# Bubble Nostalgia – Serge Belmont

Bubble Shooter mobile (web) : chaque combinaison dissipe un brouillard et révèle
progressivement une photographie de Serge Belmont.

**État actuel : v0.2** — 12 niveaux, carte de progression, 12 photographies.
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
   (JPEG ou WebP, format carré 1:1, 1080 × 1080 px minimum conseillé).
2. Dans [src/data/levels.ts](src/data/levels.ts), renseigner le **nom du fichier** du niveau voulu :

```ts
photo: 'ma-photo.webp',
```

Rien d'autre à modifier : la photo est affichée en entier sur toute la largeur,
sans recadrage ni déformation, et le pourcentage révélé se mesure sur elle seule.
Le reste de l'écran reçoit un fond flou tiré de la même image.
Tant que `file` vaut `null` ou que le fichier est introuvable, une photo
provisoire est affichée à la place.

## Ajouter un niveau

Ajouter une ligne à la liste `LEVELS` de [src/data/levels.ts](src/data/levels.ts) :
titre, difficulté, forme (`plein`, `pyramide`, `sablier`, `colonnes`, `vagues`,
`arches`), nombre de couleurs, de rangées et de tirs, objectif de révélation,
graine (`seed`). Le numéro est attribué automatiquement selon la position dans
la liste, et la carte des niveaux s'allonge toute seule.
Une disposition manuelle est possible avec `layout` (une chaîne par rangée,
un chiffre par boule, `.` pour un vide).

### Ajouter des murs

Les murs sont des barres incassables sur lesquelles les boules rebondissent.
Ils se déclarent dans le niveau, en unités de grille (le plateau fait 11,5
largeurs de boule) :

```ts
walls: [
  { type: 'h', row: 4, col: 4.25, len: 3 },  // corniche horizontale sur la rangée 4
  { type: 'v', col: 5.75, row: 0, len: 8 },  // cloison verticale depuis le plafond
],
```

Placer les murs dans la partie haute, au milieu des boules (rangées 0 à 8),
jamais entre le canon et le plateau. Une boule renvoyée vers le bas
par un mur et qui sort du plateau est un tir perdu.

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

## Collection

L'écran « Collection » (menu d'accueil) affiche les photos des niveaux terminés ;
les autres sont grisées. Après l'ajout ou le remplacement d'une photo, lancer
`npm run thumbs` pour régénérer les miniatures (`public/assets/photos/thumbnails/`).
