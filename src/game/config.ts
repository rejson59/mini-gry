// ---------------------------------------------------------------------------
//  Balonowa Przystań – konfiguracja świata, ekonomii i postępu
// ---------------------------------------------------------------------------

export type ItemType = 'gas' | 'drink' | 'gift';
export interface V2 {
  x: number;
  z: number;
}
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const ITEMS: Record<ItemType, { name: string; icon: string; h: number }> = {
  gas: { name: 'butle z gazem', icon: '🔥', h: 0.44 },
  drink: { name: 'lemoniadę', icon: '🍋', h: 0.36 },
  gift: { name: 'pamiątki', icon: '🎁', h: 0.36 },
};

// --- geometria wysp -------------------------------------------------------
export const MAIN: Rect = { x0: -18, x1: 17, z0: -14.5, z1: 12.5 };
export const EAST: Rect = { x0: 22, x1: 46, z0: -14, z1: 12 };

export const SPAWN_POS: V2 = { x: -8.8, z: 27 };
export const EXIT_POS: V2 = { x: -6.4, z: 27 };
export const PLAYER_START: V2 = { x: -5.2, z: 0.4 };

export const BOOTH = {
  pos: { x: -8.8, z: 4.2 },
  cashier: { x: -8.8, z: 2.25 },
  money: { x: -11.4, z: 4.7 },
  queueStart: { x: -8.8, z: 6.1 },
  queueStep: 1.05,
  out: [
    { x: -6.4, z: 5.6 },
    { x: -6.4, z: 2.2 },
  ] as V2[],
};

export const KIOSK = { pos: { x: -15.2, z: 9.4 }, zone: { x: -12.8, z: 8.2 } };
export const TRASH = { pos: { x: -1.6, z: 9.6 }, zone: { x: -1.6, z: 7.9 } };

// --- statki powietrzne ----------------------------------------------------
export interface AircraftDef {
  id: string;
  kind: 'balloon' | 'zeppelin';
  pos: V2;
  capacity: number;
  gas: number;
  flightTime: number;
  priceMul: number;
  palette: number;
}

export const AIRCRAFT: AircraftDef[] = [
  { id: 'balloon1', kind: 'balloon', pos: { x: -10, z: -8.5 }, capacity: 1, gas: 2, flightTime: 7, priceMul: 1, palette: 0 },
  { id: 'balloon2', kind: 'balloon', pos: { x: -3.5, z: -8.5 }, capacity: 1, gas: 2, flightTime: 7, priceMul: 1, palette: 1 },
  { id: 'balloon3', kind: 'balloon', pos: { x: 3, z: -8.5 }, capacity: 1, gas: 2, flightTime: 7.5, priceMul: 1.1, palette: 2 },
  { id: 'balloon4', kind: 'balloon', pos: { x: 9.5, z: -8.5 }, capacity: 1, gas: 2, flightTime: 7.5, priceMul: 1.2, palette: 3 },
  { id: 'balloon5', kind: 'balloon', pos: { x: 25.6, z: -8.5 }, capacity: 2, gas: 3, flightTime: 8.5, priceMul: 1.4, palette: 4 },
  { id: 'balloon6', kind: 'balloon', pos: { x: 31.3, z: -8.5 }, capacity: 2, gas: 3, flightTime: 8.5, priceMul: 1.5, palette: 5 },
  { id: 'zeppelin', kind: 'zeppelin', pos: { x: 39.5, z: -9 }, capacity: 4, gas: 6, flightTime: 14, priceMul: 2.2, palette: 0 },
];

export function airOffsets(def: AircraftDef): { board: V2; zone: V2; money: V2 } {
  const { x, z } = def.pos;
  if (def.kind === 'zeppelin') {
    return { board: { x, z: z + 2.2 }, zone: { x: x - 3.2, z: z + 3.1 }, money: { x: x + 3.2, z: z + 3.1 } };
  }
  return { board: { x, z: z + 2.1 }, zone: { x: x - 2.2, z: z + 2.7 }, money: { x: x + 2.2, z: z + 2.7 } };
}

// --- produkcja i sklepy ---------------------------------------------------
export interface ProducerDef {
  id: string;
  type: ItemType;
  pos: V2;
  pickup: V2;
  interval: number;
  max: number;
  unlock?: string;
}

export const PRODUCERS: ProducerDef[] = [
  { id: 'depot', type: 'gas', pos: { x: -15.3, z: -1.5 }, pickup: { x: -12.2, z: -1.5 }, interval: 1.4, max: 8 },
  { id: 'juicer', type: 'drink', pos: { x: 13.6, z: 8.6 }, pickup: { x: 10.5, z: 8.6 }, interval: 1.7, max: 8, unlock: 'lemonade' },
  { id: 'workshop', type: 'gift', pos: { x: 43.2, z: 3 }, pickup: { x: 40.1, z: 3 }, interval: 2.1, max: 8, unlock: 'gifts' },
];

export interface ShopDef {
  id: string;
  type: ItemType;
  label: string;
  color: number;
  pos: V2;
  deliver: V2;
  money: V2;
  queueStart: V2;
  price: number;
  max: number;
  chance: number;
}

export const SHOPS: ShopDef[] = [
  {
    id: 'lemonade', type: 'drink', label: '🍋 LEMONIADA', color: 0xffc94d,
    pos: { x: 6, z: 4.6 }, deliver: { x: 3.2, z: 4.3 }, money: { x: 8.9, z: 4.8 }, queueStart: { x: 6, z: 6.6 },
    price: 8, max: 8, chance: 0.78,
  },
  {
    id: 'gifts', type: 'gift', label: '🎁 PAMIĄTKI', color: 0xb07bff,
    pos: { x: 25.8, z: 6.6 }, deliver: { x: 23.1, z: 6.3 }, money: { x: 28.7, z: 6.8 }, queueStart: { x: 25.8, z: 8.6 },
    price: 22, max: 8, chance: 0.62,
  },
];

// --- pomocnicy ------------------------------------------------------------
export interface HelperDef {
  id: string;
  role: 'mechanic' | 'supplier';
  home: V2;
}

export const HELPERS: Record<string, HelperDef> = {
  mechanic: { id: 'mechanic', role: 'mechanic', home: { x: -11.6, z: -3.6 } },
  mechanic2: { id: 'mechanic2', role: 'mechanic', home: { x: 35.6, z: -0.4 } },
  supplier: { id: 'supplier', role: 'supplier', home: { x: 11, z: 5.6 } },
};

// --- odblokowania ---------------------------------------------------------
export interface UnlockDef {
  id: string;
  title: string;
  toast: string;
  icon: string;
  cost: number;
  pos: V2;
  requires: string[];
  kind: 'aircraft' | 'shop' | 'cashier' | 'helper' | 'island';
}

export const UNLOCKS: UnlockDef[] = [
  { id: 'balloon2', title: 'Balon nr 2', toast: 'Drugi balon gotowy do lotu!', icon: '🎈', cost: 40, pos: { x: -3.5, z: -4.9 }, requires: [], kind: 'aircraft' },
  { id: 'balloon3', title: 'Balon nr 3', toast: 'Trzeci balon gotowy do lotu!', icon: '🎈', cost: 120, pos: { x: 3, z: -4.9 }, requires: ['balloon2'], kind: 'aircraft' },
  { id: 'lemonade', title: 'Lemoniada', toast: 'Otwarto stoisko z lemoniadą!', icon: '🍋', cost: 220, pos: { x: 6, z: 6.4 }, requires: ['balloon2'], kind: 'shop' },
  { id: 'cashier', title: 'Kasjerka', toast: 'Kasjerka sprzedaje bilety za Ciebie!', icon: '🎟️', cost: 400, pos: { x: -11.4, z: 1.0 }, requires: ['balloon3'], kind: 'cashier' },
  { id: 'balloon4', title: 'Balon nr 4', toast: 'Czwarty balon gotowy do lotu!', icon: '🎈', cost: 550, pos: { x: 9.5, z: -4.9 }, requires: ['balloon3'], kind: 'aircraft' },
  { id: 'mechanic', title: 'Mechanik', toast: 'Mechanik sam tankuje balony!', icon: '🧑‍🔧', cost: 750, pos: { x: -15.2, z: 2.6 }, requires: ['lemonade'], kind: 'helper' },
  { id: 'supplier', title: 'Dostawca', toast: 'Dostawca uzupełnia stoiska!', icon: '🧑‍🍳', cost: 1300, pos: { x: 13.6, z: 4.4 }, requires: ['mechanic'], kind: 'helper' },
  { id: 'island2', title: 'Nowa wyspa', toast: 'Z chmur wyłoniła się nowa wyspa!', icon: '🏝️', cost: 1600, pos: { x: 14.6, z: 0 }, requires: ['balloon4'], kind: 'island' },
  { id: 'balloon5', title: 'Balon duo', toast: 'Dwuosobowy balon panoramiczny!', icon: '🎈', cost: 1500, pos: { x: 25.6, z: -4.9 }, requires: ['island2'], kind: 'aircraft' },
  { id: 'gifts', title: 'Pamiątki', toast: 'Otwarto sklep z pamiątkami!', icon: '🎁', cost: 2200, pos: { x: 25.8, z: 8.4 }, requires: ['island2'], kind: 'shop' },
  { id: 'balloon6', title: 'Balon duo 2', toast: 'Kolejny balon panoramiczny!', icon: '🎈', cost: 2600, pos: { x: 31.3, z: -4.9 }, requires: ['balloon5'], kind: 'aircraft' },
  { id: 'mechanic2', title: 'Mechanik 2', toast: 'Drugi mechanik dołączył do ekipy!', icon: '🧑‍🔧', cost: 3200, pos: { x: 35.6, z: 0.4 }, requires: ['balloon5'], kind: 'helper' },
  { id: 'zeppelin', title: 'Sterowiec', toast: 'Sterowiec „Obłok” wyrusza w rejsy!', icon: '🛩️', cost: 7500, pos: { x: 39.5, z: -4.3 }, requires: ['balloon6'], kind: 'aircraft' },
];

// --- zlecenia przystani ----------------------------------------------------
export type ContractMetric = 'tickets' | 'passengers' | 'sales' | 'unlocks' | 'collected' | 'level' | 'ticketUpgrade';

export interface ContractDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  metric: ContractMetric;
  target: number;
  reward: number;
}

/** Stałe zlecenia dają kolejne cele także po rozbudowaniu całej wyspy. */
export const CONTRACTS: ContractDef[] = [
  { id: 'first-tickets', title: 'Pierwsze bilety', desc: 'Sprzedaj bilety pięciu turystom.', icon: '🎟️', metric: 'tickets', target: 5, reward: 120 },
  { id: 'cloud-riders', title: 'Podniebni pasażerowie', desc: 'Zabierz 25 gości na podniebny lot.', icon: '🎈', metric: 'passengers', target: 25, reward: 260 },
  { id: 'lemonade-boom', title: 'Słodki biznes', desc: 'Sprzedaj 10 produktów w swoich sklepach.', icon: '🍋', metric: 'sales', target: 10, reward: 420 },
  { id: 'grow-the-harbor', title: 'Rozwijamy przystań', desc: 'Odblokuj cztery nowe atrakcje.', icon: '🏝️', metric: 'unlocks', target: 4, reward: 500 },
  { id: 'cash-flow', title: 'Pełna kasa', desc: 'Zbierz 1500 monet z zarobków.', icon: '💰', metric: 'collected', target: 1500, reward: 800 },
  { id: 'captain', title: 'Kapitan przestworzy', desc: 'Awansuj na 8. poziom przystani.', icon: '⭐', metric: 'level', target: 8, reward: 1500 },
  { id: 'premium-tickets', title: 'Bilet premium', desc: 'Rozwiń renomę przystani do poziomu 3.', icon: '✨', metric: 'ticketUpgrade', target: 3, reward: 1200 },
  { id: 'sky-empire', title: 'Imperium chmur', desc: 'Odblokuj wszystkie atrakcje i ukończ rozbudowę.', icon: '🏆', metric: 'unlocks', target: UNLOCKS.length, reward: 5000 },
];

// --- ulepszenia (warsztat) ------------------------------------------------
export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  max: number;
  base: number;
  mul: number;
  requires?: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'speed', name: 'Szybkie buty', desc: 'Biegasz szybciej', icon: '👟', max: 6, base: 80, mul: 2.1 },
  { id: 'capacity', name: 'Większy plecak', desc: 'Niesiesz więcej naraz', icon: '🎒', max: 7, base: 60, mul: 2.0 },
  { id: 'ticket', name: 'Renoma przystani', desc: 'Wyższe ceny, piękniejsze balony', icon: '🎈', max: 9, base: 250, mul: 2.2 },
  { id: 'marketing', name: 'Reklama', desc: 'Przyciąga więcej turystów', icon: '📣', max: 6, base: 150, mul: 2.0 },
  { id: 'production', name: 'Wydajna produkcja', desc: 'Szybciej powstają butle i towary', icon: '🏭', max: 5, base: 120, mul: 2.1 },
  { id: 'helperSpeed', name: 'Trening ekipy', desc: 'Pomocnicy poruszają się szybciej', icon: '⚡', max: 5, base: 400, mul: 2.2, requires: 'mechanic' },
  { id: 'helperCap', name: 'Wózki dla ekipy', desc: 'Pomocnicy noszą więcej', icon: '🛒', max: 4, base: 500, mul: 2.3, requires: 'mechanic' },
];

export const upgradeCost = (u: UpgradeDef, level: number) => Math.round((u.base * Math.pow(u.mul, level)) / 10) * 10;
export const xpNeed = (level: number) => 4 + level * 4;
export const levelReward = (level: number) => Math.round((30 * Math.pow(level, 1.7)) / 10) * 10;

export function fmt(n: number): string {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e5 ? 1 : 0).replace('.0', '') + 'K';
  return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
}
