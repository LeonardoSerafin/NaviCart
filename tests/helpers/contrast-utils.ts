export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export const TAILWIND_COLOR_MAP: Record<string, string> = {
  'white': '#ffffff',
  'black': '#000000',
  // Slate
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'slate-950': '#020617',
  // Gray
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',
  // Emerald
  'emerald-50': '#ecfdf5',
  'emerald-100': '#d1fae5',
  'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7',
  'emerald-400': '#34d399',
  'emerald-500': '#10b981',
  'emerald-600': '#059669',
  'emerald-700': '#047857',
  'emerald-800': '#065f46',
  'emerald-900': '#064e3b',
  // Teal
  'teal-500': '#14b8a6',
  'teal-600': '#0d9488',
  'teal-700': '#0f766e',
  // Red & Rose
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'rose-500': '#f43f5e',
  'rose-600': '#e11d48',
  'rose-700': '#be123c',
  // Amber
  'amber-500': '#f59e0b',
  'amber-600': '#d97706',
};

export function hexToRgb(hex: string): RgbColor {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

export function resolveColor(tokenOrHex: string): RgbColor {
  if (tokenOrHex.startsWith('#')) {
    return hexToRgb(tokenOrHex);
  }
  const cleanToken = tokenOrHex.replace(/^(text-|bg-|border-)/, '');
  if (TAILWIND_COLOR_MAP[cleanToken]) {
    return hexToRgb(TAILWIND_COLOR_MAP[cleanToken]);
  }
  throw new Error(`Cannot resolve color for token: ${tokenOrHex}`);
}

export function calculateLuminance(rgb: RgbColor): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const rLin = toLinear(rgb.r);
  const gLin = toLinear(rgb.g);
  const bLin = toLinear(rgb.b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function calculateContrastRatio(colorA: string | RgbColor, colorB: string | RgbColor): number {
  const rgbA = typeof colorA === 'string' ? resolveColor(colorA) : colorA;
  const rgbB = typeof colorB === 'string' ? resolveColor(colorB) : colorB;
  const lumA = calculateLuminance(rgbA);
  const lumB = calculateLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface WcagResult {
  ratio: number;
  passNormalText: boolean; // >= 4.5
  passLargeText: boolean;  // >= 3.0
  passUIComponent: boolean; // >= 3.0
}

export function evaluateWcagAA(foreground: string | RgbColor, background: string | RgbColor): WcagResult {
  const ratio = calculateContrastRatio(foreground, background);
  return {
    ratio: Math.round(ratio * 100) / 100,
    passNormalText: ratio >= 4.5,
    passLargeText: ratio >= 3.0,
    passUIComponent: ratio >= 3.0,
  };
}
