import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, Check, ShoppingBag } from 'lucide-react';
import { saveLists, loadLists } from '../utils/storage';
import { getStoreById } from '../data/stores';
import { optimizeRoute } from '../utils/routeOptimizer';
import { ShoppingList, OptimizedRoute } from '../types';
import StoreMap from '../components/StoreMap';
import RouteStats from '../components/RouteStats';
import { useLanguage } from '../context/LanguageContext';
import { productText, listDisplayName } from '../i18n/productText';

export default function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [allLists, setAllLists] = useState<ShoppingList[]>(() => loadLists());
  // Tappa scelta dall'utente (per id: resta ferma anche quando gli altri articoli vengono presi)
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  // Ultimo articolo preso: è lì che si trova l'utente in pianta
  const [lastPickedId, setLastPickedId] = useState<string | null>(null);

  const list = useMemo(() => {
    return allLists.find((l) => l.id === listId);
  }, [allLists, listId]);

  const store = useMemo(() => {
    if (!list) return undefined;
    return getStoreById(list.storeId);
  }, [list]);

  // Save changes to localStorage whenever allLists updates
  useEffect(() => {
    saveLists(allLists);
  }, [allLists]);

  // Piano completo della spesa: l'ordine e i numeri delle tappe restano fissi,
  // anche quando i prodotti vengono presi uno dopo l'altro.
  const plan = useMemo(() => {
    if (!store || !list || list.items.length === 0) return null;
    return optimizeRoute(
      store,
      list.items.map((i) => ({ ...i, checked: false }))
    );
  }, [store, list]);

  // Dove si trova l'utente: davanti all'ultimo prodotto preso (altrimenti all'ingresso)
  const startItemId = useMemo(() => {
    if (!plan || !list) return undefined;
    const checked = new Set(list.items.filter((i) => i.checked).map((i) => i.id));
    if (lastPickedId && checked.has(lastPickedId)) return lastPickedId;
    for (let k = plan.orderedItems.length - 1; k >= 0; k--) {
      if (checked.has(plan.orderedItems[k].id)) return plan.orderedItems[k].id;
    }
    return undefined;
  }, [plan, list, lastPickedId]);

  // Percorso ancora da fare: parte dalla posizione dell'utente, tocca i prodotti restanti nell'ordine del piano
  const route: OptimizedRoute | null = useMemo(() => {
    if (!store || !list || !plan) return null;
    const remaining = optimizeRoute(store, list.items, {
      startItemId,
      fixedOrder: plan.orderedItems.map((i) => i.id),
    });
    const byId = new Map(list.items.map((i) => [i.id, i]));
    return {
      ...remaining,
      // tutte le tappe, prese comprese, con il numero originale
      turnInstructions: plan.turnInstructions.map((ti) => ({ ...ti, item: byId.get(ti.item.id) ?? ti.item })),
    };
  }, [store, list, plan, startItemId]);

  const userPosition = useMemo(() => {
    if (!route || !store) return undefined;
    const start = route.turnInstructions.find((ti) => ti.item.id === startItemId);
    return start?.access ?? { x: store.entrance.x, y: store.entrance.y };
  }, [route, store, startItemId]);

  // Tappa attiva: quella scelta, altrimenti la prima ancora da prendere
  const safeActiveStopIndex = (() => {
    if (!route || route.turnInstructions.length === 0) return 0;
    const chosen = route.turnInstructions.findIndex((ti) => ti.item.id === activeStopId);
    if (chosen >= 0) return chosen;
    const firstOpen = route.turnInstructions.findIndex((ti) => !ti.item.checked);
    return firstOpen >= 0 ? firstOpen : route.turnInstructions.length - 1;
  })();

  if (!list || !store) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="font-display italic text-lg text-ink-soft">{t('listNotFound')}</p>
        <button
          onClick={() => navigate('/lists')}
          className="btn btn-ink min-h-[44px] text-xs py-2.5 px-4"
        >
          {t('backBtn')}
        </button>
      </div>
    );
  }

  // Quick increment item quantity
  const handleIncrement = (itemId: string) => {
    const newItems = list.items.map((i) =>
      i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
    );
    const updated = { ...list, items: newItems, updatedAt: new Date().toISOString() };
    setAllLists((prev) => prev.map((l) => (l.id === list.id ? updated : l)));
  };

  // Quick decrement item quantity
  const handleDecrement = (itemId: string) => {
    let newItems = list.items
      .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
      .filter((i) => i.quantity > 0);

    const updated = { ...list, items: newItems, updatedAt: new Date().toISOString() };
    setAllLists((prev) => prev.map((l) => (l.id === list.id ? updated : l)));
  };

  // Quick delete item
  const handleDeleteItem = (itemId: string) => {
    const newItems = list.items.filter((i) => i.id !== itemId);
    const updated = { ...list, items: newItems, updatedAt: new Date().toISOString() };
    setAllLists((prev) => prev.map((l) => (l.id === list.id ? updated : l)));
  };

  // Toggle item picked checkmark
  const handleToggleCheck = (itemId: string) => {
    const newItems = list.items.map((i) =>
      i.id === itemId ? { ...i, checked: !i.checked } : i
    );
    const nowChecked = newItems.find((i) => i.id === itemId)?.checked;
    if (nowChecked) {
      // l'utente è ora davanti a questo prodotto; la tappa attiva passa alla successiva da prendere
      setLastPickedId(itemId);
      const order = plan ? plan.turnInstructions.map((ti) => ti.item.id) : [];
      const openIds = order.filter((id) => !newItems.find((i) => i.id === id)?.checked);
      const here = order.indexOf(itemId);
      const next = openIds.find((id) => order.indexOf(id) > here) ?? openIds[0] ?? null;
      setActiveStopId(next);
    } else {
      setActiveStopId(itemId);
    }
    const updated = { ...list, items: newItems, updatedAt: new Date().toISOString() };
    setAllLists((prev) => prev.map((l) => (l.id === list.id ? updated : l)));
  };

  const totalPrice = list.items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const checkedCount = list.items.filter((i) => i.checked).length;
  const progressPercent = list.items.length > 0 ? Math.round((checkedCount / list.items.length) * 100) : 0;

  // Aisle IDs that currently hold unchecked items
  const highlightedAisleIds = list.items
    .filter((i) => !i.checked)
    .map((i) => i.product.aisleId);

  return (
    <div className="pb-6 animate-fadeIn">
      {/* ── Testata fissa ── */}
      <div className="px-5 py-2 bg-paper border-b border-ink flex items-center justify-between sticky top-0 z-30">
        <button
          type="button"
          onClick={() => navigate('/lists')}
          aria-label={t('navLists')}
          className="min-h-[44px] min-w-[44px] -ml-2 px-2 flex items-center gap-1.5 text-[13px] font-extrabold text-ink hover:text-tomato transition-colors duration-150 ease-out motion-reduce:transition-none"
        >
          <ArrowLeft className="w-[18px] h-[18px] stroke-[2.2]" aria-hidden="true" />
          <span>{t('navLists')}</span>
        </button>

        <div className="text-right min-w-0 flex-1 ml-3">
          <h1 className="font-display text-[18px] font-semibold text-ink truncate leading-tight text-balance">
            {listDisplayName(list, language)}
          </h1>
          <div className="text-[11.5px] text-tomato font-extrabold uppercase tracking-[0.12em] truncate">
            {store.name}
          </div>
        </div>
      </div>

      <div className="px-5 pt-3 space-y-6">
        {/* ============================================================
            IN ALTO: PIANTA CON IL PERCORSO OTTIMIZZATO
           ============================================================ */}
        <section className="space-y-3">
          {/* Mappa + tappa corrente stanno in una sola schermata: niente scorrimento per segnare un prodotto */}
          <div
            className={route ? 'flex flex-col gap-2 -mx-5' : ''}
            style={route ? { height: 'calc(100dvh - 8.4rem - env(safe-area-inset-bottom, 0px))', minHeight: 430 } : undefined}
          >
            <div className={route ? 'flex-1 min-h-0' : ''}>
              <StoreMap
                store={store}
                route={route || undefined}
                highlightedAisleIds={highlightedAisleIds}
                activeStopIndex={safeActiveStopIndex}
                userPosition={userPosition}
                fit={!!route}
                onAisleSelect={(aisleId) => {
                  if (!route) return;
                  const inAisle = route.turnInstructions.filter((ti) => ti.item.product.aisleId === aisleId);
                  const target = inAisle.find((ti) => !ti.item.checked) ?? inAisle[0];
                  if (target) setActiveStopId(target.item.id);
                }}
              />
            </div>

            {route && (
              <div className="px-2.5">
              <RouteStats
                part="stop"
                route={route}
                activeStopIndex={safeActiveStopIndex}
                onSelectStop={(idx) => {
                  const target = route.turnInstructions[idx];
                  if (target) setActiveStopId(target.item.id);
                }}
                onTogglePickItem={(item) => handleToggleCheck(item.id)}
              />
              </div>
            )}
          </div>

        {/* ── Avanzamento ── */}
        <section className="slip p-4">
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">{t('progressTitle')}</span>
            <span className="font-display text-[17px] font-semibold text-ink tabular-nums">
              {`${checkedCount} / ${list.items.length} ${t('pickedWord')} (${progressPercent}%)`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('progressTitle')}
            className="track w-full h-2.5"
          >
            <div
              className="bg-basil h-full w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
          </div>
        </section>


          {route && <RouteStats part="summary" route={route} activeStopIndex={safeActiveStopIndex} />}
        </section>

        {/* ============================================================
            IN BASSO: LISTA CON AZIONI RAPIDE
           ============================================================ */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[24px] font-semibold text-ink leading-tight text-balance">
                {t('listSectionTitle')} ({list.items.length})
              </h2>
              <div className="text-[13px] text-ink-soft mt-0.5">
                {t('estimatedTotal')}: <span className="text-ink font-extrabold tabular-nums">€{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* [+] porta alla 1.1 modificando SOLO questa lista */}
            <button
              type="button"
              onClick={() => navigate(`/store/${store.id}?listId=${list.id}`)}
              className="btn btn-tomato min-h-[44px] px-3.5 py-2.5 text-[13px] flex-shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" aria-hidden="true" />
              <span>{t('btnAddProductsToList')}</span>
            </button>
          </div>

          {list.items.length === 0 ? (
            <div className="rounded-[10px] p-7 border-[1.5px] border-dashed border-rule-strong text-center">
              <ShoppingBag className="w-8 h-8 text-ink-faint mx-auto mb-2" aria-hidden="true" />
              <p className="text-[13px] text-ink-soft mb-3 text-pretty">{t('emptyListDetail')}</p>
              <button
                onClick={() => navigate(`/store/${store.id}?listId=${list.id}`)}
                className="btn btn-tomato min-h-[44px] text-[13px] py-2.5 px-4"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('btnAddProductsToList')}</span>
              </button>
            </div>
          ) : (
            <div className="slip divide-y divide-rule overflow-hidden">
              {list.items.map((item) => {
                const p = item.product;
                const text = productText(p, language);

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-1 pl-1 pr-3.5 py-2.5 transition-colors duration-150 ease-out ${
                      item.checked ? 'bg-paper-deep/60' : ''
                    }`}
                  >
                    {/* Spunta */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.checked}
                      aria-label={(item.checked ? t('markTodoAria') : t('markPickedAria')).replace('{name}', text.name)}
                      onClick={() => handleToggleCheck(item.id)}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                    >
                      <span
                        className={`w-[22px] h-[22px] rounded-[5px] border-[1.8px] flex items-center justify-center transition-colors duration-150 ease-out motion-reduce:transition-none ${
                          item.checked ? 'bg-basil border-basil text-card' : 'border-ink bg-card'
                        }`}
                      >
                        {item.checked && <Check className="w-3.5 h-3.5 stroke-[3.4]" aria-hidden="true" />}
                      </span>
                    </button>

                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] flex-shrink-0 select-none" aria-hidden="true">{p.icon}</span>
                        <span className="text-[11.5px] font-extrabold text-ink-soft uppercase tracking-[0.1em] truncate">
                          {p.brand}
                        </span>
                      </div>

                      <div
                        className={`text-[15px] font-semibold leading-snug text-pretty ${
                          item.checked ? 'line-through text-ink-faint' : 'text-ink'
                        }`}
                      >
                        {text.name}
                      </div>

                      <div className="text-[12px] text-ink-soft mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="tag tag-bio" style={{ color: 'var(--color-ink)' }}>
                          {text.aisleName}
                        </span>
                        <span className="tabular-nums">{`€${p.price.toFixed(2)} ${t('perUnit')}`}</span>
                      </div>

                      {/* Quantità e rimozione */}
                      <div className="flex items-center justify-between mt-1.5 -ml-1">
                        <div className="flex items-center border-[1.5px] border-ink rounded-lg overflow-hidden bg-card">
                          <button
                            type="button"
                            onClick={() => handleDecrement(item.id)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-paper-deep active:scale-[0.95] transition-colors duration-150 ease-out motion-reduce:transition-none"
                            title={t('decreaseQty')}
                            aria-label={t('decreaseQty')}
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.6]" aria-hidden="true" />
                          </button>
                          <span className="min-w-[28px] text-center font-display text-[17px] font-bold tabular-nums text-ink">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrement(item.id)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-paper-deep active:scale-[0.95] transition-colors duration-150 ease-out motion-reduce:transition-none"
                            title={t('increaseQty')}
                            aria-label={t('increaseQty')}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.6]" aria-hidden="true" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-ink-soft hover:text-tomato transition-colors duration-150 ease-out motion-reduce:transition-none"
                          title={t('delete')}
                          aria-label={`${t('delete')} ${text.name}`}
                        >
                          <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 text-right flex-shrink-0">
                      <span className={`font-display text-[17px] font-semibold tabular-nums ${item.checked ? 'text-ink-faint' : 'text-ink'}`}>
                        {`€${(p.price * item.quantity).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
