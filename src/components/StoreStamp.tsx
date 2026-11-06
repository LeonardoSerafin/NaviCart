import React from 'react';

/** Colore del timbro per insegna. Solo estetica: nessuna logica dipende da qui. */
const STAMP_TONES: Record<string, string> = {
  IperPoli: '#2f5a85',
  Lidl: '#8a6a00',
  Conad: '#b03a22',
  Poli: '#2f5636',
};

interface StoreStampProps {
  brand: string;
  size?: number;
  className?: string;
}

/** Timbro circolare con l'iniziale dell'insegna, come un bollo su una ricevuta. */
export default function StoreStamp({ brand, size = 44, className = '' }: StoreStampProps) {
  const tone = STAMP_TONES[brand] || '#1f2a24';
  const initials = brand.slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size, color: tone }}
    >
      <svg width={size} height={size} viewBox="0 0 44 44" className="absolute inset-0">
        <circle cx="22" cy="22" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="22" cy="22" r="16.5" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.5 2.2" />
      </svg>
      <span className="relative font-display font-bold leading-none" style={{ fontSize: size * 0.46 }}>
        {initials}
      </span>
    </span>
  );
}
