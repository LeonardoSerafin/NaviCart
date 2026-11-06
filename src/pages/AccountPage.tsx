import React, { useState, useEffect } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LogoMark } from '../components/Brand';
import { loadLists, saveLists, getDefaultDemoLists } from '../utils/storage';
import Portal from '../components/Portal';

export default function AccountPage() {
  const { language, setLanguage, t } = useLanguage();
  const [resetMessage, setResetMessage] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const lists = loadLists();
  const totalItems = lists.reduce((sum, l) => sum + l.items.length, 0);

  const executeReset = () => {
    const demo = getDefaultDemoLists();
    saveLists(demo);
    setShowConfirmModal(false);
    setResetMessage(true);
    setTimeout(() => setResetMessage(false), 3000);
  };

  // Keyboard Escape listener for confirm reset modal
  useEffect(() => {
    if (!showConfirmModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal]);

  const langRow = (code: 'it' | 'en', name: string, tag: string) => {
    const active = language === code;
    return (
      <button
        type="button"
        onClick={() => setLanguage(code)}
        aria-pressed={active}
        className={`w-full min-h-[48px] px-3.5 py-3 flex items-center gap-3 text-left transition-colors duration-150 ease-out motion-reduce:transition-none ${
          active ? 'bg-mustard-tint/60' : 'hover:bg-paper-deep/50'
        }`}
      >
        <span className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft w-6">{tag}</span>
        <span className={`flex-1 text-[15px] ${active ? 'font-extrabold text-ink' : 'font-semibold text-ink-soft'}`}>{name}</span>
        <span
          className={`w-[22px] h-[22px] rounded-full border-[1.8px] flex items-center justify-center ${
            active ? 'bg-ink border-ink text-paper' : 'border-rule-strong'
          }`}
          aria-hidden="true"
        >
          {active && <Check className="w-3.5 h-3.5 stroke-[3.4]" />}
        </span>
      </button>
    );
  };

  // Codice a barre decorativo, sempre uguale
  const barcode = '3 1 2 1 1 3 2 1 3 1 1 2 1 3 2 2 1 1 3 1 2 1 2 3 1 1 2 1 3 1 2 2 1 3 1 1 2 3 1 2'
    .split(' ')
    .map(Number);
  const barWidth = barcode.reduce((acc, bw) => acc + bw * 1.6 + 1.2, 0);
  const bars = barcode.map((w, i) => {
    const x = barcode.slice(0, i).reduce((acc, bw) => acc + bw * 1.6 + 1.2, 0);
    return i % 2 === 0 ? <rect key={i} x={x} y="0" width={w * 1.6} height="26" fill="currentColor" /> : null;
  });

  return (
    <div className="px-5 pt-4 pb-6 space-y-6 animate-fadeIn">
      <header>
        <h1 className="font-display text-[30px] leading-[1.05] font-medium tracking-tight text-ink">
          {t('accountTitle')}
        </h1>
      </header>

      {/* ── Tessera personale ── */}
      <section
        aria-label={t('cardAria')}
        className="relative overflow-hidden rounded-[14px] bg-ink text-paper p-5 border border-ink"
      >
        <div className="flex items-start justify-between gap-3">
          <LogoMark size={34} />
          <span className="text-[11px] font-extrabold tracking-[0.14em] text-mustard border border-mustard/70 rounded-[3px] px-2 py-0.5">
            PRO
          </span>
        </div>

        <div className="mt-6">
          <h2 className="font-display text-[30px] leading-none font-medium tracking-tight">Leonardo</h2>
          <p className="text-[13px] text-paper/80 font-medium mt-2">{t('accountUserRole')}</p>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold tracking-[0.14em] text-paper/60 uppercase">{t('cardLabel')}</div>
            <div className="text-[12px] font-bold tracking-[0.12em] mt-0.5">{t('projectCourseBadge')}</div>
          </div>
          <svg width={barWidth} height="26" viewBox={`0 0 ${barWidth} 26`} className="text-paper/90 flex-shrink-0" aria-hidden="true">
            {bars}
          </svg>
        </div>
      </section>

      {/* ── Lingua ── */}
      <section className="space-y-2.5">
        <div className="rule-title">
          <span>{t('languageSectionTitle')}</span>
        </div>
        <div className="slip divide-y divide-rule overflow-hidden">
          {langRow('it', 'Italiano', 'IT')}
          {langRow('en', 'English', 'EN')}
        </div>
      </section>

      {/* ── Statistiche ── */}
      <section className="space-y-2.5">
        <div className="rule-title">
          <span>{t('statsSectionTitle')}</span>
        </div>

        <div className="slip grid grid-cols-2 divide-x divide-y divide-rule overflow-hidden">
          <div className="p-4">
            <div className="text-[11.5px] text-ink-soft font-extrabold uppercase tracking-[0.12em]">
              {t('statTotalLists')}
            </div>
            <div className="font-display text-[34px] leading-none font-semibold text-ink mt-2 tabular-nums">
              {lists.length}
            </div>
            <div className="text-[12px] text-ink-soft font-medium mt-1.5">
              {t('itemsSaved').replace('{n}', String(totalItems))}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[11.5px] text-ink-soft font-extrabold uppercase tracking-[0.12em]">
              {t('statHoursSaved')}
            </div>
            <div className="font-display text-[34px] leading-none font-semibold text-basil mt-2 tabular-nums">
              ~2.8 h
            </div>
            <div className="text-[12px] text-ink-soft font-medium mt-1.5">
              {t('timeSavedSub')}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[11.5px] text-ink-soft font-extrabold uppercase tracking-[0.12em]">
              {t('statDistanceAvoided')}
            </div>
            <div className="font-display text-[34px] leading-none font-semibold text-ink mt-2 tabular-nums">
              1.4 km
            </div>
            <div className="text-[12px] text-ink-soft font-medium mt-1.5">
              {t('zeroBackForth')}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[11.5px] text-ink-soft font-extrabold uppercase tracking-[0.12em]">
              {t('statAvgOptimization')}
            </div>
            <div className="font-display text-[34px] leading-none font-semibold text-tomato mt-2 tabular-nums">
              42%
            </div>
            <div className="text-[12px] text-ink-soft font-medium mt-1.5">
              {t('snakeRoute')}
            </div>
          </div>
        </div>
      </section>

      {/* ── Dati ── */}
      <section className="space-y-2.5">
        <div className="rule-title">
          <span>{t('dataManagementTitle')}</span>
        </div>

        <div className="slip p-4 space-y-3">
          <p className="text-[13px] text-ink-soft text-pretty">
            {t('resetDemoDesc')}
          </p>

          {resetMessage && (
            <div className="bg-basil-tint text-basil text-[13px] font-extrabold p-3 rounded-lg flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 flex-shrink-0 stroke-[3]" aria-hidden="true" />
              <span>{t('demoResetSuccess')}</span>
            </div>
          )}

          <button
            type="button"
            data-show-confirm="true"
            id="confirmModalTrigger"
            onClick={() => setShowConfirmModal(true)}
            className="btn btn-line w-full min-h-[48px] py-3 px-4 text-[13px]"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{t('btnResetDemo')}</span>
          </button>
        </div>

        {showConfirmModal && (
          <Portal>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-reset-title"
            className="sheet-backdrop animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConfirmModal(false);
            }}
          >
            <div className="sheet space-y-4 animate-scaleUp">
              <div className="sheet-handle" aria-hidden="true" />
              <h3 id="confirm-reset-title" className="font-display text-[22px] font-semibold text-ink text-balance">
                {t('btnResetDemo')}
              </h3>
              <p className="text-[13px] text-ink-soft text-pretty">
                {t('resetConfirmBody')}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="btn btn-quiet flex-1 min-h-[48px] py-2.5 text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={executeReset}
                  className="btn btn-tomato flex-1 min-h-[48px] py-2.5 text-sm"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
          </Portal>
        )}
      </section>

      {/* ── Informazioni ── */}
      <section className="space-y-2 pt-1">
        <div className="rule-title">
          <span>{t('aboutTitle')}</span>
        </div>
        <p className="text-[13px] text-ink-soft leading-relaxed text-pretty">
          {t('aboutDescription')}
        </p>
        <div className="pt-2 text-[11px] text-ink-faint font-semibold flex items-center justify-between">
          <span>NaviCart v0.9</span>
          <span>Trento Smart Shopping</span>
        </div>
      </section>
    </div>
  );
}
