import { StoreLayout, Aisle } from '../types';
import { buildStoreLayout, LayoutVariant } from './layoutBuilder';

// ============================================================
// Catalogo delle corsie: reparti, moduli di scaffale e prodotti.
// La geometria qui sotto è solo di partenza: la posizione reale di ogni
// corsia nella pianta di un negozio la decide layoutBuilder.ts (440 x 650)
// ============================================================

const catalogAisles: Aisle[] = [
  // ── Area Ortofrutta (Bottom-Right) ──
  {
    id: 'area-ortofrutta',
    number: 'Ortofrutta',
    name: 'Area Ortofrutta Fresca',
    shortName: 'Ortofrutta',
    category: 'ortofrutta',
    color: '#22c55e',
    x: 290,
    y: 430,
    width: 130,
    height: 120,
    walkway: { x: 300, y: 440, width: 110, height: 100 },
    bays: [
      { id: 'OF-1', name: 'Mele & Pere', side: 'banco', x: 305, y: 450, width: 45, height: 35, productIds: ['prod-mele-melinda'] },
      { id: 'OF-2', name: 'Banane & Frutta Esotica', side: 'banco', x: 360, y: 450, width: 45, height: 35, productIds: ['prod-banane-chiquita'] },
      { id: 'OF-3', name: 'Pomodori & Ortaggi', side: 'banco', x: 305, y: 495, width: 45, height: 35, productIds: ['prod-pomodori-pachino'] },
      { id: 'OF-4', name: 'Insalate & IV Gamma', side: 'banco', x: 360, y: 495, width: 45, height: 35, productIds: ['prod-insalata-bonduelle', 'prod-limoni-sorrento'] },
    ],
  },

  // ── Corsia 1: Forno, Biscotti & Colazione ──
  {
    id: 'corsia-1',
    number: 1,
    name: 'Corsia 1 · Colazione & Biscotti',
    shortName: 'Corsia 1',
    category: 'forno-colazione',
    color: '#f59e0b',
    x: 20,
    y: 140,
    width: 48,
    height: 250,
    leftShelf: { x: 20, y: 140, width: 12, height: 250 },
    rightShelf: { x: 56, y: 140, width: 12, height: 250 },
    walkway: { x: 32, y: 140, width: 24, height: 250 },
    bays: [
      { id: 'C1-A1', name: 'Biscotti Mulino Bianco', side: 'sx', x: 20, y: 160, width: 12, height: 60, productIds: ['prod-pandistelle', 'prod-macine'] },
      { id: 'C1-A3', name: 'Fette Biscottate & Pane', side: 'sx', x: 20, y: 250, width: 12, height: 60, productIds: ['prod-fette-biscottate'] },
      { id: 'C1-B1', name: 'Nutella & Creme', side: 'dx', x: 56, y: 160, width: 12, height: 60, productIds: ['prod-nutella'] },
      { id: 'C1-B2', name: 'Caffè Lavazza', side: 'dx', x: 56, y: 250, width: 12, height: 60, productIds: ['prod-caffe-lavazza'] },
    ],
  },

  // ── Corsia 2: Pasta & Riso ──
  {
    id: 'corsia-2',
    number: 2,
    name: 'Corsia 2 · Pasta, Riso & Farine',
    shortName: 'Corsia 2',
    category: 'pasta-riso',
    color: '#eab308',
    x: 80,
    y: 140,
    width: 48,
    height: 250,
    leftShelf: { x: 80, y: 140, width: 12, height: 250 },
    rightShelf: { x: 116, y: 140, width: 12, height: 250 },
    walkway: { x: 92, y: 140, width: 24, height: 250 },
    bays: [
      { id: 'C2-A1', name: 'Pasta Barilla & De Cecco', side: 'sx', x: 80, y: 160, width: 12, height: 60, productIds: ['prod-spaghetti-barilla', 'prod-penne-dececco'] },
      { id: 'C2-A3', name: 'Pasta Rummo', side: 'sx', x: 80, y: 250, width: 12, height: 60, productIds: ['prod-fusilli-rummo'] },
      { id: 'C2-B1', name: 'Riso Scotti', side: 'dx', x: 116, y: 160, width: 12, height: 60, productIds: ['prod-riso-carnaroli-scotti'] },
      { id: 'C2-B2', name: 'Farine & Polente', side: 'dx', x: 116, y: 250, width: 12, height: 60, productIds: ['prod-farina-caputo'] },
    ],
  },

  // ── Corsia 3: Sughi, Olio & Conserve ──
  {
    id: 'corsia-3',
    number: 3,
    name: 'Corsia 3 · Sughi, Olio & Conserve',
    shortName: 'Corsia 3',
    category: 'condimenti-sughi',
    color: '#ef4444',
    x: 140,
    y: 140,
    width: 48,
    height: 250,
    leftShelf: { x: 140, y: 140, width: 12, height: 250 },
    rightShelf: { x: 176, y: 140, width: 12, height: 250 },
    walkway: { x: 152, y: 140, width: 24, height: 250 },
    bays: [
      { id: 'C3-A1', name: 'Pomodoro Mutti & Cirio', side: 'sx', x: 140, y: 160, width: 12, height: 60, productIds: ['prod-polpa-mutti', 'prod-passata-cirio'] },
      { id: 'C3-A3', name: 'Pesto & Sughi Pronti', side: 'sx', x: 140, y: 250, width: 12, height: 60, productIds: ['prod-pesto-barilla'] },
      { id: 'C3-B1', name: 'Olio Monini & Carapelli', side: 'dx', x: 176, y: 160, width: 12, height: 60, productIds: ['prod-olio-monini', 'prod-olio-carapelli-bio'] },
    ],
  },

  // ── Corsia 4: Latticini & Formaggi ──
  {
    id: 'corsia-4',
    number: 4,
    name: 'Corsia 4 · Latticini, Formaggi & Uova',
    shortName: 'Corsia 4',
    category: 'latticini-formaggi',
    color: '#3b82f6',
    x: 200,
    y: 140,
    width: 48,
    height: 250,
    leftShelf: { x: 200, y: 140, width: 12, height: 250 },
    rightShelf: { x: 236, y: 140, width: 12, height: 250 },
    walkway: { x: 212, y: 140, width: 24, height: 250 },
    bays: [
      { id: 'C4-A1', name: 'Parmigiano & Grana', side: 'sx', x: 200, y: 160, width: 12, height: 60, productIds: ['prod-parmigiano-parmareggio'] },
      { id: 'C4-A2', name: 'Mozzarella & Freschi', side: 'sx', x: 200, y: 250, width: 12, height: 60, productIds: ['prod-mozzarella-galbani', 'prod-mozzarella-bufala-mandara'] },
      { id: 'C4-B1', name: 'Latte Granarolo', side: 'dx', x: 236, y: 160, width: 12, height: 60, productIds: ['prod-latte-granarolo'] },
      { id: 'C4-B2', name: 'Uova & Burro', side: 'dx', x: 236, y: 250, width: 12, height: 60, productIds: ['prod-uova-aia-bio', 'prod-burro-soresina'] },
    ],
  },

  // ── Corsia 5: Acqua & Bevande ──
  {
    id: 'corsia-5',
    number: 5,
    name: 'Corsia 5 · Acqua, Birra & Vini',
    shortName: 'Corsia 5',
    category: 'bevande',
    color: '#06b6d4',
    x: 260,
    y: 140,
    width: 48,
    height: 250,
    leftShelf: { x: 260, y: 140, width: 12, height: 250 },
    rightShelf: { x: 296, y: 140, width: 12, height: 250 },
    walkway: { x: 272, y: 140, width: 24, height: 250 },
    bays: [
      { id: 'C5-A1', name: 'Acqua Minerale', side: 'sx', x: 260, y: 160, width: 12, height: 60, productIds: ['prod-acqua-san-benedetto'] },
      { id: 'C5-A2', name: 'Succhi di Frutta', side: 'sx', x: 260, y: 250, width: 12, height: 60, productIds: ['prod-succo-santal-arancia'] },
      { id: 'C5-B1', name: 'Birre & Vini', side: 'dx', x: 296, y: 160, width: 12, height: 60, productIds: ['prod-birra-moretti', 'prod-vino-chianti-ruffino'] },
    ],
  },

  // ── Corsia 6: Surgelati & Gelati ──
  {
    id: 'corsia-6',
    number: 6,
    name: 'Corsia 6 · Surgelati & Gelati',
    shortName: 'Corsia 6',
    category: 'surgelati',
    color: '#8b5cf6',
    x: 320,
    y: 140,
    width: 48,
    height: 250,
    leftShelf: { x: 320, y: 140, width: 12, height: 250 },
    rightShelf: { x: 356, y: 140, width: 12, height: 250 },
    walkway: { x: 332, y: 140, width: 24, height: 250 },
    bays: [
      { id: 'C6-A1', name: 'Findus & Pesce', side: 'sx', x: 320, y: 160, width: 12, height: 60, productIds: ['prod-bastoncini-findus', 'prod-pisellini-findus'] },
      { id: 'C6-B1', name: 'Pizze & Gelati', side: 'dx', x: 356, y: 160, width: 12, height: 60, productIds: ['prod-pizza-margherita-italpizza', 'prod-gelato-sammontana'] },
    ],
  },

  // ── Corsia 7: Cura Casa & Igiene ──
  {
    id: 'corsia-7',
    number: 7,
    name: 'Corsia 7 · Detersivi & Igiene',
    shortName: 'Corsia 7',
    category: 'cura-casa',
    color: '#64748b',
    x: 380,
    y: 140,
    width: 48,
    height: 250,
    leftShelf: { x: 380, y: 140, width: 12, height: 250 },
    rightShelf: { x: 416, y: 140, width: 12, height: 250 },
    walkway: { x: 392, y: 140, width: 24, height: 250 },
    bays: [
      { id: 'C7-A1', name: 'Dash & Sgrassatori', side: 'sx', x: 380, y: 160, width: 12, height: 60, productIds: ['prod-dash-pods', 'prod-chanteclair-sgrassatore'] },
      { id: 'C7-B1', name: 'Carta & Igiene', side: 'dx', x: 416, y: 160, width: 12, height: 60, productIds: ['prod-scottex-carta-igienica', 'prod-dentifricio-colgate', 'prod-bagnoschiuma-felce-azzurra'] },
    ],
  },

  // ── Area Macelleria & Gastronomia (Back Wall) ──
  {
    id: 'area-macelleria',
    number: 'Macelleria',
    name: 'Banco Macelleria & Gastronomia',
    shortName: 'Macelleria',
    category: 'carne-pesce',
    color: '#f43f5e',
    x: 20,
    y: 40,
    width: 408,
    height: 45,
    walkway: { x: 20, y: 50, width: 408, height: 35 },
    bays: [
      { id: 'M-1', name: 'Prosciutto & Salumi', side: 'banco', x: 40, y: 40, width: 80, height: 35, productIds: ['prod-prosciutto-parma-citterio'] },
      { id: 'M-2', name: 'Pollo & Carni Bianche', side: 'banco', x: 140, y: 40, width: 80, height: 35, productIds: ['prod-petto-pollo-aia'] },
      { id: 'M-3', name: 'Chianina & Manzo', side: 'banco', x: 240, y: 40, width: 80, height: 35, productIds: ['prod-macinato-bovino-chianina'] },
      { id: 'M-4', name: 'Pescheria', side: 'banco', x: 330, y: 40, width: 80, height: 35, productIds: ['prod-salmone-norvegese'] },
    ],
  },
];

// ============================================================
// Supermercati Disponibili a TRENTO
// 1. IperPoli · La Cittadella
// 2. Lidl · Via Brennero
// 3. Conad · Corso 3 Novembre
// 4. Poli · Trento Sud
// ============================================================

const ids = (order: number[]) => order.map((n) => `corsia-${n}`);

// Quattro piante diverse, stessa grammatica: corridoio centrale, scaffali spezzati a metà.
const variantIperPoli: LayoutVariant = {
  aisleOrder: ids([1, 2, 3, 4, 5, 6, 7]),
  corridorY: 268,
  halfShift: 0,
  produceSide: 'right',
  entranceX: 382,
  exitX: 120,
  checkoutLanes: [60, 120, 180, 240],
  butcherOrder: ['M-1', 'M-2', 'M-3', 'M-4'],
};

const variantLidl: LayoutVariant = {
  aisleOrder: ids([1, 2, 3, 4, 5, 6, 7]),
  corridorY: 240,
  halfShift: 1,
  produceSide: 'left',
  entranceX: 60,
  exitX: 380,
  checkoutLanes: [200, 260, 320, 380],
  butcherOrder: ['M-4', 'M-3', 'M-2', 'M-1'],
};

const variantConad: LayoutVariant = {
  aisleOrder: ids([7, 6, 5, 4, 3, 2, 1]),
  corridorY: 296,
  halfShift: 2,
  produceSide: 'left',
  entranceX: 382,
  exitX: 250,
  checkoutLanes: [190, 250, 310],
  butcherOrder: ['M-2', 'M-1', 'M-4', 'M-3'],
};

const variantPoli: LayoutVariant = {
  aisleOrder: ids([1, 2, 3, 4, 5, 6, 7]),
  corridorY: 254,
  halfShift: 3,
  produceSide: 'right',
  entranceX: 60,
  exitX: 196,
  checkoutLanes: [140, 196, 252],
  butcherOrder: ['M-3', 'M-4', 'M-1', 'M-2'],
};

export const iperPoliTrento: StoreLayout = buildStoreLayout(
  {
    id: 'iperpoli-cittadella',
    name: 'IperPoli · La Cittadella',
    brand: 'IperPoli',
    address: 'Via Mantova 108, 38122 Trento',
    city: 'Trento (TN)',
    distance: '450 m',
    distanceMeters: 450,
    distanceText: '450 m',
    openingHours: '08:00 - 20:30',
    isOpen: true,
  },
  catalogAisles,
  variantIperPoli
);

export const lidlTrento: StoreLayout = buildStoreLayout(
  {
    id: 'lidl-brennero',
    name: 'Lidl · Via Brennero',
    brand: 'Lidl',
    address: 'Via del Brennero 134, 38121 Trento',
    city: 'Trento (TN)',
    distance: '850 m',
    distanceMeters: 850,
    distanceText: '850 m',
    openingHours: '08:00 - 21:00',
    isOpen: true,
  },
  catalogAisles,
  variantLidl
);

export const conadTrento: StoreLayout = buildStoreLayout(
  {
    id: 'conad-3novembre',
    name: 'Conad · Corso 3 Novembre',
    brand: 'Conad',
    address: 'Corso 3 Novembre 45, 38122 Trento',
    city: 'Trento (TN)',
    distance: '1.2 km',
    distanceMeters: 1200,
    distanceText: '1.2 km',
    openingHours: '07:30 - 20:30',
    isOpen: true,
  },
  catalogAisles,
  variantConad
);

export const poliTrentoSud: StoreLayout = buildStoreLayout(
  {
    id: 'poli-trento-sud',
    name: 'Poli · Trento Sud',
    brand: 'Poli',
    address: 'Via Valnigra 22, 38123 Trento Sud',
    city: 'Trento (TN)',
    distance: '2.1 km',
    distanceMeters: 2100,
    distanceText: '2.1 km',
    openingHours: '08:00 - 20:00',
    isOpen: true,
  },
  catalogAisles,
  variantPoli
);

export const availableStores: StoreLayout[] = [
  iperPoliTrento,
  lidlTrento,
  conadTrento,
  poliTrentoSud,
];

export function getStoreById(id: string): StoreLayout {
  return availableStores.find((s) => s.id === id) || iperPoliTrento;
}
