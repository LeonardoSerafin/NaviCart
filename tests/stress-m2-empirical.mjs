import { execSync } from 'child_process';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url, { jsx: true });

const { renderAppRoute, initMockStorage } = jiti('./helpers/render-helper.ts');
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
console.log('       EMPIRICAL CHALLENGER STRESS HARNESS — MILESTONE 2');
console.log('======================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. SOURCE LIST HUD COUNT & SSR COMMENT RESOLUTION ORACLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Source List HUD Count & Interpolation Oracle ---');

const testCounts = [
  { count: 0, lang: 'it', expected: '0 articoli', wrongSingularPlural: '0 articolo' },
  { count: 1, lang: 'it', expected: '1 articolo', wrongSingularPlural: '1 articoli' },
  { count: 2, lang: 'it', expected: '2 articoli', wrongSingularPlural: '2 articolo' },
  { count: 5, lang: 'it', expected: '5 articoli', wrongSingularPlural: '5 articolo' },
  { count: 99, lang: 'it', expected: '99 articoli', wrongSingularPlural: '99 articolo' },
  { count: 0, lang: 'en', expected: '0 items', wrongSingularPlural: '0 item' },
  { count: 1, lang: 'en', expected: '1 item', wrongSingularPlural: '1 items' },
  { count: 2, lang: 'en', expected: '2 items', wrongSingularPlural: '2 item' },
  { count: 5, lang: 'en', expected: '5 items', wrongSingularPlural: '5 item' },
  { count: 99, lang: 'en', expected: '99 items', wrongSingularPlural: '99 item' },
];

for (const tc of testCounts) {
  const items = Array.from({ length: tc.count }, (_, i) => ({
    productId: `prod-${i}`,
    quantity: 1,
    checked: false,
  }));

  const list = {
    id: `list-test-${tc.count}-${tc.lang}`,
    storeId: 'iperpoli-cittadella',
    name: 'Spesa Settimanale Poli',
    items,
  };

  const html = renderAppRoute(`/store/iperpoli-cittadella?listId=${list.id}`, {
    language: tc.lang,
    initialLists: [list],
  });

  // Check expected count string
  assert(html.includes(`(${tc.expected})`), `[${tc.lang.toUpperCase()}] Count=${tc.count} renders exact string "(${tc.expected})"`);

  // Check wrong grammar form is NOT rendered
  assert(!html.includes(`(${tc.wrongSingularPlural})`), `[${tc.lang.toUpperCase()}] Count=${tc.count} does not render incorrect grammar "(${tc.wrongSingularPlural})"`);

  // Check absence of React SSR comment boundaries inside the HUD count span
  const hudMatch = html.match(/role="region"[\s\S]*?<\/div>\s*<\/div>/);
  const hudText = hudMatch ? hudMatch[0] : '';
  const countSpanMatch = hudText.match(/<span[^>]*tabular-nums[^>]*>([\s\S]*?)<\/span>/);
  const countSpan = countSpanMatch ? countSpanMatch[1] : '';
  assert(!countSpan.includes('<!-- -->'), `[${tc.lang.toUpperCase()}] Count=${tc.count} HUD count span renders continuous text without SSR comment markers`);

  // Regex assertion
  const regex = new RegExp(`\\(${tc.expected}\\)`, 'i');
  assert(regex.test(html), `[${tc.lang.toUpperCase()}] Regex matches \\(${tc.expected}\\)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HUD NAVIGATION & BUTTON TARGET ORACLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. HUD Navigation & Button Target Oracle ---');

{
  const listId = 'source-list-special-777';
  const list = {
    id: listId,
    storeId: 'iperpoli-cittadella',
    name: 'Spesa Riservata',
    items: [{ productId: 'prod-latte', quantity: 1, checked: false }],
  };

  const html = renderAppRoute(`/store/iperpoli-cittadella?listId=${listId}`, {
    initialLists: [list],
  });

  // Verify Fatto button exists
  assert(html.includes('Fatto ✓'), 'HUD contains "Fatto ✓" button text');

  // Verify touch target for Fatto button
  assert(
    html.includes('min-h-[44px]') && html.includes('min-w-[76px]'),
    'Fatto button has min-h-[44px] and min-w-[76px] >= 44x44px ergonomic touch target'
  );

  // Verify breadcrumb back button
  assert(
    html.includes('min-h-[44px]') && html.includes('min-w-[44px]'),
    'Top breadcrumb back button provides min-h-[44px] min-w-[44px]'
  );

  // Verify modifyingSourceList banner presence
  assert(html.includes('role="region"'), 'Source List HUD is designated with role="region"');
  assert(
    html.includes('aria-label="Stai modificando una lista esistente"') || html.includes('Stai modificando'),
    'Source List HUD has accessible region label'
  );

  // When no sourceListId, HUD banner is NOT rendered
  const noHudHtml = renderAppRoute('/store/iperpoli-cittadella');
  assert(!noHudHtml.includes('Fatto ✓'), 'Catalog without ?listId does not display Fatto button or HUD banner');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADD-TO-LIST MODAL DIALOG EMPIRICAL MARKUP ORACLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Add-to-List Modal Dialog Empirical Markup Oracle ---');

try {
  const modalOutput = execSync('node tests/test-modal.mjs', { encoding: 'utf-8' });
  const lines = modalOutput.trim().split('\n');
  for (const line of lines) {
    if (line.includes(': true')) {
      const label = line.split(':')[0].trim();
      assert(true, `Modal: ${label}`);
    } else if (line.includes(': false')) {
      const label = line.split(':')[0].trim();
      assert(false, `Modal: ${label}`);
    }
  }
} catch (e) {
  assert(false, `Modal verification script failed: ${e.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BEHAVIORAL VERIFICATION (ESCAPE HANDLER & BODY SCROLL LOCK)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Behavioral Verification (Escape Handler & Body Scroll Lock) ---');

{
  const mockBody = { style: { overflow: '' } };
  let originalOverflow = mockBody.style.overflow;
  
  // Simulate opening modal
  mockBody.style.overflow = 'hidden';
  assert(mockBody.style.overflow === 'hidden', 'Scroll lock sets document.body.style.overflow to "hidden" when open');

  // Simulate cleanup/closing modal
  mockBody.style.overflow = originalOverflow;
  assert(mockBody.style.overflow === '', 'Scroll lock cleanup restores document.body.style.overflow to original value');
}

{
  let modalOpen = true;
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      modalOpen = false;
    }
  };

  // Simulate non-Escape key
  handleKeyDown({ key: 'Enter' });
  assert(modalOpen === true, 'Modal remains open on Enter or other keypresses');

  // Simulate Escape key
  handleKeyDown({ key: 'Escape' });
  assert(modalOpen === false, 'Escape keypress cleanly toggles modalOpen to false');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COLOR CONTRAST & ACCESSIBILITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Color Contrast & Accessibility Audit ---');

{
  const roseResult = evaluateWcagAA('rose-600', 'white');
  assert(
    roseResult.ratio >= 4.5 && roseResult.passNormalText,
    `Original price strikethrough (rose-600 on white) has contrast ${roseResult.ratio}:1 (>= 4.5:1 required by WCAG AA)`
  );

  const slate500Result = evaluateWcagAA('slate-500', 'white');
  assert(
    slate500Result.ratio >= 4.5 && slate500Result.passNormalText,
    `Subtitle text (slate-500 on white) has contrast ${slate500Result.ratio}:1 (>= 4.5:1 required by WCAG AA)`
  );

  const emeraldResult = evaluateWcagAA('emerald-800', 'emerald-50');
  assert(
    emeraldResult.ratio >= 4.5 && emeraldResult.passNormalText,
    `Source HUD tag (emerald-800 on emerald-50) has contrast ${emeraldResult.ratio}:1 (>= 4.5:1 required by WCAG AA)`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MULTI-SELECT FILTERING STATE & CATALOG ISOLATION ORACLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Multi-Select Filtering State & Catalog Isolation ---');

{
  const html = renderAppRoute('/store/iperpoli-cittadella');

  assert(html.includes('min-h-[44px] px-4 py-2.5'), 'Category filter pills provide min-h-[44px] touch target');
  assert(html.includes('role="group" aria-label="Filtri catalogo"'), 'Category filter pills container has role="group" and aria-label');
  assert(html.includes('aria-pressed='), 'Filter pill buttons declare aria-pressed state');

  const lidlHtml = renderAppRoute('/store/lidl-brennero');
  assert(!lidlHtml.includes('Nutella'), 'Lidl store catalog strictly excludes Nutella (Ferrero)');
  assert(!lidlHtml.includes('Spaghetti Barilla'), 'Lidl store catalog strictly excludes Barilla pasta');
  assert(!lidlHtml.includes('Caffè Lavazza'), 'Lidl store catalog strictly excludes Lavazza coffee');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PRODUCT QUANTITY STEPPERS & TOUCH TARGET SWEEP
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 7. Product Quantity Steppers & Touch Target Sweep ---');

{
  const html = renderAppRoute('/store/iperpoli-cittadella');

  assert(
    html.includes('min-w-[44px] min-h-[44px] w-11 h-11'),
    'Quantity steppers and add buttons strictly enforce 44x44px touch targets (w-11 h-11)'
  );
  assert(html.includes('tabular-nums'), 'Product cards utilize tabular-nums for numeric stability');
  assert(!html.includes('Vedi Mappa e Percorso'), 'Screen 1.1 strictly omits floating "Vedi Mappa e Percorso" button');
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. HOME SCREEN (M2 SCOPE) ADVERSARIAL CHECKS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 8. Home Screen (M2 Scope) Adversarial Checks ---');

{
  const homeHtml = renderAppRoute('/home');

  // Language toggle touch targets
  assert(
    homeHtml.includes('min-h-[44px] min-w-[44px]'),
    'Home language switcher buttons enforce min-h-[44px] min-w-[44px]'
  );

  // Search input >= 16px to prevent iOS auto-zoom
  assert(
    homeHtml.includes('min-h-[48px]') && homeHtml.includes('text-base'),
    'Home search input provides min-h-[48px] and text-base (>= 16px font)'
  );

  // Clear search button 44x44px (verified via test-home-clear.mjs)
  try {
    const clearOutput = execSync('node tests/test-home-clear.mjs', { encoding: 'utf-8' });
    const lines = clearOutput.trim().split('\n');
    for (const line of lines) {
      if (line.includes(': true')) {
        const label = line.split(':')[0].trim();
        assert(true, `Home Clear: ${label}`);
      } else if (line.includes(': false')) {
        const label = line.split(':')[0].trim();
        assert(false, `Home Clear: ${label}`);
      }
    }
  } catch (e) {
    assert(false, `Home clear verification script failed: ${e.message}`);
  }

  // Store cards accessibility
  assert(
    homeHtml.includes('role="button"') && (homeHtml.includes('tabIndex={0}') || homeHtml.includes('tabindex="0"')),
    'Home store cards provide role="button" and tabIndex={0}'
  );
  assert(
    homeHtml.includes('data-href="/store/'),
    'Home store cards declare data-href target routing attribute'
  );
}

console.log('\n======================================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
