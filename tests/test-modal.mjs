import React from 'react';
import { renderToString } from 'react-dom/server';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url, { jsx: true });
const { initMockStorage } = jiti('./helpers/render-helper.ts');
const { LanguageProvider } = jiti('../src/context/LanguageContext.tsx');
const { MemoryRouter, Routes, Route } = jiti('react-router-dom');

initMockStorage({
  lists: [{ id: 'list-1', storeId: 'iperpoli-cittadella', name: 'Lista 1', items: [] }],
  language: 'it',
});

// Patch React BEFORE loading StoreCatalogPage
const origUseState = React.useState;
React.useState = function(initialVal) {
  if (initialVal === false) {
    return origUseState.call(this, true); // Force modal open
  }
  return origUseState.call(this, initialVal);
};

const StoreCatalogPage = jiti('../src/pages/StoreCatalogPage.tsx').default;

const tree = React.createElement(
  LanguageProvider,
  null,
  React.createElement(
    MemoryRouter,
    { initialEntries: ['/store/iperpoli-cittadella'] },
    React.createElement(
      Routes,
      null,
      React.createElement(Route, {
        path: '/store/:storeId',
        element: React.createElement(StoreCatalogPage),
      })
    )
  )
);

const html = renderToString(tree);

console.log('=== STORE CATALOG ADD-TO-LIST MODAL EMPIRICAL AUDIT ===');
console.log('1. role="dialog":', html.includes('role="dialog"'));
console.log('2. aria-modal="true":', html.includes('aria-modal="true"'));
console.log('3. aria-labelledby="modal-new-list-title":', html.includes('aria-labelledby="modal-new-list-title"'));
console.log('4. id="modal-new-list-title":', html.includes('id="modal-new-list-title"'));
console.log('5. aria-describedby="modal-new-list-desc":', html.includes('aria-describedby="modal-new-list-desc"'));
console.log('6. id="modal-new-list-desc":', html.includes('id="modal-new-list-desc"'));
console.log('7. animate-scaleUp on modal dialog card:', html.includes('animate-scaleUp'));
console.log('8. animate-fadeIn on backdrop:', html.includes('animate-fadeIn'));
console.log('9. Close button 44x44px (w-11 h-11 min-w-[44px] min-h-[44px]):', html.includes('w-11 h-11 min-w-[44px] min-h-[44px]'));
console.log('10. Close button aria-label (Annulla):', html.includes('aria-label="Annulla"') || html.includes('aria-label="Cancel"'));
console.log('11. Input font size >= 16px (text-base):', html.includes('text-base'));
console.log('12. Input min-h-[44px]:', html.includes('min-h-[44px]'));
console.log('13. Action buttons flex-1 min-h-[44px]:', html.includes('flex-1 min-h-[44px]'));

const allPassed =
  html.includes('role="dialog"') &&
  html.includes('aria-modal="true"') &&
  html.includes('aria-labelledby="modal-new-list-title"') &&
  html.includes('id="modal-new-list-title"') &&
  html.includes('aria-describedby="modal-new-list-desc"') &&
  html.includes('id="modal-new-list-desc"') &&
  html.includes('animate-scaleUp') &&
  html.includes('animate-fadeIn') &&
  html.includes('w-11 h-11 min-w-[44px] min-h-[44px]') &&
  (html.includes('aria-label="Annulla"') || html.includes('aria-label="Cancel"')) &&
  html.includes('text-base') &&
  html.includes('min-h-[44px]') &&
  html.includes('flex-1 min-h-[44px]');

console.log('OVERALL MODAL VERDICT:', allPassed ? 'ALL PASS ✓' : 'FAIL ✗');
if (!allPassed) process.exit(1);
