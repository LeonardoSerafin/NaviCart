import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Tag,
  Leaf,
  MapPin,
  ArrowUpDown,
  Check,
  X,
} from 'lucide-react';
import { getStoreById } from '../data/stores';
import { searchProducts } from '../data/products';
import { isProductAvailableInStore } from '../utils/parser';
import {
  loadLists,
  saveLists,
  createNewList,
  generateId,
} from '../utils/storage';
import { Product, ProductSort, ShoppingList } from '../types';
import { useLanguage } from '../context/LanguageContext';
import Portal from '../components/Portal';
import { productText, listDisplayName } from '../i18n/productText';

export default function StoreCatalogPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchParams] = useSearchParams();
  const sourceListId = searchParams.get('listId');
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const store = getStoreById(storeId || '');

  // Lists state
  const [allLists, setAllLists] = useState<ShoppingList[]>(() => loadLists());

  // Filter lists belonging only to this supermarket
  const storeLists = useMemo(() => {
    return allLists.filter((l) => l.storeId === store.id);
  }, [allLists, store.id]);

  // Target list: if sourceListId is provided in URL, prioritize it; otherwise pick first store list or create one
  const [selectedListId, setSelectedListId] = useState<string>(() => {
    if (sourceListId) return sourceListId;
    if (storeLists.length > 0) return storeLists[0].id;
    return '';
  });

  // Modal for creating new list
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Escape key handler to close new list modal
  useEffect(() => {
    if (!showNewListModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNewListModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNewListModal]);

  // Lock body scroll while new list modal is open
  useEffect(() => {
    if (showNewListModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showNewListModal]);

  // Catalog filters & search
  const [searchQuery, setSearchQuery] = useState('');
  // Multi-selection filters
  const [selectedFilters, setSelectedFilters] = useState<Set<'sale' | 'bio' | 'local'>>(new Set());
  const [activeSort, setActiveSort] = useState<ProductSort>('suggested');

  const toggleFilter = (f: 'sale' | 'bio' | 'local') => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedFilters(new Set());
  };

  // Currently selected target list
  const activeList: ShoppingList | undefined = useMemo(() => {
    return allLists.find((l) => l.id === selectedListId);
  }, [allLists, selectedListId]);

  // Map of product quantities in the target list
  const listQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeList) return map;
    for (const item of activeList.items) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [activeList]);

  // Catalog products (filtered by store availability & multi-filter set)
  const products = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    // la ricerca guarda sia i nomi italiani sia quelli nella lingua scelta
    const list = searchProducts('', selectedFilters, undefined, activeSort).filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        productText(p, language).name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
    return list.filter((p) => isProductAvailableInStore(p.id, store.id));
  }, [searchQuery, selectedFilters, activeSort, store.id, language]);

  // Add product to active list
  const handleAddProduct = (product: Product) => {
    let targetList = activeList;

    // If no list exists for this store yet, create one
    if (!targetList) {
      targetList = createNewList(store.id, t('quickListName').replace('{brand}', store.brand));
      setSelectedListId(targetList.id);
    }

    const existingIndex = targetList.items.findIndex((i) => i.productId === product.id);
    let newItems = [...targetList.items];

    if (existingIndex >= 0) {
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity + 1,
      };
    } else {
      newItems.push({
        id: generateId(),
        productId: product.id,
        product,
        quantity: 1,
        checked: false,
      });
    }

    const updatedList: ShoppingList = {
      ...targetList,
      items: newItems,
      updatedAt: new Date().toISOString(),
    };

    const updatedAll = allLists.map((l) =>
      l.id === updatedList.id ? updatedList : l
    );
    if (!allLists.some((l) => l.id === updatedList.id)) {
      updatedAll.unshift(updatedList);
    }

    setAllLists(updatedAll);
    saveLists(updatedAll);
  };

  // Decrement or remove product from active list
  const handleDecrementProduct = (productId: string) => {
    if (!activeList) return;

    const existingIndex = activeList.items.findIndex((i) => i.productId === productId);
    if (existingIndex < 0) return;

    let newItems = [...activeList.items];
    if (newItems[existingIndex].quantity > 1) {
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity - 1,
      };
    } else {
      newItems = newItems.filter((i) => i.productId !== productId);
    }

    const updatedList: ShoppingList = {
      ...activeList,
      items: newItems,
      updatedAt: new Date().toISOString(),
    };

    const updatedAll = allLists.map((l) =>
      l.id === updatedList.id ? updatedList : l
    );

    setAllLists(updatedAll);
    saveLists(updatedAll);
  };

  // Create new list modal confirm
  const handleCreateNewList = () => {
    const name = newListName.trim() || t('newListDefault').replace('{brand}', store.brand);
    const created = createNewList(store.id, name);
    const updated = loadLists();
    setAllLists(updated);
    setSelectedListId(created.id);
    setNewListName('');
    setShowNewListModal(false);
  };

  const filterBtn = 'chip min-h-[44px] px-4 py-2.5 text-xs focus-visible:outline-none motion-reduce:transition-none';

  return (
    <div className="pb-6 animate-fadeIn">
      {/* ── Testata fissa: indietro + nome del negozio ── */}
      <div className="sticky top-0 z-30 bg-paper border-b border-ink px-5 py-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (sourceListId) {
              navigate(`/lists/${sourceListId}`);
            } else {
              navigate('/home');
            }
          }}
          aria-label={sourceListId ? t('returnToListBtn') : t('backBtn')}
          className="min-h-[44px] min-w-[44px] -ml-2 px-2 flex items-center gap-1.5 text-[13px] font-extrabold text-ink hover:text-tomato transition-colors duration-150 ease-out motion-reduce:transition-none"
        >
          <ArrowLeft className="w-[18px] h-[18px] stroke-[2.2] flex-shrink-0" aria-hidden="true" />
          <span>{sourceListId ? t('returnToListBtn') : t('backBtn')}</span>
        </button>

        <div className="text-right min-w-0">
          <div className="font-display text-[17px] leading-tight font-semibold italic text-ink truncate max-w-[210px] text-balance">
            {store.name}
          </div>
          <div className="text-[11px] text-tomato font-extrabold uppercase tracking-[0.14em]">
            {t('catalogHeaderTitle')}
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* ── Banner della lista di provenienza (se arrivo da 2.1 con +) ── */}
        {sourceListId && activeList && (
          <div
            role="region"
            aria-label={t('modifyingSourceList')}
            className="slip bg-mustard-tint border-mustard flex items-center justify-between gap-3 p-3.5"
          >
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold text-mustard-deep uppercase tracking-[0.14em] block">
                {t('modifyingSourceList')}
              </span>
              <span className="font-display text-[17px] font-semibold text-ink truncate block tabular-nums leading-snug">
                {`${listDisplayName(activeList, language)} (${activeList.items.length} ${
                  activeList.items.length === 1
                    ? (language === 'it' || t('itemsCount') === 'articoli' ? 'articolo' : 'item')
                    : t('itemsCount')
                })`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/lists/${sourceListId}`)}
              aria-label={`${t('returnToListBtn')}: ${listDisplayName(activeList, language)}`}
              className="btn btn-ink min-h-[44px] min-w-[76px] px-4 py-2 text-xs whitespace-nowrap"
            >
              Fatto ✓
            </button>
          </div>
        )}

        {/* ── Scelta della lista di destinazione (se non vincolato a una lista) ── */}
        {!sourceListId && (
          <section className="slip p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
                {t('targetListLabel')}
              </span>

              <button
                type="button"
                onClick={() => setShowNewListModal(true)}
                aria-label={t('btnCreateNewList')}
                className="btn btn-line min-h-[44px] px-3.5 py-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                <span>{t('btnCreateNewList')}</span>
              </button>
            </div>

            {storeLists.length === 0 ? (
              <div className="text-[13px] text-ink-soft py-1 italic text-pretty">
                {t('emptyStoreLists')}
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label={t('targetListLabel')}
                className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
              >
                {storeLists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={l.id === selectedListId}
                    onClick={() => setSelectedListId(l.id)}
                    className="chip min-h-[44px] px-3.5 py-2.5 text-xs"
                  >
                    {l.id === selectedListId && (
                      <Check className="w-3.5 h-3.5 stroke-[3] flex-shrink-0" aria-hidden="true" />
                    )}
                    <span>{listDisplayName(l, language)}</span>
                    <span
                      className={`text-[11px] font-extrabold tabular-nums px-1.5 py-0.5 rounded-full ${
                        l.id === selectedListId ? 'bg-paper text-ink' : 'bg-paper-deep text-ink-soft'
                      }`}
                    >
                      {l.items.length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Ricerca ── */}
        <div className="relative">
          <label htmlFor="store-catalog-search-input" className="sr-only">
            {t('searchProductPlaceholder')}
          </label>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-soft pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="store-catalog-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchProductPlaceholder')}
            className="field min-h-[48px] pl-11 pr-12 py-3 text-base sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t('cancel')}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-soft hover:text-ink rounded-md"
            >
              <X className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* ── Filtri a selezione multipla ── */}
        <div
          role="group"
          aria-label={t('filtersAria')}
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-5 px-5"
        >
          <button
            type="button"
            onClick={clearFilters}
            aria-pressed={selectedFilters.size === 0}
            className={filterBtn}
          >
            {t('filterAll')}
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('sale')}
            aria-pressed={selectedFilters.has('sale')}
            className={`${filterBtn} chip-sale`}
          >
            {selectedFilters.has('sale') && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
            <Tag className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('filterSale')}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('bio')}
            aria-pressed={selectedFilters.has('bio')}
            className={`${filterBtn} chip-bio`}
          >
            {selectedFilters.has('bio') && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
            <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('filterBio')}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('local')}
            aria-pressed={selectedFilters.has('local')}
            className={`${filterBtn} chip-local`}
          >
            {selectedFilters.has('local') && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('filterLocal')}</span>
          </button>
        </div>

        {/* ── Ordinamento e conteggio ── */}
        <div className="flex items-center justify-between text-xs text-ink-soft border-b border-rule-strong pb-1">
          <div className="flex items-center gap-1.5 min-h-[44px]">
            <ArrowUpDown className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <label htmlFor="product-sort-select" className="sr-only">
              {t('sortSuggested')}
            </label>
            <select
              id="product-sort-select"
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value as ProductSort)}
              aria-label={t('sortAria')}
              className="bg-transparent text-[13px] font-extrabold text-ink focus:outline-none rounded-md py-1 cursor-pointer"
            >
              <option value="suggested">{t('sortSuggested')}</option>
              <option value="price-asc">{t('sortPriceAsc')}</option>
              <option value="price-desc">{t('sortPriceDesc')}</option>
              <option value="name-asc">{t('sortNameAsc')}</option>
            </select>
          </div>

          <span className="text-[12.5px] text-ink-soft font-semibold tabular-nums">
            {`${products.length} ${t('productsFoundCount')}`}
          </span>
        </div>

        {/* ── Prodotti ── */}
        {products.length === 0 ? (
          <div className="slip p-8 text-center space-y-3">
            <div className="font-display italic text-[44px] leading-none text-rule-strong" aria-hidden="true">?</div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-semibold text-ink text-balance">
                {t('noProductsTitle')}
              </h3>
              <p className="text-[13px] text-ink-soft max-w-xs mx-auto text-pretty">
                {searchQuery
                  ? t('noResultsFor').replace('{query}', searchQuery)
                  : t('noProductsMatchFilters')}
              </p>
            </div>
            {(selectedFilters.size > 0 || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setSearchQuery('');
                }}
                className="btn btn-line min-h-[44px] px-4 py-2 text-xs"
              >
                {t('resetFilters')}
              </button>
            )}
          </div>
        ) : (
          <div className="slip divide-y divide-rule overflow-hidden">
            {products.map((product) => {
              const qty = listQuantityMap.get(product.id) || 0;

              return (
                <div
                  key={product.id}
                  className={`flex items-center justify-between gap-3 p-3 transition-colors duration-150 ease-out ${
                    qty > 0 ? 'bg-mustard-tint/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="plate w-12 h-12 text-2xl">
                      <span aria-hidden="true">{product.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11.5px] font-extrabold text-ink-soft uppercase tracking-[0.1em]">
                          {product.brand}
                        </span>
                        {product.isOnSale && <span className="tag tag-sale">{t('promoTag')}</span>}
                        {product.isBio && <span className="tag tag-bio">BIO</span>}
                        {product.isLocal && <span className="tag tag-local">KM 0</span>}
                      </div>

                      <h4 className="text-[14px] font-semibold text-ink leading-snug text-pretty">
                        {productText(product, language).name}
                      </h4>

                      <div className="text-[11.5px] text-ink-soft flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-ink whitespace-nowrap">{productText(product, language).aisleName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{productText(product, language).packageSize}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-display text-[17px] font-semibold text-ink tabular-nums leading-none">
                        €{product.price.toFixed(2)}
                      </div>
                      {product.originalPrice && (
                        <div className="text-[11px] text-tomato font-semibold line-through tabular-nums mt-1">
                          €{product.originalPrice.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {qty > 0 ? (
                      <div
                        role="group"
                        aria-label={t('qtyForAria').replace('{name}', productText(product, language).name)}
                        className="flex items-center border-[1.5px] border-ink rounded-lg overflow-hidden bg-card"
                      >
                        <button
                          type="button"
                          onClick={() => handleDecrementProduct(product.id)}
                          aria-label={t('reduceQtyAria').replace('{name}', productText(product, language).name)}
                          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-ink hover:bg-paper-deep active:scale-[0.96] transition-colors duration-150 ease-out motion-reduce:transition-none"
                        >
                          <Minus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                        </button>
                        <span className="min-w-[26px] text-center font-display text-[16px] font-bold tabular-nums text-ink select-none">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          aria-label={t('raiseQtyAria').replace('{name}', productText(product, language).name)}
                          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-ink hover:bg-paper-deep active:scale-[0.96] transition-colors duration-150 ease-out motion-reduce:transition-none"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddProduct(product)}
                        aria-label={t('addProductAria').replace('{name}', productText(product, language).name)}
                        className="btn btn-tomato min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg"
                        title={t('addToListTitle')}
                      >
                        <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Nuova lista (foglio dal basso) ── */}
      {showNewListModal && (
        <Portal>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-new-list-title"
          aria-describedby="modal-new-list-desc"
          className="sheet-backdrop animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewListModal(false);
            }
          }}
        >
          <div className="sheet space-y-4 animate-scaleUp">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3
                  id="modal-new-list-title"
                  className="font-display text-[22px] leading-tight font-semibold text-ink text-balance"
                >
                  {`${t('btnCreateNewList')} (${store.brand})`}
                </h3>
                <p id="modal-new-list-desc" className="text-[13px] text-ink-soft mt-1 text-pretty">
                  {t('createNewListPrompt')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewListModal(false)}
                aria-label={t('cancel')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-md text-ink-soft hover:text-ink hover:bg-paper-deep"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <label htmlFor="modal-new-list-input" className="sr-only">
              {t('createNewListPrompt')}
            </label>
            <input
              id="modal-new-list-input"
              type="text"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateNewList();
                }
              }}
              placeholder={t('newListPlaceholder').replace('{brand}', store.brand)}
              className="field min-h-[48px] px-3.5 py-2.5 text-base sm:text-sm"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewListModal(false)}
                className="btn btn-quiet flex-1 min-h-[48px] py-2.5 px-3 text-sm"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleCreateNewList}
                className="btn btn-tomato flex-1 min-h-[48px] py-2.5 px-3 text-sm"
              >
                {t('btnConfirmAdd')}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
