# Assets — roleplay-data

Ce dossier contient les **images** des packs de thèmes. Il est versionné avec
**Git LFS** — pensez à `git lfs install` après clonage.

```
assets/
└── items/
    ├── gta-artwork/  pack d'images de référence (par défaut)
    ├── dayz/         pack d'images du thème DayZ
    └── no_image.png  fallback universel (affiché quand une image manque)
```

## Règles

- Le fichier référencé par un item dans `catalog/items.json` doit exister dans `items/gta-artwork/`.
- Le fichier référencé par un thème peut exister dans `items/<thème>/` (et retombe sur `items/gta-artwork/` sinon).
- Conventions de nommage fichiers : `snake_case.png`, sans espace ni accent.
- Pas de sous-dossier dans `items/`.
- Toute image doit être au format PNG (fond transparent recommandé pour les items).

## Vérification

`npm run validate` signale en warning toute image référencée et introuvable
(voir README, section « Images manquantes connues »).

## Git LFS (optionnel, plus tard)

Pour l'instant les assets sont **committés tels quels** : les fichiers font
3-4 Ko chacun (~30 Mo au total), ce qui est très bien géré par git/GitHub.

On basculera en **Git LFS** quand un pack grossira (visuels lourds, vidéos,
vignettes HD). La migration se fera alors avec :

```bash
git lfs install
git lfs migrate import --yes --include="assets/**/*.png" --include-ref=main --include-ref=origin/main
```