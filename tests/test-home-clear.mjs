import React from 'react';
import { renderToString } from 'react-dom/server';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url, { jsx: true });
const { initMockStorage } = jiti('./helpers/render-helper.ts');
const { LanguageProvider } = jiti('../src/context/LanguageContext.tsx');
const { MemoryRouter, Routes, Route } = jiti('react-router-dom');

initMockStorage({
  language: 'it',
});

// Patch React BEFORE loading HomePage to force searchQuery = 'conad'
const origUseState = React.useState;
React.useState = function(initialVal) {
  if (typeof initialVal === 'string' && initialVal === '') {
    return origUseState.call(this, 'conad');
  }
  return origUseState.call(this, initialVal);
};

const HomePage = jiti('../src/pages/HomePage.tsx').default;

const tree = React.createElement(
  LanguageProvider,
  null,
  React.createElement(
    MemoryRouter,
    { initialEntries: ['/home'] },
    React.createElement(
      Routes,
      null,
      React.createElement(Route, {
        path: '/home',
        element: React.createElement(HomePage),
      })
    )
  )
);

const html = renderToString(tree);

console.log('=== HOME SEARCH CLEAR BUTTON EMPIRICAL AUDIT ===');
console.log('1. clear-search-active class:', html.includes('clear-search-active'));
console.log('2. Touch target 44x44px (w-11 h-11 min-h-[44px] min-w-[44px]):', html.includes('w-11 h-11 min-h-[44px] min-w-[44px]'));
console.log('3. Accessible aria-label (Cancella ricerca):', html.includes('aria-label="Cancella ricerca"'));

const allPassed =
  html.includes('clear-search-active') &&
  html.includes('w-11 h-11 min-h-[44px] min-w-[44px]') &&
  html.includes('aria-label="Cancella ricerca"');

console.log('OVERALL HOME CLEAR VERDICT:', allPassed ? 'ALL PASS ✓' : 'FAIL ✗');
if (!allPassed) process.exit(1);
