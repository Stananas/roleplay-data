/**
 * API orientée objet (DX) du package roleplay-data.
 *
 *   const items = new Items().theme('dayz').locale('fr');
 *   const burger = items.get('burger');
 *   burger.name();        // nom localisé (thème appliqué)
 *   burger.weightLabel(); // poids formaté selon locale/unités
 *   burger.image();       // meilleure image : thème → default → no_image
 *   items.theme('gtav-artwork'); // switch de thème à la volée (fluent)
 *
 * Politique de repli d'un item absent du thème (fallback) :
 *   - 'default' (défaut) : on renvoie l'item de base (pack de référence) ;
 *   - 'unknown'          : on renvoie un item « inconnu » (exists() === false,
 *                          image no_image).
 */
import { getItem, getItems, getTheme, getThemeRegistry, getThemedItemName } from './index.js';
import { resolveThemedItem, DEFAULT_IMAGE_THEME, NO_IMAGE, resolveThemedImage } from './resolve.js';
import {
  localize,
  itemLocalizedName,
  itemLocalizedDescription,
  formatItemWeight,
  formatVolume,
  formatVehicleMass,
} from './localize.js';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _here = dirname(fileURLToPath(import.meta.url));
const CATEGORIES_FILE = pathResolve(_here, '..', 'catalog', 'categories.json');
let _categoriesCache = null;
function getCategories() {
  if (_categoriesCache) return _categoriesCache;
  try {
    _categoriesCache = JSON.parse(readFileSync(CATEGORIES_FILE, 'utf-8')).categories ?? [];
  } catch {
    _categoriesCache = [];
  }
  return _categoriesCache;
}

/** Réglages globaux par défaut — partagés par toutes les instances. */
export class ItemsDefaults {
  static theme = DEFAULT_IMAGE_THEME;
  static locale = 'en';
  static units = 'auto'; // 'auto' | 'metric' | 'imperial'
  static fallback = 'default'; // 'default' | 'unknown'
}

/** Applique des réglages globaux (merge). */
export function configure(config = {}) {
  for (const key of ['theme', 'locale', 'units', 'fallback']) {
    if (config[key] !== undefined) ItemsDefaults[key] = config[key];
  }
  return ItemsDefaults;
}

function toUnitOpt(units) {
  return units === 'auto' ? {} : { unit: units };
}

/**
 * Vue item : un item résolu (thème/fallback appliqué) + son contexte.
 */
export class Item {
  constructor(id, resolved, ctx) {
    this.id = id;
    this._item = resolved; // objet complet OU null (inconnu)
    this._ctx = ctx;
  }

  /** L'item est-il connu (présent via le thème, un exclusif, ou le repli par défaut) ? */
  exists() {
    return this._item !== null;
  }

  /** Nom localisé selon le contexte (ou une locale surchargée). */
  name(locale) {
    if (!this._item) return this.id;
    return itemLocalizedName(this._item, locale ?? this._ctx.locale);
  }
  nameRaw() {
    return this._item?.name ?? null;
  }

  description(locale) {
    if (!this._item) return null;
    return itemLocalizedDescription(this._item, locale ?? this._ctx.locale);
  }
  descriptionRaw() {
    return this._item?.description ?? null;
  }

  emoji() {
    return this._item?.emoji ?? null;
  }

  /** Meilleure image : thème → pack par défaut → no_image. */
  image() {
    if (!this._item) return NO_IMAGE;
    return resolveThemedImage(this._item.image, this._ctx.theme);
  }

  /** Poids brut (grammes). */
  weight() {
    return this._item?.weight ?? 0;
  }
  /** Poids formaté selon la locale/unités (ex: « 950 g », « 2 lb 2 oz »). */
  weightLabel() {
    if (!this._item || this._item.weight === undefined) return null;
    return formatItemWeight(this._item.weight, this._ctx.locale, toUnitOpt(this._ctx.units));
  }

  /** Volume brut (ml) d'une boisson, sinon null. */
  volume() {
    return this._item?.consumable?.volumeMl ?? null;
  }
  /** Volume formaté (ex: « 25 cl », « 8,5 fl oz »). */
  volumeLabel() {
    const ml = this.volume();
    if (ml === null) return null;
    return formatVolume(ml, this._ctx.locale, toUnitOpt(this._ctx.units));
  }

  /** Satiété du consumable (portion entière), sinon {food, thirst} du haut niveau. */
  satiety() {
    if (!this._item) return null;
    return this._item.consumable?.satiety ?? { food: this._item.food ?? 0, thirst: this._item.thirst ?? 0 };
  }

  consumable() {
    return this._item?.consumable ?? null;
  }
  category() {
    return this._item?.category ?? 'misc';
  }

  stackable() {
    return this._item?.stackable ?? true;
  }
  usable() {
    return this._item?.usable ?? false;
  }
  tags() {
    return this._item?.tags ?? [];
  }
  metadata() {
    return this._item?.metadata ?? {};
  }
  customProperties() {
    return this._item?.customProperties ?? {};
  }

  /** L'objet complet résolu. */
  raw() {
    return this._item;
  }

  /** Sérialisation JSON → object. */
  toJSON() {
    return {
      id: this.id,
      exists: this.exists(),
      name: this.name(),
      description: this.description(),
      emoji: this.emoji(),
      image: this.image(),
      weight: this.weight(),
      weightLabel: this.weightLabel(),
      volume: this.volume(),
      volumeLabel: this.volumeLabel(),
      satiety: this.satiety(),
      consumable: this.consumable(),
      stackable: this.stackable(),
      usable: this.usable(),
      tags: this.tags(),
      metadata: this.metadata(),
      customProperties: this.customProperties(),
      theme: this._ctx.theme,
      locale: this._ctx.locale,
    };
  }
}

/**
 * Client fluent du catalogue : contexte (thème, locale, unités, repli) +
 * accès aux items.
 *
 *   new Items({ theme: 'dayz', locale: 'fr' })
 *   new Items().theme('dayz').locale('fr').units('auto')
 */
export class Items {
  constructor(opts = {}) {
    this._ctx = {
      theme: opts.theme ?? ItemsDefaults.theme,
      locale: opts.locale ?? ItemsDefaults.locale,
      units: opts.units ?? ItemsDefaults.units,
      fallback: opts.fallback ?? ItemsDefaults.fallback,
    };
  }

  /* ---------- réglages fluents ---------- */

  theme(name) {
    if (typeof name === 'string' && name.trim()) this._ctx.theme = name.trim();
    return this;
  }
  setTheme(name) {
    return this.theme(name);
  }
  locale(locale) {
    if (typeof locale === 'string' && locale.trim()) this._ctx.locale = locale.trim();
    return this;
  }
  units(units) {
    if (units === 'auto' || units === 'metric' || units === 'imperial') this._ctx.units = units;
    return this;
  }
  fallback(mode) {
    if (mode === 'default' || mode === 'unknown') this._ctx.fallback = mode;
    return this;
  }
  getContext() {
    return { ...this._ctx };
  }

  /* ---------- accès ---------- */

  /** Thème courant, normalisé (id inconnu → thème par défaut). */
  currentTheme() {
    const registry = getThemeRegistry();
    return registry[this._ctx.theme] ? this._ctx.theme : DEFAULT_IMAGE_THEME;
  }
  themes() {
    return Object.keys(getThemeRegistry());
  }
  themeLabel() {
    const registry = getThemeRegistry();
    const entry = registry[this.currentTheme()];
    return entry ? localize(entry.label, this._ctx.locale) : this.currentTheme();
  }

  /**
   * Résout un item dans le contexte courant.
   * - dans le thème (override/exclusif) → version thématique ;
   * - absent du thème → repli 'default' (base) ou 'unknown' selon la politique.
   */
  get(id) {
    if (!id) return new Item(null, null, this._ctx);
    const safeId = String(id);
    const themeId = this.currentTheme();
    const theme = getTheme(themeId);
    const { overrides = [], exclusiveItems = [] } = theme;
    const defined =
      overrides.some((o) => o?.id === safeId) || exclusiveItems.some((e) => e?.id === safeId);

    let resolved = resolveThemedItem(getItems(), safeId, theme);
    if (!defined && this._ctx.fallback === 'unknown') resolved = null;

    return new Item(safeId, resolved, { ...this._ctx, theme: themeId });
  }

  /** L'item est-il défini/connu dans le contexte courant ? */
  has(id) {
    return this.get(id).exists();
  }

  /** Tous les items du catalogue de base (résolus dans le thème courant). */
  all() {
    const themeId = this.currentTheme();
    const theme = getTheme(themeId);
    const ids = getItems().map((i) => i.id);
    for (const e of theme?.exclusiveItems ?? []) {
      if (!ids.includes(e.id)) ids.push(e.id);
    }
    return ids.map((id) => this.get(id));
  }

  /** Items par tag. */
  byTag(tag) {
    return this.all().filter((it) => it.tags().includes(tag));
  }

  /** Liste des catégories (registre localisé). */
  categories() {
    return getCategories().map((c) => ({
      id: c.id,
      name: localize(c.name, this._ctx.locale),
      emoji: c.emoji ?? null,
      parent: c.parent ?? null,
    }));
  }

  /** Items d'une catégorie (id du registre categories.json). */
  byCategory(categoryId) {
    return this.all().filter((it) => it.category() === categoryId);
  }

  /** Recherche par nom (locale courante + en), id, tags ou catégorie. */
  search(query) {
    const q = String(query ?? '').trim().toLowerCase();
    if (!q) return this.all();
    return this.all().filter((it) => {
      const hay =
        `${it.id} ${it.name()} ${it._item?.name?.en ?? ''} ${it.tags().join(' ')} ${it.category()}`.toLowerCase();
      return hay.includes(q);
    });
  }
}

/** Alias simple sous forme de fonction : const items = data().theme('dayz'); */
export { getThemedItemName as themedItemName };