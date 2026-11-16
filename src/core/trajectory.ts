import { EMPTY, type Cell, type HexGrid } from './HexGrid';
import { cellX, cellY, type BoardGeom } from './geometry';
import type { Rect } from './walls';

export interface Point {
  x: number;
  y: number;
}

export interface ShotTrace {
  /** Polyligne suivie par le projectile (départ, rebonds, point d'impact). */
  points: Point[];
  /** Cellule où la boule se fixe, ou null si aucune place valide. */
  cell: Cell | null;
  bounces: number;
  /** Vrai si la boule, renvoyée vers le bas par un mur, est sortie du plateau. */
  lost: boolean;
}

export interface TraceOptions {
  /** Murs incassables (rectangles en unités de jeu). */
  walls?: Rect[];
  /** Ordonnée sous laquelle une boule qui redescend est perdue. */
  floorY?: number;
}

const STEP = 4;
const HIT_FACTOR = 0.88;
const MAX_BOUNCES = 24;

function collides(grid: HexGrid, g: BoardGeom, x: number, y: number, hit2: number): boolean {
  const row = Math.round((y - g.top - g.r) / g.rowH);
  for (let r = row - 1; r <= row + 1; r++) {
    if (r < 0 || r >= grid.rows) continue;
    const off = r & 1 ? g.r : 0;
    const col = Math.round((x - g.left - g.r - off) / (2 * g.r));
    for (let c = col - 1; c <= col + 1; c++) {
      if (grid.get(r, c) === EMPTY) continue;
      const dx = cellX(g, r, c) - x;
      const dy = cellY(g, r) - y;
      if (dx * dx + dy * dy < hit2) return true;
    }
  }
  return false;
}

/** Cellule libre et attachable la plus proche d'un point d'impact. */
export function snapCell(grid: HexGrid, g: BoardGeom, x: number, y: number): Cell | null {
  const baseRow = Math.max(0, Math.min(grid.rows - 1, Math.round((y - g.top - g.r) / g.rowH)));
  for (let radius = 1; radius <= 3; radius++) {
    let best: Cell | null = null;
    let bestD = Infinity;
    for (let r = baseRow - radius; r <= baseRow + radius; r++) {
      if (r < 0 || r >= grid.rows) continue;
      const off = r & 1 ? g.r : 0;
      const baseCol = Math.round((x - g.left - g.r - off) / (2 * g.r));
      for (let c = baseCol - radius; c <= baseCol + radius; c++) {
        if (!grid.canHold(r, c)) continue;
        if (r !== 0 && !grid.hasOccupiedNeighbor(r, c)) continue;
        const dx = cellX(g, r, c) - x;
        const dy = cellY(g, r) - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { row: r, col: c };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/**
 * Simule un tir : rebonds sur les parois et sur les murs, collision avec les
 * boules ou le plafond. La même fonction sert à la visée et au tir réel, ce
 * qui garantit que la boule atterrit exactement là où la trajectoire l'annonce.
 */
export function traceShot(
  grid: HexGrid,
  g: BoardGeom,
  ox: number,
  oy: number,
  angle: number,
  options: TraceOptions = {},
): ShotTrace {
  const walls = options.walls ?? [];
  const floorY = options.floorY ?? oy + g.r * 4;
  let x = ox;
  let y = oy;
  let dx = Math.cos(angle);
  let dy = Math.sin(angle);
  const minX = g.left + g.r;
  const maxX = g.left + g.width - g.r;
  const topY = g.top + g.r;
  const hit2 = (g.r * 2 * HIT_FACTOR) ** 2;
  const points: Point[] = [{ x, y }];
  let bounces = 0;
  let lost = false;

  if (dy < 0) {
    for (let i = 0; i < 9000; i++) {
      const px = x;
      const py = y;
      x += dx * STEP;
      y += dy * STEP;
      if (x < minX) {
        x = 2 * minX - x;
        dx = -dx;
        points.push({ x: minX, y });
        bounces++;
      } else if (x > maxX) {
        x = 2 * maxX - x;
        dx = -dx;
        points.push({ x: maxX, y });
        bounces++;
      }

      // Murs : collision cercle / rectangle. La position précédente, toujours
      // hors de tous les murs, indique ce qui est touché : une face (rebond
      // miroir) ou un angle (rebond selon la direction angle → centre).
      for (const w of walls) {
        const nx = Math.max(w.x, Math.min(x, w.x + w.w));
        const ny = Math.max(w.y, Math.min(y, w.y + w.h));
        if ((x - nx) ** 2 + (y - ny) ** 2 >= g.r * g.r) continue;
        const besideX = px < w.x || px > w.x + w.w;
        const besideY = py < w.y || py > w.y + w.h;
        if (besideX && !besideY) dx = -dx;
        else if (besideY && !besideX) dy = -dy;
        else {
          const cx = px < w.x ? w.x : w.x + w.w;
          const cy = py < w.y ? w.y : w.y + w.h;
          let ux = px - cx;
          let uy = py - cy;
          const len = Math.hypot(ux, uy) || 1;
          ux /= len;
          uy /= len;
          const dot = dx * ux + dy * uy;
          if (dot < 0) {
            dx -= 2 * dot * ux;
            dy -= 2 * dot * uy;
          }
        }
        x = px;
        y = py;
        points.push({ x, y });
        bounces++;
        break;
      }

      if (dy < 0 && y <= topY) {
        y = topY;
        break;
      }
      if (collides(grid, g, x, y, hit2)) break;
      if (dy > 0 && y >= floorY) {
        lost = true;
        break;
      }
      if (bounces > MAX_BOUNCES) break;
    }
  }
  points.push({ x, y });
  return { points, cell: lost ? null : snapCell(grid, g, x, y), bounces, lost };
}
