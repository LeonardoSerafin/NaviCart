// ============================================================
// NaviCart Core Types
// 3-Macro Screen Architecture (Home, MyLists, Account)
// ============================================================

export type ProductCategory =
  | 'ortofrutta'
  | 'forno-colazione'
  | 'pasta-riso'
  | 'condimenti-sughi'
  | 'latticini-formaggi'
  | 'carne-pesce'
  | 'bevande'
  | 'surgelati'
  | 'cura-casa'
  | 'igiene-persona';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  isOnSale?: boolean;
  isBio?: boolean;
  isLocal?: boolean; // Del territorio / Km 0
  packageSize: string;
  icon: string;
  storeId?: string;
  aisleId: string;
  aisleName: string;
  shelfSide: 'sx' | 'dx' | 'testata' | 'banco';
  shelfSection: string;
  popularity: number;
}

export interface ShelfBay {
  id: string;
  name: string;
  side: 'sx' | 'dx' | 'testata' | 'banco';
  x: number;
  y: number;
  width: number;
  height: number;
  productIds: string[];
}

export interface Aisle {
  id: string;
  number: number | string;
  name: string;
  shortName: string;
  category: ProductCategory;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  leftShelf?: { x: number; y: number; width: number; height: number };
  rightShelf?: { x: number; y: number; width: number; height: number };
  walkway: { x: number; y: number; width: number; height: number };
  bays: ShelfBay[];
  /** Corridoio centrale che interrompe gli scaffali a metà (solo corsie). */
  crossGap?: { y: number; height: number };
}

export interface Point {
  x: number;
  y: number;
}

export interface Waypoint {
  id: number;
  x: number;
  y: number;
  aisleId?: string;
  label?: string;
  isEntrance?: boolean;
  isCheckout?: boolean;
}

export interface StoreLayout {
  id: string;
  name: string;
  brand: string; // 'IperPoli', 'Lidl', 'Conad', 'Poli'
  address: string;
  city: string;
  distance: string; // e.g. "450 m", "1.2 km"
  distanceMeters?: number;
  distanceText?: string;
  openingHours: string;
  isOpen: boolean;
  width: number;
  height: number;
  entrance: Point;
  checkout: Point;
  aisles: Aisle[];
  waypoints: Waypoint[];
  waypointConnections: [number, number][];
  /** Corridoio trasversale centrale (coordinate della pianta). */
  corridor?: { y: number; height: number };
  /** Area delle casse e centro di ogni cassa. */
  checkoutZone?: { x: number; y: number; width: number; height: number };
  checkoutLanes?: number[];
}

export interface ShoppingItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  checked: boolean;
  notes?: string;
}

export interface ShoppingList {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: ShoppingItem[];
}

export interface OptimizedRoute {
  orderedItems: ShoppingItem[];
  waypoints: Point[];
  totalDistance: number;
  estimatedTime: number;
  unoptimizedDistance: number;
  unoptimizedTime: number;
  timeSaved: number;
  distanceSaved: number;
  turnInstructions: TurnInstruction[];
}

export interface TurnInstruction {
  stepNumber: number;
  item: ShoppingItem;
  productName?: string;
  brandName?: string;
  aisleName: string;
  aisleNumber: number | string;
  shelfLocation: string;
  instruction: string;
  /** Posizione sullo scaffale (dove arriva il percorso). */
  coordinates: Point;
  /** Dove sta in piedi chi prende il prodotto, nel passaggio davanti allo scaffale. */
  access?: Point;
}

export type ProductFilter = 'all' | 'sale' | 'bio' | 'local';
export type ProductSort = 'suggested' | 'price-asc' | 'price-desc' | 'name-asc';
