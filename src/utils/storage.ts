import { ShoppingList, ShoppingItem } from '../types';
import { getProductById } from '../data/products';
import {
  availableStores,
  iperPoliTrento,
  lidlTrento,
  conadTrento,
  poliTrentoSud,
} from '../data/stores';

const LISTS_KEY = 'navicart_lists';
const SELECTED_STORE_KEY = 'navicart_selected_store';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function buildDemoItems(productIds: string[]): ShoppingItem[] {
  return productIds
    .map((id) => {
      const prod = getProductById(id);
      if (!prod) return null;
      return {
        id: generateId(),
        productId: prod.id,
        product: prod,
        quantity: 1,
        checked: false,
      };
    })
    .filter((i): i is ShoppingItem => i !== null);
}

export function getDefaultDemoLists(): ShoppingList[] {
  return [
    {
      id: 'list-iperpoli-settimanale',
      storeId: iperPoliTrento.id,
      storeName: iperPoliTrento.name,
      name: 'Spesa Settimanale Famiglia 🛒',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      items: buildDemoItems([
        'prod-mele-melinda',
        'prod-pandistelle',
        'prod-spaghetti-barilla',
        'prod-polpa-mutti',
        'prod-olio-monini',
        'prod-parmigiano-parmareggio',
        'prod-prosciutto-parma-citterio',
        'prod-acqua-san-benedetto',
        'prod-bastoncini-findus',
      ]),
    },
    {
      id: 'list-conad-carbonara',
      storeId: conadTrento.id,
      storeName: conadTrento.name,
      name: 'Cena Carbonara & Aperitivo 🍝',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      items: buildDemoItems([
        'prod-spaghetti-barilla',
        'prod-uova-aia-bio',
        'prod-parmigiano-parmareggio',
        'prod-pomodori-pachino',
        'prod-olio-monini',
        'prod-birra-moretti',
      ]),
    },
    {
      id: 'list-lidl-pranzo',
      storeId: lidlTrento.id,
      storeName: lidlTrento.name,
      name: 'Pranzo & Snack Veloci 🥪',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: buildDemoItems([
        'prod-insalata-bonduelle',
        'prod-mozzarella-galbani',
        'prod-petto-pollo-aia',
        'prod-banane-chiquita',
        'prod-succo-santal-arancia',
        'prod-macine',
      ]),
    },
    {
      id: 'list-poli-dispensa',
      storeId: poliTrentoSud.id,
      storeName: poliTrentoSud.name,
      name: 'Colazione & Dispensa Poli ☕',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: buildDemoItems([
        'prod-caffe-lavazza',
        'prod-nutella',
        'prod-latte-granarolo',
        'prod-fette-biscottate',
        'prod-riso-carnaroli-scotti',
      ]),
    },
  ];
}

export const LISTS_CHANGED_EVENT = 'navicart:lists-changed';

export function saveLists(lists: ShoppingList[]): void {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  // Avvisa chi mostra il numero di liste (es. il badge della barra in basso)
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(LISTS_CHANGED_EVENT));
  }
}

export function loadLists(): ShoppingList[] {
  const raw = localStorage.getItem(LISTS_KEY);
  if (!raw) {
    const initial = getDefaultDemoLists();
    saveLists(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const initial = getDefaultDemoLists();
      saveLists(initial);
      return initial;
    }
    return parsed;
  } catch {
    const initial = getDefaultDemoLists();
    saveLists(initial);
    return initial;
  }
}

export function getListById(id: string): ShoppingList | undefined {
  const lists = loadLists();
  return lists.find((l) => l.id === id);
}

export function createNewList(storeId: string, customName?: string): ShoppingList {
  const store = availableStores.find((s) => s.id === storeId) || availableStores[0];
  const lists = loadLists();
  const count = lists.filter((l) => l.storeId === storeId).length + 1;

  const newList: ShoppingList = {
    id: generateId(),
    storeId: store.id,
    storeName: store.name,
    name: customName?.trim() || `Nuova Spesa ${store.brand} #${count}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };

  const updated = [newList, ...lists];
  saveLists(updated);
  return newList;
}

export function deleteListById(id: string): void {
  const lists = loadLists().filter((l) => l.id !== id);
  saveLists(lists);
}

// Aliases for E2E testing framework compatibility
export const deleteList = deleteListById;
export const createEmptyList = createNewList;

export function saveSelectedStore(storeId: string): void {
  localStorage.setItem(SELECTED_STORE_KEY, storeId);
}

export function loadSelectedStore(): string {
  return localStorage.getItem(SELECTED_STORE_KEY) || availableStores[0].id;
}
