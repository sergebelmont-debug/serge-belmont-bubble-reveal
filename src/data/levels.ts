/**
 * CONFIGURATION CENTRALE DES NIVEAUX
 * ----------------------------------
 * Un niveau = une entrée de ce tableau. Pour ajouter un niveau ou une
 * photographie, il suffit d'ajouter / modifier une entrée ici : le moteur
 * de jeu n'a jamais besoin d'être touché.
 *
 * Photographies : déposer le fichier haute résolution dans
 *   public/assets/photos/levels/   et la miniature dans
 *   public/assets/photos/thumbnails/
 * puis renseigner uniquement le NOM du fichier ci-dessous (pas le chemin).
 * Tant que `file` vaut null (ou que le fichier est introuvable), le jeu
 * affiche automatiquement une photo provisoire générée.
 */
export type Difficulty = 'facile' | 'moyen' | 'difficile' | 'expert';

export interface LevelDef {
  id: string;
  number: number;
  /** Nom de la photographie, affiché au joueur. */
  title: string;
  photo: {
    file: string | null;
    thumbnail: string | null;
    description?: string;
    /** Point d'intérêt de la photo (0–1) conservé au recadrage. Défaut : 0.5 / 0.3. */
    focusX?: number;
    focusY?: number;
  };
  difficulty: Difficulty;
  /** Nombre de tirs accordés. */
  shots: number;
  /** Nombre de couleurs de boules (3 à 6). */
  colors: number;
  /** Nombre de rangées générées (ignoré si `layout` est fourni). */
  rows: number;
  /** Graine de génération : une même graine donne toujours la même disposition. */
  seed: number;
  /** Disposition manuelle facultative : une chaîne par rangée, chiffre = couleur, '.' = vide. */
  layout?: string[];
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

export const LEVELS: LevelDef[] = [
  {
    id: 'niveau-001',
    number: 1,
    title: 'Première rencontre',
    photo: { file: null, thumbnail: null, description: 'Photo provisoire' },
    difficulty: 'facile',
    shots: 26,
    colors: 4,
    rows: 7,
    seed: 101,
    objective: { revealPercent: 60 },
    reveal: { radius: 1.1, strength: 1 },
  },
  {
    id: 'niveau-002',
    number: 2,
    title: 'Sous les projecteurs',
    photo: { file: null, thumbnail: null, description: 'Photo provisoire' },
    difficulty: 'facile',
    shots: 28,
    colors: 5,
    rows: 8,
    seed: 202,
    objective: { revealPercent: 65 },
    reveal: { radius: 1, strength: 1 },
  },
  {
    id: 'niveau-003',
    number: 3,
    title: 'Le regard',
    photo: { file: null, thumbnail: null, description: 'Photo provisoire' },
    difficulty: 'moyen',
    shots: 30,
    colors: 5,
    rows: 9,
    seed: 303,
    objective: { revealPercent: 70 },
    reveal: { radius: 1, strength: 1 },
  },
];
