#!/usr/bin/env node
/**
 * Traduit en français les noms générés du thème gtav-artwork (import RAINMAD).
 *
 * Il transforme name.fr (actuellement identique à l'anglais) en français correct :
 *   - dictionnaire de tokens (armes, accessoires, drogues, objets courants) ;
 *   - surcharges phrase complète pour les composés qui changent d'ordre en français ;
 *   - les noms de marques/gammes GTA restent tels quels.
 *
 * Usage : node scripts/translate-artwork-fr.mjs    (modifie themes/gtav-artwork.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const themeId = arg('theme') || 'gtav-artwork';
const THEME = join(ROOT, 'themes', `${themeId}.json`);
const OVERRIDES = JSON.parse(
  readFileSync(join(ROOT, arg('overrides') || 'scripts/fr-overrides-artwork.json'), 'utf-8')
);

/* Surcharges de phrases complètes : anglais (minuscules) → français correct */
const PHRASES = {
  "vehicle wheel": "roue de véhicule",
  "vehicle door": "porte de véhicule",
  "vehicle hood": "capot de véhicule",
  "vehicle trunk": "coffre de véhicule",
  "big diamond": "gros diamant",
  "snowball": "boule de neige",
  "bank card": "carte bancaire",
  "card id": "carte d'identité",
  "id card": "carte d'identité",
  "black money": "argent noir",
  "bolt cutter": "coupe-boulons",
  "c4 bomb": "bombe C4",
  "bt c4": "C4",
  "bt gastank": "réservoir de gaz",
  "bt hackdevice": "dispositif de piratage",
  "cashbon": "bonus d'argent",
  "artegg": "œuf d'œuvre d'art",
  "artegg2": "œuf d'œuvre d'art II",
  "artgun": "arme d'œuvre d'art",
  "arthorse": "cheval d'œuvre d'art",
  "artlamp": "lampe d'œuvre d'art",
  "artskull": "crâne d'œuvre d'art",
  "antipatharia coral": "corail antipatharia",
  "gold chain": "chaîne en or",
  "10kgoldchain": "chaîne en or de 10 kg",
  "roasted coffee": "café torréfié",
  "weapon license": "permis de port d'arme",
  "driver license": "permis de conduire",
  "diving suit": "combinaison de plongée",
  "half of gold": "moitié d'or",
  "small bottle": "petite bouteille",
  "big drill": "grosse perceuse",
  "camo paint": "peinture de camouflage",
  "small baggy": "petit pochon",
  "empty baggy": "pochon vide",
  "packed baggy": "pochon plein",
  "3 baggy": "trois pochons",
  "white baggy": "pochon blanc",
};

/* Dictionnaire token (EN → FR) */
const T = {
  // armes GTA
  weapon: "arme", pistol: "pistolet", snspistol: "pistolet SNS", pistol50: "pistolet .50",
  assaultrifle: "fusil d'assaut", bullpuprifle: "fusil bullpup", carbinerifle: "carabine",
  specialcarbine: "carabine spéciale", combatmg: "mitrailleuse de combat", marksmanrifle: "fusil de précision",
  pumpshotgun: "fusil à pompe", grenadelauncher: "lance-grenades", revolver: "revolver",
  musket: "mousquet", railgun: "railgun", railgunxm3: "railgun XM3", hatchet: "hachette",
  heavysniper: "sniper lourd", smg: "mitraillette", rifle: "fusil", shotgun: "fusil",
  mg: "mitrailleuse", rifle2: "fusil II", tecpistol: "pistol TEC", stiletto: "stiletto",
  switchblade: "couteau à cran d'arrêt", vintagepistol: "pistolet vintage",
  stonehatchet: "hachette de pierre", stickybomb: "bombe collante", stinger: "aiguillon",
  ircam: "caméra IR", mark: "mark", grapple: "grappin", mgl: "lanceur MGL",
  // munitions
  ammo: "munitions", beanbag: "à grenaille", firework: "feu d'artifice", laser: "laser",
  rocket: "roquette", sniper: "sniper", precision: "précision", slide: "rail",
  // accessoires armes
  attachment: "accessoire", at: "accessoire", muzzle: "bouchon de canon", barrel: "canon",
  clip: "chargeur", extended: "rallongé", drum: "tambour", suppressor: "silencieux",
  scope: "lunette", advanced: "avancée", holo: "holographique", nv: "vision nocturne", thermal: "thermique",
  small: "petite", medium: "moyenne", large: "grande", grip: "poignée", flashlight: "lampe torche",
  slanted: "oblique", tactical: "tactique", squared: "carré", split: "fendu", flat: "plat",
  heavy: "lourd", fat: "large", bell: "cloche", brake: "frein", boomcamo: "camouflage",
  brushcamo: "camouflage", camo: "camouflage", paint: "peinture",
  // drogues
  weed: "herbe", coke: "cocaïne", heroin: "héroïne", meth: "meth", cocaine: "cocaïne",
  crack: "crack", kush: "kush", haze: "haze", bud: "bourgeon", leaf: "feuille",
  brick: "brique", packed: "conditionné", baggy: "pochon", tray: "plateau", table: "table",
  acetone: "acétone", hcacid: "acide", mixture: "mélange", lithium: "lithium",
  phosphorus: "phosphore", campfire: "feu de camp", gas: "gaz", seed: "graine",
  acid: "acide", spoon: "cuillère", pile: "pile", can: "canette", plant: "plante",
  // objets / nourriture
  bottle: "bouteille", water: "eau", bread: "pain", burger: "burger", chicken: "poulet",
  pizza: "pizza", ham: "jambon", candy: "bonbon", beer: "bière", coffee: "café",
  roasted: "torréfié", money: "argent", card: "carte", usb: "clé USB", laptop: "ordinateur portable",
  phone: "téléphone", toaster: "grille-pain", radio: "radio", tv: "téléviseur",
  fan: "ventilateur", drill: "perceuse", hammer: "marteau", watch: "montre",
  binoculars: "jumelles", armor: "gilet pare-balles", armour: "gilet pare-balles",
  gold: "or", diamond: "diamant", big: "gros", black: "noir", white: "blanc",
  stolen: "volé", veh: "véhicule", vehicle: "véhicule", door: "porte", hood: "capot",
  trunk: "coffre", wheel: "roue", briefcase: "mallette", bomb: "bombe", portable: "portable",
  c4: "C4", security: "sécurité", diving: "plongée", suit: "combinaison",
  end: "extrémité", half: "moitié", camo: "camouflage", lockpick: "crochet de serrure",
  advancedlockpick: "crochet de serrure avancé",
  // tokens conservés tels quels
  mk2: "MK2", bt: "", "01": "I", "02": "II", "03": "III",
};

function joinTokens(words) {
  return words.filter(Boolean).map(cap).join(' ');
}
function cap(w) {
  return w.length > 1 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase();
}

const theme = JSON.parse(readFileSync(THEME, 'utf-8'));
let changed = 0;

for (const item of theme.exclusiveItems) {
  const en = item.name.en ?? item.name.fr ?? '';
  const key = en.toLowerCase();

  // 1. traduction par id (surcharge la plus fiable)
  if (OVERRIDES[item.id]) {
    item.name.fr = OVERRIDES[item.id];
    changed += 1;
    continue;
  }
  // 2. surcharge de phrase
  if (PHRASES[key]) {
    item.name.fr = PHRASES[key];
    changed += 1;
    continue;
  }

  const tokens = key.split(/[\s'\-]+/).filter(Boolean);
  const frTokens = tokens.map((tok) => {
    if (tok in T) return T[tok];
    if (/^[0-9]+$/.test(tok)) return tok.toUpperCase();
    return null;
  });

  if (frTokens.some((t) => t === null)) {
    item.name.fr = joinTokens(tokens.map((tok, i) => (frTokens[i] ?? tok)));
  } else {
    item.name.fr = joinTokens(frTokens);
  }
  changed += 1;
}

writeFileSync(THEME, `${JSON.stringify(theme, null, 2)}\n`, 'utf-8');
console.log(`[translate-artwork-fr] ${changed} noms traduits → themes/${themeId}.json`);
console.log('⚠️  Les tokens inconnus (gammes GTA, marques) restent en anglais → revue affinée ensuite.');