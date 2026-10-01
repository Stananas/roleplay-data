/**
 * Déclarations typées de la résolution de thèmes (implémentation : resolve.js).
 * Reflet exact de l'API publique du module.
 */

export type ResolveOptions = {
  assetsRoot?: string;
};

/** Id du thème d'images de référence (pack par défaut). */
export const DEFAULT_IMAGE_THEME: string;
/** Fichier d'image de repli universel. */
export const NO_IMAGE: string;

/** Normalise un id de thème (minuscules, [a-z0-9_-]), tombe sur le thème par défaut. */
export function normalizeThemeId(raw: unknown): string;

/**
 * Meilleure image : thème → gta-artwork → no_image.
 * Sans assets embarqués, renvoie un chemin URL-able `items/{thème}/{fichier}`.
 */
export function resolveThemedImage(
  imageFile: string | null | undefined,
  themeId?: string | null | undefined,
  opts?: ResolveOptions
): string;

/** Items exclusifs d'un thème (non utilisés par l'API publique directement). */
export function _clearExistsCache(): void;