import Phaser from 'phaser';

/** Marge autour du mur pour son ombre portée (unités de jeu). */
export const WALL_PAD = 8;

/**
 * Texture d'un mur incassable : barre d'acier violet cerclée d'or, rivetée.
 * Une texture par dimension, créée à la demande puis réutilisée.
 */
export function wallTexture(scene: Phaser.Scene, w: number, h: number, scale: number): string {
  const key = `wall-${Math.round(w)}x${Math.round(h)}`;
  if (scene.textures.exists(key)) return key;

  const tex = scene.textures.createCanvas(
    key,
    Math.ceil((w + WALL_PAD * 2) * scale),
    Math.ceil((h + WALL_PAD * 2) * scale),
  )!;
  const ctx = tex.context;
  ctx.scale(scale, scale);
  ctx.translate(WALL_PAD, WALL_PAD);
  const horizontal = w >= h;
  const thick = Math.min(w, h);
  const radius = thick * 0.42;

  // Cerclage doré avec ombre portée.
  ctx.save();
  ctx.shadowColor = 'rgba(5,2,25,0.6)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 3;
  const gold = horizontal ? ctx.createLinearGradient(0, 0, 0, h) : ctx.createLinearGradient(0, 0, w, 0);
  gold.addColorStop(0, '#fff6cf');
  gold.addColorStop(0.3, '#ffd45c');
  gold.addColorStop(0.7, '#c98512');
  gold.addColorStop(1, '#6b3f00');
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, radius);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(70,38,0,0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, w - 1, h - 1, radius);
  ctx.stroke();

  // Cœur en acier violet.
  const inset = 3.5;
  const steel = horizontal
    ? ctx.createLinearGradient(0, inset, 0, h - inset)
    : ctx.createLinearGradient(inset, 0, w - inset, 0);
  steel.addColorStop(0, '#b9adff');
  steel.addColorStop(0.25, '#6a55d6');
  steel.addColorStop(0.6, '#33218a');
  steel.addColorStop(1, '#170d45');
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, radius * 0.7);
  ctx.fill();

  // Reflet le long de la barre.
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  if (horizontal) ctx.roundRect(inset + 6, inset + 2, w - inset * 2 - 12, 2.5, 1.2);
  else ctx.roundRect(inset + 2, inset + 6, 2.5, h - inset * 2 - 12, 1.2);
  ctx.fill();

  // Rivets dorés régulièrement espacés.
  const length = Math.max(w, h);
  const count = Math.max(2, Math.round(length / 46));
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const along = thick / 2 + t * (length - thick);
    const x = horizontal ? along : w / 2;
    const y = horizontal ? h / 2 : along;
    const g = ctx.createRadialGradient(x - 1.2, y - 1.2, 0, x, y, 3.6);
    g.addColorStop(0, '#fffbe6');
    g.addColorStop(0.5, '#e9a826');
    g.addColorStop(1, '#6b3f00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  tex.refresh();
  return key;
}
