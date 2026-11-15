/**
 * CONFIGURATION CENTRALE DES NIVEAUX
 * ----------------------------------
 * Un niveau = une entrée du tableau LEVELS. Pour ajouter un niveau ou une
 * photographie, il suffit d'ajouter / modifier une entrée ici : le moteur
 * de jeu n'a jamais besoin d'être touché.
 *
 * Photographies : déposer le fichier haute résolution dans
 *   public/assets/photos/levels/   et la miniature dans
 *   public/assets/photos/thumbnails/
 * puis renseigner uniquement le NOM du fichier (pas le chemin).
 * Tant que `file` vaut null (ou que le fichier est introuvable), le jeu
 * affiche automatiquement une photo provisoire générée.
 */
export type Difficulty = 'facile' | 'moyen' | 'difficile' | 'expert';

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
    /** Point d'intérêt de la photo (0–1) conservé au recadrage. Défaut : 0.5 / 0.3. */
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
  /** Pourcentage de la photo à révéler pour gagner. */
  target: number;
  /** Nom du fichier photo (dans public/assets/photos/levels/), ou rien tant qu'elle n'est pas fournie. */
  photo?: string;
  /** Nom du fichier miniature (dans public/assets/photos/thumbnails/). */
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
      thumbnail: l.thumbnail ?? null,
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
    objective: { revealPercent: l.target },
    reveal: { radius: l.revealRadius ?? 1, strength: l.revealStrength ?? 1 },
  }));
}

/*
 * Pour associer une vraie photo à un niveau, ajouter par exemple :
 *   photo: 'serge-concert-01.jpg', thumbnail: 'serge-concert-01.jpg',
 */
/*
 * Équilibrage : le nombre de tirs vient de parties simulées par un joueur
 * automatique (3 parties par niveau), avec une marge de 30 à 70 % pour un
 * joueur humain. Après tout changement de couleurs, rangées ou objectif,
 * rejouer le niveau pour vérifier qu'il reste gagnable.
 */
export const LEVELS: LevelDef[] = defineLevels([
  { title: 'Première rencontre', difficulty: 'facile', pattern: 'plein', colors: 4, rows: 6, shots: 24, target: 55, seed: 101 },
  { title: 'Sous les projecteurs', difficulty: 'facile', pattern: 'pyramide', colors: 4, rows: 8, shots: 26, target: 50, seed: 202 },
  { title: 'Le regard', difficulty: 'facile', pattern: 'plein', colors: 5, rows: 7, shots: 26, target: 60, seed: 303 },
  { title: 'En coulisses', difficulty: 'facile', pattern: 'colonnes', colors: 4, rows: 9, shots: 26, target: 60, seed: 404 },
  { title: 'La première note', difficulty: 'moyen', pattern: 'vagues', colors: 5, rows: 9, shots: 32, target: 58, seed: 505 },
  { title: 'Le micro', difficulty: 'moyen', pattern: 'sablier', colors: 5, rows: 10, shots: 24, target: 62, seed: 606 },
  { title: 'Soir de concert', difficulty: 'moyen', pattern: 'arches', colors: 5, rows: 9, shots: 36, target: 62, seed: 707 },
  { title: 'Le sourire', difficulty: 'moyen', pattern: 'plein', colors: 5, rows: 9, shots: 28, target: 68, seed: 808 },
  { title: 'Lumière dorée', difficulty: 'difficile', pattern: 'pyramide', colors: 6, rows: 10, shots: 40, target: 65, seed: 909 },
  { title: 'Entre deux chansons', difficulty: 'difficile', pattern: 'colonnes', colors: 5, rows: 10, shots: 40, target: 68, seed: 1010 },
  { title: 'Le salut au public', difficulty: 'difficile', pattern: 'vagues', colors: 6, rows: 10, shots: 30, target: 70, seed: 1111 },
  { title: 'Rappel', difficulty: 'difficile', pattern: 'plein', colors: 6, rows: 10, shots: 34, target: 72, seed: 1212 },
]);
