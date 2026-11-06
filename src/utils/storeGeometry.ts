import { Aisle, Point, Product, ShelfBay, ShoppingItem, StoreLayout } from '../types';

/**
 * Dove si trova un prodotto in pianta.
 * - `pin`: il punto sullo scaffale (dove si appoggia la spilla e dove arriva il percorso);
 * - `access`: dove sta in piedi chi lo prende, al centro del passaggio davanti allo scaffale.
 */
export interface StopPlacement {
  pin: Point;
  access: Point;
  aisleId: string;
  bayId?: string;
}

export function findBayForProduct(aisle: Aisle, product: Product): ShelfBay | undefined {
  return (
    aisle.bays.find((b) => b.productIds.includes(product.id)) ||
    aisle.bays.find((b) => b.id === product.shelfSection || b.id.endsWith(`-${product.shelfSection}`))
  );
}

const SLOT_SPACING = 14;

/** Calcola la posizione di tutti gli articoli; più articoli sullo stesso modulo si dispongono in fila. */
export function computePlacements(store: StoreLayout, items: ShoppingItem[]): Map<string, StopPlacement> {
  const result = new Map<string, StopPlacement>();
  const groups = new Map<string, string[]>();
  const base = new Map<string, StopPlacement & { key: string }>();

  for (const item of items) {
    const p = item.product;
    const aisle = store.aisles.find((a) => a.id === p.aisleId);
    let placement: StopPlacement & { key: string };

    if (!aisle) {
      const fallback = { x: store.entrance.x, y: store.entrance.y - 40 };
      placement = { pin: fallback, access: fallback, aisleId: p.aisleId, key: `none-${p.aisleId}` };
    } else {
      const bay = findBayForProduct(aisle, p);
      if (!bay) {
        const cx = aisle.walkway.x + aisle.walkway.width / 2;
        const cy = aisle.y + aisle.height / 2;
        placement = { pin: { x: cx, y: cy }, access: { x: cx, y: cy }, aisleId: aisle.id, key: `${aisle.id}-free` };
      } else if (aisle.id === 'area-macelleria') {
        const cx = bay.x + bay.width / 2;
        placement = {
          pin: { x: cx, y: aisle.y + aisle.height + 1 },
          access: { x: cx, y: aisle.walkway.y + 10 },
          aisleId: aisle.id,
          bayId: bay.id,
          key: bay.id,
        };
      } else {
        const laneX = aisle.walkway.x + aisle.walkway.width / 2;
        const cy = bay.y + bay.height / 2;
        const bayCx = bay.x + bay.width / 2;
        const onLeft = aisle.id === 'area-ortofrutta' ? bayCx < laneX : bay.side === 'sx';
        placement = {
          pin: { x: onLeft ? bay.x + bay.width : bay.x, y: cy },
          access: { x: laneX, y: cy },
          aisleId: aisle.id,
          bayId: bay.id,
          key: bay.id,
        };
      }
    }
    base.set(item.id, placement);
    groups.set(placement.key, [...(groups.get(placement.key) || []), item.id]);
  }

  for (const [, ids] of groups) {
    ids.forEach((id, j) => {
      const b = base.get(id)!;
      const offset = (j - (ids.length - 1) / 2) * SLOT_SPACING;
      const horizontal = b.aisleId === 'area-macelleria';
      const shift = (pt: Point): Point => (horizontal ? { x: pt.x + offset, y: pt.y } : { x: pt.x, y: pt.y + offset });
      result.set(id, { pin: shift(b.pin), access: shift(b.access), aisleId: b.aisleId, bayId: b.bayId });
    });
  }
  return result;
}
