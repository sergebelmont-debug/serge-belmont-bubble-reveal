import { LEVELS } from '../data/levels';
import { loadSave } from '../services/SaveService';

/**
 * Carte de progression : un chemin sinueux de pastilles, du niveau 1 (en bas)
 * au dernier niveau (en haut). Entièrement générée depuis LEVELS : ajouter des
 * niveaux allonge la carte automatiquement.
 */
const SPACING = 200;
const BOTTOM = 170;
const TOP = 210;
const LOCK_ICON =
  '<svg viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3" /><path d="M5.5 11h13v9h-13z" /></svg>';

const nodeX = (i: number): number => 360 + 200 * Math.sin(i * 1.05);

export interface MapHandlers {
  onPick(levelIndex: number): void;
  onLocked(): void;
}

/** Nombre total d'étoiles gagnées. */
export function totalStars(): number {
  return Object.values(loadSave().best).reduce((sum, b) => sum + b.stars, 0);
}

/** (Re)dessine la carte et renvoie la position verticale (en unités) du niveau courant. */
export function renderMap(container: HTMLElement, handlers: MapHandlers): number {
  const save = loadSave();
  const n = LEVELS.length;
  const height = TOP + BOTTOM + (n - 1) * SPACING;
  const nodeY = (i: number): number => height - BOTTOM - i * SPACING;
  const current = Math.min(save.unlocked, n - 1);

  container.innerHTML = '';
  container.style.height = `calc(var(--u) * ${height})`;

  // Chemin reliant les niveaux : pointillé blanc, portion parcourue en doré.
  const segment = (i: number): string => {
    const mid = (nodeY(i - 1) + nodeY(i)) / 2;
    return `C ${nodeX(i - 1)} ${mid}, ${nodeX(i)} ${mid}, ${nodeX(i)} ${nodeY(i)}`;
  };
  let full = `M ${nodeX(0)} ${nodeY(0)}`;
  let done = full;
  for (let i = 1; i < n; i++) {
    full += ` ${segment(i)}`;
    if (i <= current) done += ` ${segment(i)}`;
  }
  container.insertAdjacentHTML(
    'beforeend',
    `<svg viewBox="0 0 720 ${height}" preserveAspectRatio="none">
      <path d="${full}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="12" stroke-linecap="round" stroke-dasharray="2 26" />
      <path d="${done}" fill="none" stroke="#ffd66b" stroke-width="12" stroke-linecap="round" stroke-dasharray="2 26" />
    </svg>`,
  );

  LEVELS.forEach((level, i) => {
    const best = save.best[level.id];
    const locked = i > save.unlocked;
    const isCurrent = i === current && !best;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `node ${locked ? 'locked' : best ? 'done' : isCurrent ? 'current' : ''}`;
    btn.style.left = `calc(var(--u) * ${nodeX(i)})`;
    btn.style.top = `calc(var(--u) * ${nodeY(i)})`;
    btn.setAttribute(
      'aria-label',
      locked ? `Niveau ${level.number} verrouillé` : `Niveau ${level.number} : ${level.title}`,
    );
    if (locked) {
      btn.innerHTML = LOCK_ICON;
    } else {
      const stars = best?.stars ?? 0;
      btn.innerHTML =
        `${level.number}` +
        `<span class="node-stars">${[0, 1, 2].map((s) => `<i class="${s < stars ? 'on' : ''}">★</i>`).join('')}</span>` +
        (isCurrent ? `<span class="node-title">${level.title}</span>` : '');
    }
    btn.addEventListener('click', () => {
      if (locked) {
        btn.classList.remove('shake');
        void btn.offsetWidth;
        btn.classList.add('shake');
        handlers.onLocked();
      } else {
        handlers.onPick(i);
      }
    });
    container.appendChild(btn);
  });

  return nodeY(current);
}
