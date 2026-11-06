import React from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Porta il contenuto direttamente in <body>: una finestra "fixed" resta così
 * ancorata allo schermo, qualunque trasformazione abbiano gli elementi della pagina.
 * In rendering lato server (test) non c'è `document`: si rende sul posto.
 */
export default function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
}
