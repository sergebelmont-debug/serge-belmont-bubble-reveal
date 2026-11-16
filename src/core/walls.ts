import type { HexGrid } from './HexGrid';
import { cellX, cellY, type BoardGeom } from './geometry';

/**
 * MURS INCASSABLES
 * ----------------
 * Barres fixes sur lesquelles les boules tirées rebondissent, comme sur les
 * bords de l'écran. Elles se décrivent en unités de grille, faciles à régler :
 *
 *   { type: 'h', row: 4, col: 4.25, len: 3 }
 *     corniche horizontale centrée sur la rangée 4, qui commence à 4,25
 *     largeurs de boule du bord gauche et mesure 3 largeurs de boule.
 *
 *   { type: 'v', col: 5.75, row: 0, len: 8 }
 *     barre verticale placée à 5,75 largeurs de boule du bord gauche, qui part
 *     du plafond (rangée 0) et descend sur 8 rangées.
 *
 * Le plateau fait 11,5 largeurs de boule. Les murs se placent dans la partie
 * haute, au milieu des boules (rangées 0 à 8), jamais devant le canon.
 */
export interface WallDef {
  type: 'h' | 'v';
  col: number;
  row: number;
  len: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const WALL_THICKNESS = 24;

/** Convertit un mur (unités de grille) en rectangle (unités de jeu), limité au plateau. */
export function wallRect(g: BoardGeom, wall: WallDef): Rect {
  const d = g.r * 2;
  let rect: Rect;
  if (wall.type === 'h') {
    rect = {
      x: g.left + wall.col * d,
      y: g.top + g.r + wall.row * g.rowH - WALL_THICKNESS / 2,
      w: wall.len * d,
      h: WALL_THICKNESS,
    };
  } else {
    rect = {
      x: g.left + wall.col * d - WALL_THICKNESS / 2,
      y: g.top + wall.row * g.rowH,
      w: WALL_THICKNESS,
      h: wall.len * g.rowH,
    };
  }
  const x0 = Math.max(g.left, rect.x);
  const x1 = Math.min(g.left + g.width, rect.x + rect.w);
  const y0 = Math.max(g.top, rect.y);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: rect.y + rect.h - y0 };
}

function circleHitsRect(cx: number, cy: number, r: number, rect: Rect): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/** Marque comme inutilisables les cellules de la grille recouvertes par un mur. */
export function blockCells(grid: HexGrid, g: BoardGeom, rects: Rect[]): void {
  if (!rects.length) return;
  for (let row = 0; row < grid.rows; row++) {
    const y = cellY(g, row);
    for (let col = 0; col < grid.cols; col++) {
      const x = cellX(g, row, col);
      for (const rect of rects) {
        if (circleHitsRect(x, y, g.r - 1, rect)) {
          grid.block(row, col);
          break;
        }
      }
    }
  }
}
