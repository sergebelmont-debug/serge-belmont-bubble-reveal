import { COLS, GRID_ROWS } from '../config/gameConfig';
import type { LevelDef } from '../data/levels';
import { EMPTY, HexGrid } from './HexGrid';
import { mulberry32 } from './rng';

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
    return grid;
  }

  // Génération procédurale « en grappes » : chaque boule a une chance sur deux
  // de copier une voisine déjà placée, ce qui crée des groupes jouables.
  const rng = mulberry32(level.seed);
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < cols; c++) {
      let color = Math.floor(rng() * level.colors);
      if (rng() < 0.5) {
        const placed = grid.neighbors(r, c).filter((n) => grid.get(n.row, n.col) !== EMPTY);
        if (placed.length) {
          const pick = placed[Math.floor(rng() * placed.length)];
          color = grid.get(pick.row, pick.col);
        }
      }
      grid.set(r, c, color);
    }
  }
  return grid;
}
