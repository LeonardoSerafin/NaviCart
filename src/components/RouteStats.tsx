import React from 'react';
import { Timer, Footprints, TrendingDown, CheckCircle2, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { OptimizedRoute, ShoppingItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { productText } from '../i18n/productText';

interface RouteStatsProps {
  route: OptimizedRoute;
  activeStopIndex?: number;
  onSelectStop?: (index: number) => void;
  onTogglePickItem?: (item: ShoppingItem) => void;
  /** 'stop' = solo il biglietto della tappa, 'summary' = solo l'efficienza, 'all' = tutto */
  part?: 'stop' | 'summary' | 'all';
  className?: string;
}

export default function RouteStats({
  route,
  activeStopIndex = 0,
  onSelectStop,
  onTogglePickItem,
  part = 'all',
  className = '',
}: RouteStatsProps) {
  const { t, language } = useLanguage();
  const currentInstruction = route.turnInstructions[activeStopIndex];
  const currentItem = currentInstruction?.item;
  const currentText = currentItem ? productText(currentItem.product, language) : undefined;
  const stepNumber = currentInstruction?.stepNumber ?? activeStopIndex + 1;
  const allPicked = route.turnInstructions.length > 0 && route.orderedItems.length === 0;

  const formatMinSec = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  };

  const percentTimeSaved =
    route.unoptimizedTime > 0
      ? Math.round((route.timeSaved / route.unoptimizedTime) * 100)
      : 0;

  const percentDistanceSaved =
    route.unoptimizedDistance > 0
      ? Math.round((route.distanceSaved / route.unoptimizedDistance) * 100)
      : 0;

  // Traduzione del lato dello scaffale
  const getTranslatedShelfSide = (side: 'sx' | 'dx' | 'testata' | 'banco') => {
    switch (side) {
      case 'sx':
        return t('aisleLeftShelf');
      case 'dx':
        return t('aisleRightShelf');
      case 'testata':
        return t('aisleEndcap');
      case 'banco':
        return t('aisleCounter');
      default:
        return side;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── Prossima fermata: un biglietto da staccare ── */}
      {part !== 'summary' && currentItem && (
        <div className="slip border-ink overflow-hidden">
          <div className="bg-ink text-paper px-4 py-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-extrabold uppercase tracking-[0.12em] text-[11px]">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mustard opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mustard" />
              </span>
              <span>{`${currentItem.checked ? t('pickedBadge').toUpperCase() : t('nextStopTitle')} · ${t('stepOf')} ${stepNumber} ${t('of')} ${route.turnInstructions.length}`}</span>
            </span>
            <span className="font-bold text-[11px] text-paper/90 truncate">{currentText?.aisleName}</span>
          </div>

          <div className="px-3.5 py-3 flex items-start gap-3">
            {/* numero della tappa */}
            <div className="flex flex-col items-center flex-shrink-0 w-12">
              <span className="font-display text-[38px] leading-[0.9] font-semibold text-tomato tabular-nums">
                {stepNumber}
              </span>
              <span className="plate w-11 h-11 text-[24px] mt-1.5">{currentItem.product.icon}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] text-ink-soft font-extrabold uppercase tracking-[0.12em]">
                {currentItem.product.brand}
              </div>
              <h4 className="font-display text-[20px] font-semibold text-ink leading-tight text-balance mt-0.5">
                {currentText?.name}
              </h4>
              <p className="text-[12.5px] text-ink-soft font-semibold mt-2 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-tomato" aria-hidden="true" />
                <span>
                  {`${currentText?.aisleName} · ${getTranslatedShelfSide(currentItem.product.shelfSide)} (${currentItem.product.shelfSection})`}
                </span>
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="font-display text-[20px] font-semibold text-ink tabular-nums leading-none block">
                €{currentItem.product.price.toFixed(2)}
              </span>
              {currentItem.product.originalPrice && (
                <div className="text-[11px] text-tomato font-semibold line-through tabular-nums mt-1">
                  €{currentItem.product.originalPrice.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div className="perf" aria-hidden="true" />

          <div className="p-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTogglePickItem?.(currentItem)}
              className={`btn ${currentItem.checked ? 'btn-line' : 'btn-tomato'} flex-1 min-h-[46px] py-2 px-4 text-[14px] motion-reduce:transition-none`}
            >
              <CheckCircle2 className="w-[18px] h-[18px] stroke-[2.2]" aria-hidden="true" />
              <span>{currentItem.checked ? t('btnUnmarkPicked') : t('btnMarkPicked')}</span>
            </button>

            {route.turnInstructions.length > 1 && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  disabled={activeStopIndex <= 0}
                  onClick={() => onSelectStop?.(activeStopIndex - 1)}
                  className="btn btn-line p-3 min-w-[44px] min-h-[44px]"
                  aria-label={t('prevStop')}
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.4]" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={activeStopIndex >= route.turnInstructions.length - 1}
                  onClick={() => onSelectStop?.(activeStopIndex + 1)}
                  className="btn btn-line p-3 min-w-[44px] min-h-[44px]"
                  aria-label={t('nextStop')}
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.4]" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {part !== 'summary' && allPicked && (
        <div className="slip p-4 flex items-start gap-3 border-basil">
          <CheckCircle2 className="w-6 h-6 text-basil flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="font-display text-[19px] font-semibold text-ink leading-tight">{t('allPickedTitle')}</div>
            <p className="text-[13px] text-ink-soft mt-1 text-pretty">{t('allPickedBody')}</p>
          </div>
        </div>
      )}

      {/* ── Efficienza: due numeri grandi, separati da un filetto ── */}
      {part !== 'stop' && !allPicked && (
        <section className="slip">
          <div className="rule-title px-4 pt-3.5">
            <span>{t('efficiencyTitle')}</span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-rule">
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-[12px] text-ink-soft font-semibold mb-1.5">
                <Timer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('estimatedTime')}</span>
              </div>
              <div className="font-display text-[28px] font-semibold text-ink leading-none tabular-nums">
                {formatMinSec(route.estimatedTime)}
              </div>
              {route.timeSaved > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-extrabold text-basil bg-basil-tint px-2 py-0.5 rounded-[4px] tabular-nums">
                  <TrendingDown className="w-3 h-3" aria-hidden="true" />
                  <span>-{formatMinSec(route.timeSaved)} ({percentTimeSaved}%)</span>
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center gap-1.5 text-[12px] text-ink-soft font-semibold mb-1.5">
                <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('totalDistance')}</span>
              </div>
              <div className="font-display text-[28px] font-semibold text-ink leading-none tabular-nums">
                {route.totalDistance} m
              </div>
              {route.distanceSaved > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-extrabold text-basil bg-basil-tint px-2 py-0.5 rounded-[4px] tabular-nums">
                  <TrendingDown className="w-3 h-3" aria-hidden="true" />
                  <span>-{route.distanceSaved}m ({percentDistanceSaved}%)</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
