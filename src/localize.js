/**
 * Helpers de localisation.
 * Conventions : fr + en toujours présents ; la locale demandée retombe sur en.
 */
/** Renvoie la traduction d'un objet localisé pour une locale (fallback en). */
export function localize(localized, locale) {
  const loc = !locale || typeof locale !== 'string' ? 'en' : locale;
  if (!localized) return '';
  return localized[loc] || localized.en || localized.fr || '';
}

/** Nom localisé d'un item (fallback en). */
export function itemLocalizedName(item, locale) {
  return localize(item?.name, locale);
}

/** Description localisée d'un item (fallback en). */
export function itemLocalizedDescription(item, locale) {
  return localize(item?.description, locale);
}

/** Nom localisé brand + model d'un véhicule. */
export function vehicleLocalizedName(vehicle, locale) {
  if (!vehicle) return '';
  const brand = localize(vehicle.brand, locale);
  const model = localize(vehicle.model, locale);
  return `${brand} ${model}`.trim();
}

/* ------------------------------------------------------------------ *
 * Unités (i18n des mesures) — données canoniques en métrique (SI),
 * conversion à l'affichage selon la locale. Le consommateur peut imposer
 * un système via opts.unit.
 * ------------------------------------------------------------------ */

/** Locales dont le système usuel de masse est le métrique. */
const METRIC_LOCALES = new Set([
  'fr', 'es', 'it', 'de', 'pt', 'nl', 'pl', 'ru', 'tr', 'ar', 'cs', 'hu', 'ro', 'sv', 'fi',
]);

/** Résout le système d'unités pour une locale (métrique par défaut). */
export function unitsForLocale(locale, opts = {}) {
  if (opts.unit === 'metric' || opts.unit === 'imperial') return opts.unit;
  const key = (locale || 'en').toLowerCase().slice(0, 2);
  return METRIC_LOCALES.has(key) ? 'metric' : 'imperial';
}

function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

const GRAMS_PER_LB = 453.59237;
const GRAMS_PER_OZ = 28.349523;

/**
 * Formate un poids d'item (en grammes, canonique) selon la locale :
 * métrique → « 950 g » / « 1,5 kg » ; impérial → « 2 lb » / « 1 lb 8 oz ».
 */
export function formatItemWeight(grams, locale, opts = {}) {
  const g = Number(grams) || 0;
  if (unitsForLocale(locale, opts) === 'imperial') {
    const lb = g / GRAMS_PER_LB;
    if (lb < 1) return `${fmt(g / GRAMS_PER_OZ)} oz`;
    const wholeLb = Math.floor(lb);
    const oz = Math.round((lb - wholeLb) * 16);
    if (oz >= 16) return `${fmt(wholeLb + 1)} lb`;
    return oz === 0 ? `${fmt(wholeLb)} lb` : `${fmt(wholeLb)} lb ${oz} oz`;
  }
  return g < 1000 ? `${fmt(g)} g` : `${fmt(g / 1000)} kg`;
}

/**
 * Formate une masse de véhicule (kg, canonique) selon la locale :
 * métrique → « 1 480 kg » ; impérial → « 3 263 lb ».
 */
export function formatVehicleMass(kg, locale, opts = {}) {
  const k = Number(kg) || 0;
  if (unitsForLocale(locale, opts) === 'imperial') {
    return `${fmt(k * 2.2046226)} lb`;
  }
  return `${fmt(k)} kg`;
}