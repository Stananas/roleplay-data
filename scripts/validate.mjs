#!/usr/bin/env node
/**
 * Validation du contenu du repo roleplay-data.
 *
 * - Valide chaque JSON du catalogue et des thèmes contre son schéma
 *   (implémentation minimaliste du sous-ensemble JSON-Schema utilisé).
 * - Vérifie l'unicité des ids (items, véhicules, items exclusifs des thèmes).
 * - Vérifie que chaque thème du registre a un fichier, et réciproquement.
 * - Vérifie l'existence des images référencées (warning pour les manquantes,
 *   erreur pour tout le reste).
 *
 * Usage : node scripts/validate.mjs   (sortie : 0 = OK, 1 = erreurs)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const IMAGE_PACKS_DIR = join(ROOT, 'assets', 'items');

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf-8'));
}

/* ------------------------------------------------------------------ *
 * Mini-validateur JSON-Schema (sous-ensemble utilisé par nos schémas)
 * ------------------------------------------------------------------ */
function resolveRef(schema, ref, rootSchema) {
  if (!ref.startsWith('#/definitions/')) throw new Error(`$ref non géré : ${ref}`);
  const key = ref.slice('#/definitions/'.length);
  return rootSchema.definitions[key];
}

function validate(node, schema, path, root) {
  if (schema === true) return;
  if (schema === false) return err(`${path} : schéma false interdit`);

  if (schema.$ref) {
    validate(node, resolveRef(schema, schema.$ref, root), path, root);
    return;
  }
  if (schema.anyOf) {
    let passed = false;
    for (const sub of schema.anyOf) {
      const before = errors.length;
      validate(node, sub, path, root);
      if (errors.length === before) {
        passed = true;
        break;
      }
      errors.length = before; // rollback de la branche non retenue
    }
    if (!passed) err(`${path} : ne matche aucun anyOf`);
    return;
  }

  // $schema / $comment : mots-clés d'annotation JSON-Schema, toujours autorisés.
  if (typeof node === 'object' && node !== null && !Array.isArray(node)) {
    const { $schema, $comment, ...cleanNode } = node;
    if (Object.keys(cleanNode).length === 0) return;
    node = cleanNode;
  }

  const t = schema.type;
  const actual =
    node === null ? 'null' :
    Array.isArray(node) ? 'array' :
    typeof node;

  if (t) {
    const expected = Array.isArray(t) ? t : [t];
    let ok = expected.includes(actual);
    if (actual === 'number' && expected.includes('integer')) ok = Number.isInteger(node);
    if (!ok) {
      err(`${path} : type attendu ${expected.join('|')}, reçu ${actual}`);
      return;
    }
  }

  if (actual === 'object') {
    if (schema.required) {
      for (const req of schema.required) {
        if (!(req in node)) err(`${path} : champ requis absent « ${req} »`);
      }
    }
    if (schema.properties) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (key in node) validate(node[key], subSchema, `${path}.${key}`, root);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(node)) {
        if (!schema.properties || !(key in schema.properties)) {
          err(`${path} : propriété inattendue « ${key} »`);
        }
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (!schema.properties || !(key in schema.properties)) {
          validate(value, schema.additionalProperties, `${path}.${key}`, root);
        }
      }
    }
    return;
  }

  if (actual === 'array') {
    if (schema.items) {
      node.forEach((item, idx) => validate(item, schema.items, `${path}[${idx}]`, root));
    }
    return;
  }

  if (actual === 'string') {
    if (schema.minLength !== undefined && node.length < schema.minLength) {
      err(`${path} : longueur < ${schema.minLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(node)) {
      err(`${path} : ne correspond pas au pattern ${schema.pattern} (« ${node} »)`);
    }
    if (schema.enum !== undefined && !schema.enum.includes(node)) {
      err(`${path} : valeur « ${node} » hors enum [${schema.enum.join(', ')}]`);
    }
    return;
  }

  if ((actual === 'number' || actual === 'integer') && typeof node === 'number') {
    if (schema.minimum !== undefined && node < schema.minimum) err(`${path} : < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && node > schema.maximum) err(`${path} : > maximum ${schema.maximum}`);
    return;
  }
}

/* ------------------------------ Schémas ------------------------------ */
function schemaFor(rel) { return loadJson(rel); }

const schemas = {
  items: schemaFor('catalog/schemas/item.schema.json'),
  vehicles: schemaFor('catalog/schemas/vehicle.schema.json'),
  themeRegistry: schemaFor('catalog/schemas/theme-registry.schema.json'),
  theme: schemaFor('catalog/schemas/theme.schema.json'),
};

/* ------------------------------- Catalog ------------------------------ */
const itemsCatalog = loadJson('catalog/items.json');
validate(itemsCatalog, schemas.items, 'catalog/items.json', schemas.items);

const vehiclesCatalog = loadJson('catalog/vehicles.json');
validate(vehiclesCatalog, schemas.vehicles, 'catalog/vehicles.json', schemas.vehicles);

/* -------------------------- Coherence ids/images ------------------------- */
const items = itemsCatalog.items || [];
const vehicles = vehiclesCatalog.vehicles || [];

function uniqueIds(list, label) {
  const seen = new Set();
  for (const entry of list) {
    if (!entry?.id) continue;
    if (seen.has(entry.id)) err(`${label} : id dupliqué « ${entry.id} »`);
    seen.add(entry.id);
  }
  return seen;
}

const itemIds = uniqueIds(items, 'catalog/items.json');
uniqueIds(vehicles, 'catalog/vehicles.json');

const gtaFiles = existsSync(join(IMAGE_PACKS_DIR, 'gta-artwork'))
  ? new Set(readdirSync(join(IMAGE_PACKS_DIR, 'gta-artwork')))
  : new Set();

for (const item of items) {
  if (!item.image) continue;
  if (!gtaFiles.has(item.image)) {
    warn(`image manquante (pack gta-artwork) : ${item.id} → ${item.image}`);
  }
}

/* ------------------------------- Thèmes -------------------------------- */
const registry = loadJson('themes/themes.json');
validate(registry, schemas.themeRegistry, 'themes/themes.json', schemas.themeRegistry);

const registryIds = new Set(Object.keys(registry.themes || {}));
const themeFiles = readdirSync(join(ROOT, 'themes'))
  .filter((f) => f.endsWith('.json') && f !== 'themes.json')
  .map((f) => f.replace(/\.json$/, ''));

for (const id of themeFiles) {
  if (!registryIds.has(id)) err(`themes/${id}.json : thème non déclaré dans themes/themes.json`);
  const theme = loadJson(`themes/${id}.json`);
  validate(theme, schemas.theme, `themes/${id}.json`, schemas.theme);

  // Unicité et cohérence des ids au sein du thème
  const seen = new Set();
  const virtualIds = new Set(theme.virtualIds || []);
  for (const o of theme.overrides || []) {
    if (seen.has(o.id)) err(`themes/${id}.json : override dupliqué « ${o.id} »`);
    seen.add(o.id);
    const inBase = itemIds.has(o.id);
    if (!inBase && !virtualIds.has(o.id)) {
      err(`themes/${id}.json : override « ${o.id} » — absent du catalogue et non déclaré dans virtualIds`);
    }
  }
  for (const e of theme.exclusiveItems || []) {
    if (seen.has(e.id)) err(`themes/${id}.json : id « ${e.id} » déjà défini (override ou exclusif)`);
    seen.add(e.id);
    if (itemIds.has(e.id)) {
      err(`themes/${id}.json : exclusif « ${e.id} » existe déjà dans le catalogue (utiliser un override)`);
    }
  }

  // Images du thème : présentes dans le pack du thème ? sinon dans gta-artwork ? sinon warning.
  if (existsSync(join(IMAGE_PACKS_DIR, id))) {
    const packFiles = new Set(readdirSync(join(IMAGE_PACKS_DIR, id)));
    for (const entry of [...(theme.overrides || []), ...(theme.exclusiveItems || [])]) {
      if (!entry.image) continue;
      if (packFiles.has(entry.image) || gtaFiles.has(entry.image)) continue;
      warn(`themes/${id}.json : image « ${entry.image} » absente des packs ${id} et gta-artwork`);
    }
  }
}

for (const id of registryIds) {
  if (id === 'gta-artwork' || id === 'dayz') continue; // gérés ~ tests ci-dessus
  const f = join(ROOT, 'themes', `${id}.json`);
  if (!existsSync(f)) err(`thème « ${id} » déclaré dans le registre mais themes/${id}.json absent`);
}

/* ------------------- Cohérence des catégories ------------------- */
let categoryIds = new Set();
try {
  const cats = loadJson('catalog/categories.json');
  validate(
    cats,
    schemaFor('catalog/schemas/category.schema.json'),
    'catalog/categories.json',
    schemaFor('catalog/schemas/category.schema.json')
  );
  categoryIds = new Set((cats.categories || []).map((c) => c.id));
} catch {
  err('catalog/categories.json illisible');
}
const categoryRefs = new Map();
function checkCategory(obj, where) {
  const cat = obj?.category;
  if (cat && !categoryIds.has(cat)) categoryRefs.set(cat, where);
}
for (const item of items) checkCategory(item, `catalog/items.json:${item.id}`);
for (const file of themeFiles) {
  const theme = loadJson(`themes/${file}.json`);
  for (const e of [...(theme.overrides || []), ...(theme.exclusiveItems || [])]) {
    checkCategory(e, `themes/${file}.json:${e.id}`);
  }
}
for (const [cat, where] of categoryRefs) {
  err(`catégorie inconnue « ${cat} » (réf: ${where}) — voir catalog/categories.json`);
}

/* -------------------------------- Bilan -------------------------------- */
console.log('');
console.log(`roleplay-data : ${items.length} items, ${vehicles.length} véhicules, ${themeFiles.length} thèmes`);

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} avertissement(s) :`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.log(`\n❌ ${errors.length} erreur(s) :`);
  for (const e of errors) console.log(`  - ${e}`);
  console.log('\nValidation échouée.');
  process.exit(1);
}
if (!errors.length) console.log('\n✅ Validation OK');
process.exit(0);