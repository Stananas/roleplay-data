#!/usr/bin/env node
/**
 * Générateur des produits dérivés de roleplay-data.
 *
 *   node scripts/build-release.mjs [--version x.y.z] [--with-assets]
 *
 * Produits (dans dist/) :
 *   - dist/package/        contenu du package npm (JSON + resolvers + types)
 *   - dist/sql/…           seed PostgreSQL .sql prêt à injecter
 *   - dist/mongodb/…       documents série prêts pour mongoimport
 *   - dist/releases/*.zip  archive complète (catalog + themes + assets + docs)
 *
 * --with-assets  embarque aussi assets/ dans le package npm (le rend lourd,
 *                 ~30 Mo — par défaut les assets sont distribués via le zip
 *                 / les releases GitHub / un CDN).
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeZip } from './zip-store.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const DIST = join(ROOT, 'dist');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
let version = process.argv.includes('--version')
  ? process.argv[process.argv.indexOf('--version') + 1]
  : pkg.version;
version = version.replace(/^v/, '');
const withAssets = process.argv.includes('--with-assets');

function ensureDir(dir) { mkdirSync(dir, { recursive: true }); }
function readJson(rel) { return JSON.parse(readFileSync(join(ROOT, rel), 'utf-8')); }

const items = readJson('catalog/items.json').items;
const vehicles = readJson('catalog/vehicles.json').vehicles;
const registry = readJson('themes/themes.json').themes;
const themeFiles = readdirSync(join(ROOT, 'themes'))
  .filter((f) => f.endsWith('.json') && f !== 'themes.json');

/* ------------------------------------------------------------------ */
/* 1. Package npm (contenu)                                            */
/* ------------------------------------------------------------------ */
const pkgDir = join(DIST, 'package');
rmSync(pkgDir, { recursive: true, force: true });
ensureDir(pkgDir);
for (const item of ['catalog', 'themes', 'src']) {
  copyDir(join(ROOT, item), join(pkgDir, item));
}
copyFileSync(join(ROOT, 'LICENSE'), join(pkgDir, 'LICENSE'));
copyFileSync(join(ROOT, 'README.md'), join(pkgDir, 'README.md'));
copyFileSync(join(ROOT, 'package.json'), join(pkgDir, 'package.json'));
if (withAssets) copyDir(join(ROOT, 'assets'), join(pkgDir, 'assets'));

/* ------------------------------------------------------------------ */
/* 2. Seed SQL (PostgreSQL)                                            */
/* ------------------------------------------------------------------ */
function sqlStr(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}
function sqlLocalized(obj) {
  return obj ? `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb` : 'NULL';
}

const sqlDir = join(DIST, 'sql');
ensureDir(sqlDir);
const sqlLines = [
  '-- roleplay-data seed — généré par scripts/build-release.mjs',
  `-- Version : ${version}`,
  '',
  'BEGIN;',
  '',
  'CREATE TABLE IF NOT EXISTS rp_items (',
  '  id TEXT PRIMARY KEY,',
  '  name JSONB NOT NULL,',
  '  description JSONB NOT NULL,',
  '  image TEXT NOT NULL,',
  '  emoji TEXT,',
  '  weight NUMERIC NOT NULL,',
  '  food NUMERIC NOT NULL DEFAULT 0,',
  '  thirst NUMERIC NOT NULL DEFAULT 0,',
  '  drug JSONB,',
  '  consumable JSONB,',
  '  category TEXT,',
  '  stackable JSONB NOT NULL DEFAULT \'true\'::jsonb,',
  '  usable BOOLEAN NOT NULL DEFAULT FALSE,',
  '  tags TEXT[] NOT NULL DEFAULT \'{}\',',
  '  metadata JSONB NOT NULL DEFAULT \'{}\',',
  '  custom_properties JSONB NOT NULL DEFAULT \'{}\'',
  ');',
  'CREATE TABLE IF NOT EXISTS rp_vehicles (',
  '  id TEXT PRIMARY KEY,',
  '  brand JSONB NOT NULL,',
  '  model JSONB NOT NULL,',
  '  category TEXT NOT NULL,',
  '  image TEXT NOT NULL,',
  '  seats INT NOT NULL DEFAULT 2,',
  '  mass_kg NUMERIC,',
  '  fuel_capacity NUMERIC,',
  '  max_speed NUMERIC,',
  '  cargo JSONB NOT NULL DEFAULT \'{}\',',
  '  metadata JSONB NOT NULL DEFAULT \'{}\',',
  '  custom_properties JSONB NOT NULL DEFAULT \'{}\'',
  ');',
  'CREATE TABLE IF NOT EXISTS rp_themes (',
  '  id TEXT PRIMARY KEY,',
  '  label JSONB NOT NULL,',
  '  scope TEXT[] NOT NULL DEFAULT \'{}\',',
  '  license TEXT',
  ');',
  'CREATE TABLE IF NOT EXISTS rp_theme_entries (',
  '  theme_id TEXT NOT NULL REFERENCES rp_themes(id),',
  '  item_id TEXT NOT NULL,',
  '  kind TEXT NOT NULL CHECK (kind IN (\'override\', \'exclusive\')),',
  '  data JSONB NOT NULL,',
  '  PRIMARY KEY (theme_id, item_id)',
  ');',
  '',
];
for (const item of items) {
  const tags = (item.tags || []).length
    ? `'{${item.tags.map((t) => `"${t.replace(/"/g, '""')}"`).join(',')}}'`
    : "'{}'";
  sqlLines.push(
    `INSERT INTO rp_items (id, name, description, image, emoji, weight, food, thirst, drug, consumable, category, stackable, usable, tags, metadata, custom_properties) VALUES (${sqlStr(item.id)}, ${sqlLocalized(item.name)}, ${sqlLocalized(item.description)}, ${sqlStr(item.image)}, ${sqlStr(item.emoji ?? null)}, ${sqlStr(item.weight)}, ${sqlStr(item.food ?? 0)}, ${sqlStr(item.thirst ?? 0)}, ${sqlLocalized(item.drug ?? null)}, ${sqlLocalized(item.consumable ?? null)}, ${sqlStr(item.category ?? null)}, ${sqlLocalized(item.stackable ?? true)}, ${sqlStr(item.usable ?? false)}, ${tags}, ${sqlLocalized(item.metadata ?? {})}, ${sqlLocalized(item.customProperties ?? {})});`
  );
}
for (const v of vehicles) {
  sqlLines.push(
    `INSERT INTO rp_vehicles (id, brand, model, category, image, seats, mass_kg, fuel_capacity, max_speed, cargo, metadata, custom_properties) VALUES (${sqlStr(v.id)}, ${sqlLocalized(v.brand)}, ${sqlLocalized(v.model)}, ${sqlStr(v.category)}, ${sqlStr(v.image)}, ${sqlStr(v.seats ?? 2)}, ${sqlStr(v.massKg ?? null)}, ${sqlStr(v.fuelCapacity ?? null)}, ${sqlStr(v.maxSpeed ?? null)}, ${sqlLocalized(v.cargo ?? {})}, ${sqlLocalized(v.metadata ?? {})}, ${sqlLocalized(v.customProperties ?? {})});`
  );
}
for (const [id, t] of Object.entries(registry)) {
  sqlLines.push(
    `INSERT INTO rp_themes (id, label, scope, license) VALUES (${sqlStr(id)}, ${sqlLocalized(t.label)}, '{${(t.scope || []).join(',')}}', ${sqlStr(t.license ?? null)});`
  );
}
for (const file of themeFiles) {
  const themeId = file.replace(/\.json$/, '');
  const theme = readJson(`themes/${file}`);
  for (const o of theme.overrides || []) {
    const { id: itemId, ...data } = o;
    sqlLines.push(
      `INSERT INTO rp_theme_entries (theme_id, item_id, kind, data) VALUES (${sqlStr(themeId)}, ${sqlStr(itemId)}, 'override', ${sqlLocalized(data)});`
    );
  }
  for (const e of theme.exclusiveItems || []) {
    const { id: itemId, ...data } = e;
    sqlLines.push(
      `INSERT INTO rp_theme_entries (theme_id, item_id, kind, data) VALUES (${sqlStr(themeId)}, ${sqlStr(itemId)}, 'exclusive', ${sqlLocalized(data)});`
    );
  }
}
sqlLines.push('', 'COMMIT;', '');
const sqlPath = join(sqlDir, 'roleplay-data.sql');
writeFile(sqlPath, sqlLines.join('\n'));

/* ------------------------------------------------------------------ */
/* 3. Seed MongoDB (docs séries pour mongoimport)                      */
/* ------------------------------------------------------------------ */
const mongoDir = join(DIST, 'mongodb');
ensureDir(mongoDir);
function mongoDocs(list, extra) {
  return list.map((entry, i) => {
    const { id, ...rest } = entry;
    return JSON.stringify({ _id: { $oid: `${id}`.padEnd(24, '0').slice(0, 24) }, id, ...extra(id), ...rest });
  });
}
writeFile(
  join(mongoDir, 'seed.items.json'),
  mongoDocs(items, (id) => ({ type: 'item' })).join('\n') + '\n'
);
writeFile(
  join(mongoDir, 'seed.vehicles.json'),
  mongoDocs(vehicles, (id) => ({ type: 'vehicle' })).join('\n') + '\n'
);
const themeDocs = [];
for (const [id, t] of Object.entries(registry)) {
  themeDocs.push(JSON.stringify({ _id: { $oid: `${id}`.padEnd(24, '0').slice(0, 24) }, id, ...t, kind: 'theme-registry' }));
}
for (const file of themeFiles) {
  const themeId = file.replace(/\.json$/, '');
  const theme = readJson(`themes/${file}`);
  themeDocs.push(JSON.stringify({ _id: { $oid: `theme-${themeId}`.padEnd(24, '0').slice(0, 24) }, id: themeId, kind: 'theme', ...theme }));
}
writeFile(join(mongoDir, 'seed.themes.json'), themeDocs.join('\n') + '\n');

/* ------------------------------------------------------------------ */
/* 4. Archive ZIP (assets + données + docs)                            */
/* ------------------------------------------------------------------ */
const zipDir = join(DIST, 'releases');
ensureDir(zipDir);
const zipEntries = [];

function collectDir(dir, prefix) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = `${prefix}/${entry}`;
    if (statSync(full).isDirectory()) collectDir(full, rel);
    else zipEntries.push({ path: rel, data: readFileSync(full) });
  }
}
collectDir(join(ROOT, 'catalog'), 'catalog');
collectDir(join(ROOT, 'themes'), 'themes');
collectDir(join(ROOT, 'assets'), 'assets');
zipEntries.push(
  { path: 'LICENSE', data: readFileSync(join(ROOT, 'LICENSE')) },
  { path: 'README.md', data: readFileSync(join(ROOT, 'README.md')) },
  { path: 'CREDITS.md', data: readFileSync(join(ROOT, 'CREDITS.md')) }
);

const zipPath = join(zipDir, `roleplay-data-v${version}.zip`);
await writeZip(zipPath, zipEntries);

/* ------------------------------------------------------------------ */
console.log(`\n✅ roleplay-data v${version} — produits générés dans dist/`);
console.log(`  - package npm      dist/package/ (${withAssets ? 'avec assets' : 'sans assets — use --with-assets'})`);
console.log(`  - seed SQL         dist/sql/roleplay-data.sql`);
console.log(`  - seed MongoDB     dist/mongodb/seed.{items,vehicles,themes}.json`);
console.log(`  - archive ZIP      ${relative(ROOT, zipPath)} (${items.length} items, ${vehicles.length} véhicules, ${themeFiles.length} thèmes)`);

/* ------------------------- helpers locaux ------------------------- */
function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}
function writeFile(path, content) {
  writeFileSync(path, content, 'utf-8');
  console.log(`  généré ${relative(ROOT, path)}`);
}