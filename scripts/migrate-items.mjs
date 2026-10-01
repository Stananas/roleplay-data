#!/usr/bin/env node
/**
 * Migration one-shot : format items « legacy Amity » → format canonique roleplay-data.
 *
 * Usage :
 *   node scripts/migrate-items.mjs <ancien items.json> [--out catalog/items.json]
 *
 * Transformation :
 *   - name (+ translations)            → name:  { fr, en, … }
 *   - descriptionTranslations          → description: { fr, en, … }
 *   - le reste (image, emoji, weight, food, thirst, drug, stackable,
 *     usable, tags, customProperties) est conservé tel quel.
 *   - metadata.irl est laissé vide (pas déductible automatiquement), remplissable
 *     par la communauté ensuite.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function fail(message) {
  console.error(`[migrate-items] ${message}`);
  process.exit(1);
}

const sourceArg = process.argv[2];
if (!sourceArg) fail('chemin source manquant (ancien items.json)');

const outArgIdx = process.argv.indexOf('--out');
const outArg = outArgIdx !== -1 ? process.argv[outArgIdx + 1] : null;

const legacy = JSON.parse(readFileSync(resolve(sourceArg), 'utf-8'));
if (!Array.isArray(legacy.items)) fail('format inattendu : absence de clé "items"');

/**
 * Construit un objet localisé à partir de l'ancien « name + translations ».
 * La locale par défaut du legacy est FR (name = nom français).
 */
function buildLocalized(base, translations, defaultLocale = 'fr') {
  const t = translations && typeof translations === 'object' ? translations : {};
  const merged = {
    [defaultLocale]: base,
    ...t,
  };
  if (typeof merged.en !== 'string' || !merged.en.trim()) merged.en = base;
  return merged;
}

function buildDescription(translations) {
  const t = translations && typeof translations === 'object' ? translations : {};
  const merged = { ...t };
  if (typeof merged.fr !== 'string' || !merged.fr.trim()) merged.fr = merged.en || '';
  if (typeof merged.en !== 'string' || !merged.en.trim()) merged.en = merged.fr || '';
  return merged;
}

const items = legacy.items.map((raw) => {
  const item = {
    id: raw.id,
    name: buildLocalized(raw.name, raw.translations),
    description: buildDescription(raw.descriptionTranslations),
  };

  for (const field of ['image', 'emoji', 'weight', 'food', 'thirst', 'drug', 'stackable', 'usable', 'tags', 'customProperties']) {
    if (raw[field] !== undefined) item[field] = raw[field];
  }

  return item;
});

// Contrôles de cohérence avant écriture
const ids = new Set();
for (const item of items) {
  if (ids.has(item.id)) fail(`id dupliqué : ${item.id}`);
  ids.add(item.id);
  if (!item.name?.fr || !item.name?.en) fail(`name incomplet (fr/en requis) : ${item.id}`);
  if (!item.description?.fr || !item.description?.en) fail(`description incomplète (fr/en requis) : ${item.id}`);
  const image = item.image || '';
  if (!image) fail(`image manquante : ${item.id}`);
}

const data = {
  $schema: '../catalog/schemas/item.schema.json',
  $comment: 'Catalogue canonique des items. Contributeurs : merci de respecter le schéma — la validation CI le vérifie.',
  items,
};

const outFile = outArg ? resolve(outArg) : resolve(process.cwd(), 'catalog/items.json');
mkdirSync(dirname(outFile), { recursive: true });
// 2 espaces = diff-friendly pour les PR
writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');

console.log(`[migrate-items] ${items.length} items migrés → ${outFile}`);