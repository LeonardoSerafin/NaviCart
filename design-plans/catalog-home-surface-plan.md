# Design Plan — Catalog & Home Surface Audit

## Target Surface
- `grocery-app/src/pages/HomePage.tsx`
- `grocery-app/src/pages/StoreCatalogPage.tsx`

---

## Proven Findings (Max 3)

### Finding 1: Typographic Balance on Store & Catalog Headings
- **Contract Evidence**: `baseline-ui` Section 1 mandates `text-balance` on headings and `text-pretty` on multiline product names and empty states to prevent typographical orphans.
- **Runtime Manifestation**:
  - `HomePage.tsx` line 40 (`h1`) and line 175 (`store.name`) lack `text-balance`.
  - `StoreCatalogPage.tsx` empty state title (line 463) and new list modal description (line 617) lack `text-balance` / `text-pretty`.
- **Single Correction**: Add `text-balance` to headings and `text-pretty` to body and descriptions.

### Finding 2: Consistent Micro-Interactions on Store Catalog Interactive Controls
- **Contract Evidence**: `ui-ux-design-system` Section 5 and `baseline-ui` Section 2 require interactive elements to feature active press micro-interactions (`active:scale-[0.98] transition-transform duration-150 ease-out motion-reduce:transition-none`).
- **Runtime Manifestation**:
  - `StoreCatalogPage.tsx` filter chips and search clear buttons have varied scaling (`active:scale-95` vs `active:scale-[0.97]`).
  - Sort select element (line 442) lacks smooth transition classes and explicit focus ring styling.
- **Single Correction**: Standardize micro-interactions across filter pills, sort controls, and dialog action buttons.

### Finding 3: Visual Polish of Empty States and Modal Backdrops
- **Contract Evidence**: `ui-ux-design-system` Section 1 & 2 mandates balanced padding (`p-6` or `p-8`), consistent borders (`border-slate-200/80`), and backdrop blur on overlay sheets.
- **Runtime Manifestation**:
  - `StoreCatalogPage.tsx` empty state card (line 458) uses `border-slate-200` without balanced contrast borders.
  - New list modal backdrop uses `backdrop-blur-xs` which can render inconsistently across mobile browsers compared to `backdrop-blur-sm`.
- **Single Correction**: Normalize backdrop blur and card borders to standard tokens.

---

## Verification Steps
1. Visual inspection of Home store cards and Catalog product cards in responsive mobile view.
2. Filter pill toggling and sorting interaction responsiveness check.
3. Automated test verification: `node tests/run-e2e.mjs` verifying 271/271 tests pass.
