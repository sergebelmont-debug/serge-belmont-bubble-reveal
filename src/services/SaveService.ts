/** Sauvegarde locale de la progression (localStorage, tolérante aux navigateurs qui le bloquent). */
const KEY = 'sbbr-save-v1';

export interface SaveData {
  /** Index du plus haut niveau débloqué. */
  unlocked: number;
  /** Meilleur score et étoiles par identifiant de niveau. */
  best: Record<string, { score: number; stars: number }>;
  muted: boolean;
}

const DEFAULTS: SaveData = { unlocked: 0, best: {}, muted: false };

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  let data: SaveData = { ...DEFAULTS, best: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = { ...data, ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch {
    /* stockage indisponible : on joue sans sauvegarde */
  }
  cache = data;
  return data;
}

export function writeSave(patch: Partial<SaveData>): SaveData {
  const data = { ...loadSave(), ...patch };
  cache = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignoré */
  }
  return data;
}

export function recordResult(levelId: string, levelIndex: number, score: number, stars: number): void {
  const save = loadSave();
  const prev = save.best[levelId];
  const best = { ...save.best };
  if (!prev || score > prev.score) best[levelId] = { score, stars: Math.max(stars, prev?.stars ?? 0) };
  writeSave({ best, unlocked: Math.max(save.unlocked, levelIndex + 1) });
}
