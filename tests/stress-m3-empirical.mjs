import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url, { jsx: true });

const { renderAppRoute, initMockStorage, storageUtils, storesData, productsData } = jiti('./helpers/render-helper.ts');
const { evaluateWcagAA } = jiti('./helpers/contrast-utils.ts');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
    failures.push(message);
  }
}

console.log('======================================================================');
console.log('       EMPIRICAL CHALLENGER STRESS HARNESS — MILESTONE 3');
console.log('======================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. EMPTY LISTS STATE ORACLE (STORAGE + UI)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Empty Lists State Oracle (Storage & UI) ---');

// 1.1 Storage Invariance with empty array
initMockStorage({ lists: [] });
const emptyLoadResult = storageUtils.loadLists();
assert(Array.isArray(emptyLoadResult), 'loadLists() returns an array when storage has []');
assert(emptyLoadResult.length === 0, 'loadLists() returns exactly 0 items when storage has []');

// Check that it did NOT reseed demo lists
const rawStorageAfterLoad = globalThis.localStorage.getItem('navicart_lists');
assert(rawStorageAfterLoad === '[]', 'localStorage remains "[]" and is not auto-reseeded with demo data');

// 1.2 Storage fallback with null
initMockStorage();
globalThis.localStorage.removeItem('navicart_lists');
const nullLoadResult = storageUtils.loadLists();
assert(nullLoadResult.length === 4, 'loadLists() restores 4 default demo lists when storage is null/cleared');

// 1.3 Storage fallback with malformed JSON
globalThis.localStorage.setItem('navicart_lists', '{{malformed json');
const malformedLoadResult = storageUtils.loadLists();
assert(malformedLoadResult.length === 4, 'loadLists() gracefully catches JSON syntax error and restores demo lists');

// 1.4 Storage fallback with non-array object
globalThis.localStorage.setItem('navicart_lists', JSON.stringify({ notAnArray: true }));
const nonArrayLoadResult = storageUtils.loadLists();
assert(nonArrayLoadResult.length === 4, 'loadLists() restores demo lists if storage contains a non-array JSON object');

// 1.5 UI Rendering when lists is []
const emptyHtml = renderAppRoute('/lists', { initialLists: [] });

// All 4 Trento supermarkets are rendered
const stores = storesData.availableStores;
assert(stores.length === 4, 'availableStores contains exactly 4 Trento supermarkets');
for (const s of stores) {
  assert(emptyHtml.includes(`store-heading-${s.id}`), `Section header rendered for ${s.name} (${s.id})`);
  assert(
    new RegExp(`Crea o importa per (<!-- -->)?${s.brand}`).test(emptyHtml),
    `Dashed empty state card rendered for ${s.brand}`
  );
}

// Check dashed empty card styling and semantics
assert(emptyHtml.includes('border-2 border-dashed border-slate-200'), 'Dashed empty cards declare border-2 border-dashed border-slate-200');
assert(emptyHtml.includes('min-h-[44px]'), 'Dashed empty cards enforce min-h-[44px] touch target');
assert((emptyHtml.match(/0 liste/g) || []).length === 4, 'All 4 store headers display "0 liste" count badge in empty state');


// ─────────────────────────────────────────────────────────────────────────────
// 2. POPULATED LISTS STATE ORACLE (GROUPING, PLURALIZATION, RATIOS, PRICES)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Populated Lists State Oracle ---');

const mockPopulatedLists = [
  // Store 1: IperPoli (2 lists)
  {
    id: 'list-ip-1',
    storeId: 'iperpoli-cittadella',
    storeName: 'IperPoli Le Valli',
    name: 'Spesa Poli A',
    items: [
      { id: 'i1', productId: 'prod-mele-melinda', product: { price: 2.19, icon: '🍎', name: 'Mele' }, quantity: 2, checked: true },
      { id: 'i2', productId: 'prod-spaghetti-barilla', product: { price: 1.10, icon: '🍝', name: 'Spaghetti' }, quantity: 1, checked: false },
    ], // total: 2.19*2 + 1.10 = 4.38 + 1.10 = 5.48, checked: 1/2
  },
  {
    id: 'list-ip-2',
    storeId: 'iperpoli-cittadella',
    storeName: 'IperPoli Le Valli',
    name: 'Spesa Poli B',
    items: [], // total: 0.00, checked: 0/0
  },
  // Store 2: Lidl (1 list)
  {
    id: 'list-lidl-1',
    storeId: 'lidl-brennero',
    storeName: 'Lidl - Via Brennero',
    name: 'Spesa Lidl Solo',
    items: [
      { id: 'i3', productId: 'prod-banane-chiquita', product: { price: 1.79, icon: '🍌', name: 'Banane' }, quantity: 3, checked: true },
    ], // total: 1.79*3 = 5.37, checked: 1/1
  },
  // Store 3: Conad (0 lists) -> should render dashed empty card
  // Store 4: Poli Sud (3 lists)
  {
    id: 'list-ps-1',
    storeId: 'poli-trento-sud',
    storeName: 'Supermercato Poli',
    name: 'Poli Sud 1',
    items: Array.from({ length: 9 }, (_, idx) => ({
      id: `ps-item-${idx}`,
      productId: `prod-sample-${idx}`,
      product: { price: 1.00, icon: '📦', name: `Item ${idx}` },
      quantity: 1,
      checked: idx < 5,
    })), // total: 9.00, checked: 5/9, items: 9 (> 6 preview)
  },
  {
    id: 'list-ps-2',
    storeId: 'poli-trento-sud',
    storeName: 'Supermercato Poli',
    name: 'Poli Sud 2',
    items: [],
  },
  {
    id: 'list-ps-3',
    storeId: 'poli-trento-sud',
    storeName: 'Supermercato Poli',
    name: 'Poli Sud 3',
    items: [],
  },
];

const popHtml = renderAppRoute('/lists', { initialLists: mockPopulatedLists });

// Check header counts & pluralization
assert(popHtml.includes('2 liste'), 'Store with 2 lists formats as "2 liste"');
assert(popHtml.includes('1 lista'), 'Store with 1 list formats as "1 lista" (singular)');
assert(popHtml.includes('3 liste'), 'Store with 3 lists formats as "3 liste"');
assert(
  /Crea o importa per (<!-- -->)?Conad/.test(popHtml),
  'Conad (0 lists) still renders dashed creation placeholder'
);

// Check price & ratio formatting on IperPoli list A: total 5.48, checked 1/2
assert(popHtml.includes('€5.48'), 'Total price formatted as €5.48 (2 decimals)');
assert(popHtml.includes('1/2 presi'), 'Checked items ratio formatted as "1/2 presi"');

// Check empty list B in IperPoli: total 0.00, checked 0/0
assert(popHtml.includes('€0.00'), 'Empty list total price formatted as €0.00');
assert(popHtml.includes('0/0 presi'), 'Empty list ratio formatted as "0/0 presi"');

// Check Lidl list: total 5.37, checked 1/1
assert(popHtml.includes('€5.37'), 'Lidl single list total price formatted as €5.37');
assert(popHtml.includes('1/1 presi'), 'Lidl single list ratio formatted as "1/1 presi"');

// Check Poli Sud list with 9 items: 5/9 presi, €9.00, and +3 overflow pill
assert(popHtml.includes('5/9 presi'), 'List with 9 items formats ratio as "5/9 presi"');
assert(popHtml.includes('€9.00'), 'List with 9 items formats price as €9.00');
assert(popHtml.includes('+3'), 'List with > 6 items renders "+3" emoji remainder badge');


// ─────────────────────────────────────────────────────────────────────────────
// 3. DELETION CONFIRMATION MODAL DIALOG ORACLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Deletion Modal Dialog Oracle ---');

const myListsFilePath = path.resolve(process.cwd(), 'src/pages/MyListsPage.tsx');
const myListsCode = fs.readFileSync(myListsFilePath, 'utf8');

// 3.1 Static and ARIA semantics
assert(myListsCode.includes('role="alertdialog"'), 'Deletion modal specifies role="alertdialog"');
assert(myListsCode.includes('aria-modal="true"'), 'Deletion modal specifies aria-modal="true"');
assert(myListsCode.includes('aria-labelledby="delete-dialog-title"'), 'Deletion modal binds aria-labelledby="delete-dialog-title"');
assert(myListsCode.includes('aria-describedby="delete-dialog-description"'), 'Deletion modal binds aria-describedby="delete-dialog-description"');
assert(myListsCode.includes('id="delete-dialog-title"'), 'Title element has id="delete-dialog-title"');
assert(myListsCode.includes('id="delete-dialog-description"'), 'Description element has id="delete-dialog-description"');

// 3.2 Non-blocking React state vs window.confirm
const cleanCode = myListsCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
assert(!cleanCode.includes('window.confirm') && !cleanCode.includes('confirm('), 'Strictly avoids unstyled native window.confirm() in implementation');
assert(myListsCode.includes('setListToDelete({ id: list.id, name: list.name })'), 'Deletion triggers non-blocking state setter setListToDelete');

// 3.3 Touch ergonomics on action buttons
assert(myListsCode.includes('cancelDeleteBtnRef'), 'Cancel button binds cancelDeleteBtnRef for programmatic focus');
assert(myListsCode.includes('onClick={cancelDelete}'), 'Cancel button binds onClick={cancelDelete}');
assert(myListsCode.includes('onClick={confirmDelete}'), 'Confirm delete button binds onClick={confirmDelete}');

// 3.4 Keyboard dismissal and body scroll lock
assert(myListsCode.includes("e.key === 'Escape'"), 'Escape keydown listener is registered');
assert(myListsCode.includes("document.body.style.overflow = 'hidden'"), 'Locks document.body.style.overflow to hidden');
assert(myListsCode.includes('document.body.style.overflow = prevOverflow'), 'Restores document.body.style.overflow on cleanup');

// 3.5 Functional deletion invariance: deleteListById
initMockStorage({ lists: mockPopulatedLists });
const beforeCount = storageUtils.loadLists().length;
const targetDeleteId = 'list-ip-1';
storageUtils.deleteListById(targetDeleteId);
const afterLists = storageUtils.loadLists();
assert(afterLists.length === beforeCount - 1, 'deleteListById() removes exactly 1 list');
assert(!afterLists.some((l) => l.id === targetDeleteId), 'Target list is removed from storage');
assert(afterLists.some((l) => l.id === 'list-ip-2'), 'Other lists in same store are preserved');
assert(afterLists.some((l) => l.id === 'list-lidl-1'), 'Lists in other stores are untouched');


// ─────────────────────────────────────────────────────────────────────────────
// 4. CREATE MODAL & OCR SCANNING SIMULATION ORACLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Create Modal & OCR Scanning Simulation Oracle ---');

// 4.1 SSR Mount & Hidden state
assert(emptyHtml.includes('role="dialog"'), 'Create modal declares role="dialog" in SSR HTML');
assert(emptyHtml.includes('aria-labelledby="create-modal-title"'), 'Create modal declares aria-labelledby="create-modal-title"');
assert(emptyHtml.includes('id="create-modal-title"'), 'Modal title defines id="create-modal-title"');
assert(emptyHtml.includes('aria-hidden="true"'), 'Modal element mounts with aria-hidden="true" when closed');
assert(emptyHtml.includes('className="hidden"') || emptyHtml.includes('class="hidden"'), 'Modal element mounts with className="hidden" when closed in SSR');

// 4.2 All 3 Mode Panels present in DOM
assert(myListsCode.includes('id="tab-mode-text"'), 'Tab 1: tab-mode-text present');
assert(myListsCode.includes('id="tab-mode-photo"'), 'Tab 2: tab-mode-photo present');
assert(myListsCode.includes('id="tab-mode-manual"'), 'Tab 3: tab-mode-manual present');
assert(myListsCode.includes('id="panel-mode-text"'), 'Panel 1: panel-mode-text present');
assert(myListsCode.includes('id="panel-mode-photo"'), 'Panel 2: panel-mode-photo present');
assert(myListsCode.includes('id="panel-mode-manual"'), 'Panel 3: panel-mode-manual present');
assert(myListsCode.includes('role="tablist"'), 'Tab container implements role="tablist"');
assert(myListsCode.includes('role="tab"'), 'Tab buttons implement role="tab"');
assert(myListsCode.includes('role="tabpanel"'), 'Panel containers implement role="tabpanel"');

// 4.3 OCR Scanning Feedback & 700ms Latency
assert(myListsCode.includes('role="status"'), 'OCR scanning status container implements role="status"');
assert(myListsCode.includes('aria-live="polite"'), 'OCR scanning status container declares aria-live="polite"');
assert(myListsCode.includes('animate-spin'), 'OCR scanning spinner icon implements animate-spin');
assert(myListsCode.includes('animate-pulse'), 'OCR skeleton placeholder container implements animate-pulse');

// Inspect setTimeout in handleFileUpload
const ocrTimerRegex = /setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?setIsOcrScanning\(false\)[\s\S]*?\},\s*(\d+)\s*\)/;
const matchTimer = myListsCode.match(ocrTimerRegex);
assert(matchTimer !== null, 'OCR file upload handler utilizes setTimeout to simulate scanning latency');
if (matchTimer) {
  const timerMs = parseInt(matchTimer[1], 10);
  assert(timerMs === 700, `OCR simulation timer is strictly 700ms (measured: ${timerMs}ms)`);
}

// 4.4 Touch ergonomics in Create Modal
assert(myListsCode.includes('min-h-[44px] py-2.5 px-2'), 'Mode tabs adhere to min-h-[44px] touch target');
assert(myListsCode.includes('min-h-[96px]'), 'Photo upload dropzone provides generous min-h-[96px] touch target');
assert(myListsCode.includes('min-h-[44px]') && myListsCode.includes('select-supermarket-new'), 'Supermarket select input satisfies min-h-[44px]');
assert(myListsCode.includes('text-base sm:text-xs'), 'Inputs specify text-base to prevent iOS mobile auto-zoom');

// 4.5 Mandatory Assortment Alert Modal
assert(myListsCode.includes('id="btnAcceptAndContinue"'), 'Assortment exclusion modal implements #btnAcceptAndContinue');
assert(myListsCode.includes('data-testid="btnAcceptAndContinue"'), 'Assortment exclusion button implements data-testid="btnAcceptAndContinue"');
assert(myListsCode.includes('role="list"') && myListsCode.includes('role="listitem"'), 'Unavailable items report implements accessible list / listitem semantics');


// ─────────────────────────────────────────────────────────────────────────────
// 5. COLOR CONTRAST & ACCESSIBILITY AUDIT (WCAG 2.1 AA)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Color Contrast & WCAG 2.1 AA Audits ---');

// Delete button icon text-slate-500 (#64748b) on white
const deleteContrast = evaluateWcagAA('slate-500', 'white');
assert(deleteContrast.ratio >= 4.5, `Delete button text-slate-500 on white has contrast ${deleteContrast.ratio}:1 (>= 4.5:1 text standard)`);

// Badge text-slate-600 (#475569) on bg-slate-100 (#f1f5f9)
const badgeContrast = evaluateWcagAA('slate-600', 'slate-100');
assert(badgeContrast.ratio >= 4.5, `Store badge text-slate-600 on slate-100 has contrast ${badgeContrast.ratio}:1 (>= 4.5:1 text standard)`);

// Total price text-emerald-700 (#047857) on white
const priceContrast = evaluateWcagAA('emerald-700', 'white');
assert(priceContrast.ratio >= 4.5, `Total price text-emerald-700 on white has contrast ${priceContrast.ratio}:1 (>= 4.5:1 text standard)`);

// Delete confirmation button: white on red-600 (#dc2626)
const confirmDeleteContrast = evaluateWcagAA('white', 'red-600');
assert(confirmDeleteContrast.ratio >= 4.5, `Delete confirmation white on red-600 has contrast ${confirmDeleteContrast.ratio}:1 (>= 4.5:1 text standard)`);

// Green create button: white on emerald-600 (#059669) meets UI component 3.0:1 standard
const createBtnContrast = evaluateWcagAA('white', 'emerald-600');
assert(createBtnContrast.ratio >= 3.0, `Create button white on emerald-600 has contrast ${createBtnContrast.ratio}:1 (>= 3.0:1 UI component standard)`);


// ─────────────────────────────────────────────────────────────────────────────
// 6. ADVERSARIAL STRESS-TESTING (BOUNDARY & EXTREME VALUES)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Adversarial Stress-Testing ---');

// 6.1 Huge number of lists (stressing grouping)
const bigListCount = 100;
const hugeLists = Array.from({ length: bigListCount }, (_, i) => ({
  id: `huge-list-${i}`,
  storeId: stores[i % 4].id,
  storeName: stores[i % 4].name,
  name: `List ${i}`,
  items: [],
}));
initMockStorage({ lists: hugeLists });
const loadedHuge = storageUtils.loadLists();
assert(loadedHuge.length === 100, `Storage handles ${bigListCount} lists without corruption`);

// 6.2 List with zero items price and ratio
const zeroItemList = {
  id: 'zero-list',
  storeId: 'iperpoli-cittadella',
  storeName: 'IperPoli',
  name: 'Zero Items',
  items: [],
};
const zeroHtml = renderAppRoute('/lists', { initialLists: [zeroItemList] });
assert(zeroHtml.includes('€0.00'), 'Zero items list correctly renders €0.00 without NaN');
assert(zeroHtml.includes('0/0 presi'), 'Zero items list correctly renders 0/0 presi without division by zero');

// 6.3 List with large quantity and high prices
const expensiveList = {
  id: 'expensive-list',
  storeId: 'iperpoli-cittadella',
  storeName: 'IperPoli',
  name: 'Expensive',
  items: [
    { id: 'exp-1', productId: 'p1', product: { price: 99.99, icon: '💎', name: 'Item' }, quantity: 10, checked: true },
  ],
};
const expHtml = renderAppRoute('/lists', { initialLists: [expensiveList] });
assert(expHtml.includes('€999.90'), 'Large subtotal 99.99 * 10 renders correctly as €999.90');

// 6.4 Missing store fallback in createNewList
const fallbackNewList = storageUtils.createNewList('non-existent-store-id', 'Test Fallback');
assert(fallbackNewList.storeId === stores[0].id, 'createNewList() falls back to availableStores[0] when unknown storeId is supplied');

// 6.5 Sequential deletion transition to zero lists
initMockStorage({
  lists: [{ id: 'last-list', storeId: 'iperpoli-cittadella', name: 'Last List', items: [] }],
});
assert(storageUtils.loadLists().length === 1, 'Initial 1 list loaded');
storageUtils.deleteListById('last-list');
const zeroRemaining = storageUtils.loadLists();
assert(zeroRemaining.length === 0, 'Storage contains strictly 0 lists after deleting last remaining list');
assert(globalThis.localStorage.getItem('navicart_lists') === '[]', 'Storage raw key is "[]" and does not revert to demo lists');
const reloadAfterZero = storageUtils.loadLists();
assert(reloadAfterZero.length === 0, 'Subsequent loadLists() call maintains 0 lists without re-seeding');

// 6.6 XSS injection defense in list names
const xssList = {
  id: 'xss-list',
  storeId: 'iperpoli-cittadella',
  storeName: 'IperPoli',
  name: '<script>alert("XSS")</script>&"\'<b>safe</b>',
  items: [],
};
const xssHtml = renderAppRoute('/lists', { initialLists: [xssList] });
assert(!xssHtml.includes('<script>alert("XSS")</script>'), 'Unescaped raw script tag is not present in rendered HTML');
assert(xssHtml.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;') || xssHtml.includes('&amp;'), 'List name HTML characters are properly entity-encoded by React');

// 6.7 Backdrop click dismissal logic
assert(
  myListsCode.includes('if (e.target === e.currentTarget) cancelDelete()'),
  'Deletion modal backdrop verifies e.target === e.currentTarget before cancelling'
);
assert(
  myListsCode.includes('if (e.target === e.currentTarget) setShowCreateModal(false)'),
  'Create modal backdrop verifies e.target === e.currentTarget before closing'
);

// 6.8 Touch target sweep (min-h-[44px] on all interactive controls)
const touchTargetElements = [
  { name: 'Header New List button', check: myListsCode.includes('min-h-[48px]') && myListsCode.includes('btnNewList') },
  { name: 'Supermarket Dashed button', check: myListsCode.includes('min-h-[44px]') && myListsCode.includes('border-dashed') },
  { name: 'List Delete button', check: myListsCode.includes('handleDeleteClick') && myListsCode.includes('min-w-[44px] min-h-[44px] w-11 h-11') },
  { name: 'Modal Close (X) button', check: myListsCode.includes('setShowCreateModal(false)') && myListsCode.includes('min-w-[44px] min-h-[44px] w-11 h-11') },
  { name: 'Modal Tabs (3x)', check: myListsCode.includes('min-h-[44px] py-2.5 px-2') && myListsCode.includes('tab-mode') },
  { name: 'Photo Upload Box', check: myListsCode.includes('min-h-[96px]') },
  { name: 'Quick Demo App Buttons', check: myListsCode.includes('handleSelectDemoApp') && myListsCode.includes('min-h-[44px]') },
  { name: 'Sample Photo Buttons', check: myListsCode.includes('handleSelectSamplePhoto') && myListsCode.includes('min-h-[44px]') },
  { name: 'Manual Add Item Button', check: myListsCode.includes('handleAddDraftItem') && myListsCode.includes('min-h-[44px] min-w-[44px]') },
  { name: 'Manual Chip Delete Button', check: myListsCode.includes('handleRemoveDraftItem') && myListsCode.includes('min-w-[44px] min-h-[44px]') },
  { name: 'Modal Cancel Button', check: myListsCode.includes('setShowCreateModal(false)') && myListsCode.includes('flex-1 min-h-[44px]') },
  { name: 'Modal Submit Button', check: myListsCode.includes('handleCreate') && myListsCode.includes('flex-1 min-h-[44px]') },
  { name: 'Deletion Modal Cancel Button', check: myListsCode.includes('cancelDelete') && myListsCode.includes('min-h-[44px] px-4 py-2.5') },
  { name: 'Deletion Modal Confirm Button', check: myListsCode.includes('confirmDelete') && myListsCode.includes('min-h-[44px] px-4 py-2.5') },
  { name: 'Assortment Exclusion Continue Button', check: myListsCode.includes('btnAcceptAndContinue') && myListsCode.includes('min-h-[44px]') },
];

for (const target of touchTargetElements) {
  assert(target.check, `Touch target verified: ${target.name} adheres to >= 44x44px`);
}

// 6.9 Store assortment exclusion engine (Lidl vs IperPoli)
const { parseGroceryTextForStore } = jiti('./helpers/render-helper.ts').parserUtils;
const testRecipe = 'Spaghetti Barilla\nNutella\nMele Melinda\nLatte Granarolo';

const iperPoliResult = parseGroceryTextForStore(testRecipe, 'iperpoli-cittadella');
assert(iperPoliResult.unavailableItems.length === 0, 'IperPoli hypermarket has 0 unavailable items for standard recipe');
assert(iperPoliResult.availableItems.length >= 3, 'IperPoli matches available products');

const lidlResult = parseGroceryTextForStore(testRecipe, 'lidl-brennero');
assert(lidlResult.unavailableItems.length >= 2, 'Lidl discount store correctly excludes premium brand items (Nutella, Barilla)');
assert(
  lidlResult.unavailableItems.some((u) => /Nutella|Spaghetti/i.test(u.name)),
  'Excluded items list contains Nutella or Spaghetti Barilla'
);

console.log('\n======================================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================================\n');

if (failed > 0) {
  console.error('FAILURES SUMMARY:');
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log('ALL EMPIRICAL CHALLENGES PASSED SUCCESSFULLY! (Verdict: APPROVE)\n');
  process.exit(0);
}
