/**
 * Constantes globales du jeu. Toutes les dimensions sont exprimées en
 * « unités de design » : la largeur du plateau vaut toujours 720, la hauteur
 * s'adapte à l'écran (entre MIN_H et MAX_H).
 */
export const DESIGN_W = 720;
export const MIN_H = 1180;
export const MAX_H = 1600;

export const COLS = 11;
export const BUBBLE_R = 31;
export const ROW_H = BUBBLE_R * Math.sqrt(3);
export const BOARD_W = (COLS * 2 + 1) * BUBBLE_R;
export const BOARD_LEFT = (DESIGN_W - BOARD_W) / 2;
export const BOARD_TOP = 140;
/** Nombre de rangées logiques de la grille (large marge sous la ligne de danger). */
export const GRID_ROWS = 30;

export const CANNON_FROM_BOTTOM = 150;
export const SHOT_SPEED = 1750;
export const MIN_AIM_DEG = 9;
export const MIN_MATCH = 3;

export const SCORE_POP = 10;
export const SCORE_DROP = 20;
export const SCORE_SHOT_LEFT = 150;

export const DEPTH = {
  photo: 0,
  fog: 10,
  mist: 20,
  guide: 30,
  bubbles: 40,
  falling: 45,
  fx: 50,
  cannon: 60,
  popup: 70,
} as const;

export interface BubbleColor {
  name: string;
  base: string;
  light: string;
  dark: string;
  deep: string;
  tint: number;
}

/** Palette des boules cristal. L'index sert d'identifiant de couleur partout. */
export const BUBBLE_COLORS: BubbleColor[] = [
  { name: 'rubis', base: '#ff2d55', light: '#ffa3b6', dark: '#c40a38', deep: '#6b021f', tint: 0xff5c7c },
  { name: 'saphir', base: '#2a86ff', light: '#a9d6ff', dark: '#0c4bd0', deep: '#05216b', tint: 0x5aa6ff },
  { name: 'émeraude', base: '#22d36b', light: '#b4ffd2', dark: '#0a9645', deep: '#034f24', tint: 0x5cf09a },
  { name: 'topaze', base: '#ffc81a', light: '#fff4ad', dark: '#e08600', deep: '#874700', tint: 0xffdc5c },
  { name: 'améthyste', base: '#a64dff', light: '#e2c4ff', dark: '#6a1bd0', deep: '#370a75', tint: 0xc084ff },
  { name: 'aigue-marine', base: '#18d6e6', light: '#b8fbff', dark: '#0891a8', deep: '#03495a', tint: 0x6aeaf5 },
];
