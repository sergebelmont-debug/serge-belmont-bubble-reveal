import { BUBBLE_R, ROW_H } from '../config/gameConfig';
import { BARREL_H, BARREL_W, BASE_SIZE, STAND_H, STAND_W } from '../render/CannonTextures';
import { BUBBLE_SPRITE_SIZE } from '../render/BubbleTextures';
import type { MenuArt } from '../render/menuArt';

/**
 * Décor du menu d'accueil : quelques rangées de boules en haut et le canon en
 * bas, pour que l'on reconnaisse le jeu au premier coup d'œil.
 * Purement décoratif : rien n'est cliquable.
 */
const ROWS: (number | null)[][] = [
  [0, 0, 1, 1, 1, 2, 3, 3, 4, 4, 0],
  [0, 1, 1, 2, 2, 2, 3, 4, 4, 0],
  [1, null, null, null, null, null, null, null, null, null, 4],
];
const CANNON_SCALE = 0.7;
const BARREL_ANGLE = 24;

const u = (n: number): string => `calc(var(--u) * ${n.toFixed(2)})`;

function img(src: string, x: number, y: number, w: number, h: number): HTMLImageElement {
  const el = document.createElement('img');
  el.src = src;
  el.alt = '';
  el.draggable = false;
  el.style.cssText = `left:${u(x)};top:${u(y)};width:${u(w)};height:${u(h)}`;
  return el;
}

export function renderHomeArt(bubbles: HTMLElement, cannon: HTMLElement, art: MenuArt): void {
  bubbles.innerHTML = '';
  const pad = (BUBBLE_SPRITE_SIZE - BUBBLE_R * 2) / 2;
  const left = (720 - 23 * BUBBLE_R) / 2;
  ROWS.forEach((row, r) => {
    row.forEach((color, c) => {
      if (color === null) return;
      const x = left + c * BUBBLE_R * 2 + (r % 2 ? BUBBLE_R : 0) - pad;
      const y = 8 + r * ROW_H - pad;
      bubbles.appendChild(img(art.bubbles[color % art.bubbles.length], x, y, BUBBLE_SPRITE_SIZE, BUBBLE_SPRITE_SIZE));
    });
  });

  // Canon : mêmes proportions qu'en jeu, réduit, fût incliné vers les boules.
  cannon.innerHTML = '';
  const s = CANNON_SCALE;
  cannon.appendChild(img(art.stand, (-STAND_W / 2) * s, (72 - STAND_H / 2) * s, STAND_W * s, STAND_H * s));
  const barrel = img(art.barrel, (-BARREL_W / 2) * s, -BARREL_H * 0.92 * s, BARREL_W * s, BARREL_H * s);
  barrel.style.transformOrigin = '50% 92%';
  barrel.style.transform = `rotate(${BARREL_ANGLE}deg)`;
  cannon.appendChild(barrel);
  cannon.appendChild(img(art.base, (-BASE_SIZE / 2) * s, (-BASE_SIZE / 2) * s, BASE_SIZE * s, BASE_SIZE * s));
  const ball = BUBBLE_SPRITE_SIZE * s;
  cannon.appendChild(img(art.bubbles[2 % art.bubbles.length], -ball / 2, -ball / 2, ball, ball));
}
