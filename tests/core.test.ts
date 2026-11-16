import { describe, expect, it } from 'vitest';
import { EMPTY, HexGrid } from '../src/core/HexGrid';
import { buildGrid } from '../src/core/LevelGenerator';
import { cellX, cellY, type BoardGeom } from '../src/core/geometry';
import { traceShot } from '../src/core/trajectory';
import { blockCells, wallRect } from '../src/core/walls';
import { LEVELS } from '../src/data/levels';

const G: BoardGeom = { left: 0, top: 0, width: 23 * 30, r: 30, rowH: 30 * Math.sqrt(3), cols: 11 };

describe('HexGrid', () => {
  it('donne 6 voisines à une cellule intérieure', () => {
    const g = new HexGrid(11, 10);
    expect(g.neighbors(3, 5)).toHaveLength(6);
    expect(g.neighbors(4, 5)).toHaveLength(6);
    expect(g.neighbors(0, 0)).toHaveLength(2);
  });

  it('les voisines sont bien adjacentes géométriquement', () => {
    const g = new HexGrid(11, 10);
    for (const [row, col] of [[3, 5], [4, 5]]) {
      for (const n of g.neighbors(row, col)) {
        const d = Math.hypot(cellX(G, n.row, n.col) - cellX(G, row, col), cellY(G, n.row) - cellY(G, row));
        expect(d).toBeCloseTo(60, 3);
      }
    }
  });

  it('trouve un groupe de même couleur', () => {
    const g = new HexGrid(11, 10);
    g.set(0, 0, 1);
    g.set(0, 1, 1);
    g.set(1, 0, 1);
    g.set(0, 2, 2);
    expect(g.findCluster(0, 0)).toHaveLength(3);
    expect(g.findCluster(0, 2)).toHaveLength(1);
    expect(g.findCluster(5, 5)).toHaveLength(0);
  });

  it('détecte les boules détachées du plafond', () => {
    const g = new HexGrid(11, 10);
    g.set(0, 4, 0);
    g.set(1, 4, 1);
    g.set(2, 4, 2);
    expect(g.findFloating()).toHaveLength(0);
    g.set(1, 4, EMPTY);
    const floating = g.findFloating();
    expect(floating).toEqual([{ row: 2, col: 4 }]);
  });
});

describe('traceShot', () => {
  it('un tir vertical dans une grille vide se fixe au plafond', () => {
    const g = new HexGrid(11, 20);
    const t = traceShot(g, G, 345, 900, -Math.PI / 2);
    expect(t.cell?.row).toBe(0);
    expect(t.bounces).toBe(0);
  });

  it('se fixe contre une boule existante, sur une cellule libre et attachée', () => {
    const g = new HexGrid(11, 20);
    g.set(0, 5, 0);
    const t = traceShot(g, G, cellX(G, 0, 5), 900, -Math.PI / 2);
    expect(t.cell).not.toBeNull();
    expect(t.cell!.row).toBe(1);
    expect(g.get(t.cell!.row, t.cell!.col)).toBe(EMPTY);
    expect(g.hasOccupiedNeighbor(t.cell!.row, t.cell!.col)).toBe(true);
  });

  it('rebondit sur les parois et reste dans le plateau', () => {
    const g = new HexGrid(11, 20);
    const t = traceShot(g, G, 345, 900, -Math.PI * 0.08);
    expect(t.bounces).toBeGreaterThan(0);
    for (const p of t.points) {
      expect(p.x).toBeGreaterThanOrEqual(G.left + G.r - 0.001);
      expect(p.x).toBeLessThanOrEqual(G.left + G.width - G.r + 0.001);
    }
    expect(t.cell?.row).toBe(0);
  });

  it('trouve toujours une cellule pour chaque angle sur un vrai niveau', () => {
    const g = buildGrid(LEVELS[0], 11, 20);
    for (let deg = 10; deg <= 170; deg++) {
      const t = traceShot(g, G, 345, 1000, -(deg * Math.PI) / 180);
      expect(t.cell, `angle ${deg}`).not.toBeNull();
      expect(g.get(t.cell!.row, t.cell!.col)).toBe(EMPTY);
    }
  });
});

describe('murs', () => {
  const wall = wallRect(G, { type: 'h', row: 6, col: 4, len: 3.5 });

  it('un tir vertical rebondit sous un mur et la boule est perdue', () => {
    const g = new HexGrid(11, 20);
    const t = traceShot(g, G, wall.x + wall.w / 2, 900, -Math.PI / 2, { walls: [wall], floorY: 960 });
    expect(t.lost).toBe(true);
    expect(t.cell).toBeNull();
    expect(t.bounces).toBe(1);
  });

  it('la boule ne traverse jamais un mur', () => {
    const g = new HexGrid(11, 20);
    for (let deg = 10; deg <= 170; deg += 2) {
      const t = traceShot(g, G, 345, 900, -(deg * Math.PI) / 180, { walls: [wall], floorY: 960 });
      for (const p of t.points) {
        const inside = p.x > wall.x && p.x < wall.x + wall.w && p.y > wall.y && p.y < wall.y + wall.h;
        expect(inside, `angle ${deg}`).toBe(false);
      }
    }
  });

  it('un tir à côté du mur atteint le plafond', () => {
    const g = new HexGrid(11, 20);
    const t = traceShot(g, G, 60, 900, -Math.PI / 2, { walls: [wall], floorY: 960 });
    expect(t.lost).toBe(false);
    expect(t.cell?.row).toBe(0);
  });

  it('aucune boule ne peut se fixer sur une cellule recouverte par un mur', () => {
    const g = new HexGrid(11, 20);
    blockCells(g, G, [wall]);
    expect(g.canHold(6, 5)).toBe(false);
    expect(g.canHold(4, 5)).toBe(true);
    g.set(5, 5, 0);
    const t = traceShot(g, G, 60, 900, -Math.PI / 4, { walls: [wall], floorY: 960 });
    if (t.cell) expect(g.canHold(t.cell.row, t.cell.col)).toBe(true);
  });

  it('les murs des niveaux restent dans la partie haute et aucune boule ne les chevauche', () => {
    for (const level of LEVELS) {
      const g = buildGrid(level);
      for (const w of level.walls ?? []) {
        const bottom = w.type === 'h' ? w.row : w.row + w.len;
        expect(bottom, level.id).toBeLessThanOrEqual(8.5);
      }
      for (const cell of g.occupied()) expect(g.blocked[cell.row * g.cols + cell.col], level.id).toBe(0);
    }
  });
});

describe('niveaux', () => {
  it('chaque niveau est jouable : assez de boules, aucune boule flottante', () => {
    for (const level of LEVELS) {
      const g = buildGrid(level);
      if ((level.pattern ?? 'plein') === 'plein' && !level.walls) expect(g.count()).toBe(level.rows * 11);
      expect(g.count(), level.id).toBeGreaterThanOrEqual(30);
      expect(g.findFloating()).toHaveLength(0);
      expect(g.colorsPresent().length).toBeLessThanOrEqual(level.colors);
      expect(level.rows, level.id).toBeLessThanOrEqual(10);
    }
  });

  it('les identifiants et numéros de niveaux sont uniques et ordonnés', () => {
    LEVELS.forEach((level, i) => expect(level.number).toBe(i + 1));
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  it('la génération est déterministe', () => {
    const a = buildGrid(LEVELS[0]);
    const b = buildGrid(LEVELS[0]);
    expect([...a.cells]).toEqual([...b.cells]);
  });
});
