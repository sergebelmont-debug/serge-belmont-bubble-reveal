import '@fontsource-variable/fredoka';
import './styles/main.css';
import Phaser from 'phaser';
import { view } from './app/view';
import { sfx } from './audio/Sfx';
import { DESIGN_W, MAX_H, MIN_H } from './config/gameConfig';
import { GameScene, type SceneData } from './scenes/GameScene';
import { initUi } from './ui/Hud';

async function boot(): Promise<void> {
  // La police doit être prête avant de dessiner du texte dans le canvas.
  try {
    await Promise.race([
      document.fonts.load('700 32px "Fredoka Variable"'),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    /* police de secours */
  }

  // Certains navigateurs intégrés chargent la page dans une vue encore sans
  // dimensions : on attend qu'elle soit affichée avant de créer le jeu.
  while (window.innerWidth < 50 || window.innerHeight < 50) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Format vertical : le plateau fait toujours 720 unités de large ; sa hauteur
  // suit l'écran (du 9:14,75 au 9:20) pour remplir les smartphones sans bandes.
  const stage = document.getElementById('stage')!;
  const aspect = Phaser.Math.Clamp(window.innerHeight / window.innerWidth, MIN_H / DESIGN_W, MAX_H / DESIGN_W);
  view.h = Math.round(DESIGN_W * aspect);

  const fit = (): void => {
    const w = Math.min(window.innerWidth, window.innerHeight / aspect);
    stage.style.width = `${w}px`;
    stage.style.height = `${w * aspect}px`;
    stage.style.setProperty('--u', `${w / DESIGN_W}px`);
  };
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);

  // Densité de rendu : nette sur écrans haute définition, plafonnée pour
  // préserver les performances des smartphones de milieu de gamme.
  const density = (stage.clientWidth * (window.devicePixelRatio || 1)) / DESIGN_W;
  view.scale = Phaser.Math.Clamp(Math.round(density * 4) / 4, 1, 1.5);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: Math.round(DESIGN_W * view.scale),
    height: Math.round(view.h * view.scale),
    backgroundColor: '#1b1247',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
    render: { antialias: true, powerPreference: 'high-performance' },
    banner: false,
    scene: [GameScene],
  });

  const scene = (): GameScene => game.scene.getScene('Game') as GameScene;
  initUi({
    startLevel: (levelIndex) => {
      const data: SceneData = { levelIndex, autostart: true };
      scene().scene.restart(data);
    },
    pause: () => {
      if (scene().scene.isActive()) scene().scene.pause();
    },
    resume: () => {
      if (scene()?.scene.isPaused()) scene().scene.resume();
    },
  });

  // Interruptions (appel, changement d'onglet) : le son est suspendu.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sfx.suspend();
    else sfx.resume();
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

void boot();
