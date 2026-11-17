/**
 * CONFIGURATION CENTRALE DES NIVEAUX
 * ----------------------------------
 * Un niveau = une entrée du tableau LEVELS. Pour ajouter un niveau ou une
 * photographie, il suffit d'ajouter / modifier une entrée ici : le moteur
 * de jeu n'a jamais besoin d'être touché.
 *
 * Photographies : déposer le fichier haute résolution dans
 *   public/assets/photos/levels/   (format carré conseillé)
 * puis renseigner uniquement le NOM du fichier (pas le chemin).
 * Tant que `file` vaut null (ou que le fichier est introuvable), le jeu
 * affiche automatiquement une photo provisoire générée.
 */
import type { WallDef } from '../core/walls';

export type Difficulty ='facile' | 'moyen' | 'difficile' | 'expert';

/** Forme de la disposition initiale des boules. */
export type Pattern = 'plein' | 'pyramide' | 'sablier' | 'colonnes' | 'vagues' | 'arches';

export interface LevelDef {
  id: string;
  number: number;
  /** Nom de la photographie, affiché au joueur. */
  title: string;
  photo: {
    file: string | null;
    thumbnail: string | null;
    description?: string;
    /** Centre du fond flou qui entoure la photo (0–1). Défaut : 0.5 / 0.5. */
    focusX?: number;
    focusY?: number;
  };
  difficulty: Difficulty;
  /** Nombre de tirs accordés. */
  shots: number;
  /** Nombre de couleurs de boules (3 à 6). */
  colors: number;
  /** Nombre de rangées générées (ignoré si `layout` est fourni). 10 maximum conseillé. */
  rows: number;
  /** Forme de la disposition (défaut : 'plein'). */
  pattern?: Pattern;
  /** Graine de génération : une même graine donne toujours la même disposition. */
  seed: number;
  /** Disposition manuelle facultative : une chaîne par rangée, chiffre = couleur, '.' = vide. */
  layout?: string[];
  /** Murs incassables sur lesquels les boules rebondissent (voir core/walls.ts). */
  walls?: WallDef[];
  objective: {
    /** Pourcentage de la photo à révéler pour gagner. */
    revealPercent: number;
  };
  reveal: {
    /** Multiplicateur du rayon de dissipation (1 = standard). */
    radius: number;
    /** Multiplicateur d'intensité de dissipation (1 = standard). */
    strength: number;
  };
}

/** Entrée simplifiée : seuls les champs utiles sont obligatoires. */
type LevelInput = Pick<LevelDef, 'title' | 'difficulty' | 'shots' | 'colors' | 'rows' | 'seed'> & {
  pattern?: Pattern;
  layout?: string[];
  walls?: WallDef[];
  /** Pourcentage de la photo à révéler pour gagner. */
  target: number;
  /** Nom du fichier photo (dans public/assets/photos/levels/), ou rien tant qu'elle n'est pas fournie. */
  photo?: string;
  /** Nom du fichier miniature (dans public/assets/photos/thumbnails/). Défaut : même nom que la photo. */
  thumbnail?: string;
  description?: string;
  focusX?: number;
  focusY?: number;
  revealRadius?: number;
  revealStrength?: number;
};

/** Le numéro et l'identifiant sont déduits de la position dans la liste. */
function defineLevels(list: LevelInput[]): LevelDef[] {
  return list.map((l, i) => ({
    id: `niveau-${String(i + 1).padStart(3, '0')}`,
    number: i + 1,
    title: l.title,
    photo: {
      file: l.photo ?? null,
      thumbnail: l.thumbnail ?? l.photo ?? null,
      description: l.description ?? (l.photo ? undefined : 'Photo provisoire'),
      focusX: l.focusX,
      focusY: l.focusY,
    },
    difficulty: l.difficulty,
    shots: l.shots,
    colors: l.colors,
    rows: l.rows,
    pattern: l.pattern,
    seed: l.seed,
    layout: l.layout,
    walls: l.walls,
    objective: { revealPercent: l.target },
    reveal: { radius: l.revealRadius ?? 1, strength: l.revealStrength ?? 1 },
  }));
}

/*
 * Pour associer une vraie photo à un niveau, ajouter par exemple :
 *   photo: 'ma-photo.webp',
 */
/*
 * Équilibrage : le nombre de tirs vient de parties simulées par un joueur
 * automatique (3 à 6 parties par niveau) : il est fixé un peu au-dessus de
 * la partie la plus longue observée. L'objectif de révélation se mesure sur la
 * zone de la photographie uniquement.
 * Après tout changement de couleurs, rangées, murs ou objectif, rejouer le
 * niveau pour vérifier qu'il reste gagnable.
 */
export const LEVELS: LevelDef[] = defineLevels([
  { title: 'La rose et la montre', photo: 'serge-belmont-01.webp', difficulty: 'facile', pattern: 'plein', colors: 4, rows: 6, shots: 24, target: 70, seed: 101 },
  { title: 'Terrasse sur la mer', photo: 'serge-belmont-02.webp', difficulty: 'facile', pattern: 'pyramide', colors: 4, rows: 8, shots: 26, target: 55, seed: 202 },
  /*
   * Les murs sont tous placés dans la partie haute, au milieu des boules,
   * jamais entre le canon et le plateau. Leur nombre augmente avec le niveau :
   * 1 mur au niveau 3, jusqu'à 8 au niveau 12.
   */
  // Niveau 3 — 1 mur : un pilier central descend du plafond.
  {
    title: 'Clair de lune', photo: 'serge-belmont-03.webp', difficulty: 'facile', pattern: 'plein', colors: 5, rows: 7, shots: 26, target: 72, seed: 303,
    walls: [{ type: 'v', col: 5.75, row: 0, len: 3 }],
  },
  // Niveau 4 — 2 murs : deux piliers découpent trois alcôves.
  {
    title: 'Lecture au couchant', photo: 'serge-belmont-04.webp', difficulty: 'facile', pattern: 'plein', colors: 4, rows: 8, shots: 28, target: 68, seed: 404,
    walls: [
      { type: 'v', col: 3, row: 0, len: 3.5 },
      { type: 'v', col: 8.5, row: 0, len: 3.5 },
    ],
  },
  // Niveau 5 — 2 murs : un T suspendu au plafond, des boules posées sur ses bras.
  {
    title: 'La rose blanche', photo: 'serge-belmont-05.webp', difficulty: 'moyen', pattern: 'plein', colors: 5, rows: 8, shots: 22, target: 75, seed: 505,
    walls: [
      { type: 'v', col: 5.75, row: 0, len: 4.35 },
      { type: 'h', row: 4, col: 4.25, len: 3 },
    ],
  },
  // Niveau 6 — 3 murs : deux corniches et un pilier flottant.
  {
    title: 'Crépuscule', photo: 'serge-belmont-11.webp', difficulty: 'moyen', pattern: 'plein', colors: 5, rows: 8, shots: 34, target: 78, seed: 606,
    walls: [
      { type: 'h', row: 3, col: 1, len: 2.5 },
      { type: 'h', row: 3, col: 8, len: 2.5 },
      { type: 'v', col: 5.75, row: 2, len: 4 },
    ],
  },
  // Niveau 7 — 4 murs : une niche en C ouverte vers le bord gauche, et un pilier.
  {
    title: 'La lettre', photo: 'serge-belmont-07.webp', difficulty: 'moyen', pattern: 'plein', colors: 5, rows: 9, shots: 36, target: 76, seed: 707,
    walls: [
      { type: 'h', row: 2, col: 2.1, len: 2.5 },
      { type: 'h', row: 5, col: 2.1, len: 2.5 },
      { type: 'v', col: 4.5, row: 2.25, len: 3.2 },
      { type: 'v', col: 8.5, row: 0, len: 3 },
    ],
  },
  // Niveau 8 — 4 murs : une croix centrale et deux piliers.
  {
    title: 'Sous le grand arbre', photo: 'serge-belmont-08.webp', difficulty: 'moyen', pattern: 'plein', colors: 5, rows: 9, shots: 26, target: 72, seed: 808,
    walls: [
      { type: 'h', row: 4, col: 4, len: 3.5 },
      { type: 'v', col: 5.75, row: 2.2, len: 3.6 },
      { type: 'v', col: 2, row: 0, len: 2.5 },
      { type: 'v', col: 9.5, row: 0, len: 2.5 },
    ],
  },
  // Niveau 9 — 5 murs : des corniches en escalier.
  {
    title: 'Jour de pluie', photo: 'serge-belmont-09.webp', difficulty: 'difficile', pattern: 'plein', colors: 5, rows: 9, shots: 24, target: 58, seed: 909,
    walls: [
      { type: 'h', row: 2, col: 0.5, len: 2 },
      { type: 'h', row: 4, col: 3, len: 2 },
      { type: 'h', row: 6, col: 5.5, len: 2 },
      { type: 'h', row: 4, col: 8, len: 2 },
      { type: 'v', col: 9.75, row: 0, len: 2.5 },
    ],
  },
  // Niveau 10 — 6 murs : deux niches en C, ouvertes chacune vers son bord.
  {
    title: 'L’accordéon', photo: 'serge-belmont-10.webp', difficulty: 'difficile', pattern: 'plein', colors: 5, rows: 9, shots: 44, target: 56, seed: 1010,
    walls: [
      { type: 'h', row: 2, col: 1.8, len: 2.6 },
      { type: 'h', row: 5, col: 1.8, len: 2.6 },
      { type: 'v', col: 4.3, row: 2.25, len: 3.2 },
      { type: 'h', row: 2, col: 7.1, len: 2.6 },
      { type: 'h', row: 5, col: 7.1, len: 2.6 },
      { type: 'v', col: 7.2, row: 2.25, len: 3.2 },
    ],
  },
  // Niveau 11 — 7 murs : trois piliers et quatre corniches en quinconce.
  {
    title: 'La valse', photo: 'serge-belmont-06.webp', difficulty: 'difficile', pattern: 'plein', colors: 5, rows: 9, shots: 40, target: 76, seed: 1111,
    walls: [
      { type: 'v', col: 2.9, row: 0, len: 2 },
      { type: 'v', col: 5.75, row: 0, len: 3 },
      { type: 'v', col: 8.6, row: 0, len: 2 },
      { type: 'h', row: 4, col: 0.8, len: 1.5 },
      { type: 'h', row: 4, col: 9.2, len: 1.5 },
      { type: 'h', row: 6, col: 3.4, len: 1.5 },
      { type: 'h', row: 6, col: 6.6, len: 1.5 },
    ],
  },
  // Niveau 12 — 8 murs : une chambre forte centrale, des piliers et des corniches.
  {
    title: 'Promenade en bord de mer', photo: 'serge-belmont-12.webp', difficulty: 'difficile', pattern: 'plein', colors: 6, rows: 9, shots: 38, target: 78, seed: 1212,
    walls: [
      { type: 'h', row: 2, col: 4.2, len: 3.1 },
      { type: 'v', col: 4.35, row: 2.25, len: 2.3 },
      { type: 'v', col: 7.15, row: 2.25, len: 2.3 },
      { type: 'v', col: 1.5, row: 0, len: 2 },
      { type: 'v', col: 10, row: 0, len: 2 },
      { type: 'h', row: 5, col: 0.8, len: 1.5 },
      { type: 'h', row: 5, col: 9.2, len: 1.5 },
      { type: 'h', row: 7, col: 5, len: 1.5 },
    ],
  },
]);
