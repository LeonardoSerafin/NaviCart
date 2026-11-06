import { ShoppingItem, Product } from '../types';
import { findMatchingProduct, italianProducts, getProductById } from '../data/products';
import { generateId } from './storage';

// ── Store-Specific Assortment Exclusions ──
export const storeExclusions: Record<string, string[]> = {
  // IperPoli La Cittadella: large hypermarket, full catalog available
  'iperpoli-cittadella': [],

  // Lidl Via Brennero: discount chain, does not carry several national premium brands
  'lidl-brennero': [
    'prod-nutella',
    'prod-pandistelle',
    'prod-macine',
    'prod-spaghetti-barilla',
    'prod-penne-dececco',
    'prod-fusilli-rummo',
    'prod-polpa-mutti',
    'prod-caffe-lavazza',
    'prod-parmigiano-parmareggio',
  ],

  // Conad Corso 3 Novembre: standard supermarket, lacks certain hypermarket/local exclusives
  'conad-3novembre': [
    'prod-mele-melinda', // Local Melinda exclusive agreement with Poli
    'prod-macinato-bovino-chianina',
    'prod-dash-pods',
  ],

  // Poli Trento Sud: neighborhood supermarket, lacks fresh specialty counter items
  'poli-trento-sud': [
    'prod-salmone-norvegese',
    'prod-farina-caputo',
    'prod-mozzarella-bufala-mandara',
    'prod-gelato-sammontana',
  ],
};

export function isProductAvailableInStore(productId: string, storeId: string): boolean {
  const excluded = storeExclusions[storeId] || [];
  return !excluded.includes(productId);
}

export interface UnavailableItemReport {
  name: string;
  quantity: number;
  reason?: string;
}

export interface ParsedStoreImportResult {
  storeId: string;
  availableItems: ShoppingItem[];
  unavailableItems: UnavailableItemReport[];
  totalLinesProcessed: number;
}

export function parseGroceryTextForStore(
  text: string,
  storeId: string
): ParsedStoreImportResult {
  const lines = text.split(/\n/);
  const availableItems: ShoppingItem[] = [];
  const unavailableItems: UnavailableItemReport[] = [];
  const seenProductIds = new Set<string>();

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.length < 2) continue;

    // Skip titles, headings, and comments
    if (
      line.startsWith('#') ||
      line.startsWith('//') ||
      /^(ingredienti|ricetta|procedimento|istruzioni|note|spesa|lista):/i.test(line)
    ) {
      continue;
    }

    // Clean bullet points and checkboxes
    line = line.replace(/^[-*•◦▪▸►✓☐\[\s\]\d+.)]+\s*/, '');
    if (!line) continue;

    // Extract quantity if present
    let quantity = 1;
    const qtyMatch = line.match(
      /^(\d+(?:[.,]\d+)?)\s*(?:kg|g|hg|l|ml|pacchi|pacco|confezioni|conf|scatole|barattoli|fette|bottiglie|lattine|pezzi|pz)?\s*(?:di\s+)?(.+)/i
    );
    let productNameQuery = line;
    if (qtyMatch) {
      quantity = Math.max(1, Math.round(parseFloat(qtyMatch[1].replace(',', '.'))));
      productNameQuery = qtyMatch[2].trim();
    }

    // Attempt matching with catalog
    const matchedProduct = findMatchingProduct(productNameQuery);

    if (!matchedProduct) {
      // Product not found in catalog at all -> unavailable!
      unavailableItems.push({
        name: productNameQuery,
        quantity,
        reason: 'Non presente a catalogo',
      });
      continue;
    }

    // Check availability in this specific supermarket
    if (!isProductAvailableInStore(matchedProduct.id, storeId)) {
      unavailableItems.push({
        name: `${matchedProduct.name} (${matchedProduct.brand})`,
        quantity,
        reason: 'Non disponibile in questo supermercato',
      });
      continue;
    }

    // If already in list, merge quantity; otherwise add
    if (seenProductIds.has(matchedProduct.id)) {
      const existing = availableItems.find((i) => i.productId === matchedProduct.id);
      if (existing) {
        existing.quantity += quantity;
      }
    } else {
      seenProductIds.add(matchedProduct.id);
      availableItems.push({
        id: generateId(),
        productId: matchedProduct.id,
        product: matchedProduct,
        quantity,
        checked: false,
      });
    }
  }

  return {
    storeId,
    availableItems,
    unavailableItems,
    totalLinesProcessed: lines.length,
  };
}

// ── Sample Presets for Quick Demo Testing ──

export const DEMO_EXTERNAL_APP_LISTS = [
  {
    id: 'whatsapp-cena',
    app: 'WhatsApp',
    icon: '💬',
    title: 'Spesa Cena Pizza & Birra (WhatsApp)',
    text: `Pizza Margherita Italpizza
Cluster Birra Moretti 3x33cl
Mozzarella di Bufala Mandara
Gelato Sammontana
2 pacchi Patatine Classiche
Tofu al naturale biologico`,
  },
  {
    id: 'keep-settimanale',
    app: 'Google Keep',
    icon: '📝',
    title: 'Spesa Settimanale Completa (Keep)',
    text: `2 pacchi Spaghetti Barilla n.5
Polpa di Pomodoro Mutti
Parmigiano Reggiano Parmareggio
Olio Extra Vergine Monini
Latte Granarolo Alta Qualità
Biscotti Pan di Stelle Mulino Bianco
Nutella Ferrero 750g
Avocado Hass Maturo`,
  },
  {
    id: 'alexa-ricetta',
    app: 'Alexa',
    icon: '🗣️',
    title: 'Spaghetti alla Carbonara (Alexa)',
    text: `Spaghetti Barilla n.5
Uova Bio da allevamento a terra
Parmigiano Reggiano Parmareggio
Pepe Nero Macinato Drogheria
Pancetta Affumicata Stagionata`,
  },
];

export const SAMPLE_OCR_PHOTO_LISTS = [
  {
    id: 'ocr-photo-note',
    title: '📝 Lista manoscritta sul frigo',
    imagePlaceholder: '📷 Foto lista cartacea su post-it',
    text: `Mele Melinda Val di Non
Spaghetti Barilla n.5
Nutella Ferrero 750g
Caffè Lavazza Qualità Rossa
Latte Granarolo Alta Qualità
Hummus di ceci bio`,
  },
  {
    id: 'ocr-photo-receipt',
    title: '🧾 Scontrino spesa precedente',
    imagePlaceholder: '🧾 Foto scontrino fiscale',
    text: `Penne De Cecco n.41
Pomodori Ciliegino IGP
Olio Extra Vergine Monini
Petto di Pollo AIA
Salmone norvegese affumicato
Detersivo Dash Pods`,
  },
];
