import { bus, type LevelResult } from '../app/bus';
import { sfx } from '../audio/Sfx';
import { DESIGN_W } from '../config/gameConfig';
import { LEVELS } from '../data/levels';
import { loadSave, writeSave } from '../services/SaveService';
import { renderMap, totalStars } from './LevelMap';

/** Interface HTML : accueil, carte des niveaux, barre d'état, écrans de fin de niveau. */
export interface UiActions {
  startLevel(levelIndex: number): void;
  /** Met la scène de jeu en pause (carte affichée). */
  pause(): void;
  /** Relance la scène de jeu (retour à l'accueil). */
  resume(): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

const ICON_SOUND_ON =
  '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6" /><path d="M18 6.5a7.6 7.6 0 0 1 0 11" /></svg>';
const ICON_SOUND_OFF =
  '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5" /><path d="M21 9.5l-5 5" /></svg>';

export function initUi(actions: UiActions): void {
  const hud = $('hud');
  const home = $('overlay-start');
  const map = $('screen-map');
  const end = $('overlay-end');
  const scoreEl = $('hud-score');
  const shotsPill = $('hud-shots').parentElement!;
  const soundBtn = $<HTMLButtonElement>('btn-sound');
  let levelIndex = 0;
  let lastScore = 0;

  const hideAll = (): void => {
    for (const el of [hud, home, map, end]) el.classList.add('hidden');
  };

  const showHome = (): void => {
    hideAll();
    const save = loadSave();
    const stars = totalStars();
    $('home-progress').textContent =
      save.unlocked > 0 ? `★ ${stars} · Niveau ${Math.min(save.unlocked + 1, LEVELS.length)} sur ${LEVELS.length}` : '';
    home.classList.remove('hidden');
    actions.resume();
  };

  const showMap = (): void => {
    hideAll();
    actions.pause();
    map.classList.remove('hidden');
    $('map-stars').textContent = `${totalStars()} / ${LEVELS.length * 3}`;
    const scroll = $('map-scroll');
    const currentY = renderMap($('map-path'), {
      onPick: (i) => play(i),
      onLocked: () => sfx.bounce(),
    });
    const unit = $('stage').clientWidth / DESIGN_W;
    scroll.scrollTop = currentY * unit - scroll.clientHeight / 2;
  };

  const play = (index: number): void => {
    sfx.click();
    hideAll();
    hud.classList.remove('hidden');
    actions.startLevel(Math.max(0, Math.min(index, LEVELS.length - 1)));
  };

  const renderSound = (): void => {
    soundBtn.innerHTML = sfx.muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
    soundBtn.setAttribute('aria-pressed', String(sfx.muted));
  };
  sfx.setMuted(loadSave().muted);
  renderSound();

  soundBtn.addEventListener('click', () => {
    sfx.unlock();
    sfx.setMuted(!sfx.muted);
    writeSave({ muted: sfx.muted });
    renderSound();
    sfx.click();
  });

  $('btn-play').addEventListener('click', () => {
    sfx.unlock();
    sfx.click();
    showMap();
  });
  $('btn-map-home').addEventListener('click', () => {
    sfx.click();
    showHome();
  });
  $('btn-map').addEventListener('click', () => {
    sfx.click();
    showMap();
  });
  $('btn-end-map').addEventListener('click', () => {
    sfx.click();
    showMap();
  });
  $('btn-restart').addEventListener('click', () => play(levelIndex));
  $('btn-again').addEventListener('click', () => play(levelIndex));
  $('btn-next').addEventListener('click', () => play(levelIndex + 1));

  bus.on('ready', (e) => {
    levelIndex = e.levelIndex;
    lastScore = 0;
  });

  bus.on('hud', (s) => {
    $('hud-level').textContent = String(s.levelNumber);
    $('hud-shots').textContent = String(s.shots);
    shotsPill.classList.toggle('low', s.shots > 0 && s.shots <= 5);
    if (s.score !== lastScore) {
      lastScore = s.score;
      scoreEl.textContent = s.score.toLocaleString('fr-FR');
      scoreEl.classList.remove('bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('bump');
    }
    $('reveal-fill').style.width = `${s.percent}%`;
    $('reveal-target').style.left = `${s.target}%`;
    $('reveal-text').textContent = `${s.percent} % · objectif ${s.target} %`;
  });

  const showEnd = (r: LevelResult, won: boolean): void => {
    // Si le joueur a quitté le niveau entre-temps, on n'affiche rien.
    if (hud.classList.contains('hidden')) return;
    $('end-title').textContent = won ? 'Photo révélée !' : r.reason === 'line' ? 'Les boules ont débordé…' : 'Plus de tirs…';
    $('end-sub').textContent = won
      ? `Niveau ${r.levelNumber} · « ${r.title} »`
      : `La photo n'était révélée qu'à ${r.percent} %. Encore un effort !`;
    const stars = $('end-stars');
    stars.classList.toggle('hidden', !won);
    [...stars.children].forEach((el, i) => el.classList.toggle('on', i < r.stars));
    $('end-score').textContent = r.score.toLocaleString('fr-FR');
    $('end-percent').textContent = `${won ? 100 : r.percent} %`;
    $('end-shots').textContent = String(r.shotsLeft);
    const next = $('btn-next');
    const again = $('btn-again');
    next.classList.toggle('hidden', !won || !r.hasNext);
    again.textContent = won ? 'Rejouer' : 'Réessayer';
    again.className = `btn ${won && r.hasNext ? 'secondary' : 'primary'}`;
    $('end-note').textContent = won && !r.hasNext ? 'Bravo ! De nouveaux niveaux arrivent bientôt.' : '';
    end.classList.remove('hidden');
  };

  bus.on('win', (r) => showEnd(r, true));
  bus.on('lose', (r) => showEnd(r, false));

  showHome();
}
