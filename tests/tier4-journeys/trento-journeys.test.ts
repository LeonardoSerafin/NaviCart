import { describe, it, expect } from '../helpers/test-framework';
import { parserUtils, storageUtils, storesData, productsData, routeUtils, createShoppingItem } from '../helpers/render-helper';

describe('Tier 4: Real-World Application Scenarios (Trento Supermarkets)', () => {
  it('J01: Complete Weekly Family Shopping Journey at IperPoli · La Cittadella', () => {
    // 1. User arrives at Home and selects IperPoli (450m from center)
    const store = storesData.availableStores.find((s: any) => s.id === 'iperpoli-cittadella');
    expect(store).toBeDefined();
    expect(store.address).toContain('Via Mantova');

    // 2. Selects products across different aisles (Ortofrutta, Latticini, Carne, Forno)
    const selectedProductIds = [
      'prod-mele-melinda',      // Ortofrutta
      'prod-latte-granarolo',    // Latticini (Corsia 2)
      'prod-parmigiano-parmareggio', // Latticini (Corsia 2)
      'prod-prosciutto-parma-citterio', // Carne & Pesce (Banco Freschi)
    ];

    const listItems = selectedProductIds.map(id => createShoppingItem(id));

    const journeyList = {
      id: 'journey-iperpoli-family',
      storeId: store.id,
      storeName: store.name,
      name: 'Spesa Famiglia IperPoli',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: listItems,
    };
    storageUtils.saveLists([journeyList]);

    // 3. Opens Screen 2.1 to generate optimized route
    const route = routeUtils.optimizeRoute(store, journeyList.items);
    expect(route).toBeDefined();
    expect(route.orderedItems.length).toBe(4);
    expect(route.totalDistance).toBeGreaterThan(0);

    // 4. Walks through supermarket following turn-by-turn HUD
    for (let step = 0; step < route.orderedItems.length; step++) {
      journeyList.items[step].checked = true;
    }

    // 5. Verifies 100% completion at Casse
    const checkedRatio = journeyList.items.filter((i: any) => i.checked).length / journeyList.items.length;
    expect(checkedRatio).toBe(1.0);

    const finishedRoute = routeUtils.optimizeRoute(store, journeyList.items);
    expect(finishedRoute.orderedItems.length).toBe(0);
  });

  it('J02: Budget Meal Prep Journey at Lidl · Via Brennero with Assortment Exclusions', () => {
    // 1. User selects Lidl (Via Brennero 134)
    const store = storesData.availableStores.find((s: any) => s.id === 'lidl-brennero');
    expect(store).toBeDefined();
    expect(store.address).toContain('Brennero');

    // 2. User pastes a recipe from WhatsApp containing Barilla and generic ingredients
    const rawRecipe = `- 2 kg Mele Melinda\n- 1 Barilla Spaghetti\n- 2 Latte Mila\n- 1 Nutella Ferrero`;

    // 3. Parser catches brand exclusions (Lidl does not stock Barilla or Nutella)
    const parseResult = parserUtils.parseGroceryTextForStore(rawRecipe, store.id);
    expect(parseResult.unavailableItems.length).toBe(2);
    expect(parseResult.availableItems.length).toBe(2);

    // 4. Single-action alert accepted, creating list with available items
    const mealPrepList = {
      id: 'journey-lidl-mealprep',
      storeId: store.id,
      storeName: store.name,
      name: 'Lidl Meal Prep',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: parseResult.availableItems,
    };
    storageUtils.saveLists([mealPrepList]);

    // 5. In-store navigation in Lidl
    const route = routeUtils.optimizeRoute(store, mealPrepList.items);
    expect(route.orderedItems.length).toBe(2);

    // Pick all
    mealPrepList.items.forEach((i: any) => { i.checked = true; });
    const finalRoute = routeUtils.optimizeRoute(store, mealPrepList.items);
    expect(finalRoute.orderedItems.length).toBe(0);
  });

  it('J03: Express Quick Stop Journey at Conad · Corso 3 Novembre', () => {
    // 1. User searches and selects Conad (Corso 3 Novembre 45)
    const store = storesData.availableStores.find((s: any) => s.id === 'conad-3novembre');
    expect(store).toBeDefined();

    // 2. Fast 2-item dinner purchase: Pasta & Polpa
    const expressItems = [
      createShoppingItem('prod-spaghetti-barilla'),
      createShoppingItem('prod-polpa-mutti'),
    ];

    const expressList = {
      id: 'journey-conad-express',
      storeId: store.id,
      storeName: store.name,
      name: 'Cena Veloce Conad',
      items: expressItems,
    };

    // 3. Route links Entrance -> Corsia -> Casse
    const route = routeUtils.optimizeRoute(store, expressList.items);
    expect(route.orderedItems.length).toBe(2);
    expect(route.turnInstructions.length).toBe(2);

    // Both stops picked quickly
    expressList.items[0].checked = true;
    expressList.items[1].checked = true;
    expect(expressList.items.every((i: any) => i.checked)).toBe(true);
  });

  it('J04: Local KM0 Trentino Specialty Shopping at Poli · Trento Sud', () => {
    // 1. User selects Poli Trento Sud (Via Valnigra 22)
    const store = storesData.availableStores.find((s: any) => s.id === 'poli-trento-sud');
    expect(store).toBeDefined();

    // 2. User filters catalog by "Del Territorio" (KM0 Trentino products)
    const localProducts = productsData.italianProducts.filter((p: any) => p.isLocal);
    expect(localProducts.length).toBeGreaterThan(0);

    // Pick 3 local products
    const specialtyItems = localProducts.slice(0, 3).map((prod: any) => createShoppingItem(prod.id));

    const specialtyList = {
      id: 'journey-poli-km0',
      storeId: store.id,
      storeName: store.name,
      name: 'Prodotti Tipici Trentini',
      items: specialtyItems,
    };

    // 3. Map route calculation for Poli Trento Sud floor plan
    const route = routeUtils.optimizeRoute(store, specialtyList.items);
    expect(route.orderedItems.length).toBe(3);
    expect(route.totalDistance).toBeGreaterThan(0);

    // Complete shopping journey
    specialtyList.items.forEach((i: any) => { i.checked = true; });
    const finalRoute = routeUtils.optimizeRoute(store, specialtyList.items);
    expect(finalRoute.orderedItems.length).toBe(0);
  });
}, { tier: 'tier4' });
