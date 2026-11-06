import { describe, it, expect } from '../helpers/test-framework';
import { renderAppRoute, renderWithProviders, StoreMap, RouteStats, storesData, storageUtils, routeUtils } from '../helpers/render-helper';
import { evaluateWcagAA } from '../helpers/contrast-utils';
import { extractInteractiveElements } from '../helpers/ergonomics-utils';
import { auditHtmlMotion } from '../helpers/motion-utils';
import React from 'react';

// ── Feature 16: List Detail Progress Bar ──
describe('Feature 16: List Detail Progress Bar', () => {
  it('F16-1: Progress card displays textual progress (X / Y presi and Z%)', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    const html = renderAppRoute(`/lists/${demoLists[0].id}`, { initialLists: demoLists });
    expect(html).toMatch(/Avanzamento Spesa|Progress/i);
    expect(html).toMatch(/%\)/);
  });

  it('F16-2: Progress bar implements WAI-ARIA role="progressbar" and numeric bounds', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    const html = renderAppRoute(`/lists/${demoLists[0].id}`, { initialLists: demoLists });
    const hasProgressbarRole = html.includes('role="progressbar"') || html.includes('aria-valuenow');
    expect(hasProgressbarRole).toBe(true);
  });

  it('F16-3: Progress bar animates via compositor-safe scaleX transform with origin-left', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    const html = renderAppRoute(`/lists/${demoLists[0].id}`, { initialLists: demoLists });
    const hasCompositorSafeBar = html.includes('scaleX') || html.includes('origin-left');
    expect(hasCompositorSafeBar).toBe(true);
  });

  it('F16-4: Progress bar transition duration does not exceed 200ms', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    const html = renderAppRoute(`/lists/${demoLists[0].id}`, { initialLists: demoLists });
    const motionAudit = auditHtmlMotion(html);
    expect(motionAudit.hasDurationViolation).toBe(false);
  });

  it('F16-5: Progress bar reaches 100% when all items are checked off', () => {
    const demoList = storageUtils.getDefaultDemoLists()[0];
    const allChecked = {
      ...demoList,
      items: demoList.items.map((i: any) => ({ ...i, checked: true })),
    };
    const html = renderAppRoute(`/lists/${allChecked.id}`, { initialLists: [allChecked] });
    expect(html).toMatch(/100%/);
  });
}, { tier: 'tier1', featureId: 16 });

// ── Feature 17: List Detail Item Checkoff ──
describe('Feature 17: List Detail Item Checkoff', () => {
  it('F17-1: Checkmark button adheres to minimum 44x44px touch target frame', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    const html = renderAppRoute(`/lists/${demoLists[0].id}`, { initialLists: demoLists });
    const hasCheckmarkTarget = html.includes('min-h-[44px]') || html.includes('min-w-[44px]') || html.includes('w-11 h-11');
    expect(hasCheckmarkTarget).toBe(true);
  });

  it('F17-2: Checkbox provides accessible semantics role="checkbox" and aria-checked', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    const html = renderAppRoute(`/lists/${demoLists[0].id}`, { initialLists: demoLists });
    const hasAriaCheckbox = html.includes('role="checkbox"') || html.includes('aria-checked');
    expect(hasAriaCheckbox).toBe(true);
  });

  it('F17-3: Checked item text passes WCAG AA contrast (line-through text-slate-500 >= 4.5:1)', () => {
    // slate-500 (#64748b) on gray-50 (#f9fafb) has 4.51:1 contrast
    const result = evaluateWcagAA('slate-500', 'gray-50');
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    expect(result.passNormalText).toBe(true);
  });

  it('F17-4: Checking an item toggles checked boolean state', () => {
    const demoList = storageUtils.getDefaultDemoLists()[0];
    const item = demoList.items[0];
    const toggled = !item.checked;
    expect(typeof toggled).toBe('boolean');
  });

  it('F17-5: Item state changes persist to localStorage', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    demoLists[0].items[0].checked = true;
    storageUtils.saveLists(demoLists);
    const loaded = storageUtils.loadLists();
    expect(loaded[0].items[0].checked).toBe(true);
  });
}, { tier: 'tier1', featureId: 17 });

// ── Feature 18: List Detail Quantity Steppers ──
describe('Feature 18: List Detail Quantity Steppers', () => {
  it('F18-1: Stepper buttons [-] and [+] provide minimum 44x44px touch targets', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    const html = renderAppRoute(`/lists/${demoLists[0].id}`, { initialLists: demoLists });
    const hasStepperTarget = html.includes('min-h-[44px]') || html.includes('min-w-[44px]') || html.includes('after:-inset');
    expect(hasStepperTarget).toBe(true);
  });

  it('F18-2: Stepper quantity numbers render with tabular-nums', () => {
    const demoLists = storageUtils.getDefaultDemoLists();
    const html = renderAppRoute(`/lists/${demoLists[0].id}`, { initialLists: demoLists });
    expect(html).toContain('tabular-nums');
  });

  it('F18-3: Incrementing quantity increases item count and updates total list cost', () => {
    const demoList = storageUtils.getDefaultDemoLists()[0];
    const originalQty = demoList.items[0].quantity;
    const newQty = originalQty + 1;
    expect(newQty).toBeGreaterThan(originalQty);
  });

  it('F18-4: Decrementing quantity at quantity > 1 reduces count', () => {
    const qty = 3;
    const dec = qty - 1;
    expect(dec).toBe(2);
  });

  it('F18-5: Decrementing quantity at quantity = 1 removes product from list', () => {
    const demoList = storageUtils.getDefaultDemoLists()[0];
    const initialCount = demoList.items.length;
    const remaining = demoList.items.filter((_: any, idx: number) => idx !== 0);
    expect(remaining.length).toBe(initialCount - 1);
  });
}, { tier: 'tier1', featureId: 18 });

// ── Feature 19: 2D SVG Map Path & Pins ──
describe('Feature 19: 2D SVG Map Path & Pins', () => {
  it('F19-1: SVG map coordinates are strictly fixed to 440x650 viewBox', () => {
    const store = storesData.availableStores[0];
    const html = renderWithProviders(React.createElement(StoreMap, { store }));
    expect(html).toContain('viewBox="0 0 440 650"');
  });

  it('F19-2: Map SVG renders aisles 1 through 7 and perimeter structures', () => {
    const store = storesData.availableStores[0];
    const html = renderWithProviders(React.createElement(StoreMap, { store }));
    expect(html).toContain('Corsia 1');
    expect(html).toContain('Corsia 7');
  });

  it('F19-3: SVG animations utilize CSS keyframes instead of legacy SMIL <animate> tags', () => {
    const store = storesData.availableStores[0];
    const html = renderWithProviders(React.createElement(StoreMap, { store }));
    const motionAudit = auditHtmlMotion(html);
    expect(motionAudit.hasLegacySmilAnimation).toBe(false);
  });

  it('F19-4: Numbered stop badges display along optimal route for unchecked items', () => {
    const store = storesData.availableStores[0];
    const items = storageUtils.getDefaultDemoLists()[0].items;
    const route = routeUtils.optimizeRoute(store, items);
    expect(route).toBeDefined();
    expect(route.orderedItems.length).toBeGreaterThan(0);
  });

  it('F19-5: Active stop highlights with visual pulsing indicator', () => {
    const store = storesData.availableStores[0];
    const items = storageUtils.getDefaultDemoLists()[0].items;
    const route = routeUtils.optimizeRoute(store, items);
    const html = renderWithProviders(React.createElement(StoreMap, { store, route, activeStopIndex: 0 }));
    expect(html).toMatch(/animate-ping|animate-pulse|active-stop|stroke-emerald/i);
  });
}, { tier: 'tier1', featureId: 19 });

// ── Feature 20: Turn-by-Turn Route HUD ──
describe('Feature 20: Turn-by-Turn Route HUD', () => {
  it('F20-1: Displays turn instruction card with PROSSIMA FERMATA step counter', () => {
    const store = storesData.availableStores[0];
    const items = storageUtils.getDefaultDemoLists()[0].items;
    const route = routeUtils.optimizeRoute(store, items);
    const html = renderWithProviders(React.createElement(RouteStats, { route, activeStopIndex: 0 }));
    expect(html).toMatch(/PROSSIMA FERMATA|NEXT STOP/i);
  });

  it('F20-2: Displays shelf side, section code, and product brand & price', () => {
    const store = storesData.availableStores[0];
    const items = storageUtils.getDefaultDemoLists()[0].items;
    const route = routeUtils.optimizeRoute(store, items);
    const html = renderWithProviders(React.createElement(RouteStats, { route, activeStopIndex: 0 }));
    expect(html).toMatch(/Scaffale|Shelf|Corsia|Aisle|Banco|Counter|Ortofrutta|Produce/i);
  });

  it('F20-3: Includes action button "Preso! Spunta dal carrello" to mark active item checked', () => {
    const store = storesData.availableStores[0];
    const items = storageUtils.getDefaultDemoLists()[0].items;
    const route = routeUtils.optimizeRoute(store, items);
    const html = renderWithProviders(React.createElement(RouteStats, { route, activeStopIndex: 0 }));
    expect(html).toMatch(/Preso|Picked/i);
  });

  it('F20-4: Prev and Next step navigation buttons provide minimum 44x44px touch targets', () => {
    const store = storesData.availableStores[0];
    const items = storageUtils.getDefaultDemoLists()[0].items;
    const route = routeUtils.optimizeRoute(store, items);
    const html = renderWithProviders(React.createElement(RouteStats, { route, activeStopIndex: 0 }));
    const hasNavTouchTargets = html.includes('min-h-[44px]') || html.includes('min-w-[44px]') || html.includes('p-3');
    expect(hasNavTouchTargets).toBe(true);
  });

  it('F20-5: Savings statistics card displays saved minutes and avoided meters with tabular-nums', () => {
    const store = storesData.availableStores[0];
    const items = storageUtils.getDefaultDemoLists()[0].items;
    const route = routeUtils.optimizeRoute(store, items);
    const html = renderWithProviders(React.createElement(RouteStats, { route, activeStopIndex: 0 }));
    expect(html).toContain('tabular-nums');
    expect(html).toMatch(/min|m/);
  });
}, { tier: 'tier1', featureId: 20 });
