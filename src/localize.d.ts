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

export type UnitSystem = 'metric' | 'imperial';

export type UnitOptions = { unit?: UnitSystem };

/** Résout le système d'unités pour une locale (métrique par défaut). */
export function unitsForLocale(locale?: string, opts?: UnitOptions): UnitSystem;

/** Formate un poids d'item (grammes, canonique) selon la locale : g/kg ou lb/oz. */
export function formatItemWeight(grams: number, locale?: string, opts?: UnitOptions): string;

/** Formate une masse de véhicule (kg, canonique) selon la locale : kg ou lb. */
export function formatVehicleMass(kg: number, locale?: string, opts?: UnitOptions): string;