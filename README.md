# roleplay-data

**Base de données RP open source** : items, véhicules, thèmes (packs d'images +
renommages) et i18n. Une source de vérité unique, consommable partout :

- 📦 **package npm** pour vos services (bot Discord, sites, API)
- 🗄️ **seed SQL / MongoDB** prêt à injecter (catalogues, thèmes)
- 📦 **archive ZIP** des assets pour une version donnée (FiveM, ESX, serveurs custom)

> 🇫🇷 🇬🇧 Conventions : la langue source des données est **fr + en** (obligatoires),
> toute autre locale est une contribution bonus.

---

## Structure

```
catalog/                  ✨ données canoniques
├── items.json             166 items (nom, description i18n, poids, stats, tags…)
├── vehicles.json          10 modèles de véhicules (marque/modèle i18n, catégorie, specs, cargo)
└── schemas/               JSON Schema : la validation CI les applique aux PR
themes/                   🎨 systèmes de thèmes (packs d'images + renommages + exclusifs)
├── themes.json            le registre : un thème est déclaré une fois, partout consommé
├── gta-artwork.json       renommages « monde GTA V » (ex: arme Beretta → « Pistol »)
├── gtav-artwork.json      pack RAINMAD : 517 items artwork (43 overrides + 474 exclusifs)
└── dayz.json              renommages + items exclusifs DayZ
assets/                   🖼️ images (brutes en git — LFS later)
├── items/gta-artwork/     pack d'images par défaut (référence)
├── items/gtav-artwork/    pack d'images RAINMAD « Artwork GTA V »
├── items/dayz/            pack d'images du thème DayZ
└── no_image.png           fallback universel
src/                      📦 l'API du package (zéro dépendance)
├── index.js               chargement + cache + API publique
├── resolve.js             résolution thème (image fallback gta-artwork → no_image, overrides, exclusifs)
├── localize.js            i18n (fallback en)
└── index.d.ts             types TypeScript
scripts/                  🔧 outils de maintenance
├── validate.mjs           validation (schéma, unicité des ids, cohérence thèmes, images)
└── build-release.mjs      génère dist/ : package npm + seed SQL + seed MongoDB + ZIP
```

---

## Exemples d'items

```json
{
  "id": "weapon_beretta",
  "name": { "fr": "Beretta", "en": "Beretta" },
  "description": { "fr": "Un pistolet semi-automatique fiable.", "en": "A reliable semi-automatic pistol." },
  "image": "weapon_beretta.png",
  "emoji": "🔫",
  "weight": 950,
  "food": 0, "thirst": 0, "drug": null,
  "stackable": false, "usable": false,
  "tags": ["weapon"],
  "metadata": { "irl": { "model": "Beretta 92FS", "fabricant": "Beretta", "caliber": "9×19 mm Parabellum" } },
  "customProperties": {}
}
```

- `metadata` : identité réelle de l'objet — sert de base au **renommage par thème**
  (voir `themes/gta-artwork.json` : la même arme porte son nom GTA V dans ce thème).
- `customProperties` : **point d'extension libre** pour vos besoins propres,
  sans jamais modifier le schéma.

## Exemple de thème

```json
// themes/gta-artwork.json — renommage monde GTA V
{ "overrides": [ { "id": "weapon_beretta", "name": { "fr": "Pistol", "en": "Pistol" } } ], "exclusiveItems": [] }
```

Règles des thèmes :
- les **overrides** ne touchent que les champs fournis (fusion sur l'item du catalogue) ;
- les **exclusiveItems** n'existent que dans le thème (ex: `aks74u` en DayZ) ;
- les **virtualIds** autorisent des overrides sur des ids créés par le code (ex: `money_clean`) ;
- une image absente du pack du thème **retombe sur le pack `gta-artwork`**, puis sur `no_image.png`.

> ⚖️ **Neutralité des données** : le registre ne contient **aucune notion de
> monétisation** (pas de champ `premium`). Le fait qu'un thème soit gratuit,
> payant, réservé, exclusif, etc. est une décision **du projet consommateur** —
> pas une propriété de la donnée. Si vous monétisez certains thèmes, gérez ce
> mapping dans la config de votre projet, pas ici.

---

## 📏 Unités (i18n des mesures)

Les données embarquent des **unités canoniques métriques** (SI) — la conversion
vers les systèmes locaux (lb/oz…) se fait **à l'affichage**, pas dans les données :

| Champ | Unité canonique | Helper d'affichage |
|---|---|---|
| `item.weight` | grammes | `formatItemWeight(weight, locale)` |
| `vehicle.massKg` | kg | `formatVehicleMass(massKg, locale)` |
| `consumable.volumeMl` | millilitres | `formatVolume(volumeMl, locale)` |
| `vehicle.fuelCapacity` | litres | à convertir par le consommateur |
| `vehicle.maxSpeed` | km/h | à convertir par le consommateur |
| `cargo.maxWeightKg` | kg | à convertir par le consommateur |

```js
import { formatItemWeight, formatVehicleMass, formatVolume } from 'roleplay-data';

formatItemWeight(950, 'fr');            // "950 g"     (métrique)
formatItemWeight(950, 'en');            // "2 lb 2 oz" (impérial)
formatItemWeight(950, 'en', { unit: 'metric' }); // "950 g" (forcé)
formatVolume(250, 'fr');                // "25 cl"
formatVolume(1000, 'en');               // "33,8 fl oz"
formatVehicleMass(1480, 'en');          // "3 263 lb"
```

Le système retenu dérive de la locale (métrique pour fr/es/de/…, impérial pour
en/us…) — il peut être **forcé** via `opts.unit`.

---

## Consumption

### npm

```bash
npm install roleplay-data
```

```js
import { getItems, getItem, getThemedItemName, getItemImage } from 'roleplay-data';

getItems();                                  // 166 items canoniques
getThemedItemName('burger', 'dayz', 'fr');   // "Conserve DayZ"
getItemImage('aks74u', 'dayz');              // thème → gta-artwork → no_image
```

### SQL (PostgreSQL)

```bash
node scripts/build-release.mjs && psql -U postgres -d ma_base -f dist/sql/roleplay-data.sql
```

Tables : `rp_items`, `rp_vehicles`, `rp_themes`, `rp_theme_entries`.

### MongoDB

```bash
mongoimport --db roleplay-data --collection items --file dist/mongodb/seed.items.json
mongoimport --db roleplay-data --collection vehicles --file dist/mongodb/seed.vehicles.json
mongoimport --db roleplay-data --collection themes --file dist/mongodb/seed.themes.json
```

### Archives

Chaque release GitHub embarque `roleplay-data-vX.Y.Z.zip` (catalog + themes + assets + docs).

---

## Contribuer

1. `npm run validate` doit passer en local (⚠️ 8 warnings connus = images manquantes, voir ci-dessous).
2. Une PR = un sujet : ajouter un item / un véhicule / un thème / une traduction, ou corriger des données.
3. Ne **jamais** casser les ids existants (rétro-compatibilité).
4. La CI `validate` vérifie schémas, unicité, cohérence des thèmes et existence des images.

### Images manquantes connues (bonnes premières issues)

Les items suivants pointent vers des images qui n'existaient déjà pas dans le jeu source —
parfaits pour un premier PR « ajouter une image » :

`poisson_propre`, `pioche`, `lanterne_mini`, `minerai`, `minerai_rare`, `lingot`, `hache`, `bois`

Ajoutez le fichier `assets/items/gta-artwork/<id>.png` et le warning disparaît.

### Assets & Git LFS

Actuellement les images sont **committées telles quelles** (fichiers de 3-4 Ko
chacun, ~30 Mo au total — aucun souci pour git/GitHub). Le **Git LFS** sera
adopté quand un pack deviendra lourd — la procédure de migration est documentée
dans `assets/README.md`.

---

## 🚀 Releases & publication automatique

Une release = une nouvelle version de **`roleplay-data`** sur npm +
une release GitHub avec tous les artefacts. Tout est automatisé par GitHub Actions.

### Option A — un clic (recommandé)
1. GitHub → **Actions** → **bump-version** → *Run workflow*
2. Choisis le bump : `patch` / `minor` / `major` (ou saisis une version explicite)
3. Le workflow : `npm version` → commit + tag `vX.Y.Z` → push → **déclenche la release**

```bash
# ou en CLI :
gh workflow run bump-version.yml -f bump=minor
```

### Option B — manuel (équivalent)
```bash
npm version minor && git push --tags
```

### Ce que fait le workflow `release` (sur tag `v*`)
1. `validate` : schémas, unicité des ids, cohérence des thèmes, images
2. `build-release --with-assets` : ZIP des assets + seeds SQL/MongoDB
3. `npm pack` : tarball du package
4. `npm publish` **(si le secret `NPM_TOKEN` est présent)** — sinon release quand même
5. Release GitHub attachant : ZIP, seeds SQL/Mongo, tarball + notes générées

### Prérequis pour la publication npm automatique
- **Secret GitHub `NPM_TOKEN`** : npmjs.org → *Access Tokens* → *Granular* (scope `roleplay-data`, permission *publish*) → ajouter dans `Settings → Secrets and variables → Actions`.
- **2FA npm en mode « Authorization only »** (npmjs.com → *Settings → Two-Factor Authentication*) : avec « Authorization & writes », la publication depuis CI exige un OTP qu'aucun robot ne peut saisir — le mode « only » permet aux tokens de publier sans OTP. *(La provenance npm demandera en plus d'activer l'option dans les settings npm.)*

---

## 🥤 Consommables (système)

Le bloc optionnel **`consumable`** propose une structure propre et prête à
l'emploi pour les objets comestibles/buvables : **satiété en % des barres**
(faim/soif, 0-100), **volume** pour les boissons, et **portions fractionnées**
(une bouteille se boit en quart, tiers, moitié ou entière selon sa taille).

```json
{
  "id": "water_bottle_1l",
  "name": { "fr": "Eau 1L", "en": "Water 1L" },
  "consumable": {
    "kind": "drink",
    "satiety": { "food": 0, "thirst": 20 },
    "volumeMl": 1000,
    "portions": [
      { "fraction": 0.25, "label": { "fr": "quart", "en": "quarter" }, "satiety": { "food": 0, "thirst": 5 } },
      { "fraction": 0.5,  "label": { "fr": "moitié", "en": "half"  }, "satiety": { "food": 0, "thirst": 10 } },
      { "fraction": 1,    "label": { "fr": "entière", "en": "whole" }, "satiety": { "food": 0, "thirst": 20 } }
    ]
  }
}
```

Règles d'interprétation :
- **`satiety`** = restauration en pourcentage pour une **portion entière** (ex :
  burger → 30 % de faim, peanuts → 4 %, donut → 10 % — le burger « remplit » bien plus).
- **`portions`** = les fractions de consommation possibles, chacune avec sa
  **satiété propre** (pas besoin de recalculer). `portions` vide = se consomme
  en une fois.
- **`volumeMl`** = volume total du contenant (canonique SI, affichable via
  `formatVolume` selon la locale : « 25 cl » en fr, « 8,5 fl oz » en en).
- La façon d'appliquer (une gorgée par portion, mise à jour de la barre, etc.)
  reste **au choix du projet consommateur** — les données sont prêtes.
- Catalogue : une série de bouteilles d'eau multi-tailles (25cl / 50cl / 1L /
  1,5L), sodas et alcools disposent déjà de `consumable` complets.

---

## Feuille de route

- [x] v0.1 — items + véhicules + thèmes + i18n + validation + builds multi-produits
- [x] v0.2 — thème gtav-artwork (517 items RAINMAD)
- [x] v0.3 — traductions FR + unités i18n (g/kg vs lb/oz)
- [x] releases GitHub Actions automatisées (bump un-clic → npm + artefacts)
- [ ] habitations (`catalog/properties.json`), drogues, jobs
- [ ] images de véhicules (`assets/vehicles/`)
- [ ] API items/thèmes (hostée)
- [ ] migration des services Amity vers `roleplay-data` (fin des copies locales)

---

## Licence

MIT — libre, code et données. Une mention (crédit) est appréciée, jamais obligatoire.
Voir `LICENSE` et `CREDITS.md`.