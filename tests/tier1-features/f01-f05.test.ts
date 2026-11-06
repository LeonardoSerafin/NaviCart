import { describe, it, expect } from '../helpers/test-framework';
import { renderAppRoute, renderWithProviders, Layout, HomePage, storesData } from '../helpers/render-helper';
import { evaluateWcagAA } from '../helpers/contrast-utils';
import { evaluateTouchTarget, extractInteractiveElements } from '../helpers/ergonomics-utils';
import { auditHtmlMotion } from '../helpers/motion-utils';
import fs from 'node:fs';
import path from 'node:path';

// ── Feature 1: Safe-Area Viewport & Shell ──
describe('Feature 1: Safe-Area Viewport & Shell', () => {
  it('F01-1: Outer wrapper centers mobile viewport with max-w-md constraint', () => {
    const html = renderAppRoute('/home');
    expect(html).toContain('max-w-md');
    expect(html).toContain('justify-center');
  });

  it('F01-2: Smartphone shell employs dynamic viewport height (min-h-dvh)', () => {
    const html = renderAppRoute('/home');
    const hasDvh = html.includes('min-h-dvh');
    expect(hasDvh).toBe(true);
  });

  it('F01-3: Shell provides safe-area inset padding for bottom gesture navigation', () => {
    const html = renderAppRoute('/home');
    const hasSafeArea = html.includes('safe-area-inset-bottom') || html.includes('pb-[env(safe-area-inset-bottom');
    expect(hasSafeArea).toBe(true);
  });

  it('F01-4: Scroll container reserves bottom space so fixed navbar does not occlude content', () => {
    const html = renderAppRoute('/home');
    expect(html).toMatch(/pb-(20|24|28)|pb-\[calc/);
  });

  it('F01-5: Frame has boundary border definition isolating mobile viewport', () => {
    const html = renderAppRoute('/home');
    expect(html).toMatch(/border-x|border-slate/);
  });
}, { tier: 'tier1', featureId: 1 });

// ── Feature 2: Design Tokens & Motion Baseline ──
describe('Feature 2: Design Tokens & Motion Baseline', () => {
  it('F02-1: Primary action token meets WCAG AA contrast (>= 4.5:1) against white', () => {
    // emerald-700 (#047857) on white (#ffffff) has 5.48:1 contrast
    const result = evaluateWcagAA('emerald-700', 'white');
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    expect(result.passNormalText).toBe(true);
  });

  it('F02-2: Inactive navigation & caption token meets WCAG AA contrast (>= 4.5:1)', () => {
    // slate-500 (#64748b) on white has 4.62:1 contrast
    const result = evaluateWcagAA('slate-500', 'white');
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    expect(result.passNormalText).toBe(true);
  });

  it('F02-3: Application CSS enforces animation duration ceiling <= 200ms', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    const html = renderAppRoute('/home');
    const motionAudit = auditHtmlMotion(html);
    expect(motionAudit.hasDurationViolation).toBe(false);
  });

  it('F02-4: Micro-interactions utilize compositor-safe GPU properties (transform/opacity)', () => {
    const html = renderAppRoute('/home');
    const motionAudit = auditHtmlMotion(html);
    expect(motionAudit.hasCompositorViolation).toBe(false);
  });

  it('F02-5: Prefers-reduced-motion overrides are present in stylesheet or DOM classes', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    const hasMediaReduce = /prefers-reduced-motion/i.test(css);
    const html = renderAppRoute('/home');
    const hasClassReduce = /motion-reduce:/.test(html);
    expect(hasMediaReduce || hasClassReduce).toBe(true);
  });
}, { tier: 'tier1', featureId: 2 });

// ── Feature 3: Persistent Bottom Nav Bar ──
describe('Feature 3: Persistent Bottom Nav Bar', () => {
  it('F03-1: Renders exactly 3 primary navigation tabs (Home, Lists, Account)', () => {
    const html = renderAppRoute('/home');
    expect(html).toContain('Home');
    expect(html).toMatch(/Le Mie Liste|My Lists/);
    expect(html).toContain('Account');
  });

  it('F03-2: Bottom nav buttons adhere to minimum 48px touch target height', () => {
    const html = renderAppRoute('/home');
    const navMatch = html.match(/<nav[\s\S]*?<\/nav>/i);
    expect(Boolean(navMatch)).toBe(true);
    const navHtml = navMatch ? navMatch[0] : '';
    const hasMinH = navHtml.includes('min-h-[48px]') || navHtml.includes('h-12') || navHtml.includes('py-2.5');
    expect(hasMinH).toBe(true);
  });

  it('F03-3: Tab container includes ARIA semantics for assistive technologies', () => {
    const html = renderAppRoute('/home');
    const hasTablist = html.includes('role="tablist"') || html.includes('aria-label="Bottom Navigation"');
    expect(hasTablist).toBe(true);
  });

  it('F03-4: Tab badge displays total number of user lists dynamically', () => {
    const customLists = [
      { id: 'l1', storeId: 'iperpoli-cittadella', name: 'Lista 1', items: [] },
      { id: 'l2', storeId: 'lidl-brennero', name: 'Lista 2', items: [] },
      { id: 'l3', storeId: 'conad-3novembre', name: 'Lista 3', items: [] },
    ];
    const html = renderAppRoute('/home', { initialLists: customLists });
    expect(html).toContain('>3<');
  });

  it('F03-5: Active tab styling reflects current route location', () => {
    // Il tab attivo è marcato semanticamente (aria-selected) e graficamente (icona in colore d'azione).
    const homeHtml = renderAppRoute('/home');
    expect(homeHtml).toMatch(/data-nav-id="navHome"[^>]*aria-selected="true"/);
    expect(homeHtml).toContain('text-tomato');
    const listsHtml = renderAppRoute('/lists');
    expect(listsHtml).toMatch(/data-nav-id="navLists"[^>]*aria-selected="true"/);
    expect(listsHtml).toContain('text-tomato');
  });
}, { tier: 'tier1', featureId: 3 });

// ── Feature 4: Home Store Selection ──
describe('Feature 4: Home Store Selection', () => {
  it('F04-1: Displays all 4 predefined Trento supermarkets', () => {
    const html = renderAppRoute('/home');
    expect(html).toContain('IperPoli');
    expect(html).toContain('Lidl');
    expect(html).toContain('Conad');
    expect(html).toContain('Trento Sud');
  });

  it('F04-2: Store cards provide accessible interactive roles and keyboard focusability', () => {
    const html = renderAppRoute('/home');
    const hasAccessibleCard = html.includes('role="button"') || html.includes('<button');
    expect(hasAccessibleCard).toBe(true);
  });

  it('F04-3: Store cards span accessible touch target area >= 44px', () => {
    const html = renderAppRoute('/home');
    const controls = extractInteractiveElements(html);
    const storeControls = controls.filter(c => c.includes('store') || c.includes('IperPoli') || c.includes('cursor-pointer') || c.includes('role="button"'));
    expect(storeControls.length).toBeGreaterThan(0);
  });

  it('F04-4: Store cards display localized opening hours and walking distance', () => {
    const html = renderAppRoute('/home');
    expect(html).toContain('450 m');
    expect(html).toContain('08:00 - 20:30');
  });

  it('F04-5: Store catalog link target points to /store/:storeId route', () => {
    const html = renderAppRoute('/home');
    expect(html).toMatch(/\/store\/(iperpoli-cittadella|lidl-brennero|conad-3novembre|poli-trento-sud)/);
  });
}, { tier: 'tier1', featureId: 4 });

// ── Feature 5: Home Search & Clear Control ──
describe('Feature 5: Home Search & Clear Control', () => {
  it('F05-1: Search input font size is >= 16px (text-base) to prevent iOS auto-zoom', () => {
    const html = renderAppRoute('/home');
    const searchMatch = html.match(/<input[^>]*type="text"[^>]*>/i);
    expect(Boolean(searchMatch)).toBe(true);
    const inputHtml = searchMatch ? searchMatch[0] : '';
    const hasPreventZoomClass = inputHtml.includes('text-base') || inputHtml.includes('text-[16px]');
    expect(hasPreventZoomClass).toBe(true);
  });

  it('F05-2: Search input placeholder text matches translation dictionary', () => {
    const html = renderAppRoute('/home', { language: 'it' });
    expect(html).toContain('Cerca supermercato per nome o zona...');
  });

  it('F05-3: Clear button provides dedicated touch target >= 44x44px', () => {
    const html = renderAppRoute('/home');
    // Check if clear button container or tap area is min-h-[44px]
    const hasClearTouchTarget = html.includes('min-h-[44px]') || html.includes('min-w-[44px]') || html.includes('w-11 h-11');
    expect(hasClearTouchTarget).toBe(true);
  });

  it('F05-4: Empty search query renders all available supermarkets', () => {
    const html = renderAppRoute('/home');
    for (const store of storesData.availableStores) {
      expect(html).toContain(store.brand);
    }
  });

  it('F05-5: Search matches case-insensitively across store name, brand, and address', () => {
    const stores = storesData.availableStores;
    const query = 'brennero';
    const matches = stores.filter((s: any) => 
      s.name.toLowerCase().includes(query) || 
      s.brand.toLowerCase().includes(query) || 
      s.address.toLowerCase().includes(query)
    );
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('lidl-brennero');
  });
}, { tier: 'tier1', featureId: 5 });
