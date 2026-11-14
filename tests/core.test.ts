import { describe, expect, it } from 'vitest';
import { EMPTY, HexGrid } from '../src/core/HexGrid';
import { buildGrid } from '../src/core/LevelGenerator';
import { cellX, cellY, type BoardGeom } from '../src/core/geometry';
import { traceShot } from '../src/core/trajectory';
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

describe('niveaux', () => {
  it('chaque niveau est jouable : rangées pleines, aucune boule flottante', () => {
    for (const level of LEVELS) {
      const g = buildGrid(level);
      expect(g.count()).toBe(level.rows * 11);
      expect(g.findFloating()).toHaveLength(0);
      expect(g.colorsPresent().length).toBeLessThanOrEqual(level.colors);
    }
  });

  it('la génération est déterministe', () => {
    const a = buildGrid(LEVELS[0]);
    const b = buildGrid(LEVELS[0]);
    expect([...a.cells]).toEqual([...b.cells]);
  });
});
