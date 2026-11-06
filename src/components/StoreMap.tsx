import React, { useMemo } from 'react';
import { StoreLayout, OptimizedRoute, Point, Aisle } from '../types';
import { findBayForProduct } from '../utils/storeGeometry';
import { aisleTopic } from '../i18n/productText';
import { useLanguage } from '../context/LanguageContext';

interface StoreMapProps {
  store: StoreLayout;
  route?: OptimizedRoute;
  highlightedAisleIds?: string[];
  activeStopIndex?: number;
  onAisleSelect?: (aisleId: string) => void;
  /** Dove si trova ora l'utente (davanti all'ultimo prodotto preso); se manca, l'inizio del percorso. */
  userPosition?: Point;
  /** Riempie l'altezza disponibile del contenitore (la pianta si ridimensiona, niente scorrimento). */
  fit?: boolean;
  className?: string;
}

// ── Palette della pianta (coerente con i token dell'app) ──
const C = {
  ink: '#1f2a24',
  inkSoft: '#4b574f',
  paper: '#f4eee2',
  card: '#fcfaf4',
  floor: '#f1eadb',
  floorLine: '#e5dcc7',
  pavement: '#d9d0bb',
  rule: '#b9ac90',
  shelfBase: '#d8ccb0',
  coldBase: '#cfdde2',
  tomato: '#b03a22',
  basil: '#2f5636',
  mustard: '#e3ae33',
  mustardTint: '#f7e8bd',
  glass: '#dbe6e7',
  wood: '#c9a96e',
  woodDark: '#7a5a2a',
  shadow: 'rgba(70, 52, 22, 0.14)',
  you: '#2f5a85',
};

// Icona per ogni reparto, mostrata sulla testata della corsia
const CATEGORY_EMOJI: Record<string, string> = {
  'forno-colazione': '🥐',
  'pasta-riso': '🍝',
  'condimenti-sughi': '🍅',
  'latticini-formaggi': '🧀',
  bevande: '💧',
  surgelati: '❄️',
  'cura-casa': '🧴',
  'igiene-persona': '🧴',
};

const COLD_CATEGORIES = new Set(['latticini-formaggi', 'surgelati']);

// 1 px della pianta ≈ 0.12 m (stessa scala usata dal calcolo del percorso)
const METERS_PER_PX = 0.12;

/** Percorso con angoli arrotondati (come le indicazioni di una mappa). */
function buildRoundedPath(points: Point[], radius = 9): string {
  const pts = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const r = Math.min(radius, d01 / 2, d12 / 2);
    const ax = p1.x - ((p1.x - p0.x) / d01) * r;
    const ay = p1.y - ((p1.y - p0.y) / d01) * r;
    const bx = p1.x + ((p2.x - p1.x) / d12) * r;
    const by = p1.y + ((p2.y - p1.y) / d12) * r;
    d += ` L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${p1.x} ${p1.y} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Frecce di direzione, una per ogni tratto abbastanza lungo (senza ripetere i tratti già percorsi). */
function buildChevrons(points: Point[]) {
  const seen = new Set<string>();
  const out: { x: number; y: number; angle: number; key: string }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 44) continue;
    const key = [a.x, a.y, b.x, b.y].join(',');
    const rkey = [b.x, b.y, a.x, a.y].join(',');
    if (seen.has(key) || seen.has(rkey)) continue;
    seen.add(key);
    out.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      key,
    });
  }
  return out;
}

function topicOf(aisle: Aisle, lang: 'it' | 'en'): string {
  return aisleTopic(aisle.name, lang);
}

/** Mensola divisa in moduli, con le confezioni in fila. */
function ShelfRun({
  x,
  y,
  width,
  height,
  color,
  cold,
  seed,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  cold: boolean;
  seed: number;
}) {
  const count = Math.max(1, Math.round(height / 25));
  const unit = height / count;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const uy = y + i * unit;
    items.push(
      <rect
        key={`u${i}`}
        x={x}
        y={uy + 0.5}
        width={width}
        height={unit - 1}
        rx={1.5}
        fill={cold ? C.coldBase : C.shelfBase}
        stroke={C.ink}
        strokeOpacity={0.55}
        strokeWidth={0.6}
      />
    );
    for (let j = 0; j < 3; j++) {
      const tone = (seed + i * 3 + j * 5) % 4;
      items.push(
        <rect
          key={`f${i}-${j}`}
          x={x + 2}
          y={uy + 2.5 + j * 7.2}
          width={width - 4}
          height={5.2}
          rx={1}
          fill={color}
          fillOpacity={cold ? 0.4 + tone * 0.1 : 0.42 + tone * 0.14}
        />
      );
    }
  }
  return <g>{items}</g>;
}

/** Spilla della mappa: la punta indica lo scaffale. */
function Pin({
  x,
  y,
  label,
  state,
}: {
  x: number;
  y: number;
  label: string;
  state: 'active' | 'todo' | 'done';
}) {
  const fill = state === 'active' ? C.tomato : state === 'done' ? C.basil : C.ink;
  const scale = state === 'active' ? 1.22 : 1;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {state === 'active' && (
        <circle
          cx="0"
          cy="-1"
          r="13"
          fill={C.tomato}
          fillOpacity="0.28"
          className="animate-pulseGlow active-stop animate-ping"
        />
      )}
      <g transform={`scale(${scale})`}>
        <ellipse cx="0" cy="0" rx="4" ry="1.6" fill={C.shadow} />
        <path
          d="M0,0 C-4,-6 -9,-11 -9,-19 A9,9 0 1 1 9,-19 C9,-11 4,-6 0,0 Z"
          fill={fill}
          stroke={C.card}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <text
          y="-15.6"
          textAnchor="middle"
          fill={C.card}
          fontSize={label.length > 1 ? 8 : 10}
          fontWeight="800"
        >
          {label}
        </text>
      </g>
    </g>
  );
}

export default function StoreMap({
  store,
  route,
  highlightedAisleIds = [],
  activeStopIndex = 0,
  onAisleSelect,
  userPosition,
  fit = false,
  className = '',
}: StoreMapProps) {
  const { t, language } = useLanguage();
  const it = language === 'it';

  const routePoints = useMemo(() => route?.waypoints ?? [], [route]);
  const routeSvgPath = useMemo(() => buildRoundedPath(routePoints), [routePoints]);
  const chevrons = useMemo(() => buildChevrons(routePoints), [routePoints]);

  // Quanti articoli da prendere in ogni corsia
  const aisleItemCount = useMemo(() => {
    const map = new Map<string, number>();
    if (!route) return map;
    for (const item of route.orderedItems) {
      if (!item.checked) {
        map.set(item.product.aisleId, (map.get(item.product.aisleId) || 0) + 1);
      }
    }
    return map;
  }, [route]);

  // Scaffali (moduli) con articoli da prendere
  const activeBayIds = useMemo(() => {
    const set = new Set<string>();
    if (!route) return set;
    for (const item of route.orderedItems) {
      if (item.checked) continue;
      const aisle = store.aisles.find((a) => a.id === item.product.aisleId);
      if (!aisle) continue;
      const bay = findBayForProduct(aisle, item.product);
      if (bay) set.add(bay.id);
    }
    return set;
  }, [route, store.aisles]);

  // Spille: posizione precisa sullo scaffale e numero della tappa, fissi per tutta la spesa
  const stopPoints = useMemo(() => {
    if (!route || !route.turnInstructions) return [];
    return route.turnInstructions.map((instruction, idx) => ({
      number: instruction.stepNumber,
      x: instruction.coordinates.x,
      y: instruction.coordinates.y,
      item: instruction.item,
      isActive: idx === activeStopIndex,
    }));
  }, [route, activeStopIndex]);

  const corsie = store.aisles.filter((a) => a.id.startsWith('corsia-'));
  const produce = store.aisles.find((a) => a.id === 'area-ortofrutta');
  const butcher = store.aisles.find((a) => a.id === 'area-macelleria');

  const startPt = routePoints[0];
  const endPt = routePoints[routePoints.length - 1];
  const corridor = store.corridor;
  const zone = store.checkoutZone;
  const lanes = store.checkoutLanes ?? [];
  const entrance = store.entrance;
  const exit = store.checkout;
  const doorHalf = 38;
  // porte a vetri sul muro di fondo: ingresso e uscita
  const doors = [entrance.x, exit.x].sort((a, b) => a - b).map((x) => [x - doorHalf, x + doorHalf]);
  const wallY = store.height - 15;
  const bottomWall = [
    `M ${doors[1][1]} ${wallY} H ${store.width - 10}`,
    `M ${doors[1][0]} ${wallY} H ${doors[0][1]}`,
    `M ${doors[0][0]} ${wallY} H 10`,
  ].join(' ');
  // ingresso e uscita possono stare da lati opposti: carrelli dal lato con più spazio
  const cartsOnRight = entrance.x < store.width / 2;
  // scala grafica nel tratto più libero del muro di fondo (lontano da ingresso e uscita)
  const scaleW = 10 / METERS_PER_PX;
  const scaleX = (() => {
    const blocked = [entrance.x, exit.x].sort((a, b) => a - b).map((x) => [x - 48, x + 48]);
    const edges = [18, ...blocked.flat(), store.width - 18];
    let best = { w: -1, from: 18 };
    for (let i = 0; i < edges.length; i += 2) {
      const w = edges[i + 1] - edges[i];
      if (w > best.w) best = { w, from: edges[i] };
    }
    return best.from + (best.w - scaleW - 24) / 2;
  })();

  const W = store.width;
  const H = store.height;

  const selectable = (aisleId: string) =>
    onAisleSelect
      ? {
          onClick: () => onAisleSelect(aisleId),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAisleSelect(aisleId);
            }
          },
          role: 'button' as const,
          tabIndex: 0,
          className: 'cursor-pointer',
        }
      : {};

  const bayFruit: Record<string, string[]> = {
    'OF-1': ['#b03a22', '#7f9a3c', '#b03a22', '#c9552f', '#7f9a3c', '#b03a22'],
    'OF-2': ['#e3ae33', '#e3ae33', '#d99a1f', '#e3ae33', '#d99a1f', '#e3ae33'],
    'OF-3': ['#b03a22', '#c9552f', '#7f9a3c', '#b03a22', '#4f7a3a', '#c9552f'],
    'OF-4': ['#4f7a3a', '#7f9a3c', '#e8c43c', '#4f7a3a', '#6b9446', '#7f9a3c'],
  };

  const butcherTrays: Record<string, { color: string; ice?: boolean }> = {
    'M-1': { color: '#a4553a' },
    'M-2': { color: '#e6b9a5' },
    'M-3': { color: '#8f2d27' },
    'M-4': { color: '#a8c2cc', ice: true },
  };
  const butcherLabels: Record<string, string> = it
    ? { 'M-1': 'SALUMI', 'M-2': 'POLLO', 'M-3': 'MANZO', 'M-4': 'PESCE' }
    : { 'M-1': 'CURED', 'M-2': 'CHICKEN', 'M-3': 'BEEF', 'M-4': 'FISH' };

  const stateLabels = it
    ? { todo: 'Da prendere', active: 'Prossima', done: 'Presa' }
    : { todo: 'To pick', active: 'Next', done: 'Picked' };

  return (
    <figure
      className={`relative w-full overflow-hidden bg-card border border-ink rounded-[10px] select-none m-0 ${fit ? 'h-full flex flex-col' : ''} ${className}`}
    >
      {/* ── Cartiglio della pianta ── */}
      <figcaption className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-ink bg-card">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-tomato flex-shrink-0 translate-y-[-1px]" aria-hidden="true" />
          <span className="font-display text-[15px] font-semibold italic text-ink truncate">{store.name}</span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft whitespace-nowrap">
          {t('storeView')}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={fit ? 'w-full flex-1 min-h-0 block' : 'w-full h-auto block'}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${t('storeView')} · ${store.name}`}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        <defs>
          <pattern id="floorTiles" width="22" height="22" patternUnits="userSpaceOnUse">
            <rect width="22" height="22" fill={C.floor} />
            <path d="M 22 0 L 0 0 0 22" fill="none" stroke={C.floorLine} strokeWidth="0.7" />
          </pattern>
          <pattern id="matStripes" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="#cfc6b0" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="#b5ab92" strokeWidth="2" />
          </pattern>
          <pattern id="staffHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="6" height="6" fill="#d9cfb8" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#cbbfa3" strokeWidth="1" />
          </pattern>
        </defs>

        {/* ── Marciapiede e pavimento ── */}
        <rect width={W} height={H} fill={C.pavement} />
        <rect x="10" y="15" width={W - 20} height={H - 30} fill="url(#floorTiles)" />

        {/* ── Zone a pavimento ── */}
        {/* Ortofrutta: piastrelle più fresche */}
        {produce && (
          <rect x={produce.x - 3} y={produce.y - 4} width={produce.width + 6} height={produce.height + 4} rx="6" fill="#e4e8cf" stroke="#b9c08f" strokeWidth="0.9" strokeDasharray="3 3" />
        )}
        {/* Casse */}
        {zone && (
          <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="4" fill="#e8e0cc" stroke={C.rule} strokeWidth="0.8" strokeDasharray="3 3" />
        )}
        {/* Corridoio centrale: pavimento più chiaro e filetto tratteggiato */}
        {corridor && (
          <g>
            <rect x="12" y={corridor.y} width={W - 24} height={corridor.height} fill="#f7f2e6" />
            <line x1="14" x2={W - 14} y1={corridor.y + corridor.height / 2} y2={corridor.y + corridor.height / 2} stroke={C.floorLine} strokeWidth="1" strokeDasharray="1 6" strokeLinecap="round" />
          </g>
        )}
        {/* Retro banco servito */}
        <rect x="17.5" y="17.5" width={W - 35} height="14" fill="url(#staffHatch)" />

        {/* ── BANCO SERVITO: macelleria, salumi, pescheria ── */}
        {butcher && (
          <g {...selectable(butcher.id)} aria-label={t('storeView') + ' · ' + (it ? 'Banco servito' : 'Service counter')}>
            <rect x="24" y="32.5" width="396" height="34" rx="4" fill={C.shadow} />
            <rect x="22" y="31" width="396" height="33" rx="4" fill={C.glass} stroke={C.ink} strokeWidth="1.2" />
            {butcher.bays.map((bay) => {
              const tray = butcherTrays[bay.id] || { color: '#a4553a' };
              const hasItem = activeBayIds.has(bay.id);
              return (
                <g key={bay.id}>
                  {hasItem && (
                    <rect x={bay.x - 4} y="33" width={bay.width + 8} height="29" rx="3" fill={C.tomato} fillOpacity="0.14" stroke={C.tomato} strokeWidth="1.3" />
                  )}
                  {[0, 1, 2, 3].map((i) => (
                    <rect key={i} x={bay.x + 3 + i * 19} y="37" width="16" height="17" rx="2" fill={tray.color} fillOpacity={0.55 + (i % 2) * 0.25} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.8" />
                  ))}
                  {tray.ice &&
                    [0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={bay.x + 8 + i * 12} cy={58} r="1.1" fill="#ffffff" fillOpacity="0.9" />)}
                  <text x={bay.x + bay.width / 2} y="26" textAnchor="middle" fontSize="6.2" fontWeight="800" letterSpacing="0.9" fill={C.inkSoft}>
                    {butcherLabels[bay.id] || ''}
                  </text>
                </g>
              );
            })}
            {/* bordo di appoggio lato clienti */}
            <rect x="22" y="63" width="396" height="2.5" fill={C.woodDark} />
            {/* eliminacode */}
            <rect x="26" y="70" width="9" height="12" rx="1.5" fill={C.tomato} />
            <rect x="28" y="72" width="5" height="3" fill={C.card} />
          </g>
        )}

        {/* ── ORTOFRUTTA ── */}
        {produce && (
          <g {...selectable(produce.id)} aria-label={it ? 'Ortofrutta' : 'Produce'}>
            <text x={produce.x + produce.width / 2} y={produce.y + 11} textAnchor="middle" fontSize="7" fontWeight="800" letterSpacing="1.2" fill={C.basil}>
              {it ? 'ORTOFRUTTA' : 'PRODUCE'}
            </text>
            {produce.bays.map((bay) => {
              const dots = bayFruit[bay.id] || bayFruit['OF-1'];
              const hasItem = activeBayIds.has(bay.id);
              return (
                <g key={bay.id}>
                  <rect x={bay.x + 1.5} y={bay.y + 2} width={bay.width} height={bay.height} rx="4" fill={C.shadow} />
                  <rect x={bay.x} y={bay.y} width={bay.width} height={bay.height} rx="4" fill={C.wood} stroke={hasItem ? C.tomato : C.woodDark} strokeWidth={hasItem ? 2 : 1} />
                  <rect x={bay.x + 3} y={bay.y + 3} width={bay.width - 6} height={bay.height - 6} rx="2.5" fill="#e9d9b0" />
                  {dots.map((color, i) => (
                    <circle key={i} cx={bay.x + 9 + (i % 3) * 13.5} cy={bay.y + 11 + Math.floor(i / 3) * 14} r="4.6" fill={color} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.8" />
                  ))}
                </g>
              );
            })}
          </g>
        )}

        {/* ── CORSIE 1–7: scaffali a isola ── */}
        {corsie.map((aisle) => {
          const isHighlighted = highlightedAisleIds.includes(aisle.id);
          const itemsInAisle = aisleItemCount.get(aisle.id) || 0;
          const cold = COLD_CATEGORIES.has(aisle.category);
          const aisleLabel = it ? `Corsia ${aisle.number}` : `Aisle ${aisle.number}`;
          const cx = aisle.x + aisle.width / 2;
          const seed = Number(aisle.number) * 7;
          const l = aisle.leftShelf;
          const r = aisle.rightShelf;
          const gap = aisle.crossGap;
          // scaffali interrotti dal corridoio centrale: due metà
          const segments: [number, number][] = gap
            ? [
                [aisle.y, gap.y],
                [gap.y + gap.height, aisle.y + aisle.height],
              ]
            : [[aisle.y, aisle.y + aisle.height]];

          return (
            <g key={aisle.id} {...selectable(aisle.id)} aria-label={`${aisleLabel} · ${topicOf(aisle, language)}`}>
              <title>{`${aisleLabel} · ${topicOf(aisle, language)}`}</title>

              {/* corridoio con articoli: segno leggero sul pavimento */}
              {itemsInAisle > 0 && (
                <rect x={aisle.walkway.x} y={aisle.walkway.y} width={aisle.walkway.width} height={aisle.walkway.height} fill={C.tomato} fillOpacity="0.1" />
              )}

              {/* scaffali, in due metà */}
              {segments.map(([y0, y1], si) => (
                <g key={si}>
                  {l && <rect x={l.x + 1.5} y={y0 + 2} width={l.width} height={y1 - y0} fill={C.shadow} />}
                  {r && <rect x={r.x + 1.5} y={y0 + 2} width={r.width} height={y1 - y0} fill={C.shadow} />}
                  {l && <ShelfRun x={l.x} y={y0} width={l.width} height={y1 - y0} color={aisle.color} cold={cold} seed={seed + si * 2} />}
                  {r && <ShelfRun x={r.x} y={y0} width={r.width} height={y1 - y0} color={aisle.color} cold={cold} seed={seed + 3 + si * 2} />}
                </g>
              ))}

              {/* testate sul corridoio centrale */}
              {gap &&
                [gap.y - 7, gap.y + gap.height + 1].map((ey, ei) => (
                  <g key={ei}>
                    <rect x={aisle.x + 0.5} y={ey} width={aisle.width - 1} height="6" rx="2" fill={C.mustardTint} stroke={C.ink} strokeOpacity="0.6" strokeWidth="0.7" />
                    {[0, 1, 2, 3, 4].map((i) => (
                      <circle key={i} cx={aisle.x + 8 + i * 8} cy={ey + 3} r="1.5" fill={aisle.color} fillOpacity="0.85" />
                    ))}
                  </g>
                ))}

              {/* moduli con articoli da prendere */}
              {aisle.bays.map((bay) =>
                activeBayIds.has(bay.id) ? (
                  <rect
                    key={bay.id}
                    x={bay.x - 1.5}
                    y={bay.y - 2}
                    width={bay.width + 3}
                    height={bay.height + 4}
                    rx="2.5"
                    fill={C.tomato}
                    fillOpacity="0.16"
                    stroke={C.tomato}
                    strokeWidth="1.6"
                  />
                ) : null
              )}

              {/* testata promozionale sul lato fronte */}
              <rect x={aisle.x + 0.5} y={aisle.y + aisle.height + 2} width={aisle.width - 1} height="11" rx="2.5" fill={C.mustardTint} stroke={C.ink} strokeOpacity="0.7" strokeWidth="0.8" />
              {[0, 1, 2, 3, 4].map((i) => (
                <circle key={i} cx={aisle.x + 8 + i * 8} cy={aisle.y + aisle.height + 7.5} r="2" fill={aisle.color} fillOpacity="0.85" />
              ))}

              {/* targhetta: numero a sinistra, reparto a destra (il centro resta libero per il percorso) */}
              <circle cx={l ? l.x + 6 : aisle.x + 6} cy={aisle.y - 13} r="7" fill={isHighlighted && itemsInAisle > 0 ? C.tomato : C.ink} stroke={C.card} strokeWidth="1.4" />
              <text x={l ? l.x + 6 : aisle.x + 6} y={aisle.y - 9.6} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={C.card}>
                {aisle.number}
              </text>
              <text x={r ? r.x + 6 : aisle.x + 42} y={aisle.y - 9.6} textAnchor="middle" fontSize="9.5">
                {CATEGORY_EMOJI[aisle.category] || ''}
              </text>

              {/* contatore articoli sotto la testata */}
              {itemsInAisle > 0 && (
                <g>
                  <rect x={cx - 8} y={aisle.y + aisle.height + 15} width="16" height="11" rx="5.5" fill={C.tomato} />
                  <text x={cx} y={aisle.y + aisle.height + 23.4} textAnchor="middle" fontSize="8" fontWeight="800" fill={C.card}>
                    {itemsInAisle}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ── CASSE ── */}
        {zone && (
          <g>
            <text x={zone.x + 6} y={zone.y + 10} fontSize="6.2" fontWeight="800" letterSpacing="0.9" fill={C.inkSoft} stroke="#e8e0cc" strokeWidth="3" paintOrder="stroke">
              {t('cashierLabel')}
            </text>
            {lanes.map((cx, i) => (
              <g key={cx}>
                <rect x={cx - 6.5} y={zone.y + 35.5} width="15" height="30" rx="2" fill={C.shadow} />
                <rect x={cx - 8} y={zone.y + 34} width="15" height="30" rx="2" fill="#59645d" stroke={C.ink} strokeWidth="0.9" />
                {[0, 1, 2, 3, 4].map((k) => (
                  <line key={k} x1={cx - 8} x2={cx + 7} y1={zone.y + 39 + k * 5.5} y2={zone.y + 39 + k * 5.5} stroke="#7d8982" strokeWidth="0.8" />
                ))}
                <rect x={cx - 16} y={zone.y + 65} width="32" height="13" rx="2.5" fill={C.ink} />
                <rect x={cx + 5} y={zone.y + 67} width="8" height="5" rx="1" fill="#9fb8b0" />
                <text x={cx - 10} y={zone.y + 75} fontSize="8" fontWeight="800" fill={C.card}>
                  {i + 1}
                </text>
                <title>{`${t('cashierUnit')} ${i + 1}`}</title>
              </g>
            ))}
          </g>
        )}

        {/* ── MURI con porte scorrevoli (ingresso e uscita) ── */}
        <path
          d={`M 10 ${wallY} V 15 H ${W - 10} V ${wallY} ${bottomWall}`}
          fill="none"
          stroke={C.ink}
          strokeWidth="5"
          strokeLinejoin="miter"
        />
        {doors.map(([x1, x2]) => (
          <g key={x1}>
            <rect x={x1} y={wallY - 2.5} width={(x2 - x1) / 2 - 1} height="5" fill="#8fb3bf" stroke={C.ink} strokeWidth="0.8" />
            <rect x={(x1 + x2) / 2 + 1} y={wallY - 2.5} width={(x2 - x1) / 2 - 1} height="5" fill="#8fb3bf" stroke={C.ink} strokeWidth="0.8" />
          </g>
        ))}

        {/* ── Ingresso: zerbino, carrelli ── */}
        <g>
          <rect x={entrance.x - 31} y="598" width="62" height="28" rx="3" fill="url(#matStripes)" stroke={C.rule} strokeWidth="0.8" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={cartsOnRight ? entrance.x + 36 + i * 3 : entrance.x - 66 - i * 3}
              y={600 + i * 1.2}
              width="30"
              height="9"
              rx="2"
              fill="none"
              stroke={C.inkSoft}
              strokeWidth="0.9"
            />
          ))}
          <text x={entrance.x} y="645" textAnchor="middle" fontSize="7" fontWeight="800" letterSpacing="1.2" fill={C.ink}>
            ↑ {t('entranceLabel')}
          </text>
        </g>

        {/* ── Uscita ── */}
        <g>
          <rect x={exit.x - 31} y="598" width="62" height="28" rx="3" fill="url(#matStripes)" stroke={C.rule} strokeWidth="0.8" />
          <text x={exit.x} y="645" textAnchor="middle" fontSize="7" fontWeight="800" letterSpacing="1.2" fill={C.ink}>
            {t('exitLabel')} ↓
          </text>
        </g>

        {/* ── Scala grafica (10 m) ── */}
        <g transform={`translate(${scaleX}, 641)`}>
          <line x1="0" y1="0" x2={10 / METERS_PER_PX} y2="0" stroke={C.ink} strokeWidth="1.2" />
          <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke={C.ink} strokeWidth="1.2" />
          <line x1={10 / METERS_PER_PX} y1="-2.5" x2={10 / METERS_PER_PX} y2="2.5" stroke={C.ink} strokeWidth="1.2" />
          <text x={10 / METERS_PER_PX + 4} y="2.4" fontSize="6.5" fontWeight="700" fill={C.ink}>
            10 m
          </text>
        </g>

        {/* ── PERCORSO ── */}
        {routeSvgPath && (
          <g>
            <path d={routeSvgPath} fill="none" stroke={C.card} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={routeSvgPath} fill="none" stroke={C.tomato} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d={routeSvgPath}
              fill="none"
              stroke={C.card}
              strokeWidth="1.6"
              strokeDasharray="2 8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="route-walking-line"
            />
            {chevrons.map((c) => (
              <g key={c.key} transform={`translate(${c.x}, ${c.y}) rotate(${c.angle})`}>
                <path d="M -2.4 -3 L 1.6 0 L -2.4 3" fill="none" stroke={C.card} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
            {/* partenza e arrivo */}
            {endPt && (
              <g transform={`translate(${endPt.x}, ${endPt.y})`}>
                <circle r="7" fill={C.ink} stroke={C.card} strokeWidth="1.6" />
                <path d="M -2.5 3.5 V -3.5 L 3.2 -1.6 L -2.5 0.3" fill={C.card} />
              </g>
            )}
          </g>
        )}

        {/* ── SPILLE DELLE TAPPE ── */}
        {[...stopPoints]
          .sort((a, b) => Number(a.isActive) - Number(b.isActive))
          .map((stop) => (
            <Pin
              key={stop.number}
              x={stop.x}
              y={stop.y}
              label={stop.item.checked ? '✓' : String(stop.number)}
              state={stop.item.checked ? 'done' : stop.isActive ? 'active' : 'todo'}
            />
          ))}

        {/* ── TU SEI QUI ── */}
        {(userPosition || startPt) && (
          <g transform={`translate(${(userPosition || startPt).x}, ${(userPosition || startPt).y})`} aria-label={it ? 'La tua posizione' : 'Your position'}>
            <title>{it ? 'Sei qui' : 'You are here'}</title>
            <circle r="13" fill={C.you} fillOpacity="0.22" className="animate-ping" />
            <circle r="8" fill={C.you} stroke={C.card} strokeWidth="2.2" />
            <circle cx="0" cy="-2.2" r="2" fill={C.card} />
            <path d="M -3.4 3.6 C -3.4 0.6 3.4 0.6 3.4 3.6 Z" fill={C.card} />
          </g>
        )}
      </svg>

      {/* ── Legenda ── */}
      <div className={`${fit ? 'flex-shrink-0 py-1.5' : 'py-2.5'} flex items-center flex-wrap gap-x-4 gap-y-1 px-3.5 border-t border-rule bg-card text-[11px] font-semibold text-ink-soft`}>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-ink inline-block" aria-hidden="true" />
          {stateLabels.todo}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-tomato inline-block" aria-hidden="true" />
          {stateLabels.active}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-basil inline-block" aria-hidden="true" />
          {stateLabels.done}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: C.you }} aria-hidden="true" />
          {it ? 'Tu' : 'You'}
        </span>
        <span className="inline-flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-5 h-[3px] rounded bg-tomato" aria-hidden="true" />
          {it ? 'Percorso' : 'Route'}
        </span>
      </div>
    </figure>
  );
}
