import type Phaser from 'phaser';
import { BUBBLE_COLORS } from '../config/gameConfig';
import { bubbleKey } from './BubbleTextures';

/**
 * Images des boules et du canon pour le menu d'accueil : ce sont exactement
 * les dessins utilisés en jeu, exportés depuis les textures générées.
 */
export interface MenuArt {
  bubbles: string[];
  barrel: string;
  base: string;
  stand: string;
}

export function menuArt(scene: Phaser.Scene | undefined): MenuArt | null {
  if (!scene || !scene.textures.exists('cannon-base') || !scene.textures.exists(bubbleKey(0))) return null;
  const url = (key: string): string => (scene.textures.get(key).getSourceImage() as HTMLCanvasElement).toDataURL();
  try {
    return {
      bubbles: BUBBLE_COLORS.map((_, i) => url(bubbleKey(i))),
      barrel: url('cannon-barrel'),
      base: url('cannon-base'),
      stand: url('cannon-stand'),
    };
  } catch {
    return null;
  }
}
