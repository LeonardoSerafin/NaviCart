import {
  Point,
  StoreLayout,
  ShoppingItem,
  OptimizedRoute,
  TurnInstruction,
} from '../types';
import { computePlacements, StopPlacement } from './storeGeometry';

// ============================================================
// Percorso ottimizzato nel supermercato
//
// 1. Ogni articolo ha una posizione precisa sullo scaffale (spilla) e un
//    punto d'accesso nel passaggio davanti a esso.
// 2. Si cercano i cammini minimi sul grafo dei passaggi della pianta.
// 3. L'ordine delle tappe parte dal più vicino e viene poi migliorato (2-opt).
// 4. Il percorso disegnato arriva fino allo scaffale di ogni prodotto
//    e termina alle casse/uscita.
// ============================================================

interface GNode {
  id: number;
  x: number;
  y: number;
}

interface Graph {
  nodes: Map<number, GNode>;
  edges: Map<number, Map<number, number>>;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function addEdge(g: Graph, a: number, b: number) {
  const na = g.nodes.get(a);
  const nb = g.nodes.get(b);
  if (!na || !nb || a === b) return;
  const d = distance(na, nb);
  g.edges.get(a)!.set(b, d);
  g.edges.get(b)!.set(a, d);
}

function buildBaseGraph(store: StoreLayout): Graph {
  const g: Graph = { nodes: new Map(), edges: new Map() };
  for (const wp of store.waypoints) {
    g.nodes.set(wp.id, { id: wp.id, x: wp.x, y: wp.y });
    g.edges.set(wp.id, new Map());
  }
  for (const [a, b] of store.waypointConnections) addEdge(g, a, b);
  return g;
}

interface ShortestPaths {
  dist: Map<number, number>;
  prev: Map<number, number | null>;
}

function dijkstraFrom(g: Graph, source: number): ShortestPaths {
  const dist = new Map<number, number>();
  const prev = new Map<number, number | null>();
  const done = new Set<number>();
  for (const id of g.nodes.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(source, 0);

  while (true) {
    let best = -1;
    let bestD = Infinity;
    for (const [id, d] of dist) {
      if (!done.has(id) && d < bestD) {
        bestD = d;
        best = id;
      }
    }
    if (best === -1) break;
    done.add(best);
    for (const [nb, w] of g.edges.get(best)!) {
      const alt = bestD + w;
      if (alt < (dist.get(nb) ?? Infinity)) {
        dist.set(nb, alt);
        prev.set(nb, best);
      }
    }
  }
  return { dist, prev };
}

function pathTo(sp: ShortestPaths, target: number): number[] {
  const path: number[] = [];
  let cur: number | null = target;
  while (cur !== null) {
    path.unshift(cur);
    cur = sp.prev.get(cur) ?? null;
  }
  return path;
}

const PIXEL_TO_METERS = 0.12; // 1 px della pianta ≈ 0.12 m
const WALKING_SPEED_MPS = 1.1; // ~1.1 m/s con il carrello
const PICK_TIME_SECONDS = 18; // ~18 s per trovare, controllare e mettere nel carrello

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

function dedupe(points: Point[]): Point[] {
  return points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
}

export interface RouteOptions {
  /**
   * Articolo appena preso: il percorso parte da lì (dove si trova ora l'utente)
   * invece che dall'ingresso.
   */
  startItemId?: string;
  /** Ordine imposto delle tappe (id degli articoli): se presente, non viene ricalcolato. */
  fixedOrder?: string[];
}

export function optimizeRoute(
  store: StoreLayout,
  items: ShoppingItem[],
  options: RouteOptions = {}
): OptimizedRoute {
  const uncheckedItems = items.filter((i) => !i.checked);

  if (uncheckedItems.length === 0) {
    return {
      orderedItems: [],
      waypoints: [],
      totalDistance: 0,
      estimatedTime: 0,
      unoptimizedDistance: 0,
      unoptimizedTime: 0,
      timeSaved: 0,
      distanceSaved: 0,
      turnInstructions: [],
    };
  }

  // ── Grafo: passaggi della pianta + un punto d'accesso per ogni articolo ──
  const graph = buildBaseGraph(store);
  const placements = computePlacements(store, items);
  const accessId = new Map<string, number>();
  let nextId = 10000;
  const dynamicByAisle = new Map<string, number[]>();

  for (const item of items) {
    const pl = placements.get(item.id)!;
    const id = nextId++;
    accessId.set(item.id, id);
    graph.nodes.set(id, { id, x: pl.access.x, y: pl.access.y });
    graph.edges.set(id, new Map());
    // collegato a tutti i punti di passaggio del suo reparto (stessa colonna/fila, libera da scaffali)
    for (const wp of store.waypoints) {
      if (wp.aisleId === pl.aisleId) addEdge(graph, id, wp.id);
    }
    // e agli altri articoli dello stesso reparto
    for (const other of dynamicByAisle.get(pl.aisleId) || []) addEdge(graph, id, other);
    dynamicByAisle.set(pl.aisleId, [...(dynamicByAisle.get(pl.aisleId) || []), id]);
  }

  const entranceWp = store.waypoints.find((w) => w.isEntrance) || store.waypoints[0];
  const exitWp = store.waypoints.find((w) => w.isCheckout) || store.waypoints[store.waypoints.length - 1];

  const startItem = options.startItemId ? items.find((i) => i.id === options.startItemId) : undefined;
  const startNode = startItem ? accessId.get(startItem.id)! : entranceWp.id;
  const startPoint: Point = startItem
    ? placements.get(startItem.id)!.access
    : { x: entranceWp.x, y: entranceWp.y };

  // ── Distanze tra tutti i punti di interesse ──
  const stopNodes = uncheckedItems.map((i) => accessId.get(i.id)!);
  const sources = [startNode, ...stopNodes];
  const sp = new Map<number, ShortestPaths>();
  for (const s of new Set(sources)) sp.set(s, dijkstraFrom(graph, s));
  const dist = (a: number, b: number) => sp.get(a)!.dist.get(b) ?? Infinity;
  const toExit = (a: number) => dist(a, exitWp.id);

  // ── Ordine delle tappe ──
  const n = uncheckedItems.length;
  let order: number[]; // indici in uncheckedItems

  if (options.fixedOrder && options.fixedOrder.length > 0) {
    const rank = new Map(options.fixedOrder.map((id, i) => [id, i]));
    order = uncheckedItems
      .map((_, idx) => idx)
      .sort((a, b) => {
        const ra = rank.get(uncheckedItems[a].id) ?? Infinity;
        const rb = rank.get(uncheckedItems[b].id) ?? Infinity;
        return ra === rb ? a - b : ra - rb;
      });
  } else {
    // più vicino in successione...
    const left = new Set(uncheckedItems.map((_, i) => i));
    order = [];
    let cur = startNode;
    while (left.size > 0) {
      let best = -1;
      let bestD = Infinity;
      for (const i of left) {
        const d = dist(cur, stopNodes[i]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      left.delete(best);
      order.push(best);
      cur = stopNodes[best];
    }

    // ...poi si inverte ogni tratto che accorcia il giro (2-opt)
    const cost = (seq: number[]) => {
      let c = dist(startNode, stopNodes[seq[0]]);
      for (let i = 1; i < seq.length; i++) c += dist(stopNodes[seq[i - 1]], stopNodes[seq[i]]);
      return c + toExit(stopNodes[seq[seq.length - 1]]);
    };
    let best = cost(order);
    let improved = n > 2;
    let guard = 0;
    while (improved && guard++ < 30) {
      improved = false;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
          const c = cost(cand);
          if (c + 1e-6 < best) {
            order = cand;
            best = c;
            improved = true;
          }
        }
      }
    }
  }

  const orderedItems = order.map((i) => uncheckedItems[i]);

  // ── Tracciato: dallo start, davanti a ogni scaffale (fino alla spilla), poi alle casse ──
  const coord = (id: number): Point => {
    const node = graph.nodes.get(id)!;
    return { x: node.x, y: node.y };
  };
  const walk = (from: number, to: number): Point[] => pathTo(sp.get(from)!, to).map(coord);

  let points: Point[] = [startPoint];
  let current = startNode;
  for (const idx of order) {
    const node = stopNodes[idx];
    const pl = placements.get(uncheckedItems[idx].id)!;
    points = points.concat(walk(current, node));
    points.push(pl.pin, pl.access);
    current = node;
  }
  points = points.concat(walk(current, exitWp.id));
  points = dedupe(points);

  const totalPixelDistance = polylineLength(points);

  // ── Confronto con un giro senza piano (articoli nell'ordine della lista) ──
  let unoptimizedPixelDist = 0;
  let unoptCurr = startNode;
  for (const node of stopNodes) {
    unoptimizedPixelDist += dist(unoptCurr, node);
    unoptCurr = node;
  }
  unoptimizedPixelDist += toExit(unoptCurr);
  const backtrackingPenalty = uncheckedItems.length > 3 ? 1.45 : 1.15;
  unoptimizedPixelDist = Math.max(totalPixelDistance * 1.25, unoptimizedPixelDist * backtrackingPenalty);

  const totalMeters = Math.round(totalPixelDistance * PIXEL_TO_METERS);
  const unoptMeters = Math.round(unoptimizedPixelDist * PIXEL_TO_METERS);
  const totalPickSeconds = uncheckedItems.length * PICK_TIME_SECONDS;
  const unoptPickSeconds = uncheckedItems.length * (PICK_TIME_SECONDS + 15);

  const estimatedTimeSec = Math.round(totalMeters / WALKING_SPEED_MPS + totalPickSeconds);
  const unoptTimeSec = Math.round(unoptMeters / WALKING_SPEED_MPS + unoptPickSeconds);

  const timeSaved = Math.max(0, unoptTimeSec - estimatedTimeSec);
  const distanceSaved = Math.max(0, unoptMeters - totalMeters);

  const turnInstructions: TurnInstruction[] = orderedItems.map((item, index) =>
    buildInstruction(store, item, index + 1, placements.get(item.id)!)
  );

  return {
    orderedItems,
    waypoints: points,
    totalDistance: totalMeters,
    estimatedTime: estimatedTimeSec,
    unoptimizedDistance: unoptMeters,
    unoptimizedTime: unoptTimeSec,
    timeSaved,
    distanceSaved,
    turnInstructions,
  };
}

function buildInstruction(
  store: StoreLayout,
  item: ShoppingItem,
  stepNumber: number,
  placement: StopPlacement
): TurnInstruction {
  const p = item.product;
  const sideText =
    p.shelfSide === 'sx'
      ? 'Scaffale Sinistro'
      : p.shelfSide === 'dx'
      ? 'Scaffale Destro'
      : p.shelfSide === 'testata'
      ? 'Testata promozionale'
      : 'Banco servito';

  const aisle = store.aisles.find((a) => a.id === p.aisleId);
  const aisleNumber = aisle?.number ?? p.aisleName;

  return {
    stepNumber,
    item,
    productName: p.name,
    brandName: p.brand,
    aisleName: p.aisleName,
    aisleNumber,
    shelfLocation: `${p.aisleName} · ${sideText} (${p.shelfSection})`,
    instruction: `Raggiungi ${p.aisleName} e prendi ${p.brand} ${p.name} al ${sideText.toLowerCase()}.`,
    coordinates: placement.pin,
    access: placement.access,
  };
}
