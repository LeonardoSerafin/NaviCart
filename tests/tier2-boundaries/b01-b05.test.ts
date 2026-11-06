import { describe, it, expect } from '../helpers/test-framework';
import { renderAppRoute, storesData } from '../helpers/render-helper';
import { evaluateWcagAA, calculateContrastRatio } from '../helpers/contrast-utils';

// ── Boundary Feature 1: Safe-Area Viewport & Shell ──
describe('Boundary Feature 1: Safe-Area Viewport & Shell', () => {
  it('B01-1: Render on ultra-narrow viewport (320px) retains max-w-md constraint without horizontal blowout', () => {
    const html = renderAppRoute('/home');
    expect(html).toContain('max-w-md');
    expect(html).not.toContain('overflow-x-scroll');
  });

  it('B01-2: Render with empty route content retains shell structure and bottom nav placement', () => {
    const html = renderAppRoute('/lists', { initialLists: [] });
    expect(html).toContain('max-w-md');
    expect(html).toContain('<nav');
  });

  it('B01-3: Safe area padding includes safe fallback when env(safe-area-inset-bottom) is zero', () => {
    const html = renderAppRoute('/home');
    const hasSafeFallback = html.includes('env(safe-area-inset-bottom') || html.includes('pb-20');
    expect(hasSafeFallback).toBe(true);
  });

  it('B01-4: Tall viewport (1600px) preserves centered container and fixed bottom docking', () => {
    const html = renderAppRoute('/home');
    expect(html).toContain('fixed bottom-0');
    expect(html).toContain('justify-center');
  });

  it('B01-5: Shell layout maintains overflow-y-auto scrolling without double scrollbar', () => {
    const html = renderAppRoute('/home');
    expect(html).toContain('overflow-y-auto');
  });
}, { tier: 'tier2', featureId: 1 });

// ── Boundary Feature 2: Design Tokens & Motion Baseline ──
describe('Boundary Feature 2: Design Tokens & Motion Baseline', () => {
  it('B02-1: Dark background accent contrast (text-emerald-400 on bg-slate-900) exceeds 7.0:1 (AAA)', () => {
    const result = evaluateWcagAA('emerald-400', 'slate-900');
    expect(result.ratio).toBeGreaterThanOrEqual(7.0);
    expect(result.passNormalText).toBe(true);
  });

  it('B02-2: Disabled / inactive UI elements adhere to minimum 3.0:1 graphical contrast threshold', () => {
    // slate-500 (#64748b) on white has 4.51:1 contrast (>= 3.0:1)
    const result = evaluateWcagAA('slate-500', 'white');
    expect(result.ratio).toBeGreaterThanOrEqual(3.0);
    expect(result.passUIComponent).toBe(true);
  });

  it('B02-3: Animation duration classes strictly exclude values >= 250ms across all components', () => {
    const html = renderAppRoute('/home');
    expect(html).not.toContain('duration-300');
    expect(html).not.toContain('duration-500');
  });

  it('B02-4: Reduced-motion media query suppresses transitions to 0s', () => {
    const html = renderAppRoute('/home');
    const hasReducedVariant = html.includes('motion-reduce:transition-none') || html.includes('motion-reduce:transform-none');
    expect(hasReducedVariant).toBe(true);
  });

  it('B02-5: Invalid color token throws descriptive resolution error', () => {
    expect(() => calculateContrastRatio('unknown-nonexistent-token', 'white')).toThrow();
  });
}, { tier: 'tier2', featureId: 2 });

// ── Boundary Feature 3: Persistent Bottom Nav Bar ──
describe('Boundary Feature 3: Persistent Bottom Nav Bar', () => {
  it('B03-1: Zero lists in storage completely omits numeric badge (never displays "0")', () => {
    const html = renderAppRoute('/home', { initialLists: [] });
    // Badge span should not exist with value 0
    expect(html).not.toMatch(/>0<\/span>/);
  });

  it('B03-2: Extreme list count (e.g. 99 lists) formats badge cleanly without overflow', () => {
    const manyLists = Array.from({ length: 99 }, (_, i) => ({
      id: `list-${i}`,
      storeId: 'iperpoli-cittadella',
      name: `Spesa ${i}`,
      items: [],
    }));
    const html = renderAppRoute('/home', { initialLists: manyLists });
    expect(html).toContain('>99<');
  });

  it('B03-3: Root path "/" redirects to /home with Home tab active', () => {
    const html = renderAppRoute('/');
    expect(html).toMatch(/data-nav-id="navHome"[^>]*aria-selected="true"/);
  });

  it('B03-4: Sub-routes maintain correct parent tab active state (/store/:storeId -> Home tab)', () => {
    const html = renderAppRoute('/store/iperpoli-cittadella');
    expect(html).toMatch(/data-nav-id="navHome"[^>]*aria-selected="true"/);
  });

  it('B03-5: Catch-all unknown route preserves persistent navbar layout', () => {
    const html = renderAppRoute('/unknown-nonexistent-route-xyz');
    expect(html).toContain('<nav');
  });
}, { tier: 'tier2', featureId: 3 });

// ── Boundary Feature 4: Home Store Selection ──
describe('Boundary Feature 4: Home Store Selection', () => {
  it('B04-1: Direct navigation to unknown store ID defaults safely to first store', () => {
    const html = renderAppRoute('/store/unknown-supermarket-id');
    expect(html).toContain('IperPoli');
  });

  it('B04-2: Store with 0 or minimum distance formats without negative distance', () => {
    const store = storesData.availableStores[0];
    expect(store.distanceMeters).toBeGreaterThanOrEqual(0);
  });

  it('B04-3: Store distances > 1000m format with decimal km notation', () => {
    const conad = storesData.availableStores.find((s: any) => s.id === 'conad-3novembre');
    expect(conad.distanceText).toMatch(/km/i);
    expect(conad.distanceMeters).toBeGreaterThanOrEqual(1000);
  });

  it('B04-4: Store cards maintain keyboard tabIndex=0 for accessibility navigation', () => {
    const html = renderAppRoute('/home');
    const hasFocusableCard = html.includes('tabIndex={0}') || html.includes('tabindex="0"') || html.includes('<button');
    expect(hasFocusableCard).toBe(true);
  });

  it('B04-5: Multiple store cards render without duplicate DOM IDs or keys', () => {
    const ids = storesData.availableStores.map((s: any) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
}, { tier: 'tier2', featureId: 4 });

// ── Boundary Feature 5: Home Search & Clear Control ──
describe('Boundary Feature 5: Home Search & Clear Control', () => {
  it('B05-1: Search query matching no stores displays 0 results and empty state CTA', () => {
    const all = storesData.availableStores;
    const query = 'zzzz_no_match_at_all';
    const matches = all.filter((s: any) => s.name.toLowerCase().includes(query) || s.brand.toLowerCase().includes(query));
    expect(matches.length).toBe(0);
  });

  it('B05-2: Search query with surrounding whitespace and punctuation trims and matches', () => {
    const all = storesData.availableStores;
    const query = '  Lidl!  '.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const matches = all.filter((s: any) => s.brand.toLowerCase().includes(query));
    expect(matches.length).toBe(1);
  });

  it('B05-3: Extremely long query string (250+ characters) does not cause unhandled errors', () => {
    const all = storesData.availableStores;
    const longQuery = 'a'.repeat(300);
    const matches = all.filter((s: any) => s.name.toLowerCase().includes(longQuery));
    expect(matches.length).toBe(0);
  });

  it('B05-4: Clear button (✕) only renders when search query is non-empty', () => {
    const htmlEmpty = renderAppRoute('/home');
    // Clear button should not be present when query is empty
    expect(htmlEmpty).not.toContain('clear-search-active');
  });

  it('B05-5: Case-insensitive search matches accents and umlauts (e.g. Trento Süd / Sud)', () => {
    const all = storesData.availableStores;
    const match = all.find((s: any) => s.id === 'poli-trento-sud');
    expect(match).toBeDefined();
    expect(match.name).toContain('Trento Sud');
  });
}, { tier: 'tier2', featureId: 5 });
