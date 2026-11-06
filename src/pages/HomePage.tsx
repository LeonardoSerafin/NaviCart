import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Search, Navigation, ChevronRight } from 'lucide-react';
import { availableStores } from '../data/stores';
import { useLanguage } from '../context/LanguageContext';
import { LogoMark, Wordmark } from '../components/Brand';
import StoreStamp from '../components/StoreStamp';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStores = availableStores.filter((store) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      store.name.toLowerCase().includes(q) ||
      store.brand.toLowerCase().includes(q) ||
      store.address.toLowerCase().includes(q) ||
      store.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-5 pt-4 pb-6 space-y-6 animate-fadeIn">
      {/* ── Testata: marchio ── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={38} />
          <div>
            <h1 className="text-[26px] leading-none font-semibold text-ink">
              <Wordmark />
            </h1>
            <p className="text-[11.5px] text-ink-soft font-bold mt-1 uppercase tracking-[0.12em]">
              {t('brandTagline')}
            </p>
          </div>
        </div>
      </header>

      {/* ── Titolo con percorso tratteggiato ── */}
      <section className="relative pt-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 150 110"
          className="absolute -right-2 -top-1 w-[132px] h-auto text-tomato pointer-events-none"
        >
          <path
            d="M6 100 C 30 100, 38 70, 62 74 S 98 96, 108 58 S 118 30, 128 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="0.1 7"
          />
          <circle cx="6" cy="100" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M128 5 a11 11 0 0 1 11 11 c0 8 -11 17 -11 17 s-11 -9 -11 -17 a11 11 0 0 1 11 -11z"
            fill="currentColor"
          />
          <circle cx="128" cy="16" r="4" fill="#f4eee2" />
        </svg>

        <span className="tag tag-sale relative">{t('indoorMapAvailable')}</span>
        <h2 className="relative font-display text-[34px] leading-[1.04] font-medium tracking-tight text-ink text-balance mt-3 max-w-[11ch]">
          {t('homeHeaderTitle')}
        </h2>
        <p className="relative text-[13.5px] leading-relaxed text-ink-soft text-pretty mt-3 max-w-[30ch]">
          {t('homeHeaderSubtitle')}
        </p>
      </section>

      {/* ── Ricerca ── */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-soft pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchStorePlaceholder')}
          aria-label={t('searchStorePlaceholder')}
          className="field min-h-[48px] pl-11 pr-12 py-3 text-base"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label={t('clearSearch')}
            className="clear-search-active absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-soft hover:text-ink rounded-md"
          >
            <span className="text-sm font-bold leading-none" aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      {/* ── Punti vendita ── */}
      <section className="space-y-3.5">
        <div className="rule-title">
          <span>{t('mappedStoresTitle')}</span>
          <span role="status" aria-live="polite" className="tabular-nums normal-case tracking-normal font-semibold text-ink-soft order-last">
            {filteredStores.length} {t('nearbySupermarketsCount')}
          </span>
        </div>

        {filteredStores.length === 0 ? (
          <div className="slip text-center py-10 px-5 space-y-3">
            <div className="font-display italic text-[44px] leading-none text-rule-strong" aria-hidden="true">?</div>
            <h3 className="font-display text-lg font-semibold text-ink text-balance">
              {t('noStoreFoundTitle')}
            </h3>
            <p className="text-[13px] text-ink-soft text-pretty max-w-xs mx-auto">
              {`${t('noStoreFoundBody')} “${searchQuery}”.`}
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="btn btn-line min-h-[44px] px-4 py-2 text-xs"
            >
              {t('clearSearch')}
            </button>
          </div>
        ) : (
          filteredStores.map((store) => (
            <div
              key={store.id}
              role="button"
              tabIndex={0}
              data-href={`/store/${store.id}`}
              onClick={() => navigate(`/store/${store.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/store/${store.id}`);
                }
              }}
              aria-label={`${store.name}, ${store.address}, ${store.distance}`}
              className="slip slip-interactive w-full min-h-[44px] cursor-pointer overflow-hidden group"
            >
              <div className="flex items-stretch">
                {/* matrice del biglietto: timbro e distanza */}
                <div className="w-[84px] flex-shrink-0 flex flex-col items-center justify-center gap-2 py-4 bg-paper-deep/60 border-r-[1.5px] border-dashed border-rule-strong">
                  <StoreStamp brand={store.brand} size={46} />
                  <span className="text-[12px] font-extrabold text-ink tabular-nums leading-none">
                    {store.distance}
                  </span>
                </div>

                <div className="flex-1 min-w-0 p-3.5">
                  <h3 className="font-display text-[19px] leading-tight font-semibold text-ink text-balance">
                    {store.name}
                  </h3>

                  <div className="text-[12.5px] text-ink-soft flex items-center gap-1.5 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{store.address}</span>
                  </div>

                  <div className="text-[12.5px] text-ink-soft flex items-center gap-1.5 mt-1 tabular-nums">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-basil font-extrabold">{t('openStatus')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{store.openingHours}</span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-rule flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-ink-soft tabular-nums flex items-center gap-1">
                      <Navigation className="w-3 h-3" aria-hidden="true" />
                      {`${store.aisles.length} ${t('aislesAndCounters')}`}
                    </span>

                    <span className="text-[12.5px] font-extrabold text-tomato flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform duration-150 motion-reduce:transition-none">
                      {t('viewCatalogBtn')}
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
