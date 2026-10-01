/**
 * Types publics du package roleplay-data.
 * Chaque type reflète fidèlement le schéma JSON correspondant (catalog/schemas/*).
 */
export type Locale = 'fr' | 'en' | (string & {});

/** Objet texte localisé. fr + en sont toujours présents. */
export type Localized = {
  fr: string;
  en: string;
  [locale: string]: string;
};

export type DrugProperties = {
  type: string;
  duration: number;
  [key: string]: unknown;
};

/** Toute propriété libre laissée au projet consommateur. */
export type CustomProperties = Record<string, unknown>;

export type ItemMetadata = {
  /** Identité du monde réel (modèle d'arme, calibre, fabricant…). */
  irl?: Record<string, unknown>;
  /** Provenance de l'item. */
  source?: string;
  [key: string]: unknown;
};

export type Item = {
  /** Identifiant canonique (snake_case). Ne change jamais. */
  id: string;
  name: Localized;
  description: Localized;
  /** Fichier dans le pack d'images par défaut (themes/gta-artwork). */
  image: string;
  emoji?: string;
  weight: number;
  food: number;
  thirst: number;
  drug: DrugProperties | null;
  stackable: boolean | number;
  usable: boolean;
  tags: string[];
  metadata: ItemMetadata;
  customProperties: CustomProperties;
};

export type ItemsCatalog = {
  items: Item[];
};

export type VehicleCategory = 'car' | 'bike' | 'truck' | 'special';

export type Vehicle = {
  id: string;
  brand: Localized;
  model: Localized;
  category: VehicleCategory;
  image: string;
  seats: number;
  massKg: number;
  fuelCapacity: number;
  maxSpeed: number;
  cargo: {
    maxSlots: number;
    maxWeightKg: number;
  };
  metadata: ItemMetadata;
  customProperties: CustomProperties;
};

export type VehiclesCatalog = {
  vehicles: Vehicle[];
};

export type ThemeScope = 'items' | 'vehicles';

export type ThemeRegistryEntry = {
  label: Localized;
  description?: Localized;
  scope: ThemeScope[];
  image?: string;
  license?: string;
  attribution?: string;
};

export type ThemeRegistry = {
  themes: Record<string, ThemeRegistryEntry>;
};

export type ThemeOverride = {
  id: string;
  name?: Localized;
  description?: Localized;
  image?: string;
  emoji?: string;
  weight?: number;
  food?: number;
  thirst?: number;
  drug?: DrugProperties | null;
  stackable?: boolean | number;
  usable?: boolean;
  tags?: string[];
  metadata?: ItemMetadata;
  customProperties?: CustomProperties;
};

export type ThemeExclusiveItem = ThemeOverride & {
  id: string;
  name: Localized;
  image: string;
  weight: number;
};

export type Theme = {
  overrides: ThemeOverride[];
  exclusiveItems: ThemeExclusiveItem[];
  virtualIds?: string[];
};

/* ------------------------------------------------------------------ *
 * Fonctions runtime (implémentées dans index.js / localize.js / resolve.js)
 * ------------------------------------------------------------------ */

/** Liste ordonnée des items canoniques. */
export function getItems(): Item[];
/** Item canonique par id, ou null. */
export function getItem(id: string | null | undefined): Item | null;
/** Liste ordonnée des modèles de véhicules. */
export function getVehicles(): Vehicle[];
/** Véhicule par id, ou null. */
export function getVehicle(id: string | null | undefined): Vehicle | null;
/** Registre des thèmes (id → métadonnées). */
export function getThemeRegistry(): Record<string, ThemeRegistryEntry>;
/** Ids des thèmes (thème par défaut en premier), filtrés par scope. */
export function listThemeIds(scope?: ThemeScope): string[];
/** Thème complet (overrides + exclusifs) par id — thème inconnu = vide. */
export function getTheme(themeId: string | null | undefined): Theme;
/** Item résolu pour un thème (override + exclusif gérés), ou null. */
export function getThemedItem(itemId: string, themeId?: string | null | undefined): Item | null;
/**
 * Personnalise des items à partir du catalogue : applique des surcharges
 * « à la carte » (même format qu'un overrides de thème), crée les items
 * complets inédits, et signale les ids inconnus incomplets via `missing`.
 */
export function applyOverrides(
  baseItems: Item[],
  overrides: ThemeOverride[]
): { items: Item[]; missing: string[] };
/** Nom localisé effectif d'un item pour un thème et une locale. */
export function getThemedItemName(itemId: string, themeId: string, locale?: string): string;
/** Meilleure image disponible : thème → gta-artwork → no_image. */
export function getItemImage(
  itemId: string,
  themeId?: string | null | undefined,
  opts?: { assetsRoot?: string }
): string;
/** Libère les caches (rechargement à chaud). */
export function clearCache(): void;

/* ------------------------------------------------------------------ *
 * API orientée objet (DX) — flux fluent, contexte global, accesseurs
 * ------------------------------------------------------------------ */

export type UnitMode = 'auto' | 'metric' | 'imperial';
export type FallbackMode = 'default' | 'unknown';

export type ItemsOptions = {
  theme?: string;
  locale?: string;
  units?: UnitMode;
  fallback?: FallbackMode;
};

/** Réglages globaux par défaut (partagés par toutes les instances). */
export class ItemsDefaults {
  static theme: string;
  static locale: string;
  static units: UnitMode;
  static fallback: FallbackMode;
}

/** Fusionne des réglages dans les défauts globaux. Retourne les défauts mis à jour. */
export function configure(config?: Partial<ItemsOptions>): typeof ItemsDefaults;

/** Vue item : un item résolu dans un contexte (thème/locale/unités). */
export class Item {
  readonly id: string;
  readonly _item: Item | null;
  readonly _ctx: ItemsOptions;
  exists(): boolean;
  name(locale?: string): string;
  nameRaw(): Localized | null;
  description(locale?: string): string;
  descriptionRaw(): Localized | null;
  emoji(): string | null;
  image(): string;
  weight(): number;
  weightLabel(): string | null;
  volume(): number | null;
  volumeLabel(): string | null;
  satiety(): { food: number; thirst: number } | null;
  consumable(): NonNullable<Item['consumable']> | null;
  stackable(): boolean | number;
  usable(): boolean;
  tags(): string[];
  metadata(): ItemMetadata;
  customProperties(): CustomProperties;
  raw(): Item | null;
  toJSON(): Record<string, unknown>;
}

/** Client fluent du catalogue (contexte + accès). */
export class Items {
  constructor(opts?: ItemsOptions);
  theme(name: string): this;
  setTheme(name: string): this;
  locale(locale: string): this;
  units(units: UnitMode): this;
  fallback(mode: FallbackMode): this;
  getContext(): ItemsOptions;
  currentTheme(): string;
  themes(): string[];
  themeLabel(): string;
  get(id: string | null | undefined): Item;
  has(id: string): boolean;
  all(): Item[];
  byTag(tag: string): Item[];
  search(query: string): Item[];
}

/** Outils i18n. */
export function translate(localized: Localized | null | undefined, locale?: string): string;
export function itemLocalizedName(
  item: { name?: Localized } | null | undefined,
  locale?: string
): string;
export function itemLocalizedDescription(
  item: { description?: Localized } | null | undefined,
  locale?: string
): string;
export function vehicleLocalizedName(
  vehicle: { brand?: Localized; model?: Localized } | null | undefined,
  locale?: string
): string;

/** Résolution de thèmes (packs d'images + renommages + exclusifs). */
export const DEFAULT_IMAGE_THEME: string;
export const NO_IMAGE: string;
export function normalizeThemeId(raw: unknown): string;
export function resolveThemedImage(
  imageFile: string | null | undefined,
  themeId?: string | null | undefined,
  opts?: { assetsRoot?: string }
): string;

/** Namespaces utilitaires (équivalents « module » des JS compacts). */
import * as localizeNs from './localize.js';
import * as resolverNs from './resolve.js';
export { localizeNs as localize, resolverNs as resolver };