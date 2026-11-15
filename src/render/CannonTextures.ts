import Phaser from 'phaser';

/**
 * Textures procédurales du canon : fût, socle, piédestal et supports ronds
 * (boule suivante / minuteur de changement).
 * Les dimensions exportées sont en unités de jeu.
 */
export const BARREL_W = 88;
export const BARREL_H = 198;
export const BASE_SIZE = 198;
export const STAND_W = 236;
export const STAND_H = 112;
export const HOLDER_SIZE = 100;

type Ctx = CanvasRenderingContext2D;

function makeCanvas(scene: Phaser.Scene, key: string, w: number, h: number, scale: number): Ctx {
  const tex = scene.textures.createCanvas(key, Math.ceil(w * scale), Math.ceil(h * scale))!;
  tex.context.scale(scale, scale);
  return tex.context;
}

function goldH(ctx: Ctx, x0: number, x1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, '#7a4a00');
  g.addColorStop(0.22, '#e9a826');
  g.addColorStop(0.42, '#fff6cf');
  g.addColorStop(0.58, '#ffd45c');
  g.addColorStop(0.82, '#c98512');
  g.addColorStop(1, '#6b3f00');
  return g;
}

function goldV(ctx: Ctx, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff6cf');
  g.addColorStop(0.35, '#ffd45c');
  g.addColorStop(0.7, '#d9931a');
  g.addColorStop(1, '#7a4a00');
  return g;
}

function rivet(ctx: Ctx, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, '#fffbe6');
  g.addColorStop(0.5, '#e9a826');
  g.addColorStop(1, '#6b3f00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function gem(ctx: Ctx, x: number, y: number, r: number, light: string, base: string, dark: string): void {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, light);
  g.addColorStop(0.7, base);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,0,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBarrel(ctx: Ctx): void {
  const w = BARREL_W;
  const h = BARREL_H;
  const cx = w / 2;
  // Largeur du fût à une hauteur donnée (légèrement évasé vers la base).
  const half = (y: number): number => 22 + (11 * (y - 16)) / (h - 22);

  // Corps métallique violet.
  const body = ctx.createLinearGradient(cx - 33, 0, cx + 33, 0);
  body.addColorStop(0, '#170d45');
  body.addColorStop(0.2, '#5a45c8');
  body.addColorStop(0.4, '#e9e3ff');
  body.addColorStop(0.55, '#9a88ff');
  body.addColorStop(0.8, '#4630b0');
  body.addColorStop(1, '#150b3e');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(cx - half(16), 16);
  ctx.lineTo(cx + half(16), 16);
  ctx.lineTo(cx + half(h - 6), h - 6);
  ctx.quadraticCurveTo(cx, h + 2, cx - half(h - 6), h - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(12,6,40,0.75)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Rainure sombre et filet d'énergie lumineux au centre.
  ctx.fillStyle = 'rgba(14,8,48,0.75)';
  ctx.beginPath();
  ctx.roundRect(cx - 7, 34, 14, h - 74, 7);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = '#6ff0ff';
  ctx.shadowBlur = 9;
  const energy = ctx.createLinearGradient(0, 38, 0, h - 44);
  energy.addColorStop(0, '#eaffff');
  energy.addColorStop(0.5, '#4fe3ff');
  energy.addColorStop(1, '#2a7dff');
  ctx.fillStyle = energy;
  ctx.beginPath();
  ctx.roundRect(cx - 2.5, 40, 5, h - 86, 2.5);
  ctx.fill();
  ctx.restore();

  // Reflet vertical.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.roundRect(cx - 17, 30, 4, h - 60, 2);
  ctx.fill();

  // Bagues dorées rivetées.
  for (const [y, bh] of [[60, 11], [116, 13]] as const) {
    const hw = half(y) + 3;
    ctx.fillStyle = goldH(ctx, cx - hw, cx + hw);
    ctx.beginPath();
    ctx.roundRect(cx - hw, y, hw * 2, bh, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,0,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const dx of [-hw + 7, 0, hw - 7]) rivet(ctx, cx + dx, y + bh / 2, 2.6);
  }

  // Bouche du canon : large lèvre dorée à double bord.
  ctx.fillStyle = goldH(ctx, 8, w - 8);
  ctx.beginPath();
  ctx.roundRect(8, 2, w - 16, 24, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,0,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.roundRect(14, 5, w - 28, 4, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(90,50,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(12, 19, w - 24, 3, 1.5);
  ctx.fill();
  // Ombre portée de la lèvre sur le fût.
  const shade = ctx.createLinearGradient(0, 26, 0, 38);
  shade.addColorStop(0, 'rgba(8,4,30,0.55)');
  shade.addColorStop(1, 'rgba(8,4,30,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(cx - half(30), 26, half(30) * 2, 12);
}

function drawBase(ctx: Ctx): void {
  const c = BASE_SIZE / 2;

  // Couronne dorée extérieure, avec ombre portée.
  ctx.save();
  ctx.shadowColor = 'rgba(5,2,25,0.65)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = goldV(ctx, c - 82, c + 82);
  ctx.beginPath();
  ctx.arc(c, c, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,50,0,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c, c, 82, 0, Math.PI * 2);
  ctx.stroke();

  // Biseau : anneau intérieur éclairé à l'inverse.
  ctx.fillStyle = goldV(ctx, c + 72, c - 72);
  ctx.beginPath();
  ctx.arc(c, c, 71, 0, Math.PI * 2);
  ctx.fill();

  // Gemmes et rivets alternés sur la couronne.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = c + Math.cos(a) * 76.5;
    const y = c + Math.sin(a) * 76.5;
    if (i % 3 === 0) gem(ctx, x, y, 5, '#b8fbff', '#18d6e6', '#045a6e');
    else rivet(ctx, x, y, 2.6);
  }

  // Dôme de verre violet.
  const dome = ctx.createRadialGradient(c - 18, c - 24, 4, c, c, 64);
  dome.addColorStop(0, '#8f7dff');
  dome.addColorStop(0.45, '#3a2796');
  dome.addColorStop(1, '#120a3a');
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(c, c, 63, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,0,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Anneau d'énergie.
  ctx.save();
  ctx.shadowColor = '#6ff0ff';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(130,236,255,0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(c, c, 56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Graduations fines autour du logement de la boule.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 46, c + Math.sin(a) * 46);
    ctx.lineTo(c + Math.cos(a) * (i % 2 ? 50 : 52), c + Math.sin(a) * (i % 2 ? 50 : 52));
    ctx.stroke();
  }

  // Logement sombre de la boule et reflets du verre.
  const well = ctx.createRadialGradient(c, c, 10, c, c, 42);
  well.addColorStop(0, 'rgba(10,5,36,0.9)');
  well.addColorStop(1, 'rgba(10,5,36,0.35)');
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.arc(c, c, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(c, c, 59, Math.PI * 1.08, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(c, c, 59, Math.PI * 0.15, Math.PI * 0.45);
  ctx.stroke();
}

function drawStand(ctx: Ctx): void {
  const w = STAND_W;
  const h = STAND_H;
  const cx = w / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(5,2,25,0.6)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  const body = ctx.createLinearGradient(0, 16, 0, h - 8);
  body.addColorStop(0, '#6a55d6');
  body.addColorStop(0.5, '#33218a');
  body.addColorStop(1, '#170d45');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(40, 18);
  ctx.lineTo(w - 40, 18);
  ctx.quadraticCurveTo(w - 18, 40, w - 8, h - 14);
  ctx.lineTo(8, h - 14);
  ctx.quadraticCurveTo(18, 40, 40, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Reflet latéral.
  const sheen = ctx.createLinearGradient(0, 0, w, 0);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.3, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(20, 26, w - 40, h - 46);

  // Plinthe dorée.
  ctx.fillStyle = goldV(ctx, h - 22, h - 4);
  ctx.beginPath();
  ctx.roundRect(2, h - 22, w - 4, 16, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,0,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (const x of [22, 62, w - 62, w - 22]) rivet(ctx, x, h - 14, 3);

  // Emblème central : gemme rose sertie d'or.
  ctx.fillStyle = goldV(ctx, h - 62, h - 30);
  ctx.beginPath();
  ctx.moveTo(cx, h - 66);
  ctx.lineTo(cx + 17, h - 46);
  ctx.lineTo(cx, h - 26);
  ctx.lineTo(cx - 17, h - 46);
  ctx.closePath();
  ctx.fill();
  gem(ctx, cx, h - 46, 8, '#ffd9ef', '#ff5cc8', '#8a1260');
}

function drawHolder(ctx: Ctx): void {
  const c = HOLDER_SIZE / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(5,2,25,0.55)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = goldV(ctx, c - 42, c + 42);
  ctx.beginPath();
  ctx.arc(c, c, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const inner = ctx.createRadialGradient(c - 10, c - 12, 2, c, c, 37);
  inner.addColorStop(0, '#5a45c8');
  inner.addColorStop(0.6, '#24166e');
  inner.addColorStop(1, '#120a3a');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(c, c, 36.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,0,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(c, c, 32, Math.PI * 1.1, Math.PI * 1.55);
  ctx.stroke();
}

/** Crée les textures du canon (appelé une fois ; `scale` = densité de rendu). */
export function createCannonTextures(scene: Phaser.Scene, scale: number): void {
  if (scene.textures.exists('cannon-barrel')) return;
  const draw = (key: string, w: number, h: number, fn: (ctx: Ctx) => void): void => {
    fn(makeCanvas(scene, key, w, h, scale));
    (scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
  };
  draw('cannon-barrel', BARREL_W, BARREL_H, drawBarrel);
  draw('cannon-base', BASE_SIZE, BASE_SIZE, drawBase);
  draw('cannon-stand', STAND_W, STAND_H, drawStand);
  draw('round-holder', HOLDER_SIZE, HOLDER_SIZE, drawHolder);
}
