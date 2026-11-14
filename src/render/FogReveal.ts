import Phaser from 'phaser';
import { DEPTH, DESIGN_W } from '../config/gameConfig';

/**
 * BROUILLARD ET RÉVÉLATION PHOTOGRAPHIQUE
 * ---------------------------------------
 * Le brouillard est calculé sur une petite grille (180 px de large) puis
 * agrandi avec un filtrage doux : rapide sur mobile et naturellement vaporeux.
 *
 * - `field` mémorise, pour chaque point, la quantité de brouillard dissipée.
 *   Elle ne fait que croître : les zones révélées sont donc persistantes et
 *   deux zones voisines fusionnent d'elles-mêmes (leurs valeurs s'additionnent).
 * - Chaque dissipation est une « bouffée » animée dans le temps (dégradé radial
 *   qui s'étend), accompagnée de lobes secondaires décalés.
 * - Un bruit procédural animé déforme le seuil de transparence : les contours
 *   sont irréguliers, organiques, et ondulent lentement.
 * - Trois états visibles : opaque (0), voile partiel, totalement dissipé.
 */
const FIELD_W = 180;
const NOISE = 256;
const TEX_KEY = 'fog-canvas';

interface Blob {
  x: number;
  y: number;
  r: number;
  strength: number;
  dur: number;
  t: number;
  prevE: number;
}

function buildNoise(seed: number): Uint8Array {
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const acc = new Float32Array(NOISE * NOISE);
  let amp = 1;
  let total = 0;
  for (const freq of [4, 8, 16, 32]) {
    const lattice = new Float32Array(freq * freq);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
    const cell = NOISE / freq;
    for (let y = 0; y < NOISE; y++) {
      const gy = y / cell;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const ya = (y0 % freq) * freq;
      const yb = ((y0 + 1) % freq) * freq;
      for (let x = 0; x < NOISE; x++) {
        const gx = x / cell;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const xa = x0 % freq;
        const xb = (x0 + 1) % freq;
        const top = lattice[ya + xa] + (lattice[ya + xb] - lattice[ya + xa]) * sx;
        const bot = lattice[yb + xa] + (lattice[yb + xb] - lattice[yb + xa]) * sx;
        acc[y * NOISE + x] += (top + (bot - top) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  const out = new Uint8Array(NOISE * NOISE);
  for (let i = 0; i < acc.length; i++) {
    // Contraste renforcé pour des volutes bien dessinées.
    const v = (acc[i] / total - 0.5) * 1.9 + 0.5;
    out[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  return out;
}

export class FogReveal {
  readonly image: Phaser.GameObjects.Image;
  /** Fraction de la photo actuellement visible (0–1). */
  fraction = 0;

  private readonly fw = FIELD_W;
  private readonly fh: number;
  private readonly k: number;
  private readonly field: Float32Array;
  private readonly blobs: Blob[] = [];
  private readonly pool: Blob[] = [];
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly img: ImageData;
  private readonly px: Uint32Array;
  private readonly noise: Uint8Array;
  private readonly colorLUT = new Uint32Array(256);
  private readonly alphaLUT = new Uint8Array(256);
  private time = 0;
  private frame = 0;

  constructor(private scene: Phaser.Scene, viewH: number) {
    this.k = this.fw / DESIGN_W;
    this.fh = Math.ceil(viewH * this.k);
    this.field = new Float32Array(this.fw * this.fh);
    this.noise = buildNoise(20261114);

    if (scene.textures.exists(TEX_KEY)) scene.textures.remove(TEX_KEY);
    this.tex = scene.textures.createCanvas(TEX_KEY, this.fw, this.fh)!;
    this.img = this.tex.context.createImageData(this.fw, this.fh);
    this.px = new Uint32Array(this.img.data.buffer);

    // Palette du brouillard : indigo profond → brume lavande lumineuse.
    const stops = [
      [0, 46, 34, 104],
      [0.45, 104, 86, 178],
      [0.75, 164, 146, 226],
      [1, 232, 222, 255],
    ];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let a = stops[0];
      let b = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s][0] && t <= stops[s + 1][0]) {
          a = stops[s];
          b = stops[s + 1];
          break;
        }
      }
      const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const r = Math.round(a[1] + (b[1] - a[1]) * f);
      const g = Math.round(a[2] + (b[2] - a[2]) * f);
      const bl = Math.round(a[3] + (b[3] - a[3]) * f);
      this.colorLUT[i] = (bl << 16) | (g << 8) | r;
    }
    // Courbe d'opacité : 0 = opaque, voile progressif, puis totalement dissipé.
    for (let i = 0; i < 256; i++) {
      const t = (i / 255) * 1.2;
      const s = Math.max(0, Math.min(1, (t - 0.2) / (0.95 - 0.2)));
      this.alphaLUT[i] = Math.round(255 * (1 - s * s * (3 - 2 * s)));
    }

    this.image = scene.add
      .image(0, 0, TEX_KEY)
      .setOrigin(0, 0)
      .setDisplaySize(DESIGN_W, viewH)
      .setDepth(DEPTH.fog);
    this.render();
  }

  /** Vrai lorsqu'aucune dissipation n'est en cours. */
  get idle(): boolean {
    return this.blobs.length === 0;
  }

  /** Bouffée de dissipation simple (coordonnées et rayon en unités de jeu). */
  addBlob(x: number, y: number, radius: number, strength: number, durationMs = 900, delayMs = 0): void {
    const b = this.pool.pop() ?? { x: 0, y: 0, r: 0, strength: 0, dur: 0, t: 0, prevE: 0 };
    b.x = x * this.k;
    b.y = y * this.k;
    b.r = radius * this.k;
    b.strength = strength;
    b.dur = durationMs;
    b.t = -delayMs;
    b.prevE = 0;
    this.blobs.push(b);
  }

  /** Dissipation « nuage » : une bouffée centrale et des lobes irréguliers décalés. */
  reveal(x: number, y: number, radius: number, strength: number, delayMs = 0): void {
    this.addBlob(x, y, radius, strength, 950, delayMs);
    const lobes = 3;
    const start = Math.random() * Math.PI * 2;
    for (let i = 0; i < lobes; i++) {
      const a = start + (i / lobes) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
      const d = radius * (0.55 + Math.random() * 0.4);
      this.addBlob(
        x + Math.cos(a) * d,
        y + Math.sin(a) * d,
        radius * (0.45 + Math.random() * 0.3),
        strength * 0.75,
        800 + Math.random() * 500,
        delayMs + 90 + Math.random() * 320,
      );
    }
  }

  /** Dissipation totale (finale de victoire), en onde depuis un point. */
  clearAll(cx: number, cy: number): void {
    const h = this.fh / this.k;
    for (let y = 0; y <= h + 100; y += 150) {
      for (let x = 0; x <= DESIGN_W; x += 144) {
        const d = Math.hypot(x - cx, y - cy);
        this.addBlob(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60, 240, 1.8, 1100, d * 0.9);
      }
    }
  }

  update(dtMs: number): void {
    this.time += dtMs;
    this.frame++;
    const hadBlobs = this.blobs.length > 0;

    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i];
      b.t += dtMs;
      if (b.t <= 0) continue;
      const p = Math.min(1, b.t / b.dur);
      const inv = 1 - p;
      const e = 1 - inv * inv * inv;
      this.stamp(b.x, b.y, b.r * (0.5 + 0.5 * e), (e - b.prevE) * b.strength);
      b.prevE = e;
      if (p >= 1) {
        this.blobs[i] = this.blobs[this.blobs.length - 1];
        this.blobs.pop();
        this.pool.push(b);
      }
    }

    // Pendant une dissipation : rendu à chaque image. Au repos : une image sur
    // deux suffit pour l'ondulation lente du brouillard.
    if (hadBlobs || (this.frame & 1) === 0) this.render();
  }

  private stamp(cx: number, cy: number, r: number, amount: number): void {
    if (amount <= 0 || r <= 0) return;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.fw - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.fh - 1, Math.ceil(cy + r));
    const r2 = r * r;
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      const row = y * this.fw;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const f = 1 - d2 / r2;
          this.field[row + x] += amount * f * f;
        }
      }
    }
  }

  private render(): void {
    const { fw, fh, field, px, noise, colorLUT, alphaLUT } = this;
    // Deux couches de bruit qui dérivent en sens opposés (interpolées en x
    // pour un déplacement sans à-coups).
    const d1 = this.time * 0.0035;
    const d2 = this.time * 0.0052;
    const o1 = Math.floor(d1);
    const f1 = d1 - o1;
    const o2 = Math.floor(d2);
    const f2 = d2 - o2;
    const oy1 = Math.floor(this.time * 0.0011);
    let visible = 0;

    for (let y = 0; y < fh; y++) {
      const ny1 = ((y + oy1) & 255) << 8;
      const ny2 = ((y * 2 + 97) & 255) << 8;
      const row = y * fw;
      for (let x = 0; x < fw; x++) {
        const a1 = noise[ny1 + ((x + o1) & 255)];
        const b1 = noise[ny1 + ((x + o1 + 1) & 255)];
        const xx = x * 2 - o2 + 4096;
        const a2 = noise[ny2 + (xx & 255)];
        const b2 = noise[ny2 + ((xx - 1) & 255)];
        const n = (a1 + (b1 - a1) * f1 + a2 + (b2 - a2) * f2) * 0.5;

        const v = field[row + x];
        let alpha = 255;
        if (v > 0.002) {
          const t = v + ((n - 128) / 255) * 0.62 * (v < 0.333 ? v * 3 : 1);
          const idx = t <= 0 ? 0 : t >= 1.2 ? 255 : (t * 212.5) | 0;
          alpha = alphaLUT[idx];
        }
        visible += 255 - alpha;
        px[row + x] = (alpha << 24) | colorLUT[n | 0];
      }
    }

    this.fraction = visible / (255 * fw * fh);
    this.tex.context.putImageData(this.img, 0, 0);
    this.tex.refresh();
  }

  destroy(): void {
    this.image.destroy();
    if (this.scene.textures.exists(TEX_KEY)) this.scene.textures.remove(TEX_KEY);
  }
}
