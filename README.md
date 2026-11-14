# Serge Belmont – Bubble Reveal

Bubble Shooter mobile (web) : chaque combinaison dissipe un brouillard et révèle
progressivement une photographie de Serge Belmont.

**État actuel : prototype jouable (v0.1)** — 3 niveaux, photos provisoires.
Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour l'architecture et la feuille de route.

## Lancer le jeu sur son ordinateur

Prérequis : [Node.js](https://nodejs.org) (version LTS).

```bash
npm install
npm run dev
```

Ouvrir ensuite l'adresse affichée (http://localhost:5173). L'adresse « Network »
permet de tester depuis un smartphone connecté au même Wi-Fi.

| Commande          | Rôle                                              |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Lance le jeu en développement                     |
| `npm test`        | Tests automatiques du moteur (grille, tirs)       |
| `npm run build`   | Vérifie le code et produit la version finale dans `dist/` |
| `npm run preview` | Sert la version finale en local                   |

## Ajouter une photographie

1. Déposer la photo haute résolution dans `public/assets/photos/levels/`
   (JPEG ou WebP, format vertical, 1080 × 1920 px minimum conseillé).
2. Déposer sa miniature dans `public/assets/photos/thumbnails/` (environ 360 px de large).
3. Dans [src/data/levels.ts](src/data/levels.ts), renseigner le **nom du fichier** du niveau voulu :

```ts
photo: { file: 'serge-concert-01.jpg', thumbnail: 'serge-concert-01.jpg' },
```

Rien d'autre à modifier : le cadrage plein écran est automatique. Si le visage
est coupé sur certains écrans, ajuster `focusX` / `focusY` (0 à 1).
Tant que `file` vaut `null` ou que le fichier est introuvable, une photo
provisoire est affichée à la place.

## Ajouter un niveau

Ajouter une entrée dans le tableau `LEVELS` de [src/data/levels.ts](src/data/levels.ts) :
numéro, titre, photo, nombre de tirs, nombre de couleurs, nombre de rangées,
graine (`seed`), objectif de révélation. Chaque champ est commenté dans le fichier.
Une disposition manuelle est possible avec `layout` (une chaîne par rangée,
un chiffre par boule, `.` pour un vide).

## Mettre en ligne (GitHub Pages)

Le dépôt contient un déploiement automatique ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) :
chaque envoi sur la branche `main` teste, construit et publie le jeu.

Configuration à faire **une seule fois** sur GitHub : *Settings → Pages →
Build and deployment → Source : « GitHub Actions »*.
Le jeu est alors accessible sur
`https://sergebelmont-debug.github.io/serge-belmont-bubble-reveal/`.

## Services externes

Aucun pour le moment. Le classement communautaire et la sauvegarde en ligne
(prévus avec Supabase) nécessiteront la création d'un projet Supabase.
