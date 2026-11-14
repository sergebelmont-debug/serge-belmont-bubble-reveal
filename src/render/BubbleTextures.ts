import Phaser from 'phaser';
import { BUBBLE_COLORS, BUBBLE_R, type BubbleColor } from '../config/gameConfig';

/**
 * Textures procédurales : sphères de cristal glossy, canon et particules.
 * Tout est dessiné une seule fois au démarrage, à la résolution de l'écran,
 * puis réutilisé (aucun fichier image à charger).
 */
export const BUBBLE_PAD = 8;
/** Taille d'affichage (unités de jeu) d'un sprite de boule, ombre comprise. */
export const BUBBLE_SPRITE_SIZE = (BUBBLE_R + BUBBLE_PAD) * 2;

export const bubbleKey = (color: number): string => `bubble-${color}`;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex: string, a: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

function drawCrystalSphere(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: BubbleColor): void {
  // 1. Ombre portée douce.
  ctx.save();
  ctx.shadowColor = 'rgba(8,4,30,0.5)';
  ctx.shadowBlur = r * 0.3;
  ctx.shadowOffsetY = r * 0.14;
  ctx.fillStyle = c.deep;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.97, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // 2. Volume : dégradé décentré clair → saturé → sombre.
  let g = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.34, r * 0.05, cx, cy, r * 1.08);
  g.addColorStop(0, c.light);
  g.addColorStop(0.3, c.base);
  g.addColorStop(0.72, c.dark);
  g.addColorStop(1, c.deep);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // 3. Lumière interne : la lumière traverse le verre et ressort en bas.
  ctx.globalCompositeOperation = 'screen';
  g = ctx.createRadialGradient(cx + r * 0.18, cy + r * 0.5, 0, cx + r * 0.18, cy + r * 0.5, r * 0.8);
  g.addColorStop(0, rgba(c.light, 0.85));
  g.addColorStop(0.45, rgba(c.base, 0.35));
  g.addColorStop(1, rgba(c.base, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // 4. Éclat de cristal : étoile de lumière diffuse au cœur de la sphère.
  ctx.translate(cx + r * 0.08, cy + r * 0.12);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    const sg = ctx.createLinearGradient(-r * 0.7, 0, r * 0.7, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-r * 0.7, -r * 0.045, r * 1.4, r * 0.09);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  // 5. Bord assombri (épaisseur du verre).
  g = ctx.createRadialGradient(cx, cy, r * 0.78, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, rgba(c.deep, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // 6. Liseré lumineux en bas à droite (reflet de contre-jour).
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  const rim = ctx.createLinearGradient(cx - r, cy, cx + r, cy + r);
  rim.addColorStop(0.35, 'rgba(255,255,255,0)');
  rim.addColorStop(0.8, 'rgba(255,255,255,0.55)');
  rim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, Math.PI * 0.08, Math.PI * 0.62);
  ctx.stroke();

  // 7. Reflet spéculaire principal (fenêtre de lumière en haut à gauche).
  ctx.save();
  ctx.translate(cx - r * 0.3, cy - r * 0.46);
  ctx.rotate(-0.55);
  ctx.scale(1, 0.56);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 8. Petit point de brillance secondaire.
  g = ctx.createRadialGradient(cx - r * 0.56, cy - r * 0.06, 0, cx - r * 0.56, cy - r * 0.06, r * 0.14);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  ctx.restore();

  // 9. Contour fin pour détacher la boule de la photo.
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.strokeStyle = rgba(c.deep, 0.7);
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
}

function softDot(scene: Phaser.Scene, key: string, size: number, stops: Array<[number, string]>): void {
  const tex = scene.textures.createCanvas(key, size, size)!;
  const ctx = tex.context;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

/** Crée toutes les textures du jeu (appelé une fois ; `scale` = densité de rendu). */
export function createGameTextures(scene: Phaser.Scene, scale: number): void {
  if (scene.textures.exists(bubbleKey(0))) return;

  BUBBLE_COLORS.forEach((color, i) => {
    const size = Math.ceil(BUBBLE_SPRITE_SIZE * scale);
    const tex = scene.textures.createCanvas(bubbleKey(i), size, size)!;
    drawCrystalSphere(tex.context, size / 2, size / 2, (BUBBLE_R - 0.75) * scale, color);
    tex.refresh();
  });

  softDot(scene, 'fx-glow', 64, [
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,255,255,0.75)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  softDot(scene, 'fx-puff', 128, [
    [0, 'rgba(255,255,255,0.55)'],
    [0.5, 'rgba(255,255,255,0.22)'],
    [1, 'rgba(255,255,255,0)'],
  ]);

  // Éclat de cristal (losange lumineux).
  {
    const tex = scene.textures.createCanvas('fx-shard', 28, 28)!;
    const ctx = tex.context;
    const g = ctx.createLinearGradient(0, 0, 28, 28);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0.35)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(14, 1);
    ctx.lineTo(22, 14);
    ctx.lineTo(14, 27);
    ctx.lineTo(6, 14);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }

  // Anneau d'onde de choc.
  {
    const tex = scene.textures.createCanvas('fx-ring', 128, 128)!;
    const ctx = tex.context;
    const g = ctx.createRadialGradient(64, 64, 44, 64, 64, 63);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    tex.refresh();
  }

  // Canon : fût.
  {
    const w = 64;
    const h = 132;
    const tex = scene.textures.createCanvas('cannon-barrel', Math.ceil(w * scale), Math.ceil(h * scale))!;
    const ctx = tex.context;
    ctx.scale(scale, scale);
    const body = ctx.createLinearGradient(8, 0, w - 8, 0);
    body.addColorStop(0, '#2a1d6b');
    body.addColorStop(0.3, '#8f7dff');
    body.addColorStop(0.5, '#d9d1ff');
    body.addColorStop(0.7, '#7a66ee');
    body.addColorStop(1, '#221556');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(12, 10, w - 24, h - 14, 12);
    ctx.fill();
    // Bagues dorées.
    const gold = ctx.createLinearGradient(6, 0, w - 6, 0);
    gold.addColorStop(0, '#8a5a00');
    gold.addColorStop(0.35, '#ffd86b');
    gold.addColorStop(0.55, '#fff6cf');
    gold.addColorStop(0.8, '#e0a321');
    gold.addColorStop(1, '#7a4c00');
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.roundRect(6, 4, w - 12, 16, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(9, 58, w - 18, 9, 4);
    ctx.fill();
    tex.refresh();
  }

  // Canon : socle circulaire.
  {
    const s = 156;
    const tex = scene.textures.createCanvas('cannon-base', Math.ceil(s * scale), Math.ceil(s * scale))!;
    const ctx = tex.context;
    ctx.scale(scale, scale);
    const c = s / 2;
    ctx.shadowColor = 'rgba(5,2,25,0.6)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    const gold = ctx.createLinearGradient(0, 10, 0, s - 10);
    gold.addColorStop(0, '#fff3c4');
    gold.addColorStop(0.45, '#f0b535');
    gold.addColorStop(1, '#8a5a00');
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(c, c, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const inner = ctx.createRadialGradient(c - 14, c - 18, 4, c, c, 56);
    inner.addColorStop(0, '#6e5bd8');
    inner.addColorStop(0.6, '#2d1f78');
    inner.addColorStop(1, '#150c40');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(c, c, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, 46, Math.PI * 1.05, Math.PI * 1.75);
    ctx.stroke();
    tex.refresh();
  }

  // Support de la boule suivante.
  {
    const s = 92;
    const tex = scene.textures.createCanvas('next-holder', Math.ceil(s * scale), Math.ceil(s * scale))!;
    const ctx = tex.context;
    ctx.scale(scale, scale);
    const c = s / 2;
    ctx.fillStyle = 'rgba(20,12,60,0.55)';
    ctx.beginPath();
    ctx.arc(c, c, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,107,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, 38, 0, Math.PI * 2);
    ctx.stroke();
    tex.refresh();
  }
}
