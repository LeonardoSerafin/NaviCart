import type { Product, ShoppingList } from '../types';
import type { Language } from './translations';

// Nomi e confezioni in inglese. I marchi (Barilla, Mutti, Lavazza...) restano com'è.
const EN_NAMES: Record<string, [string, string?]> = {
  'prod-mele-melinda': ['Golden Delicious Apples PDO', '1 kg (tray)'],
  'prod-banane-chiquita': ['Bananas 10/10', '1 kg'],
  'prod-pomodori-pachino': ['Cherry Tomatoes PGI', '500 g'],
  'prod-insalata-bonduelle': ['Organic Lamb\'s Lettuce', '120 g'],
  'prod-limoni-sorrento': ['Sorrento Lemons PGI', '750 g (net bag)'],
  'prod-pandistelle': ['Pan di Stelle Biscuits', '700 g'],
  'prod-macine': ['Macine Biscuits with Fresh Cream', '800 g'],
  'prod-nutella': ['Hazelnut Spread', '750 g'],
  'prod-caffe-lavazza': ['Qualità Rossa Ground Coffee', '2 x 250 g'],
  'prod-fette-biscottate': ['Golden Rusks', '315 g (36 slices)'],
  'prod-spaghetti-barilla': ['Spaghetti No. 5', '500 g'],
  'prod-penne-dececco': ['Penne Rigate No. 41', '500 g, bronze-drawn'],
  'prod-fusilli-rummo': ['Fusilli No. 48 Slow-Dried', '500 g'],
  'prod-riso-carnaroli-scotti': ['Carnaroli Rice for Risotto', '1 kg vacuum-packed'],
  'prod-farina-caputo': ['Classic "00" Flour', '1 kg'],
  'prod-polpa-mutti': ['Finest Tomato Pulp, 100% Italian', '3 x 400 g cans'],
  'prod-passata-cirio': ['Verace Tomato Passata', '700 g glass bottle'],
  'prod-olio-monini': ['Extra Virgin Olive Oil "Il Classico"', '1 litre'],
  'prod-olio-carapelli-bio': ['Organic Italian Extra Virgin Olive Oil', '750 ml'],
  'prod-pesto-barilla': ['Genovese Pesto with Fresh Basil', '190 g jar'],
  'prod-parmigiano-parmareggio': ['Parmigiano Reggiano PDO, 24 Months', '250 g wedge'],
  'prod-mozzarella-galbani': ['Santa Lucia Mozzarella', '3 x 100 g'],
  'prod-mozzarella-bufala-mandara': ['Campania Buffalo Mozzarella PDO', '200 g'],
  'prod-latte-granarolo': ['Fresh Whole Milk, High Quality', '1 litre bottle'],
  'prod-uova-aia-bio': ['Organic Free-Range Fresh Eggs', 'Pack of 6'],
  'prod-burro-soresina': ['Traditional Cream Butter', '250 g block'],
  'prod-prosciutto-parma-citterio': ['Parma Ham PDO, 20 Months', '90 g tray'],
  'prod-petto-pollo-aia': ['Select Chicken Breast Slices, 100% Italian', '400 g tray'],
  'prod-macinato-bovino-chianina': ['Select Minced Beef, Chianina PGI', '350 g'],
  'prod-salmone-norvegese': ['Fresh Salmon Steaks', '250 g (2 steaks)'],
  'prod-acqua-san-benedetto': ['Still Water Eco-Green', 'Pack 6 x 1.5 L'],
  'prod-birra-moretti': ['Original Recipe Beer', 'Cluster 3 x 33 cl bottles'],
  'prod-vino-chianti-ruffino': ['Chianti Superiore DOCG', '750 ml bottle'],
  'prod-succo-santal-arancia': ['100% Blond Orange Juice', '1 litre carton'],
  'prod-bastoncini-findus': ['Cod Fish Fingers', '12 fingers (300 g)'],
  'prod-pisellini-findus': ['Tender Spring Peas', '700 g'],
  'prod-pizza-margherita-italpizza': ['Margherita Pizza 26x38, Stone-Baked', '480 g'],
  'prod-gelato-sammontana': ['Cream & Chocolate Ice Cream Tub', '500 g'],
  'prod-dash-pods': ['All-in-1 Laundry Detergent Pods', '24 pods'],
  'prod-chanteclair-sgrassatore': ['Marseille Universal Degreaser', '625 ml spray'],
  'prod-scottex-carta-igienica': ['Toilet Paper "Pulito Completo"', 'Pack of 10 rolls'],
  'prod-dentifricio-colgate': ['Cavity Protection & Fresh Breath Toothpaste', '75 ml'],
  'prod-bagnoschiuma-felce-azzurra': ['Classic Shower Gel, Traditional Scent', '650 ml'],
};

const EN_AISLES: Record<string, string> = {
  Ortofrutta: 'Produce',
  'Banco Macelleria & Salumi': 'Butcher & Deli Counter',
};

/** Testi di un prodotto nella lingua scelta (il marchio non si traduce). */
export function productText(p: Product, lang: Language) {
  if (lang === 'it') return { name: p.name, packageSize: p.packageSize, aisleName: p.aisleName };
  const en = EN_NAMES[p.id];
  const aisleMatch = /^Corsia (\d+)$/.exec(p.aisleName);
  return {
    name: en?.[0] ?? p.name,
    packageSize: en?.[1] ?? p.packageSize,
    aisleName: aisleMatch ? `Aisle ${aisleMatch[1]}` : EN_AISLES[p.aisleName] ?? p.aisleName,
  };
}

/** Nome di una corsia dal suo titolo ("Corsia 3 · Sughi, Olio & Conserve"). */
const EN_TOPICS: Record<string, string> = {
  'Colazione & Biscotti': 'Breakfast & Biscuits',
  'Pasta, Riso & Farine': 'Pasta, Rice & Flour',
  'Sughi, Olio & Conserve': 'Sauces, Oil & Preserves',
  'Latticini, Formaggi & Uova': 'Dairy, Cheese & Eggs',
  'Acqua, Birra & Vini': 'Water, Beer & Wine',
  'Surgelati & Gelati': 'Frozen Food & Ice Cream',
  'Detersivi & Igiene': 'Cleaning & Hygiene',
};

export function aisleTopic(aisleName: string, lang: Language): string {
  const topic = (aisleName.split('·')[1] || aisleName).trim();
  return lang === 'it' ? topic : EN_TOPICS[topic] ?? topic;
}

const EN_LIST_NAMES: Record<string, string> = {
  'list-iperpoli-settimanale': 'Weekly Family Shop 🛒',
  'list-conad-carbonara': 'Carbonara Dinner & Aperitif 🍝',
  'list-lidl-pranzo': 'Quick Lunch & Snacks 🥪',
  'list-poli-dispensa': 'Breakfast & Pantry Poli ☕',
};

export function listDisplayName(list: Pick<ShoppingList, 'id' | 'name'>, lang: Language): string {
  if (lang === 'en' && EN_LIST_NAMES[list.id]) return EN_LIST_NAMES[list.id];
  return list.name;
}

const EN_PRESETS: Record<string, string> = {
  'whatsapp-cena': 'Pizza & Beer Dinner (WhatsApp)',
  'keep-settimanale': 'Full Weekly Shop (Keep)',
  'alexa-ricetta': 'Spaghetti alla Carbonara (Alexa)',
  'ocr-photo-note': '📝 Handwritten list from the fridge',
  'ocr-photo-receipt': '🧾 Previous shopping receipt',
};

export function presetTitle(id: string, title: string, lang: Language): string {
  return lang === 'en' ? EN_PRESETS[id] ?? title : title;
}
