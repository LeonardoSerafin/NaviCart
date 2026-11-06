import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Store, ClipboardList, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { loadLists, LISTS_CHANGED_EVENT } from '../utils/storage';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Il badge di "Le Mie Liste" mostra il numero complessivo di liste (non degli articoli)
  // e si aggiorna subito a ogni creazione o eliminazione.
  const [totalListsCount, setTotalListsCount] = useState(() => loadLists().length);
  useEffect(() => {
    const refresh = () => setTotalListsCount(loadLists().length);
    refresh();
    window.addEventListener(LISTS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(LISTS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [location.pathname]);

  const navItems = [
    {
      id: 'home',
      path: '/home',
      label: t('navHome'),
      icon: Store,
      isActive: location.pathname === '/' || location.pathname.startsWith('/home') || location.pathname.startsWith('/store'),
    },
    {
      id: 'lists',
      path: '/lists',
      label: t('navLists'),
      icon: ClipboardList,
      badge: totalListsCount > 0 ? totalListsCount : undefined,
      isActive: location.pathname.startsWith('/lists'),
    },
    {
      id: 'account',
      path: '/account',
      label: t('navAccount'),
      icon: User,
      isActive: location.pathname.startsWith('/account'),
    },
  ];

  return (
    <div className="min-h-screen min-h-dvh bg-night flex justify-center text-ink font-sans antialiased">
      {/* ── Colonna "telefono": carta su fondale scuro ── */}
      <div className="w-full max-w-md paper-grain min-h-screen min-h-dvh flex flex-col relative border-x border-rule-strong">
        <main
          id="main-content"
          className="flex-1 pb-24 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] overflow-y-auto scrollbar-none"
        >
          <Outlet />
        </main>

        {/* ── Barra di navigazione: una riga di inchiostro sulla carta ── */}
        <nav
          role="navigation"
          aria-label={t('mainNavAria')}
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-card border-t border-ink px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
        >
          <div role="tablist" aria-label={t('tabsAria')} className="grid grid-cols-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  data-nav-id={item.id === 'home' ? 'navHome' : item.id === 'lists' ? 'navLists' : 'navAccount'}
                  aria-selected={item.isActive}
                  aria-current={item.isActive ? 'page' : undefined}
                  aria-label={item.badge !== undefined ? `${item.label} (${item.badge})` : item.label}
                  onClick={() => navigate(item.path)}
                  className={`group relative flex flex-col items-center justify-center min-h-[48px] py-1.5 px-2 select-none transition-colors duration-150 ease-out motion-reduce:transition-none ${
                    item.isActive ? 'text-ink' : 'text-ink-faint hover:text-ink'
                  }`}
                >
                  {/* segnalibro sopra la scheda attiva */}
                  <span
                    aria-hidden="true"
                    className={`absolute -top-[7px] left-1/2 -translate-x-1/2 h-[4px] w-9 rounded-b-sm bg-tomato transition-transform duration-150 ease-out origin-top ${
                      item.isActive ? 'scale-y-100' : 'scale-y-0'
                    }`}
                  />
                  <span className="relative">
                    <Icon
                      className={`w-[22px] h-[22px] ${
                        item.isActive ? 'stroke-[2.2] text-tomato' : 'stroke-[1.7]'
                      }`}
                      aria-hidden="true"
                    />
                    {item.badge !== undefined && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1.5 -right-3.5 min-w-[18px] h-[18px] px-1 bg-tomato text-card text-[11px] font-extrabold tabular-nums rounded-full flex items-center justify-center border-2 border-card pointer-events-none"
                      >
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[11px] leading-tight mt-1 tracking-wide text-center truncate max-w-full ${
                      item.isActive ? 'font-extrabold' : 'font-semibold'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
