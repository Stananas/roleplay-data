/**
 * Types publics du package @roleplay/data.
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
  stackable: boolean;
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
  stackable?: boolean;
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