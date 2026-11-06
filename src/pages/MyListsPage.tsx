import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  FileText,
  Camera,
  AlertTriangle,
  Check,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react';
import { availableStores, getStoreById } from '../data/stores';
import { loadLists, saveLists, deleteListById, createNewList } from '../utils/storage';
import { ShoppingList } from '../types';
import { useLanguage } from '../context/LanguageContext';
import StoreStamp from '../components/StoreStamp';
import Portal from '../components/Portal';
import { listDisplayName, presetTitle, productText } from '../i18n/productText';
import {
  parseGroceryTextForStore,
  UnavailableItemReport,
  DEMO_EXTERNAL_APP_LISTS,
  SAMPLE_OCR_PHOTO_LISTS,
} from '../utils/parser';

export default function MyListsPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [lists, setLists] = useState<ShoppingList[]>(() => loadLists());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStoreForNew, setSelectedStoreForNew] = useState(availableStores[0].id);
  const [newListName, setNewListName] = useState('');

  // Creation mode: manual | text (WhatsApp, Keep, Alexa) | photo (OCR)
  const [creationMode, setCreationMode] = useState<'manual' | 'text' | 'photo'>('text');
  const [importText, setImportText] = useState('');
  const [manualDraftItem, setManualDraftItem] = useState('');
  const [draftItems, setDraftItems] = useState<string[]>([]);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // Deletion confirmation modal state
  const [listToDelete, setListToDelete] = useState<{ id: string; name: string } | null>(null);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement | null>(null);

  // Unavailable products modal report
  const [unavailableReport, setUnavailableReport] = useState<{
    storeName: string;
    missingItems: UnavailableItemReport[];
    pendingListId: string;
    availableCount: number;
  } | null>(null);

  // Scroll locking & keyboard dismissal for confirmation dialog
  useEffect(() => {
    if (listToDelete) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setListToDelete(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => cancelDeleteBtnRef.current?.focus(), 50);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [listToDelete]);

  // Scroll locking & keyboard dismissal for create modal
  useEffect(() => {
    if (showCreateModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowCreateModal(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showCreateModal]);

  // Group lists by supermarket
  const groupedLists = availableStores.map((store) => {
    return {
      store,
      lists: lists.filter((l) => l.storeId === store.id),
    };
  });

  const handleDeleteClick = (e: React.MouseEvent, list: ShoppingList) => {
    e.stopPropagation();
    setListToDelete({ id: list.id, name: list.name });
  };

  const confirmDelete = () => {
    if (listToDelete) {
      deleteListById(listToDelete.id);
      setLists(loadLists());
      setListToDelete(null);
    }
  };

  const cancelDelete = () => {
    setListToDelete(null);
  };

  const resetForm = () => {
    setNewListName('');
    setImportText('');
    setManualDraftItem('');
    setDraftItems([]);
    setUploadedImagePreview(null);
    setOcrSuccess(false);
    setIsOcrScanning(false);
  };

  const handleAddDraftItem = () => {
    const trimmed = manualDraftItem.trim();
    if (!trimmed) return;
    setDraftItems((prev) => [...prev, trimmed]);
    setManualDraftItem('');
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle file input for photo OCR
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate OCR text recognition with exact 700ms latency
    setIsOcrScanning(true);
    setOcrSuccess(false);
    setTimeout(() => {
      setIsOcrScanning(false);
      setOcrSuccess(true);
      // Realistic OCR extracted items
      setImportText(
        `2 pacchi Spaghetti Barilla n.5\nMele Melinda Val di Non\nNutella Ferrero 750g\nLatte Granarolo Alta Qualità\nCaffè Lavazza Qualità Rossa\n1 confezione Tofu naturale biologico\nAvocado Hass`
      );
      if (!newListName) {
        setNewListName(t('photoListName').replace('{brand}', getStoreById(selectedStoreForNew).brand));
      }
    }, 700);
  };

  // Handle sample photo selection
  const handleSelectSamplePhoto = (sample: (typeof SAMPLE_OCR_PHOTO_LISTS)[0]) => {
    setIsOcrScanning(true);
    setOcrSuccess(false);
    setUploadedImagePreview(null);
    setTimeout(() => {
      setIsOcrScanning(false);
      setOcrSuccess(true);
      setImportText(sample.text);
      setNewListName(presetTitle(sample.id, sample.title, language).replace(/^\S+\s/, ''));
    }, 500);
  };

  // Handle external app template selection
  const handleSelectDemoApp = (demo: (typeof DEMO_EXTERNAL_APP_LISTS)[0]) => {
    setImportText(demo.text);
    setNewListName(t('quickListName').replace('{brand}', demo.app));
  };

  // Confirm creation
  const handleCreate = () => {
    const store = getStoreById(selectedStoreForNew);
    const name = newListName.trim() || t('newListDefault').replace('{brand}', store.brand);

    let textToParse = importText.trim();
    if (creationMode === 'manual') {
      if (draftItems.length > 0) {
        textToParse = draftItems.join('\n');
      } else {
        // Manual empty list creation
        const created = createNewList(store.id, name);
        setLists(loadLists());
        setShowCreateModal(false);
        resetForm();
        navigate(`/store/${store.id}?listId=${created.id}`);
        return;
      }
    }

    if (!textToParse) {
      // Empty list creation fallback
      const created = createNewList(store.id, name);
      setLists(loadLists());
      setShowCreateModal(false);
      resetForm();
      navigate(`/store/${store.id}?listId=${created.id}`);
      return;
    }

    // Parse text for this specific store
    const parseResult = parseGroceryTextForStore(textToParse, store.id);

    if (parseResult.unavailableItems.length > 0) {
      // If items are missing: create the list with available items
      const created = createNewList(store.id, name);
      created.items = parseResult.availableItems;

      const currentLists = loadLists().filter((l) => l.id !== created.id);
      saveLists([created, ...currentLists]);
      setLists(loadLists());

      // Show the mandatory Alert Modal
      setShowCreateModal(false);
      setUnavailableReport({
        storeName: store.name,
        missingItems: parseResult.unavailableItems,
        pendingListId: created.id,
        availableCount: parseResult.availableItems.length,
      });
      return;
    }

    // All products available!
    const created = createNewList(store.id, name);
    created.items = parseResult.availableItems;
    const currentLists = loadLists().filter((l) => l.id !== created.id);
    saveLists([created, ...currentLists]);
    setLists(loadLists());
    setShowCreateModal(false);
    resetForm();
    navigate(`/lists/${created.id}`);
  };

  // User accepts the unavailable products alert
  const handleAcceptUnavailable = () => {
    if (unavailableReport) {
      const listId = unavailableReport.pendingListId;
      setUnavailableReport(null);
      resetForm();
      navigate(`/lists/${listId}`);
    }
  };

  const tabBtn = (active: boolean) =>
    `min-h-[44px] py-2.5 px-2 text-[11.5px] font-extrabold rounded-md transition-colors duration-150 ease-out motion-reduce:transition-none flex flex-col items-center justify-center gap-1 ${
      active ? 'bg-card text-ink border border-ink' : 'text-ink-soft hover:text-ink border border-transparent'
    }`;

  const sampleBtn =
    'text-left p-2.5 px-3.5 bg-card hover:bg-paper-deep border border-rule-strong rounded-lg text-[12.5px] font-semibold text-ink flex items-center justify-between min-h-[44px] transition-colors duration-150 ease-out motion-reduce:transition-none';

  return (
    <div className="px-5 pt-4 pb-6 space-y-6 animate-fadeIn">
      {/* ── Testata ── */}
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-[1.05] font-medium tracking-tight text-ink text-balance">
            {t('myListsHeaderTitle')}
          </h1>
          <p className="text-[13px] text-ink-soft mt-1.5 text-pretty">{t('myListsHeaderSubtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="btn btn-tomato min-h-[48px] px-4 py-2.5 text-[13px] flex-shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
          <span>{t('btnNewList')}</span>
        </button>
      </header>

      {/* ── Liste raggruppate per supermercato ── */}
      <div className="space-y-7">
        {groupedLists.map(({ store, lists: storeLists }) => (
          <section key={store.id} aria-labelledby={`store-heading-${store.id}`} className="space-y-3">
            <div className="flex items-center gap-3">
              <StoreStamp brand={store.brand} size={34} />
              <div className="min-w-0 flex-1">
                <h3
                  id={`store-heading-${store.id}`}
                  className="font-display text-[19px] leading-tight font-semibold text-ink"
                >
                  {store.name}
                </h3>
                <span className="sr-only">{store.brand}</span>
              </div>
              <span className="text-[11px] text-ink-soft font-extrabold tabular-nums uppercase tracking-wider">
                {`${storeLists.length} ${storeLists.length === 1 ? t('listSingular') : t('listPlural')}`}
              </span>
            </div>
            <div className="h-px bg-ink" aria-hidden="true" />

            {storeLists.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedStoreForNew(store.id);
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="w-full rounded-[10px] p-5 border-[1.5px] border-dashed border-rule-strong hover:border-ink text-center cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none min-h-[44px] group"
              >
                <p className="text-[13px] text-ink-soft mb-2">{t('noListsFound')}</p>
                <span className="text-[13px] font-extrabold text-tomato flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  {t('createOrImportFor').replace('{brand}', store.brand)}
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                {storeLists.map((list) => {
                  const totalPrice = list.items.reduce(
                    (sum, i) => sum + i.product.price * i.quantity,
                    0
                  );
                  const checkedCount = list.items.filter((i) => i.checked).length;
                  const percent = list.items.length > 0 ? Math.round((checkedCount / list.items.length) * 100) : 0;

                  return (
                    <div
                      key={list.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/lists/${list.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/lists/${list.id}`);
                        }
                      }}
                      className="slip slip-interactive cursor-pointer group overflow-hidden"
                    >
                      <div className="p-4 pb-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <h4 className="font-display text-[19px] leading-snug font-semibold text-ink truncate text-balance">
                            {listDisplayName(list, language)}
                          </h4>
                          <span className="font-display text-[17px] font-semibold text-ink tabular-nums flex-shrink-0">
                            {`€${totalPrice.toFixed(2)}`}
                          </span>
                        </div>

                        {/* Anteprima articoli */}
                        <div className="flex items-center gap-1.5 mt-3 overflow-hidden">
                          {list.items.slice(0, 6).map((item) => (
                            <span
                              key={item.id}
                              className="plate w-8 h-8 text-[15px]"
                              title={productText(item.product, language).name}
                            >
                              {item.product.icon}
                            </span>
                          ))}
                          {list.items.length > 6 && (
                            <span className="text-[11px] text-ink-soft font-extrabold px-1.5 tabular-nums">
                              {`+${list.items.length - 6}`}
                            </span>
                          )}
                        </div>

                        {list.items.length > 0 && (
                          <div className="track h-1.5 mt-3.5">
                            <div
                              className="bg-basil h-full w-full origin-left transition-transform duration-200 ease-out"
                              style={{ transform: `scaleX(${percent / 100})` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="perf mx-0" aria-hidden="true" />

                      <div className="flex items-center justify-between pl-4 pr-1.5 py-0.5 text-[13px]">
                        <div className="text-ink-soft flex items-center gap-1.5 tabular-nums">
                          <span className="font-extrabold text-ink">
                            {list.items.length} {t('itemsCount')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold">
                            {`${checkedCount}/${list.items.length} ${t('pickedWord')}`}
                          </span>
                        </div>

                        <div className="flex items-center flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, list)}
                            aria-label={`${t('delete')} ${listDisplayName(list, language)}`}
                            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-md text-ink-soft hover:text-tomato transition-colors duration-150 ease-out motion-reduce:transition-none flex items-center justify-center"
                          >
                            <Trash2 className="w-[18px] h-[18px]" aria-hidden="true" />
                          </button>

                          <span aria-hidden="true" className="w-8 h-11 flex items-center justify-center text-ink group-hover:translate-x-0.5 transition-transform duration-150 motion-reduce:transition-none">
                            <ChevronRight className="w-5 h-5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* ============================================================
          CONFERMA ELIMINAZIONE
         ============================================================ */}
      <Portal>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        aria-hidden={!listToDelete}
        className={listToDelete ? 'sheet-backdrop animate-fadeIn' : 'hidden'}
        onClick={(e) => {
          if (e.target === e.currentTarget) cancelDelete();
        }}
      >
        <div className="sheet text-center space-y-4 animate-scaleUp" tabIndex={-1}>
          <div className="sheet-handle" aria-hidden="true" />
          <div className="w-12 h-12 rounded-full bg-tomato-tint text-tomato flex items-center justify-center mx-auto" aria-hidden="true">
            <Trash2 className="w-6 h-6 stroke-[2]" />
          </div>

          <div className="space-y-1">
            <h3 id="delete-dialog-title" className="font-display text-[22px] font-semibold text-ink text-balance">
              {t('deleteListBtn')}
            </h3>
            <p id="delete-dialog-description" className="text-[13px] text-ink-soft text-pretty">
              {t('confirmDeleteList')}
            </p>
            {listToDelete && (
              <p className="font-display italic text-[16px] text-ink truncate px-2 pt-1">
                “{listDisplayName(listToDelete, language)}”
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              ref={cancelDeleteBtnRef}
              type="button"
              onClick={cancelDelete}
              className="btn btn-quiet min-h-[48px] px-4 py-2.5 text-sm"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="btn btn-danger min-h-[48px] px-4 py-2.5 text-sm"
            >
              {t('delete')}
            </button>
          </div>
        </div>
      </div>
      </Portal>

      {/* ============================================================
          CREA O IMPORTA LISTA (TESTO, FOTO OCR, MANUALE)
         ============================================================ */}
      <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
        aria-hidden={!showCreateModal}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowCreateModal(false);
        }}
        className={showCreateModal ? 'sheet-backdrop animate-fadeIn' : 'hidden'}
      >
        <div className="sheet space-y-4">
          <div className="sheet-handle" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h3 id="create-modal-title" className="font-display text-[24px] leading-tight font-semibold text-ink text-balance">
              <span>{t('importModalTitle')}</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              aria-label={t('cancel')}
              className="text-ink-soft hover:text-ink min-w-[44px] min-h-[44px] w-11 h-11 -mr-2 flex items-center justify-center rounded-md"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Supermercato */}
          <div>
            <label htmlFor="select-supermarket-new" className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-soft mb-1.5">
              {t('storeSelectLabel')}
            </label>
            <select
              id="select-supermarket-new"
              value={selectedStoreForNew}
              onChange={(e) => setSelectedStoreForNew(e.target.value)}
              className="field px-3.5 py-2.5 text-base sm:text-sm font-bold min-h-[44px]"
            >
              {availableStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.distance})
                </option>
              ))}
            </select>
          </div>

          {/* Nome */}
          <div>
            <label htmlFor="input-new-list-name" className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-soft mb-1.5">
              {t('listNameLabel')}
            </label>
            <input
              id="input-new-list-name"
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t('listNamePlaceholder')}
              className="field px-3.5 py-2.5 text-base sm:text-sm min-h-[44px]"
            />
          </div>

          {/* Modalità */}
          <div>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-soft mb-1.5">
              {t('createModeLabel')}
            </span>
            <div role="tablist" aria-label={t('createModeLabel')} className="grid grid-cols-3 gap-1 p-1 bg-paper-deep rounded-lg">
              <button
                type="button"
                role="tab"
                id="tab-mode-text"
                aria-selected={creationMode === 'text'}
                aria-controls="panel-mode-text"
                onClick={() => setCreationMode('text')}
                className={tabBtn(creationMode === 'text')}
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                <span>{t('modeTextApp')}</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-mode-photo"
                aria-selected={creationMode === 'photo'}
                aria-controls="panel-mode-photo"
                onClick={() => setCreationMode('photo')}
                className={tabBtn(creationMode === 'photo')}
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                <span>{t('modeOcr')}</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-mode-manual"
                aria-selected={creationMode === 'manual'}
                aria-controls="panel-mode-manual"
                onClick={() => setCreationMode('manual')}
                className={tabBtn(creationMode === 'manual')}
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>{language === 'it' ? 'Manuale' : 'Manual'}</span>
              </button>
            </div>
          </div>

          {/* ── Testo / App ── */}
          <div
            id="panel-mode-text"
            role="tabpanel"
            aria-labelledby="tab-mode-text"
            className={creationMode === 'text' ? 'space-y-3' : 'hidden'}
          >
            <div>
              <label htmlFor="textarea-import-text" className="block text-[12.5px] font-semibold text-ink-soft mb-1.5">
                {t('textImportHelp')}
              </label>
              <textarea
                id="textarea-import-text"
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={t('textPlaceholder')}
                className="field p-3 text-base sm:text-sm font-mono resize-none"
              />
            </div>

            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-soft mb-1.5">
                {t('quickDemoListLabel')}
              </span>
              <div className="flex flex-col gap-1.5">
                {DEMO_EXTERNAL_APP_LISTS.map((demo) => (
                  <button key={demo.id} type="button" onClick={() => handleSelectDemoApp(demo)} className={sampleBtn}>
                    <span className="truncate">
                      {`${demo.icon} ${presetTitle(demo.id, demo.title, language)}`}
                    </span>
                    <ArrowRight className="w-4 h-4 text-ink-soft flex-shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Foto / scontrino ── */}
          <div
            id="panel-mode-photo"
            role="tabpanel"
            aria-labelledby="tab-mode-photo"
            className={creationMode === 'photo' ? 'space-y-3' : 'hidden'}
          >
            <div>
              <span className="block text-[12.5px] font-semibold text-ink-soft mb-1.5">
                {t('photoImportHelp')}
              </span>

              <label className="border-[1.5px] border-dashed border-rule-strong hover:border-ink rounded-[10px] p-4 flex flex-col items-center justify-center cursor-pointer bg-card transition-colors duration-150 ease-out motion-reduce:transition-none text-center group min-h-[96px] focus-within:outline focus-within:outline-2 focus-within:outline-tomato">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label={t('photoImportHelp')}
                />
                <Camera className="w-6 h-6 text-tomato mb-1" aria-hidden="true" />
                <span className="text-[13px] font-extrabold text-ink">
                  {t('ocrTakePhoto')}
                </span>
                <span className="text-[11.5px] text-ink-soft mt-0.5">
                  {t('ocrHint')}
                </span>
              </label>
            </div>

            {uploadedImagePreview && (
              <div className="relative rounded-lg overflow-hidden border border-rule-strong bg-paper-deep p-2.5 space-y-2">
                <div className="relative rounded-md overflow-hidden max-h-48 flex items-center justify-center">
                  <img
                    src={uploadedImagePreview}
                    alt={t('ocrAlt')}
                    className="w-full max-h-44 object-contain rounded-md"
                  />
                  {isOcrScanning && (
                    <div className="absolute inset-0 bg-ink/30 flex items-center justify-center">
                      <div className="bg-card px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-extrabold text-ink">
                        <Sparkles className="w-3.5 h-3.5 text-tomato animate-spin" aria-hidden="true" />
                        <span>{t('ocrScanning')}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-bold text-ink truncate">
                    {t('receiptLoaded')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImagePreview(null);
                      setOcrSuccess(false);
                      setImportText('');
                    }}
                    className="text-[12px] font-extrabold text-tomato hover:text-tomato-deep min-h-[44px] px-2 py-2 flex items-center gap-1 rounded-md"
                    aria-label={t('removeReceiptAria')}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t('removeWord')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Scansione in corso: uno scontrino che si legge */}
            <div
              role="status"
              aria-live="polite"
              className={
                isOcrScanning
                  ? 'p-3.5 bg-card rounded-[10px] border border-rule-strong text-center space-y-2.5 animate-pulse'
                  : 'hidden'
              }
            >
              <div className="flex items-center justify-center gap-2 text-[13px] font-extrabold text-ink">
                <Sparkles className="w-4 h-4 text-tomato animate-spin" aria-hidden="true" />
                <span>{t('photoOcrScanning')}</span>
              </div>
              <div className="space-y-1.5 bg-paper p-3 border border-rule">
                <div className="h-2.5 bg-ink/70 w-3/4 mx-auto" />
                <div className="h-2 bg-rule-strong w-5/6 mx-auto" />
                <div className="h-2 bg-rule-strong w-2/3 mx-auto" />
                <div className="h-2 bg-rule-strong w-4/5 mx-auto" />
                <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-rule-strong px-1">
                  <div className="h-2 bg-rule-strong w-14" />
                  <div className="h-2 bg-tomato w-10" />
                </div>
              </div>
              <span className="sr-only">{t('ocrScanning')}</span>
            </div>

            {ocrSuccess && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-basil">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>{t('photoOcrSuccess')}</span>
                </div>
                <textarea
                  rows={3}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  aria-label={t('photoOcrSuccess')}
                  className="field p-3 text-base sm:text-sm font-mono resize-none"
                />
              </div>
            )}

            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-soft mb-1.5">
                {t('ocrTryExample')}
              </span>
              <div className="flex flex-col gap-1.5">
                {SAMPLE_OCR_PHOTO_LISTS.map((sample) => (
                  <button key={sample.id} type="button" onClick={() => handleSelectSamplePhoto(sample)} className={sampleBtn}>
                    <span className="truncate">{presetTitle(sample.id, sample.title, language)}</span>
                    <ArrowRight className="w-4 h-4 text-ink-soft flex-shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Manuale ── */}
          <div
            id="panel-mode-manual"
            role="tabpanel"
            aria-labelledby="tab-mode-manual"
            className={creationMode === 'manual' ? 'space-y-3' : 'hidden'}
          >
            <div className="bg-paper-deep/70 rounded-[10px] p-3 border border-rule text-left space-y-2.5">
              <p className="text-[13px] text-ink-soft text-pretty">
                {t('createListFor')} <strong className="text-ink">{getStoreById(selectedStoreForNew).name}</strong>. {t('manualIntroRest')}
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="manual-draft-item-input" className="sr-only">
                  {t('addItemLabel')}
                </label>
                <input
                  id="manual-draft-item-input"
                  type="text"
                  value={manualDraftItem}
                  onChange={(e) => setManualDraftItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDraftItem();
                    }
                  }}
                  placeholder={t('manualPlaceholder')}
                  className="field flex-1 min-h-[44px] px-3.5 py-2 text-base sm:text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddDraftItem}
                  aria-label={t('addDraftItemAria')}
                  className="btn btn-ink min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                  <span>{t('addWord')}</span>
                </button>
              </div>

              {draftItems.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-card border border-rule divide-y divide-rule">
                  {draftItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between min-h-[44px] pl-3 text-[13px] font-semibold text-ink"
                    >
                      <span className="truncate">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftItem(idx)}
                        aria-label={t('removeItemAria').replace('{name}', item)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-soft hover:text-tomato"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Azioni */}
          <div className="flex items-center gap-2 pt-3 border-t border-rule">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn btn-quiet flex-1 min-h-[48px] py-2.5 text-sm"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="btn btn-tomato flex-[1.4] min-h-[48px] py-2.5 text-sm"
            >
              {creationMode === 'manual' && draftItems.length === 0 ? t('btnConfirmAdd') : t('btnCreateAndImport')}
            </button>
          </div>
        </div>
      </div>
      </Portal>

      {/* ============================================================
          AVVISO OBBLIGATORIO: PRODOTTI NON DISPONIBILI
         ============================================================ */}
      {unavailableReport && (
        <Portal>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unavailable-modal-title"
          className="sheet-backdrop animate-fadeIn"
        >
          <div className="sheet space-y-4 animate-scaleUp">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-mustard-tint text-mustard-deep flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <AlertTriangle className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div className="min-w-0">
                <h3 id="unavailable-modal-title" className="font-display text-[21px] font-semibold text-ink leading-tight text-balance">
                  {t('unavailableModalTitle')}
                </h3>
                <p className="text-[12px] text-ink-soft mt-0.5 truncate">
                  {unavailableReport.storeName}
                </p>
              </div>
            </div>

            <p className="text-[13px] text-ink-soft text-pretty">
              {t('unavailableModalSubtitle')}{' '}
              <strong className="text-ink">{unavailableReport.storeName}</strong>:
            </p>

            {/* Elenco come righe di scontrino barrate */}
            <div
              role="list"
              aria-label={t('unavailableModalTitle')}
              className="max-h-44 overflow-y-auto bg-tomato-tint/60 border border-tomato/40 rounded-[10px] divide-y divide-tomato/20"
            >
              {unavailableReport.missingItems.map((item, idx) => (
                <div
                  key={idx}
                  role="listitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-bold text-tomato-deep"
                >
                  <span aria-hidden="true">✕</span>
                  <span className="truncate">{item.name}</span>
                  {item.quantity > 1 && (
                    <span className="text-[11px] font-semibold ml-auto flex-shrink-0 tabular-nums">
                      (x{item.quantity})
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-basil-tint rounded-[10px] p-3 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-basil flex-shrink-0 stroke-[2.8]" aria-hidden="true" />
              <p className="text-[13px] text-ink font-medium leading-snug">
                {t('remainingItemsNote').replace('{n}', String(unavailableReport.availableCount))}
              </p>
            </div>

            {/* Una sola azione, come da requisito REQ-005 */}
            <button
              id="btnAcceptAndContinue"
              data-testid="btnAcceptAndContinue"
              type="button"
              onClick={handleAcceptUnavailable}
              className="btn btn-ink w-full min-h-[48px] py-3 text-sm"
            >
              <span>{t('btnAcceptAndContinue')}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
