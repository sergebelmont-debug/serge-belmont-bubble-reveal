/**
 * Grille hexagonale du Bubble Shooter (logique pure, sans rendu).
 * Les rangées impaires sont décalées d'un rayon vers la droite.
 */
export const EMPTY = -1;

export interface Cell {
  row: number;
  col: number;
}

const EVEN_OFFSETS = [
  [0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0],
];
const ODD_OFFSETS = [
  [0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1],
];

export class HexGrid {
  readonly cells: Int8Array;
  /** Cellules recouvertes par un mur : aucune boule ne peut s'y fixer. */
  readonly blocked: Uint8Array;

  constructor(readonly cols: number, readonly rows: number) {
    this.cells = new Int8Array(cols * rows).fill(EMPTY);
    this.blocked = new Uint8Array(cols * rows);
  }

  block(row: number, col: number): void {
    if (this.inBounds(row, col)) this.blocked[row * this.cols + col] = 1;
  }

  /** Vrai si une boule peut être posée sur cette cellule (libre et sans mur). */
  canHold(row: number, col: number): boolean {
    if (!this.inBounds(row, col)) return false;
    const i = row * this.cols + col;
    return this.cells[i] === EMPTY && !this.blocked[i];
  }

  inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  get(row: number, col: number): number {
    return this.inBounds(row, col) ? this.cells[row * this.cols + col] : EMPTY;
  }

  set(row: number, col: number, color: number): void {
    if (this.inBounds(row, col)) this.cells[row * this.cols + col] = color;
  }

  neighbors(row: number, col: number): Cell[] {
    const offsets = row & 1 ? ODD_OFFSETS : EVEN_OFFSETS;
    const out: Cell[] = [];
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      if (this.inBounds(r, c)) out.push({ row: r, col: c });
    }
    return out;
  }

  hasOccupiedNeighbor(row: number, col: number): boolean {
    const offsets = row & 1 ? ODD_OFFSETS : EVEN_OFFSETS;
    for (const [dr, dc] of offsets) {
      if (this.get(row + dr, col + dc) !== EMPTY) return true;
    }
    return false;
  }

  /** Groupe de boules de même couleur connectées à la cellule donnée. */
  findCluster(row: number, col: number): Cell[] {
    const color = this.get(row, col);
    if (color === EMPTY) return [];
    const seen = new Uint8Array(this.cells.length);
    const stack: Cell[] = [{ row, col }];
    const out: Cell[] = [];
    seen[row * this.cols + col] = 1;
    while (stack.length) {
      const cell = stack.pop()!;
      out.push(cell);
      for (const n of this.neighbors(cell.row, cell.col)) {
        const idx = n.row * this.cols + n.col;
        if (!seen[idx] && this.cells[idx] === color) {
          seen[idx] = 1;
          stack.push(n);
        }
      }
    }
    return out;
  }

  /** Boules qui ne sont plus reliées au plafond (rangée 0). */
  findFloating(): Cell[] {
    const seen = new Uint8Array(this.cells.length);
    const stack: Cell[] = [];
    for (let c = 0; c < this.cols; c++) {
      if (this.cells[c] !== EMPTY) {
        seen[c] = 1;
        stack.push({ row: 0, col: c });
      }
    }
    while (stack.length) {
      const cell = stack.pop()!;
      for (const n of this.neighbors(cell.row, cell.col)) {
        const idx = n.row * this.cols + n.col;
        if (!seen[idx] && this.cells[idx] !== EMPTY) {
          seen[idx] = 1;
          stack.push(n);
        }
      }
    }
    const out: Cell[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] !== EMPTY && !seen[i]) {
        out.push({ row: Math.floor(i / this.cols), col: i % this.cols });
      }
    }
    return out;
  }

  occupied(): Cell[] {
    const out: Cell[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] !== EMPTY) out.push({ row: Math.floor(i / this.cols), col: i % this.cols });
    }
    return out;
  }

  count(): number {
    let n = 0;
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] !== EMPTY) n++;
    return n;
  }

  colorsPresent(): number[] {
    const set = new Set<number>();
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] !== EMPTY) set.add(this.cells[i]);
    return [...set].sort((a, b) => a - b);
  }
}
