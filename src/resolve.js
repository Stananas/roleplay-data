/**
 * Résolution des thèmes (packs d'images + renommages + items exclusifs).
 * Portage du comportement du bot Amity :
 *   - un thème se greffe sur le catalogue sans le modifier ;
 *   - les remplacements n'appliquent que les champs présents ;
 *   - l'image retombe sur le thème de référence (gta-artwork), puis no_image.
 *
 * Source de vérité des thèmes disponibles : themes/themes.json (le registre).
 */

/** Id du thème d'images de référence (pack par défaut). */
export const DEFAULT_IMAGE_THEME = 'gta-artwork';

export const NO_IMAGE = 'no_image.png';

import { existsSync } from 'node:fs';

const existsCache = new Map();

function fileExists(fsPath) {
  if (existsCache.has(fsPath)) return existsCache.get(fsPath);
  const ok = existsSync(fsPath);
  existsCache.set(fsPath, ok);
  return ok;
}

/** Libère le cache d'existence de fichiers (rechargement à chaud). */
export function _clearExistsCache() {
  existsCache.clear();
  rootValidCache.clear();
}

/**
 * Renvoie le meilleur chemin d'image : thème → gta-artwork → no_image.
 *
 * - `assetsRoot` fourni et valide (le dossier items/gta-artwork y existe) : contrôle
 *   fichier par fichier, no_image en ultime recours.
 * - assets NON embarqués (package sans assets) : renvoie un chemin relatif
 *   « URL-able » `items/{theme}/{file}` que le consommateur mappe sur son CDN.
 */
export function resolveThemedImage(imageFile, themeId, { assetsRoot } = {}) {
  const safeImage = (imageFile || '').trim() || NO_IMAGE;
  const theme = normalizeThemeId(themeId);

  const candidate = (t) =>
    assetsRoot ? `${assetsRoot}/items/${t}/${safeImage}` : `assets/items/${t}/${safeImage}`;

  const assetsValid =
    !assetsRoot || assetRootHasPacks(assetsRoot);

  if (theme && theme !== DEFAULT_IMAGE_THEME) {
    const themed = candidate(theme);
    if (assetsValid && fileExists(themed)) return themed;
  }

  const base = candidate(DEFAULT_IMAGE_THEME);
  if (assetsValid && fileExists(base)) return base;

  if (!assetsValid) {
    const t = theme && theme !== DEFAULT_IMAGE_THEME ? theme : DEFAULT_IMAGE_THEME;
    return `items/${t}/${safeImage}`;
  }

  return assetsRoot ? `${assetsRoot}/no_image.png` : `assets/items/${NO_IMAGE}`;
}

let rootValidCache = new Map();

function assetRootHasPacks(assetsRoot) {
  if (rootValidCache.has(assetsRoot)) return rootValidCache.get(assetsRoot);
  const ok = existsSync(`${assetsRoot}/items/${DEFAULT_IMAGE_THEME}`);
  rootValidCache.set(assetsRoot, ok);
  return ok;
}

/** Normalise un id de thème (minuscules, [a-z0-9_-]). */
export function normalizeThemeId(raw) {
  if (typeof raw !== 'string') return DEFAULT_IMAGE_THEME;
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return normalized || DEFAULT_IMAGE_THEME;
}

/** Construit un item exclusif complet depuis une entrée de thème. */
export function buildExclusiveItem(entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.id.trim()) return null;
  if (!entry.name || typeof entry.name !== 'object') return null;
  if (!entry.image || typeof entry.image !== 'string') return null;
  if (!Number.isFinite(entry.weight)) return null;

  return {
    id: entry.id,
    name: entry.name,
    description: entry.description || { fr: '', en: '' },
    image: entry.image,
    emoji: entry.emoji || '',
    weight: entry.weight,
    food: entry.food ?? 0,
    thirst: entry.thirst ?? 0,
    drug: entry.drug ?? null,
    stackable: entry.stackable ?? true,
    usable: entry.usable ?? false,
    tags: entry.tags || [],
    metadata: entry.metadata || {},
    customProperties: entry.customProperties || {},
  };
}

/** Applique un override sur un item existant (seuls les champs présents remplacent). */
export function applyOverride(baseItem, override) {
  if (!baseItem || !override) return baseItem;
  const merged = { ...baseItem };

  for (const field of [
    'name', 'description', 'image', 'emoji', 'weight', 'food', 'thirst',
    'drug', 'stackable', 'usable', 'tags', 'customProperties',
  ]) {
    if (override[field] !== undefined) merged[field] = override[field];
  }
  return merged;
}

/**
 * Résout un item complet pour un thème donné :
 *   - item du catalogue + override du thème (fusion) ;
 *   - ou item exclusif du thème si l'id n'existe pas dans le catalogue.
 * Retourne null si introuvable.
 */
export function resolveThemedItem(baseItems, itemId, theme) {
  const safeId = (itemId || '').trim();
  if (!safeId) return null;

  // 1. item exclusif du thème ?
  // 2. override sur un item du catalogue ?
  const themeEntries = theme?.overrides || [];
  const themeExclusives = theme?.exclusiveItems || [];

  if (baseItems && Array.isArray(baseItems)) {
    // Items uniquement dans le thème : non remplacés par les overrides.
    for (const entry of themeExclusives) {
      if (entry.id === safeId) return buildExclusiveItem(entry);
    }
  }

  const base = Array.isArray(baseItems)
    ? baseItems.find((i) => i?.id === safeId) || null
    : null;

  const override = themeEntries.find((e) => e?.id === safeId) || null;

  if (base && override) return applyOverride(base, override);
  if (base) return base;
  return null;
}

/** Ids d'items effectivement disponibles dans un thème. */
export function listThemeItemIds(theme) {
  const ids = new Set((theme?.overrides || []).map((e) => e?.id));
  for (const e of theme?.exclusiveItems || []) {
    ids.add(e?.id);
  }
  return Array.from(ids);
}