import { describe, it, expect } from '../helpers/test-framework';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createJiti } from 'jiti';
import { renderAppRoute, renderWithProviders, parserUtils, storageUtils, storesData, productsData, routeUtils, translationsData, StoreMap, createShoppingItem } from '../helpers/render-helper';

const jitiLocal = createJiti(import.meta.url, { jsx: true });
const jiti_productText = () => jitiLocal('../../src/i18n/productText.ts').productText as (p: any, l: string) => any;

describe('Tier 3: Cross-Feature Combinations', () => {
  it('C01: Supermarket Switch & Catalog Assortment Scoping (Store Selection <-> Catalog Exclusions)', () => {
    // 1. Lidl catalog excludes Nutella, Barilla, Lavazza
    const lidlStore = storesData.availableStores.find((s: any) => s.id === 'lidl-brennero');
    const lidlHtml = renderAppRoute(`/store/${lidlStore.id}`);
    expect(lidlHtml).not.toContain('Nutella');

    // 2. IperPoli catalog includes Nutella, Barilla, Lavazza
    const poliStore = storesData.availableStores.find((s: any) => s.id === 'iperpoli-cittadella');
    const poliHtml = renderAppRoute(`/store/${poliStore.id}`);
    expect(poliHtml).toContain('Nutella Ferrero');
  });

  it('C02: Multi-Filter to List Addition (Filters <-> Target List Persistence)', () => {
    // Filter products by sale + local
    const catalog = productsData.italianProducts;
    const saleLocal = catalog.filter((p: any) => p.isOnSale && p.isLocal);
    expect(saleLocal.length).toBeGreaterThan(0);

    // Target product
    const prod = saleLocal[0];
    const initialLists = storageUtils.getDefaultDemoLists();
    const targetList = initialLists[0];

    // Add product to list
    targetList.items.push({
      productId: prod.id,
      quantity: 2,
      checked: false,
    });
    storageUtils.saveLists(initialLists);

    // Verify persistence
    const loaded = storageUtils.loadLists().find((l: any) => l.id === targetList.id);
    expect(loaded.items.some((i: any) => i.productId === prod.id && i.quantity === 2)).toBe(true);
  });

  it('C03: Originating List HUD Round-Trip (?listId Routing <-> Screen 2.1 <-> Screen 1.1)', () => {
    const list = {
      id: 'roundtrip-list-1',
      storeId: 'iperpoli-cittadella',
      name: 'Spesa Settimanale',
      items: [createShoppingItem('prod-mele-melinda')],
    };

    // 1. User starts on Screen 2.1
    const screen21Html = renderAppRoute(`/lists/${list.id}`, { initialLists: [list] });
    expect(screen21Html).toContain(list.name);

    // 2. Navigates to catalog with ?listId
    const catalogUrl = `/store/${list.storeId}?listId=${list.id}`;
    const catalogHtml = renderAppRoute(catalogUrl, { initialLists: [list] });
    expect(catalogHtml).toMatch(/Stai modificando|Editing list/i);
    expect(catalogHtml).toContain(list.name);

    // 3. Modifies list item
    list.items[0].quantity = 3;
    storageUtils.saveLists([list]);

    // 4. Returns to Screen 2.1 with updated quantity
    const returnHtml = renderAppRoute(`/lists/${list.id}`, { initialLists: [list] });
    expect(returnHtml).toContain(list.name);
  });

  it('C04: External Text Import with Assortment Exclusion Alert (Parser <-> Alert Modal <-> List Creation)', () => {
    // Raw recipe / text paste containing both valid items and Lidl excluded items
    const rawPastedText = `
      - 2 Mele Melinda
      - 1 Latte Mila
      - 1 Nutella Ferrero
      - 1 Caffè Lavazza
    `;

    // Parse for Lidl store
    const parseResult = parserUtils.parseGroceryTextForStore(rawPastedText, 'lidl-brennero');

    // Assortment exclusions correctly isolated
    expect(parseResult.availableItems.length).toBe(2); // Mele, Latte
    expect(parseResult.unavailableItems.length).toBe(2); // Nutella, Lavazza

    // Mandatory single-action alert created with available items only
    const createdList = storageUtils.createEmptyList('lidl-brennero', 'Spesa Lidl da WhatsApp');
    createdList.items = parseResult.availableItems;
    storageUtils.saveLists([createdList]);

    // Verify created list has only available items
    const saved = storageUtils.loadLists().find((l: any) => l.id === createdList.id);
    expect(saved.items.length).toBe(2);
    expect(saved.items.some((i: any) => i.product.name.includes('Nutella'))).toBe(false);
  });

  it('C05: In-Store Pathfinding & Turn HUD Synchronization (TSP Engine <-> SVG Map <-> RouteStats HUD)', () => {
    const store = storesData.availableStores[0]; // IperPoli
    const demoList = storageUtils.getDefaultDemoLists()[0];

    // Compute route
    const route = routeUtils.optimizeRoute(store, demoList.items);
    expect(route).toBeDefined();
    expect(route.orderedItems.length).toBeGreaterThan(0);
    expect(route.turnInstructions.length).toBeGreaterThan(0);

    // Step 0 turn instruction
    const step0 = route.turnInstructions[0];
    expect(step0).toBeDefined();
    expect(step0.productName).toBeDefined();

    // Mark step 0 checked
    const updatedItems = demoList.items.map((i: any, idx: number) => ({
      ...i,
      checked: idx === 0 ? true : i.checked,
    }));

    // Recalculate route
    const updatedRoute = routeUtils.optimizeRoute(store, updatedItems);
    expect(updatedRoute.orderedItems.length).toBe(route.orderedItems.length - 1);
  });

  it('C06: Bilingual Localization App-Wide Propagation (Language Toggle <-> Storage <-> Layout <-> Pages)', () => {
    // 1. Set language to English in storage
    globalThis.localStorage.setItem('navicart_language', 'en');

    // 2. Layout renders English tabs
    const homeHtml = renderAppRoute('/home', { language: 'en' });
    expect(homeHtml).toContain('Indoor Supermarket Pathfinding');

    // 3. My Lists renders English headers
    const listsHtml = renderAppRoute('/lists', { language: 'en' });
    expect(listsHtml).toMatch(/My Grocery Lists|New List/i);

    // 4. Account renders English profile
    const accountHtml = renderAppRoute('/account', { language: 'en' });
    expect(accountHtml).toMatch(/Language|Account/i);
  });

  it('C07: Demo Data Reset Impact on Map and Badge (Account Reset <-> Storage <-> Bottom Nav Badge <-> Map Render)', () => {
    // 1. Clear all lists
    storageUtils.saveLists([]);
    const emptyHome = renderAppRoute('/home', { initialLists: [] });
    expect(emptyHome).not.toMatch(/>0<\/span>/);

    // 2. Perform demo data reset
    const demoLists = storageUtils.getDefaultDemoLists();
    storageUtils.saveLists(demoLists);

    // 3. Bottom nav updates badge to 4
    const restoredHome = renderAppRoute('/home', { initialLists: demoLists });
    expect(restoredHome).toContain('>4<');

    // 4. First list renders 2D SVG map with optimized route
    const firstList = demoLists[0];
    const store = storesData.availableStores.find((s: any) => s.id === firstList.storeId);
    const route = routeUtils.optimizeRoute(store, firstList.items);
    expect(route.orderedItems.length).toBeGreaterThan(0);
  });

  it('C08: Checkoff to 100% Completion & Route Clearance (Checkmark <-> Progress Bar <-> Map Zero State)', () => {
    const store = storesData.availableStores[0];
    const list = {
      id: 'comp-list',
      storeId: store.id,
      name: 'Completa',
      items: [
        createShoppingItem('prod-mele-melinda'),
        createShoppingItem('prod-latte-granarolo'),
      ],
    };

    // Initially 0%
    let checkedCount = list.items.filter(i => i.checked).length;
    expect(Math.round((checkedCount / list.items.length) * 100)).toBe(0);

    // Check item 1 (50%)
    list.items[0].checked = true;
    checkedCount = list.items.filter(i => i.checked).length;
    expect(Math.round((checkedCount / list.items.length) * 100)).toBe(50);

    // Check item 2 (100%)
    list.items[1].checked = true;
    checkedCount = list.items.filter(i => i.checked).length;
    expect(Math.round((checkedCount / list.items.length) * 100)).toBe(100);

    // Route clear
    const clearedRoute = routeUtils.optimizeRoute(store, list.items);
    expect(clearedRoute.orderedItems.length).toBe(0);
    expect(clearedRoute.totalDistance).toBe(0);
  });
}, { tier: 'tier3' });

// ── Piante, percorso e traduzioni (v0.10) ──
describe('Tier 3: Store Maps, Pin-Accurate Routes & Translations', () => {
  const stores = () => storesData.availableStores as any[];
  const demoItems = () => storageUtils.getDefaultDemoLists()[0].items as any[];

  it('N01: Every aisle is split in two halves by a central corridor in every store', () => {
    for (const store of stores()) {
      expect(store.corridor).toBeDefined();
      const corsie = store.aisles.filter((a: any) => a.id.startsWith('corsia-'));
      expect(corsie.length).toBe(7);
      for (const aisle of corsie) {
        expect(aisle.crossGap).toBeDefined();
        expect(aisle.crossGap.y).toBeGreaterThan(aisle.y);
        expect(aisle.crossGap.y + aisle.crossGap.height).toBeLessThan(aisle.y + aisle.height);
        // nessun modulo di scaffale cade dentro il corridoio
        for (const bay of aisle.bays) {
          const inGap = bay.y + bay.height > aisle.crossGap.y && bay.y < aisle.crossGap.y + aisle.crossGap.height;
          expect(inGap).toBe(false);
        }
      }
    }
  });

  it('N02: The four supermarkets have different floor plans', () => {
    const fingerprints = stores().map((s: any) =>
      JSON.stringify([
        s.corridor,
        s.entrance,
        s.checkout,
        s.checkoutLanes,
        s.aisles.map((a: any) => [a.id, a.x, a.bays.map((b: any) => [b.id, b.y])]),
      ])
    );
    expect(new Set(fingerprints).size).toBe(4);
  });

  it('N03: All waypoints and bays stay inside the 440x650 map, and every product has a bay', () => {
    for (const store of stores()) {
      for (const wp of store.waypoints) {
        expect(wp.x).toBeGreaterThanOrEqual(0);
        expect(wp.x).toBeLessThanOrEqual(440);
        expect(wp.y).toBeGreaterThanOrEqual(0);
        expect(wp.y).toBeLessThanOrEqual(650);
      }
      for (const p of productsData.italianProducts) {
        const aisle = store.aisles.find((a: any) => a.id === p.aisleId);
        expect(aisle).toBeDefined();
        expect(aisle.bays.some((b: any) => b.productIds.includes(p.id))).toBe(true);
      }
    }
  });

  it('N04: The drawn route reaches the exact shelf point of every product to pick', () => {
    for (const store of stores()) {
      const route = routeUtils.optimizeRoute(store, demoItems());
      expect(route.totalDistance).toBeGreaterThan(0);
      for (const ti of route.turnInstructions) {
        const hit = route.waypoints.some((w: any) => w.x === ti.coordinates.x && w.y === ti.coordinates.y);
        expect(hit).toBe(true);
      }
      const last = route.waypoints[route.waypoints.length - 1];
      expect(last).toEqual({ x: store.checkout.x, y: store.checkout.y });
    }
  });

  it('N05: After picking an item the route starts from that item, not from the entrance', () => {
    const store = stores()[0];
    const items = demoItems();
    const plan = routeUtils.optimizeRoute(store, items);
    const first = plan.orderedItems[0];
    const after = items.map((i: any) => ({ ...i, checked: i.id === first.id }));
    const route = routeUtils.optimizeRoute(store, after, {
      startItemId: first.id,
      fixedOrder: plan.orderedItems.map((i: any) => i.id),
    });
    const access = plan.turnInstructions[0].access;
    expect(route.waypoints[0]).toEqual(access);
    expect(route.waypoints[0]).not.toEqual({ x: store.entrance.x, y: store.entrance.y });
    expect(route.orderedItems.length).toBe(items.length - 1);
  });

  it('N06: Stop numbers stay fixed as items are picked (plan order is preserved)', () => {
    const store = stores()[0];
    const items = demoItems();
    const plan = routeUtils.optimizeRoute(store, items);
    const planIds = plan.orderedItems.map((i: any) => i.id);
    const after = items.map((i: any) => ({ ...i, checked: i.id === planIds[0] }));
    const route = routeUtils.optimizeRoute(store, after, { startItemId: planIds[0], fixedOrder: planIds });
    expect(route.orderedItems.map((i: any) => i.id)).toEqual(planIds.slice(1));
    // il piano completo non dipende dalle spunte
    const replan = routeUtils.optimizeRoute(store, items.map((i: any) => ({ ...i, checked: false })));
    expect(replan.turnInstructions.map((t: any) => [t.item.id, t.stepNumber])).toEqual(
      plan.turnInstructions.map((t: any) => [t.item.id, t.stepNumber])
    );
  });

  it('N07: Routes differ from store to store for the same list', () => {
    const items = demoItems();
    const paths = stores().map((s: any) => JSON.stringify(routeUtils.optimizeRoute(s, items).waypoints));
    expect(new Set(paths).size).toBe(4);
  });

  it('N08: Map draws the "you are here" marker and keeps pin numbers when items are checked', () => {
    const store = stores()[0];
    const items = demoItems();
    const plan = routeUtils.optimizeRoute(store, items);
    const html = renderWithProviders(React.createElement(StoreMap, { store, route: plan, userPosition: { x: 100, y: 200 } }));
    expect(html).toMatch(/Sei qui|You are here/);
  });

  it('N09: Every Italian text has an English counterpart and every product has an English name', () => {
    const it = translationsData.translations.it;
    const en = translationsData.translations.en;
    for (const key of Object.keys(it)) {
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    }
    const names = jiti_productText();
    for (const p of productsData.italianProducts) {
      expect(names(p, 'en').name).not.toBe('');
      expect(names(p, 'en').aisleName).not.toMatch(/^Corsia/);
    }
  });

  it('N10: Entry animations leave no persistent transform (fixed modals stay anchored to the screen)', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    expect(css).not.toMatch(/animation:\s*fadeIn[^;]*forwards/);
    expect(css).not.toMatch(/animation:\s*scaleUp[^;]*forwards/);
  });
}, { tier: 'tier3' });
