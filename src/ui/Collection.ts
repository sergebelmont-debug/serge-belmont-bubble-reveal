import { LEVELS } from '../data/levels';
import { photoUrl, thumbnailUrl } from '../services/PhotoService';
import { loadSave } from '../services/SaveService';

/**
 * Collection : les photographies obtenues en terminant les niveaux.
 * Une photo non encore obtenue apparaît grisée, floue et verrouillée.
 */
const LOCK_ICON =
  '<svg viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3" /><path d="M5.5 11h13v9h-13z" /></svg>';

/** Nombre de photographies obtenues (niveaux terminés). */
export function collectedCount(): number {
  const best = loadSave().best;
  return LEVELS.filter((l) => best[l.id]).length;
}

export interface CollectionHandlers {
  /** Ouvre une photo obtenue en grand. */
  onOpen(url: string, caption: string): void;
  onLocked(): void;
}

export function renderCollection(container: HTMLElement, handlers: CollectionHandlers): void {
  const best = loadSave().best;
  container.innerHTML = '';
  for (const level of LEVELS) {
    const owned = Boolean(best[level.id]);
    const thumb = thumbnailUrl(level) ?? photoUrl(level);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `tile ${owned ? 'owned' : 'locked'}`;
    tile.setAttribute(
      'aria-label',
      owned ? `Photo ${level.number} : ${level.title}` : `Photo ${level.number} verrouillée : terminez le niveau ${level.number}`,
    );
    const img = thumb ? `<img src="${thumb}" alt="" loading="lazy" draggable="false" />` : '';
    tile.innerHTML = owned
      ? `${img}<span class="tile-cap"><b>${level.number}</b>${level.title}</span>`
      : `${img}<span class="tile-lock">${LOCK_ICON}<i>Niveau ${level.number}</i></span>`;
    tile.addEventListener('click', () => {
      const full = photoUrl(level) ?? thumb;
      if (owned && full) {
        handlers.onOpen(full, `${level.number} · ${level.title}`);
      } else {
        tile.classList.remove('shake');
        void tile.offsetWidth;
        tile.classList.add('shake');
        handlers.onLocked();
      }
    });
    container.appendChild(tile);
  }
}
