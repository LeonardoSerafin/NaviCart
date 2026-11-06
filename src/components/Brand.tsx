import React from 'react';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Marchio NaviCart: un foglietto rosso con un percorso tratteggiato
 * che parte da un punto e arriva a una tappa. Stesso disegno del favicon.
 */
export function LogoMark({ size = 36, className = '' }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="7" fill="#b03a22" />
      <path
        d="M8 25 C 8 18, 15 21, 15.5 15 S 24 14, 24 10"
        fill="none"
        stroke="#fcfaf4"
        strokeWidth="2"
        strokeDasharray="0.1 3.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="25" r="2.4" fill="none" stroke="#fcfaf4" strokeWidth="1.6" />
      <path
        d="M24 5.2 a4.4 4.4 0 0 1 4.4 4.4 c0 3 -4.4 7.2 -4.4 7.2 s-4.4 -4.2 -4.4 -7.2 a4.4 4.4 0 0 1 4.4 -4.4z"
        fill="#fcfaf4"
      />
      <circle cx="24" cy="9.6" r="1.6" fill="#b03a22" />
    </svg>
  );
}

interface WordmarkProps {
  className?: string;
}

/** Scritta NaviCart in serif, con "Cart" in corsivo. */
export function Wordmark({ className = '' }: WordmarkProps) {
  return (
    <span className={`font-display tracking-tight ${className}`}>
      Navi<span className="italic text-tomato">Cart</span>
    </span>
  );
}
