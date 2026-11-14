import Phaser from 'phaser';
import type { LevelDef } from '../data/levels';
import { mulberry32 } from '../core/rng';

/**
 * SEUL endroit du projet qui connaît l'emplacement des photographies.
 * Le reste du jeu passe toujours par ces fonctions.
 */
const PHOTO_DIR = 'assets/photos/levels/';
const THUMB_DIR = 'assets/photos/thumbnails/';

export const photoTextureKey = (level: LevelDef): string => `photo-${level.id}`;

export function photoUrl(level: LevelDef): string | null {
  return level.photo.file ? `${import.meta.env.BASE_URL}${PHOTO_DIR}${level.photo.file}` : null;
}

export function thumbnailUrl(level: LevelDef): string | null {
  return level.photo.thumbnail ? `${import.meta.env.BASE_URL}${THUMB_DIR}${level.photo.thumbnail}` : null;
}

/**
 * Photo provisoire générée : utilisée tant que la vraie photographie n'est pas
 * fournie, ou si son fichier est introuvable. Clairement étiquetée comme telle.
 */
export function createPlaceholderPhoto(scene: Phaser.Scene, level: LevelDef): void {
  const key = photoTextureKey(level);
  if (scene.textures.exists(key)) return;
  const W = 900;
  const H = 2000;
  const tex = scene.textures.createCanvas(key, W, H)!;
  const ctx = tex.context;
  const rng = mulberry32(level.seed * 7 + 13);
  const hue = (level.number * 67 + 200) % 360;

  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, `hsl(${hue},75%,22%)`);
  bg.addColorStop(0.5, `hsl(${(hue + 40) % 360},80%,42%)`);
  bg.addColorStop(1, `hsl(${(hue + 95) % 360},85%,60%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Faisceaux de projecteurs.
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const x = W * (0.1 + 0.2 * i);
    const beam = ctx.createLinearGradient(x, 0, x + (rng() - 0.5) * 500, H * 0.8);
    beam.addColorStop(0, 'rgba(255,255,255,0.35)');
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 20, 0);
    ctx.lineTo(x + 20, 0);
    ctx.lineTo(x + 260 + (rng() - 0.5) * 300, H * 0.85);
    ctx.lineTo(x - 260 + (rng() - 0.5) * 300, H * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  // Bokeh.
  for (let i = 0; i < 70; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = 18 + rng() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const h = (hue + rng() * 140) % 360;
    g.addColorStop(0, `hsla(${h},95%,75%,0.5)`);
    g.addColorStop(0.7, `hsla(${h},95%,65%,0.22)`);
    g.addColorStop(1, `hsla(${h},95%,60%,0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // Silhouette de chanteur (repère visuel pour juger le cadrage).
  ctx.fillStyle = 'rgba(12,6,34,0.82)';
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.36, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 330, H);
  ctx.bezierCurveTo(W / 2 - 330, H * 0.5, W / 2 - 120, H * 0.45, W / 2, H * 0.45);
  ctx.bezierCurveTo(W / 2 + 120, H * 0.45, W / 2 + 330, H * 0.5, W / 2 + 330, H);
  ctx.closePath();
  ctx.fill();

  // Étiquettes.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = '700 76px "Fredoka Variable", system-ui, sans-serif';
  ctx.fillText('SERGE BELMONT', W / 2, H * 0.2);
  ctx.font = '500 46px "Fredoka Variable", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`Photo provisoire n° ${level.number}`, W / 2, H * 0.2 + 70);
  ctx.fillText('(haut)', W / 2, 90);
  ctx.fillText('(bas de la photo)', W / 2, H - 60);
  ctx.font = '600 54px "Fredoka Variable", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`« ${level.title} »`, W / 2, H * 0.72);

  tex.refresh();
}
