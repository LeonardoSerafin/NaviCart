# Design Plan — Account Surface Audit

## Target Surface
- `grocery-app/src/pages/AccountPage.tsx`

---

## Proven Findings (Max 3)

### Finding 1: Inconsistent Neutral Color Tokens (`gray-*` instead of Design System `slate-*`)
- **Contract Evidence**: `ui-ux-design-system` Section 2 specifies system color tokens based on Tailwind `slate-*` for surfaces, cards, and text (`slate-50`, `slate-100`, `slate-200`, `slate-600`, `slate-900`).
- **Runtime Manifestation**:
  - `AccountPage.tsx` lines 62-64, 79, 92, 103, 110, 161, 167, 196, 200, 207, 225, 230 use `border-gray-200`, `text-gray-800`, `text-gray-600`, `text-gray-500`, `bg-gray-50`, `bg-gray-100`.
- **Single Correction**: Replace all `gray-*` classes with semantic `slate-*` tokens (`border-slate-200`, `text-slate-900`, `text-slate-600`, `text-slate-500`, `bg-slate-50`, `bg-slate-100`), ensuring WCAG AA contrast (>= 4.5:1).

### Finding 2: Missing Micro-Interactions, Focus Indicators & Touch Target Consistency
- **Contract Evidence**: `ui-ux-design-system` Section 4 & 5 and `baseline-ui` Section 2 mandate minimum `44x44px` touch targets, active micro-press scaling (`active:scale-[0.98] transition-transform duration-150 ease-out`), and visible focus rings (`focus-visible:ring-2 focus-visible:ring-emerald-500`).
- **Runtime Manifestation**:
  - Language buttons (lines 74-99) lack explicit minimum height and `focus-visible:ring-2`.
  - Reset action trigger (line 179) and modal buttons (lines 204-217) lack focus rings and standardized transitions.
- **Single Correction**: Add `min-h-[48px]`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`, and `active:scale-[0.98] transition-transform duration-150 ease-out` to interactive controls.

### Finding 3: Typography Hierarchy & Text Balancing
- **Contract Evidence**: `baseline-ui` Section 1 mandates `text-balance` on section headings and `text-pretty` on descriptive paragraphs to eliminate orphaned words.
- **Runtime Manifestation**:
  - Reset modal heading (line 197) and card headings lack `text-balance`.
  - Descriptive paragraphs (lines 167, 200, 230) lack `text-pretty`.
- **Single Correction**: Apply `text-balance` to headings and `text-pretty` to explanatory paragraphs.

---

## Verification Steps
1. Visual inspection in mobile viewport verifying slate card backgrounds and crisp borders.
2. Keyboard navigation verification ensuring visible focus rings on language cards and reset buttons.
3. Automated test verification: `node tests/run-e2e.mjs` verifying 271/271 tests pass.
