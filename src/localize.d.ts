/**
 * Déclarations typées des helpers i18n (implémentation : localize.js).
 * Évite toute circularité : les types structures sont répétés volontairement.
 */

export type LocalizedLike = {
  fr?: string;
  en?: string;
  [locale: string]: string | undefined;
};

/** Renvoie la traduction d'un objet localisé pour une locale (fallback en). */
export function localize(localized: LocalizedLike | null | undefined, locale?: string): string;

/** Nom localisé d'un item (fallback en). */
export function itemLocalizedName(
  item: { name?: LocalizedLike } | null | undefined,
  locale?: string
): string;

/** Description localisée d'un item (fallback en). */
export function itemLocalizedDescription(
  item: { description?: LocalizedLike } | null | undefined,
  locale?: string
): string;

/** Nom localisé brand + model d'un véhicule. */
export function vehicleLocalizedName(
  vehicle: { brand?: LocalizedLike; model?: LocalizedLike } | null | undefined,
  locale?: string
): string;