# Design Plan — List Detail & Route HUD Surface Audit

## Target Surface
- `grocery-app/src/pages/ListDetailPage.tsx`
- `grocery-app/src/components/RouteStats.tsx`

---

## Proven Findings (Max 3)

### Finding 1: Design Token Inconsistency (Mixing uncalibrated `gray-*` with `slate-*` tokens)
- **Contract Evidence**: `ui-ux-design-system` Section 2 mandates consistent semantic slate tokens (`slate-900` text, `slate-600` secondary, `slate-50` surfaces, `slate-200` borders) and emerald brand actions (`emerald-600` / `emerald-700`).
- **Runtime Manifestation**:
  - `ListDetailPage.tsx` lines 122-137, 143-147, 170-174, 212-218, 248-255 use uncalibrated `gray-50`, `gray-100`, `gray-200`, `gray-400`, `gray-500`, `gray-700`, `gray-900`.
  - `RouteStats.tsx` lines 62, 74-84, 91-96, 145-152, 162-169 use `gray-50`, `gray-100`, `gray-200`, `gray-500`, `gray-900`.
- **Single Correction**: Normalize all neutral surface, text, and border classes to the standard `slate-*` palette (`slate-50`, `slate-100`, `slate-200`, `slate-500`, `slate-600`, `slate-900`), maintaining established WCAG AA contrast (>= 4.5:1).

### Finding 2: Missing Ergonomic Focus Rings & Touch Target Guarantees on Back & Add Actions
- **Contract Evidence**: `baseline-ui` Section 4 and `ui-ux-design-system` Section 4 mandate minimum `44x44px` touch targets (`min-h-[44px] min-w-[44px]`) and visible accessible focus indicators (`focus-visible:ring-2 focus-visible:ring-emerald-500`).
- **Runtime Manifestation**:
  - `ListDetailPage.tsx` back button (line 124) has `px-3 py-2` without `min-h-[44px] min-w-[44px]`.
  - `ListDetailPage.tsx` "Aggiungi Prodotti" button (line 222) has `px-3 py-2` without explicit `min-h-[44px]`.
  - Stepper buttons and checkmark buttons lack `focus-visible:ring-2` keyboard focus rings.
- **Single Correction**: Add `min-h-[44px]` and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500` to all interactive controls.

### Finding 3: Typography Rhythm & Text Balancing Violations
- **Contract Evidence**: `baseline-ui` Section 1 mandates `text-balance` on headings/titles, `text-pretty` on body, and `tabular-nums` on all currency values, counts, and percentages.
- **Runtime Manifestation**:
  - `ListDetailPage.tsx` list title (line 132), section headings (lines 170, 212), and item names lack `text-balance` / `text-pretty`. Total price in section header lacks `tabular-nums`.
  - `RouteStats.tsx` product name heading (line 82) lacks `text-balance`.
- **Single Correction**: Apply `text-balance` to headings, `text-pretty` to multiline labels, and `tabular-nums` to the total price display.

---

## Verification Steps
1. Visual inspection in mobile viewport (`390px` width) verifying consistent slate palette and crisp borders.
2. Keyboard navigation test (Tab / Shift+Tab) verifying clear emerald focus rings on all buttons and steppers.
3. Automated test verification: `node tests/run-e2e.mjs` verifying all 271 E2E tests pass without regressions.
