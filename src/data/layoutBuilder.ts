import { Aisle, ShelfBay, StoreLayout, Waypoint } from '../types';

// ============================================================
// Costruttore delle piante dei supermercati (440 x 650)
//
// Ogni negozio ha la stessa "grammatica" — banco servito sul fondo,
// corsie di scaffali, corridoio centrale che le interrompe a metà,
// ortofrutta, casse, ingresso e uscita — ma la dispone in modo diverso:
// ordine delle corsie, altezza del corridoio, lato dell'ortofrutta,
// posizione di ingresso, casse e uscita, distribuzione dei prodotti.
// ============================================================

export const MAP_W = 440;
export const MAP_H = 650;

const AISLE_X0 = 16;
const AISLE_PITCH = 60;
const AISLE_W = 48;
const SHELF_W = 12;
const SHELVES_TOP = 134;
const SHELVES_BOTTOM = 408;
const CORRIDOR_H = 40;
const BACK_LANE_Y = 100;
const FRONT_LANE_Y = 448;
const COUNTER_CUSTOMER_Y = 76;
const CHECKOUT_TOP = 486;
const CHECKOUT_H = 92;

export interface LayoutVariant {
  /** Ordine delle corsie da sinistra a destra (id delle corsie). */
  aisleOrder: string[];
  /** Ordinata del centro del corridoio centrale. */
  corridorY: number;
  /** Sfasa la distribuzione dei prodotti tra metà alta e metà bassa. */
  halfShift: number;
  /** Lato dell'ortofrutta in basso. */
  produceSide: 'left' | 'right';
  entranceX: number;
  exitX: number;
  /** Centri delle casse. */
  checkoutLanes: number[];
  /** Ordine dei moduli del banco servito (id dei moduli). */
  butcherOrder: string[];
}

interface BuiltParts {
  aisles: Aisle[];
  waypoints: Waypoint[];
  waypointConnections: [number, number][];
  entrance: { x: number; y: number };
  checkout: { x: number; y: number };
  corridor: { y: number; height: number };
  checkoutZone: { x: number; y: number; width: number; height: number };
  checkoutLanes: number[];
}

function nearestBy<T>(items: T[], key: (t: T) => number, target: number, count: number): T[] {
  return [...items].sort((a, b) => Math.abs(key(a) - target) - Math.abs(key(b) - target)).slice(0, count);
}

export function buildStoreParts(catalog: Aisle[], variant: LayoutVariant): BuiltParts {
  const corsie = variant.aisleOrder
    .map((id) => catalog.find((a) => a.id === id))
    .filter((a): a is Aisle => !!a);
  const produceCat = catalog.find((a) => a.id === 'area-ortofrutta')!;
  const butcherCat = catalog.find((a) => a.id === 'area-macelleria')!;

  const cy = variant.corridorY;
  const corridorTop = cy - CORRIDOR_H / 2;
  const corridorBottom = cy + CORRIDOR_H / 2;
  const halves = {
    up: { top: SHELVES_TOP, bottom: corridorTop },
    low: { top: corridorBottom, bottom: SHELVES_BOTTOM },
  };

  // ── Corsie: scaffali spezzati a metà dal corridoio centrale ──
  const builtCorsie: Aisle[] = corsie.map((cat, slot) => {
    const x = AISLE_X0 + slot * AISLE_PITCH;
    const catIdx = catalog.findIndex((a) => a.id === cat.id);
    const bays: ShelfBay[] = [];

    (['sx', 'dx'] as const).forEach((side) => {
      const sideBays = cat.bays.filter((b) => b.side === side);
      const placed: { bay: ShelfBay; half: 'up' | 'low' }[] = sideBays.map((b, i) => ({
        bay: b,
        half: (i + catIdx + variant.halfShift) % 2 === 0 ? 'up' : 'low',
      }));
      (['up', 'low'] as const).forEach((half) => {
        const inHalf = placed.filter((p) => p.half === half);
        const span = halves[half].bottom - halves[half].top;
        inHalf.forEach((p, j) => {
          const slotH = span / inHalf.length;
          const h = Math.min(56, slotH - 10);
          const centre = halves[half].top + slotH * (j + 0.5);
          bays.push({
            ...p.bay,
            x: side === 'sx' ? x : x + AISLE_W - SHELF_W,
            y: Math.round(centre - h / 2),
            width: SHELF_W,
            height: Math.round(h),
          });
        });
      });
    });

    const height = SHELVES_BOTTOM - SHELVES_TOP;
    return {
      ...cat,
      x,
      y: SHELVES_TOP,
      width: AISLE_W,
      height,
      leftShelf: { x, y: SHELVES_TOP, width: SHELF_W, height },
      rightShelf: { x: x + AISLE_W - SHELF_W, y: SHELVES_TOP, width: SHELF_W, height },
      walkway: { x: x + SHELF_W, y: SHELVES_TOP, width: AISLE_W - 2 * SHELF_W, height },
      crossGap: { y: corridorTop, height: CORRIDOR_H },
      bays,
    };
  });

  // ── Banco servito (fondo del negozio) ──
  const butcherBays: ShelfBay[] = variant.butcherOrder
    .map((id) => butcherCat.bays.find((b) => b.id === id))
    .filter((b): b is ShelfBay => !!b)
    .map((b, j) => ({ ...b, x: 32 + j * 98, y: 33, width: 90, height: 30 }));
  const butcher: Aisle = {
    ...butcherCat,
    x: 22,
    y: 31,
    width: 396,
    height: 34,
    walkway: { x: 22, y: 66, width: 396, height: 20 },
    bays: butcherBays,
  };

  // ── Ortofrutta: quattro tavoli attorno a un passaggio centrale ──
  const zoneW = 124;
  const zoneX = variant.produceSide === 'right' ? 296 : 24;
  const zoneY = 462;
  const zoneH = 96;
  const laneX = zoneX + zoneW / 2;
  const tableW = 44;
  const tableH = 32;
  const rowY = [zoneY + 22, zoneY + 58];
  const produceBays: ShelfBay[] = produceCat.bays.map((b, i) => ({
    ...b,
    x: i % 2 === 0 ? zoneX + 10 : zoneX + zoneW - 10 - tableW,
    y: rowY[Math.floor(i / 2)],
    width: tableW,
    height: tableH,
  }));
  const produce: Aisle = {
    ...produceCat,
    x: zoneX,
    y: zoneY,
    width: zoneW,
    height: zoneH,
    walkway: { x: laneX - 8, y: zoneY + 8, width: 16, height: zoneH - 8 },
    bays: produceBays,
  };

  // ── Casse ──
  const lanes = variant.checkoutLanes;
  const checkoutZone = {
    x: lanes[0] - 34,
    y: CHECKOUT_TOP,
    width: lanes[lanes.length - 1] - lanes[0] + 68,
    height: CHECKOUT_H,
  };

  // ── Punti di passaggio e collegamenti ──
  const wps: Waypoint[] = [];
  const edges: [number, number][] = [];
  const add = (wp: Waypoint) => {
    wps.push(wp);
    return wp;
  };
  const chain = (ids: number[]) => {
    for (let i = 1; i < ids.length; i++) edges.push([ids[i - 1], ids[i]]);
  };

  const ex = variant.entranceX;
  const xx = variant.exitX;
  const entersViaProduce = ex >= zoneX - 10 && ex <= zoneX + zoneW + 10;

  // Colonne delle corsie: fondo – metà alta – corridoio – metà bassa – fronte
  builtCorsie.forEach((a, k) => {
    const cx = a.x + AISLE_W / 2;
    const ys = [
      BACK_LANE_Y,
      (SHELVES_TOP + corridorTop) / 2,
      cy,
      (corridorBottom + SHELVES_BOTTOM) / 2,
      FRONT_LANE_Y,
    ];
    ys.forEach((y, r) => {
      add({
        id: (r + 1) * 100 + k,
        x: cx,
        y: Math.round(y),
        aisleId: a.id,
        label: r === 0 ? `Fondo ${a.shortName}` : r === 4 ? `Fronte ${a.shortName}` : r === 2 ? `Corridoio ${a.shortName}` : a.shortName,
      });
    });
    chain([100 + k, 200 + k, 300 + k, 400 + k, 500 + k]);
  });
  const K = builtCorsie.length;
  chain(Array.from({ length: K }, (_, k) => 100 + k)); // corsia di fondo
  chain(Array.from({ length: K }, (_, k) => 300 + k)); // corridoio centrale

  // Banco servito
  const mIds: number[] = [];
  butcherBays.forEach((b, j) => {
    const id = 600 + j;
    mIds.push(id);
    add({ id, x: b.x + b.width / 2, y: COUNTER_CUSTOMER_Y, aisleId: 'area-macelleria', label: b.name });
  });
  chain(mIds);
  mIds.forEach((id) => {
    const w = wps.find((q) => q.id === id)!;
    const backs = wps.filter((q) => q.id >= 100 && q.id < 200);
    nearestBy(backs, (q) => q.x, w.x, 2).forEach((q) => edges.push([id, q.id]));
  });

  // Ortofrutta: passaggio centrale tra i tavoli
  const pTop = add({ id: 700, x: laneX, y: zoneY + 8, aisleId: 'area-ortofrutta', label: 'Ortofrutta' });
  add({ id: 701, x: laneX, y: rowY[0] + tableH / 2, aisleId: 'area-ortofrutta', label: 'Ortofrutta' });
  add({ id: 702, x: laneX, y: rowY[1] + tableH / 2, aisleId: 'area-ortofrutta', label: 'Ortofrutta' });
  add({ id: 703, x: laneX, y: zoneY + zoneH + 8, aisleId: 'area-ortofrutta', label: 'Ortofrutta' });
  chain([703, 702, 701, 700]);
  void pTop;

  // Corsia di fronte: unisce colonne, ortofrutta, casse e ingresso
  const frontIds: number[] = Array.from({ length: K }, (_, k) => 500 + k);
  add({ id: 710, x: laneX, y: FRONT_LANE_Y });
  frontIds.push(710);
  edges.push([700, 710]);

  // Ingresso
  add({ id: 0, x: ex, y: 610, isEntrance: true, label: 'Ingresso' });
  add({ id: 1, x: ex, y: 598 });
  edges.push([0, 1]);
  if (entersViaProduce) {
    add({ id: 2, x: laneX, y: 598 });
    chain([1, 2, 703]);
  } else {
    add({ id: 711, x: ex, y: FRONT_LANE_Y });
    frontIds.push(711);
    edges.push([1, 711]);
  }

  // Casse e uscita
  const exitHall = add({ id: 69, x: xx, y: 590 });
  add({ id: 60, x: xx, y: 610, isCheckout: true, label: 'Casse & Uscita' });
  edges.push([69, 60]);
  const zIds: number[] = [exitHall.id];
  lanes.forEach((lane, i) => {
    const lx = lane - 28;
    add({ id: 50 + i, x: lx, y: CHECKOUT_TOP + 8, label: `Cassa ${i + 1}` });
    add({ id: 80 + i, x: lx, y: FRONT_LANE_Y });
    add({ id: 70 + i, x: lx, y: 590 });
    frontIds.push(80 + i);
    zIds.push(70 + i);
    chain([80 + i, 50 + i, 70 + i]);
  });

  const byId = (id: number) => wps.find((w) => w.id === id)!;
  const sortChain = (ids: number[]) => chain([...ids].sort((a, b) => byId(a).x - byId(b).x));
  sortChain(frontIds);
  sortChain(zIds);

  return {
    aisles: [
      ...[...builtCorsie].sort((a, b) => Number(a.number) - Number(b.number)),
      produce,
      butcher,
    ],
    waypoints: wps,
    waypointConnections: edges,
    entrance: { x: ex, y: 610 },
    checkout: { x: xx, y: 610 },
    corridor: { y: corridorTop, height: CORRIDOR_H },
    checkoutZone,
    checkoutLanes: lanes,
  };
}

export type StoreInfo = Omit<
  StoreLayout,
  'aisles' | 'waypoints' | 'waypointConnections' | 'entrance' | 'checkout' | 'corridor' | 'checkoutZone' | 'checkoutLanes' | 'width' | 'height'
>;

export function buildStoreLayout(info: StoreInfo, catalog: Aisle[], variant: LayoutVariant): StoreLayout {
  const parts = buildStoreParts(catalog, variant);
  return { ...info, width: MAP_W, height: MAP_H, ...parts };
}
