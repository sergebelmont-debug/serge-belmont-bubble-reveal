import { COLS, GRID_ROWS } from '../config/gameConfig';
import type { LevelDef, Pattern } from '../data/levels';
import { EMPTY, HexGrid } from './HexGrid';
import { mulberry32 } from './rng';

type Mask = (row: number, col: number, rows: number, cols: number) => boolean;

/** Position horizontale d'une cellule en « colonnes », décalage des rangées impaires compris. */
const px = (row: number, col: number): number => col + (row & 1 ? 0.5 : 0);

/**
 * Formes disponibles pour la disposition initiale des boules.
 * Pour en ajouter une : écrire sa fonction ici et l'ajouter au type `Pattern`.
 */
const MASKS: Record<Pattern, Mask> = {
  plein: () => true,
  pyramide: (r, c, rows, cols) => {
    const half = (cols - 1) / 2;
    return Math.abs(px(r, c) - half - 0.25) <= half * (1 - r / rows) + 0.8;
  },
  sablier: (r, c, rows, cols) => {
    const half = (cols - 1) / 2;
    const t = Math.abs(r / (rows - 1) - 0.5) * 2;
    return Math.abs(px(r, c) - half - 0.25) <= 1.3 + (half - 1) * t;
  },
  colonnes: (r, c) => r < 1 || c % 4 !== 3,
  vagues: (r, c, rows) => r < rows * (0.64 + 0.36 * Math.sin(c * 1.15 + 0.6)),
  arches: (r, c, rows) => {
    if (r < 2) return true;
    for (const cx of [2.3, 7.9]) {
      if (Math.hypot(px(r, c) - cx, (r - (rows - 0.4)) * 0.9) < 2.4) return false;
    }
    return true;
  },
};

/** Construit la grille initiale d'un niveau à partir de sa configuration. */
export function buildGrid(level: LevelDef, cols = COLS, rows = GRID_ROWS): HexGrid {
  const grid = new HexGrid(cols, rows);

  if (level.layout) {
    level.layout.forEach((line, r) => {
      for (let c = 0; c < cols && c < line.length; c++) {
        const ch = line[c];
        if (ch >= '0' && ch <= '9') grid.set(r, c, Number(ch) % level.colors);
      }
    });
  } else {
    // Génération procédurale « en grappes » : chaque boule a une chance sur deux
    // de copier une voisine déjà placée, ce qui crée des groupes jouables.
    const rng = mulberry32(level.seed);
    const mask = MASKS[level.pattern ?? 'plein'];
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < cols; c++) {
        let color = Math.floor(rng() * level.colors);
        const copy = rng() < 0.5;
        if (!mask(r, c, level.rows, cols)) continue;
        if (copy) {
          const placed = grid.neighbors(r, c).filter((n) => grid.get(n.row, n.col) !== EMPTY);
          if (placed.length) {
            const pick = placed[Math.floor(rng() * placed.length)];
            color = grid.get(pick.row, pick.col);
          }
        }
        grid.set(r, c, color);
      }
    }
  }

  // Sécurité : aucune boule ne doit flotter au départ, quelle que soit la forme.
  for (const cell of grid.findFloating()) grid.set(cell.row, cell.col, EMPTY);
  return grid;
}
