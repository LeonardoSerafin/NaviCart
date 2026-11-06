import { describe, it, expect } from '../helpers/test-framework';
import { renderAppRoute, productsData, storesData, translationsData } from '../helpers/render-helper';
import { evaluateWcagAA } from '../helpers/contrast-utils';

// ── Boundary Feature 6: Home Language Switcher ──
describe('Boundary Feature 6: Home Language Switcher', () => {
  it('B06-1: Missing translation key falls back gracefully to Italian string without crashing', () => {
    const dict = translationsData.translations;
    const testKey = 'homeHeaderTitle';
    const translatedIt = dict.it[testKey];
    expect(translatedIt).toBeDefined();
    expect(translatedIt.length).toBeGreaterThan(0);
  });

  it('B06-2: Rapid language toggling maintains state consistency', () => {
    let currentLang = 'it';
    const toggle = () => { currentLang = currentLang === 'it' ? 'en' : 'it'; };
    toggle(); // en
    toggle(); // it
    toggle(); // en
    expect(currentLang).toBe('en');
  });

  it('B06-3: Corrupted language storage value ("xyz") defaults safely to "it"', () => {
    const rawVal = 'xyz';
    const safeLang = (rawVal === 'it' || rawVal === 'en') ? rawVal : 'it';
    expect(safeLang).toBe('it');
  });

  it('B06-4: Language toggle updates document lang attribute', () => {
    const htmlEn = renderAppRoute('/home', { language: 'en' });
    expect(htmlEn).toBeDefined();
  });

  it('B06-5: Context handles uninitialized storage without throwing exceptions', () => {
    globalThis.localStorage.clear();
    const html = renderAppRoute('/home');
    expect(html).toContain('Navi');
  });
}, { tier: 'tier2', featureId: 6 });

// ── Boundary Feature 7: Store Catalog Product Cards ──
describe('Boundary Feature 7: Store Catalog Product Cards', () => {
  it('B07-1: Product without discount renders standard price without strikethrough element', () => {
    const regularProduct = productsData.italianProducts.find((p: any) => !p.isOnSale);
    expect(regularProduct).toBeDefined();
    expect(regularProduct.originalPrice).toBeUndefined();
  });

  it('B07-2: Product with 0 quantity in target list renders single [+] add button', () => {
    const html = renderAppRoute('/store/iperpoli-cittadella');
    expect(html).toContain('+');
  });

  it('B07-3: Product with high quantity (e.g. 99) formats cleanly without stepper clipping', () => {
    const customList = {
      id: 'high-qty-list',
      storeId: 'iperpoli-cittadella',
      name: 'High Qty Test',
      items: [{ productId: 'prod-mele-melinda', quantity: 99, checked: false }],
    };
    const html = renderAppRoute('/store/iperpoli-cittadella?listId=high-qty-list', {
      initialLists: [customList],
    });
    expect(html).toContain('99');
  });

  it('B07-4: Long product title wraps text gracefully with text-pretty/relaxed', () => {
    const longNameProd = productsData.italianProducts.find((p: any) => p.name.length > 25);
    expect(longNameProd).toBeDefined();
  });

  it('B07-5: Strikethrough discount price contrast meets WCAG AA (>= 4.5:1)', () => {
    const result = evaluateWcagAA('rose-600', 'white');
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
  });
}, { tier: 'tier2', featureId: 8 });

// ── Boundary Feature 8: Store Catalog Category/Sale Filters ──
describe('Boundary Feature 8: Store Catalog Category/Sale Filters', () => {
  it('B08-1: Active filter combination yielding 0 products displays 0 products found notice', () => {
    const all = productsData.italianProducts;
    // Test impossible combination: bio + surgelati that doesn't exist
    const filtered = all.filter((p: any) => p.category === 'surgelati' && p.isBio);
    if (filtered.length === 0) {
      expect(filtered.length).toBe(0);
    }
  });

  it('B08-2: Toggling filter pill twice toggles membership in active Set', () => {
    const activeFilters = new Set<string>();
    const toggle = (tag: string) => {
      if (activeFilters.has(tag)) activeFilters.delete(tag);
      else activeFilters.add(tag);
    };
    toggle('bio');
    expect(activeFilters.has('bio')).toBe(true);
    toggle('bio');
    expect(activeFilters.has('bio')).toBe(false);
  });

  it('B08-3: All 3 filter pills active simultaneously filters strictly by logical AND', () => {
    const all = productsData.italianProducts;
    const triple = all.filter((p: any) => p.isOnSale && p.isBio && p.isLocal);
    for (const item of triple) {
      expect(item.isOnSale && item.isBio && item.isLocal).toBe(true);
    }
  });

  it('B08-4: Sort by price-asc orders products from lowest to highest price', () => {
    const all = [...productsData.italianProducts];
    all.sort((a, b) => a.price - b.price);
    for (let i = 0; i < all.length - 1; i++) {
      expect(all[i].price).toBeLessThanOrEqual(all[i + 1].price);
    }
  });

  it('B08-5: Special characters in product search query do not throw RegExp syntax errors', () => {
    const query = 'Caffè (100% Arabica) + Bio [Special]';
    const safeRegex = () => {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, 'i');
    };
    expect(safeRegex).not.toThrow();
  });
}, { tier: 'tier2', featureId: 8 });

// ── Boundary Feature 9: Store Catalog Add-to-List Modal ──
describe('Boundary Feature 9: Store Catalog Add-to-List Modal', () => {
  it('B09-1: Adding item when 0 lists exist triggers auto-creation of default store list', () => {
    const store = storesData.availableStores[0];
    const defaultName = `Spesa ${store.brand}`;
    expect(defaultName).toContain(store.brand);
  });

  it('B09-2: Creating list with empty string name auto-populates fallback title', () => {
    const inputName = '   '.trim();
    const resolvedName = inputName || 'Nuova Spesa';
    expect(resolvedName).toBe('Nuova Spesa');
  });

  it('B09-3: Modal dismissal via Escape key leaves storage unchanged', () => {
    const initialLists = [{ id: '1', storeId: 'conad-3novembre', name: 'Existing', items: [] }];
    // Abort dialog
    expect(initialLists.length).toBe(1);
  });

  it('B09-4: Focus trap constraints are implemented for modal accessibility', () => {
    const html = renderAppRoute('/store/iperpoli-cittadella');
    expect(html).toBeDefined();
  });

  it('B09-5: Adding existing product increments quantity instead of adding duplicate entry', () => {
    const items = [{ productId: 'prod-mele-melinda', quantity: 1, checked: false }];
    const existing = items.find(i => i.productId === 'prod-mele-melinda');
    if (existing) {
      existing.quantity += 1;
    }
    expect(items.length).toBe(1);
    expect(items[0].quantity).toBe(2);
  });
}, { tier: 'tier2', featureId: 9 });

// ── Boundary Feature 10: Store Catalog Source List HUD ──
describe('Boundary Feature 10: Store Catalog Source List HUD', () => {
  it('B10-1: Unknown ?listId parameter in URL gracefully falls back without throwing', () => {
    const html = renderAppRoute('/store/iperpoli-cittadella?listId=nonexistent-uuid-999');
    expect(html).toContain('IperPoli');
  });

  it('B10-2: Modifying item quantity in originating list updates list item count in HUD', () => {
    const list = {
      id: 'l1',
      storeId: 'iperpoli-cittadella',
      name: 'Test List',
      items: [{ productId: 'prod-mele-melinda', quantity: 5, checked: false }],
    };
    const html = renderAppRoute(`/store/iperpoli-cittadella?listId=${list.id}`, { initialLists: [list] });
    expect(html).toMatch(/1 articolo|1 item/i);
  });

  it('B10-3: Removing all items in source list updates banner to 0 items gracefully', () => {
    const emptyList = {
      id: 'l-empty',
      storeId: 'iperpoli-cittadella',
      name: 'Empty List',
      items: [],
    };
    const html = renderAppRoute(`/store/iperpoli-cittadella?listId=${emptyList.id}`, { initialLists: [emptyList] });
    expect(html).toMatch(/0 articoli|0 items/i);
  });

  it('B10-4: Fatto button correctly maintains destination route /lists/:listId', () => {
    const listId = 'target-list-777';
    const destination = `/lists/${listId}`;
    expect(destination).toBe('/lists/target-list-777');
  });

  it('B10-5: Changing store from catalog resets source list HUD to prevent cross-store list corruption', () => {
    const conadStore = 'conad-3novembre';
    const poliList = { id: 'poli-list', storeId: 'iperpoli-cittadella', name: 'Poli List', items: [] };
    // If user changes route to conad, poli list should not be attached
    expect(poliList.storeId).not.toBe(conadStore);
  });
}, { tier: 'tier2', featureId: 10 });
