import { BOARD_LEFT, BOARD_TOP, BOARD_W, BUBBLE_R, COLS, ROW_H } from '../config/gameConfig';

/** Géométrie du plateau : permet de tester la logique avec d'autres dimensions. */
export interface BoardGeom {
  left: number;
  top: number;
  width: number;
  r: number;
  rowH: number;
  cols: number;
}

export const GEOM: BoardGeom = {
  left: BOARD_LEFT,
  top: BOARD_TOP,
  width: BOARD_W,
  r: BUBBLE_R,
  rowH: ROW_H,
  cols: COLS,
};

export function cellX(g: BoardGeom, row: number, col: number): number {
  return g.left + g.r + col * 2 * g.r + (row & 1 ? g.r : 0);
}

export function cellY(g: BoardGeom, row: number): number {
  return g.top + g.r + row * g.rowH;
}
