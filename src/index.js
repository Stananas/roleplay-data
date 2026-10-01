/**
 * roleplay-data — source de vérité RP (items, véhicules, thèmes).
 *
 * Ce module charge les données JSON du package (catalog/ + themes/) et expose
 * une API typée pour les consommer : recherche d'item/véhicule, résolution
 * d'images et de renommages par thème, i18n.
 *
 * Les données sont mises en cache en mémoire la première fois qu'elles sont
 * lues — rechargement possible via clearCache().
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as pathResolve } from 'node:path';

import * as localize from './localize.js';
import * as resolver from './resolve.js';

export { localize, resolver };
export {
  DEFAULT_IMAGE_THEME,
  NO_IMAGE,
  normalizeThemeId,
  resolveThemedImage,
} from './resolve.js';
export {
  localize as translate,
  itemLocalizedName,
  itemLocalizedDescription,
  vehicleLocalizedName,
  unitsForLocale,
  formatItemWeight,
  formatVehicleMass,
  formatVolume,
} from './localize.js';

export { Items, Item, configure, ItemsDefaults } from './items-class.js';

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(here, '..');

const cache = {
  items: null,
  vehicles: null,
  registry: null,
  themes: new Map(),
};

function readJson(rel) {
  return JSON.parse(readFileSync(join(REPO_ROOT, rel), 'utf-8'));
}

function lazy(key, rel) {
  if (cache[key] === null) cache[key] = readJson(rel);
  return cache[key];
}

/** Liste ordonnée des items canoniques. */
export function getItems() {
  return lazy('items', 'catalog/items.json').items;
}

/** Item canonique par id, ou null. */
export function getItem(id) {
  if (!id) return null;
  return getItems().find((i) => i.id === id) || null;
}

/** Liste ordonnée des modèles de véhicules. */
export function getVehicles() {
  return lazy('vehicles', 'catalog/vehicles.json').vehicles;
}

/** Véhicule par id, ou null. */
export function getVehicle(id) {
  if (!id) return null;
  return getVehicles().find((v) => v.id === id) || null;
}

/** Registre des thèmes (métadonnées : label, scope, licence, attribution…). */
export function getThemeRegistry() {
  return lazy('registry', 'themes/themes.json').themes;
}

/** Ids des thèmes, triés avec le thème par défaut en premier. */
export function listThemeIds(scope = 'items') {
  const registry = getThemeRegistry();
  const ids = Object.keys(registry).filter(
    (id) => !scope || !Array.isArray(registry[id]?.scope) || registry[id].scope.includes(scope)
  );
  return ids.sort((a, b) => {
    if (a === resolver.DEFAULT_IMAGE_THEME) return -1;
    if (b === resolver.DEFAULT_IMAGE_THEME) return 1;
    return a.localeCompare(b);
  });
}

/** Thème complet (overrides + exclusifs) par id. Fichier introuvable → thème vide. */
export function getTheme(themeId) {
  const id = resolver.normalizeThemeId(themeId);
  if (cache.themes.has(id)) return cache.themes.get(id);
  let theme = null;
  try {
    theme = readJson(`themes/${id}.json`);
  } catch {
    theme = { overrides: [], exclusiveItems: [] };
  }
  cache.themes.set(id, theme);
  return theme;
}

/** Item résolu pour un thème (override + exclusif gérés), ou null. */
export function getThemedItem(itemId, themeId) {
  return resolver.resolveThemedItem(getItems(), itemId, getTheme(themeId));
}

/** Nom localisé effectif d'un item pour un thème et une locale. */
export function getThemedItemName(itemId, themeId, locale) {
  const themed = getThemedItem(itemId, themeId);
  return localize.itemLocalizedName(themed, locale);
}

/** Meilleure image disponible pour un item/thème : thème → gta-artwork → no_image. */
export function getItemImage(itemId, themeId, { assetsRoot } = {}) {
  const item = getThemedItem(itemId, themeId) || getItem(itemId);
  if (!item) return resolver.NO_IMAGE;
  const root = assetsRoot ?? join(REPO_ROOT, 'assets');
  return resolver.resolveThemedImage(item.image, themeId, { assetsRoot: root });
}

/** Libère tous les caches (utile en rechargement à chaud). */
export function clearCache() {
  cache.items = null;
  cache.vehicles = null;
  cache.registry = null;
  cache.themes.clear();
  if (typeof resolver._clearExistsCache === 'function') resolver._clearExistsCache();
}

/**
 * Personnalise son propre catalogue à partir des données de base :
 * fusion des surcharges sur les items existants + ajout d'items complets inédits.
 * Retourne { items, missing }.
 */
export function applyOverrides(items, overrides) {
  return resolver.applyOverrides(items, overrides);
}