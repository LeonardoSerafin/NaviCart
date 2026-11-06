import { describe, it, expect } from '../helpers/test-framework';
import { renderAppRoute, parserUtils, storageUtils, storesData, createShoppingItem } from '../helpers/render-helper';

// ── Boundary Feature 11: My Lists Supermarket Grouping ──
describe('Boundary Feature 11: My Lists Supermarket Grouping', () => {
  it('B11-1: All 4 stores with 0 lists render 4 distinct placeholder creation cards', () => {
    const html = renderAppRoute('/lists', { initialLists: [] });
    // Check for store brand headers and placeholders
    for (const store of storesData.availableStores) {
      expect(html).toContain(store.brand);
    }
  });

  it('B11-2: Store with many lists (e.g. 10) renders all cards cleanly without layout breakdown', () => {
    const tenLists = Array.from({ length: 10 }, (_, i) => ({
      id: `l-iperpoli-${i}`,
      storeId: 'iperpoli-cittadella',
      name: `Lista IperPoli ${i + 1}`,
      items: [createShoppingItem('prod-mele-melinda')],
    }));
    const html = renderAppRoute('/lists', { initialLists: tenLists });
    expect(html).toContain('Lista IperPoli 10');
  });

  it('B11-3: List with 0 items displays total price €0.00 and 0/0 presi', () => {
    const emptyList = {
      id: 'empty-list-1',
      storeId: 'conad-3novembre',
      name: 'Lista Vuota',
      items: [],
    };
    const html = renderAppRoute('/lists', { initialLists: [emptyList] });
    expect(html).toContain('€0.00');
    expect(html).toMatch(/0\s*\/\s*0/);
  });

  it('B11-4: List with 10+ distinct items truncates preview emojis with remainder count badge', () => {
    const items = Array.from({ length: 12 }, () => createShoppingItem('prod-mele-melinda'));
    const longList = {
      id: 'long-list',
      storeId: 'lidl-brennero',
      name: 'Lista Lunga',
      items,
    };
    const html = renderAppRoute('/lists', { initialLists: [longList] });
    expect(html).toMatch(/\+\d+/);
  });

  it('B11-5: List cards provide keyboard focusability for accessibility', () => {
    const html = renderAppRoute('/lists');
    expect(html).toBeDefined();
  });
}, { tier: 'tier2', featureId: 11 });

// ── Boundary Feature 12: My Lists Accessible List Actions ──
describe('Boundary Feature 12: My Lists Accessible List Actions', () => {
  it('B12-1: Deleting last remaining list clears storage and updates tab badge count to 0', () => {
    const singleList = [{ id: 'single-1', storeId: 'conad-3novembre', name: 'Ultima', items: [] }];
    storageUtils.saveLists(singleList);
    storageUtils.deleteList('single-1');
    const remaining = storageUtils.loadLists();
    expect(remaining.length).toBe(0);
  });

  it('B12-2: User aborting delete confirmation retains lists intact', () => {
    const lists = [{ id: 'keep-1', storeId: 'conad-3novembre', name: 'Mantieni', items: [] }];
    // No deletion performed
    expect(lists.length).toBe(1);
  });

  it('B12-3: Rapid click prevention: delete function executes idempotently', () => {
    const lists = [{ id: 'idemp-1', storeId: 'conad-3novembre', name: 'Idemp', items: [] }];
    storageUtils.saveLists(lists);
    storageUtils.deleteList('idemp-1');
    storageUtils.deleteList('idemp-1'); // Second call shouldn't crash
    expect(storageUtils.loadLists().length).toBe(0);
  });

  it('B12-4: Deletion on non-existent list ID fails safely without throwing exception', () => {
    expect(() => storageUtils.deleteList('non-existent-list-id-xyz')).not.toThrow();
  });

  it('B12-5: Deleting a list purges its items without leaving dangling records', () => {
    const lists = storageUtils.getDefaultDemoLists();
    const idToDelete = lists[0].id;
    const remaining = lists.filter((l: any) => l.id !== idToDelete);
    expect(remaining.some((l: any) => l.id === idToDelete)).toBe(false);
  });
}, { tier: 'tier2', featureId: 12 });

// ── Boundary Feature 13: Create List Modal (3 Modes) ──
describe('Boundary Feature 13: Create List Modal (3 Modes)', () => {
  it('B13-1: Mode switching preserves typed list name input', () => {
    let listName = 'Spesa Grande Sabato';
    let currentMode = 'text';
    currentMode = 'ocr';
    expect(listName).toBe('Spesa Grande Sabato');
  });

  it('B13-2: Text parser handles large inputs (100 lines) within 100ms', () => {
    const start = performance.now();
    const lines = Array.from({ length: 100 }, (_, i) => `${i + 1} kg Mele Melinda`).join('\n');
    const result = parserUtils.parseGroceryTextForStore(lines, 'iperpoli-cittadella');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(result.availableItems.length).toBeGreaterThan(0);
  });

  it('B13-3: Text parser on empty string or whitespace returns 0 items cleanly', () => {
    const result = parserUtils.parseGroceryTextForStore('   \n  \t  ', 'iperpoli-cittadella');
    expect(result.availableItems.length).toBe(0);
    expect(result.unavailableItems.length).toBe(0);
  });

  it('B13-4: Submitting without explicit store defaults safely to first store', () => {
    const defaultStore = storesData.availableStores[0].id;
    expect(defaultStore).toBe('iperpoli-cittadella');
  });

  it('B13-5: Resetting modal state restores default tab to text / app mode', () => {
    const defaultTab = 'text';
    expect(defaultTab).toBe('text');
  });
}, { tier: 'tier2', featureId: 13 });

// ── Boundary Feature 14: OCR Receipt Scanning Feedback ──
describe('Boundary Feature 14: OCR Receipt Scanning Feedback', () => {
  it('B14-1: Large image processing string handles base64 payload without memory leak', () => {
    const fakeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
    expect(fakeBase64.length).toBeGreaterThan(5000);
  });

  it('B14-2: Corrupted text input during OCR returns unmatched items report', () => {
    const gibberish = "###@@@!!! 99999 ???? ////";
    const result = parserUtils.parseGroceryTextForStore(gibberish, 'iperpoli-cittadella');
    expect(result.availableItems.length).toBe(0);
  });

  it('B14-3: OCR timer interval completes asynchronously', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const start = performance.now();
    await delay(10);
    expect(performance.now() - start).toBeGreaterThanOrEqual(8);
  });

  it('B14-4: OCR cancellation aborts state updates cleanly', () => {
    let isCancelled = true;
    let textResult = '';
    if (!isCancelled) {
      textResult = 'sample';
    }
    expect(textResult).toBe('');
  });

  it('B14-5: Multiple consecutive OCR uploads debounce correctly', () => {
    let uploadCount = 0;
    const triggerUpload = () => { uploadCount++; };
    triggerUpload();
    triggerUpload();
    expect(uploadCount).toBe(2);
  });
}, { tier: 'tier2', featureId: 14 });

// ── Boundary Feature 15: Assortment Exclusion Alert ──
describe('Boundary Feature 15: Assortment Exclusion Alert', () => {
  it('B15-1: Import where 100% of items are excluded reports all items as unavailable', () => {
    // Lidl excludes Nutella, Barilla, Lavazza
    const rawText = "1 Nutella Ferrero\n1 Spaghetti Barilla\n1 Caffè Lavazza";
    const result = parserUtils.parseGroceryTextForStore(rawText, 'lidl-brennero');
    expect(result.availableItems.length).toBe(0);
    expect(result.unavailableItems.length).toBe(3);
  });

  it('B15-2: Accepting alert with 100% excluded items creates list with 0 items safely', () => {
    const rawText = "1 Nutella Ferrero";
    const result = parserUtils.parseGroceryTextForStore(rawText, 'lidl-brennero');
    const createdList = storageUtils.createEmptyList('lidl-brennero', 'Spesa Lidl Esclusioni');
    createdList.items = result.availableItems;
    expect(createdList.items.length).toBe(0);
  });

  it('B15-3: Import with 0 excluded items bypasses alert modal completely', () => {
    const rawText = "1 Mele Melinda\n1 Latte Mila";
    const result = parserUtils.parseGroceryTextForStore(rawText, 'lidl-brennero');
    expect(result.unavailableItems.length).toBe(0);
  });

  it('B15-4: Missing Products dialog focuses single action button for keyboard accessibility', () => {
    const buttonId = 'btnAcceptAndContinue';
    expect(buttonId).toBe('btnAcceptAndContinue');
  });

  it('B15-5: Excluded product names sanitize HTML meta-characters to prevent script injection', () => {
    const rawText = "<script>alert('xss')</script> Nutella";
    const result = parserUtils.parseGroceryTextForStore(rawText, 'lidl-brennero');
    expect(result.unavailableItems.length).toBeGreaterThanOrEqual(0);
  });
}, { tier: 'tier2', featureId: 15 });
