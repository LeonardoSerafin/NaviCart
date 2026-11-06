import React from 'react';
import { renderToString } from 'react-dom/server';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url, { jsx: true });

// Load app components and data via jiti
export const storesData = jiti('../../src/data/stores.ts');
export const productsData = jiti('../../src/data/products.ts');
export const translationsData = jiti('../../src/i18n/translations.ts');
export const storageUtils = jiti('../../src/utils/storage.ts');
if (!storageUtils.deleteList) storageUtils.deleteList = storageUtils.deleteListById;
if (!storageUtils.createEmptyList) storageUtils.createEmptyList = storageUtils.createNewList;
export const parserUtils = jiti('../../src/utils/parser.ts');
export const routeUtils = jiti('../../src/utils/routeOptimizer.ts');

export function createShoppingItem(productId: string, quantity = 1, checked = false) {
  const prod = productsData.getProductById ? productsData.getProductById(productId) : productsData.italianProducts.find((p: any) => p.id === productId);
  return {
    id: storageUtils.generateId(),
    productId,
    product: prod,
    quantity,
    checked,
  };
}

export const { LanguageProvider, useLanguage } = jiti('../../src/context/LanguageContext.tsx');
export const { MemoryRouter, Routes, Route, Navigate } = jiti('react-router-dom');

export const Layout = jiti('../../src/components/Layout.tsx').default;
export const HomePage = jiti('../../src/pages/HomePage.tsx').default;
export const StoreCatalogPage = jiti('../../src/pages/StoreCatalogPage.tsx').default;
export const MyListsPage = jiti('../../src/pages/MyListsPage.tsx').default;
export const ListDetailPage = jiti('../../src/pages/ListDetailPage.tsx').default;
export const AccountPage = jiti('../../src/pages/AccountPage.tsx').default;
export const StoreMap = jiti('../../src/components/StoreMap.tsx').default;
export const RouteStats = jiti('../../src/components/RouteStats.tsx').default;

let mockStore: Record<string, string> = {};

export function initMockStorage(initial?: {
  lists?: any[];
  language?: 'it' | 'en';
  selectedStore?: string;
}) {
  mockStore = {};
  if (initial?.lists) {
    mockStore['navicart_lists'] = JSON.stringify(initial.lists);
  } else {
    mockStore['navicart_lists'] = JSON.stringify(storageUtils.getDefaultDemoLists());
  }
  if (initial?.language) {
    mockStore['navicart_language'] = initial.language;
  }
  if (initial?.selectedStore) {
    mockStore['navicart_selected_store'] = initial.selectedStore;
  }

  globalThis.localStorage = {
    getItem: (key: string) => (key in mockStore ? mockStore[key] : null),
    setItem: (key: string, val: string) => {
      mockStore[key] = String(val);
    },
    removeItem: (key: string) => {
      delete mockStore[key];
    },
    clear: () => {
      mockStore = {};
    },
    key: (i: number) => Object.keys(mockStore)[i] || null,
    length: Object.keys(mockStore).length,
  };

  (globalThis as any).window = globalThis;
}

export function getMockStorage(): Record<string, string> {
  return { ...mockStore };
}

export interface RenderOptions {
  path?: string;
  language?: 'it' | 'en';
  initialLists?: any[];
}

export function renderWithProviders(
  element: React.ReactElement,
  options: RenderOptions = {}
): string {
  initMockStorage({
    lists: options.initialLists,
    language: options.language || 'it',
  });

  const path = options.path || '/home';

  const tree = React.createElement(
    LanguageProvider,
    null,
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      element
    )
  );

  return renderToString(tree);
}

export function renderAppRoute(
  path: string,
  options: { language?: 'it' | 'en'; initialLists?: any[] } = {}
): string {
  initMockStorage({
    lists: options.initialLists,
    language: options.language || 'it',
  });

  const appRoutes = React.createElement(
    Routes,
    null,
    React.createElement(
      Route,
      { path: '/', element: React.createElement(Layout) },
      React.createElement(Route, { index: true, element: React.createElement(Navigate, { to: '/home', replace: true }) }),
      React.createElement(Route, { path: 'home', element: React.createElement(HomePage) }),
      React.createElement(Route, { path: 'store/:storeId', element: React.createElement(StoreCatalogPage) }),
      React.createElement(Route, { path: 'lists', element: React.createElement(MyListsPage) }),
      React.createElement(Route, { path: 'lists/:listId', element: React.createElement(ListDetailPage) }),
      React.createElement(Route, { path: 'account', element: React.createElement(AccountPage) }),
      React.createElement(Route, { path: '*', element: React.createElement(Navigate, { to: '/home', replace: true }) })
    )
  );

  const tree = React.createElement(
    LanguageProvider,
    null,
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      appRoutes
    )
  );

  return renderToString(tree);
}

export function extractTags(html: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>|<${tagName}[^>]*\\/>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}
