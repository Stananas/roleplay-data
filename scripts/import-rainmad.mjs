#!/usr/bin/env node
/**
 * Import d'une galerie d'images « artwork » (ex: items.rainmad.com) vers un thème.
 *
 * Usage :
 *   node scripts/import-rainmad.mjs \
 *     --src /chemin/vers/{Categorie}/*.png \
 *     --theme gtav-artwork \
 *     --priority OX,QB,DrugsV,Robbery
 *
 * Règles :
 *   - un item dont l'id normalisé existe déjà dans le catalogue → override (image) ;
 *   - sinon → item exclusif au thème ;
 *   - doublons entre catégories → une variante gagne selon --priority ;
 *   - les fichiers sont copiés dans assets/items/<theme>/ en conservant leur nom.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const src = arg('src');
const themeId = arg('theme') || 'gtav-artwork';
const priority = (arg('priority') || 'OX,QB,DrugsV,Robbery').split(',').filter(Boolean);

if (!src || !existsSync(src)) {
  console.error('[import-rainmad] --src introuvable');
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog', 'items.json'), 'utf-8'));
const catalogIds = new Set(catalog.items.map((i) => i.id.toLowerCase()));

function norm(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function titleCase(stem) {
  return stem
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

/* 1. Inventaire des fichiers par catégorie, trié par priorité */
const byName = new Map(); // norm(stem) -> { category, file, fullPath }
for (const cat of readdirSync(src)) {
  const catDir = join(src, cat);
  if (!statSync(catDir).isDirectory()) continue;
  for (const file of readdirSync(catDir)) {
    if (!file.toLowerCase().endsWith('.png')) continue;
    const stem = parse(file).name;
    const key = norm(stem);
    if (!key) continue;
    const existing = byName.get(key);
    const prio = priority.indexOf(cat);
    // on garde la variante de plus haute priorité (ou la première trouvée)
    if (!existing || priority.indexOf(existing.category) > prio || (existing.category === cat && prio === -1)) {
      byName.set(key, { category: cat, file, fullPath: join(catDir, file) });
    }
  }
}

/* 2. Copie des assets dans le pack thème */
const packDir = join(ROOT, 'assets', 'items', themeId);
mkdirSync(packDir, { recursive: true });
const copied = [];
for (const { file, fullPath } of byName.values()) {
  copyFileSync(fullPath, join(packDir, file));
  copied.push(file);
}

/* 3. Construction du thème (overrides + exclusifs) */
const overrides = [];
const exclusiveItems = [];
for (const [key, { file, category }] of byName.entries()) {
  if (catalogIds.has(key)) {
    overrides.push({ id: key, image: file });
  } else {
    const name = titleCase(parse(file).name.replace(/[_-]+/g, ' '));
    exclusiveItems.push({
      id: key,
      name: { fr: name, en: name },
      description: {
        fr: `Item d'inventaire « ${name} » — artwork GTA V (galerie RAINMAD).`,
        en: `Inventory item "${name}" — GTA V artwork (RAINMAD gallery).`,
      },
      image: file,
      weight: 0,
      stackable: true,
      usable: false,
      tags: key.startsWith('weapon_') ? ['weapon'] : [],
    });
  }
}

const theme = {
  $schema: '../catalog/schemas/theme.schema.json',
  $comment: `Thème généré depuis items.rainmad.com (${byName.size} images, sources : ${priority.join(', ')}). Les valeurs de gameplay (weight…) sont à compléter par la communauté.`,
  overrides,
  exclusiveItems,
};

const themeFile = join(ROOT, 'themes', `${themeId}.json`);
writeFileSync(themeFile, `${JSON.stringify(theme, null, 2)}\n`, 'utf-8');

console.log(`[import-rainmad] thème « ${themeId} » — importé depuis ${src}`);
console.log(`  images copiées        : ${byName.size} → assets/items/${themeId}/`);
console.log(`  overrides (catalogue) : ${overrides.length}`);
console.log(`  items exclusifs       : ${exclusiveItems.length}`);
console.log(`  fichier thème         : themes/${themeId}.json`);