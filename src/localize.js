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