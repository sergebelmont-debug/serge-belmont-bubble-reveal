/** Bus d'événements typé : seul lien entre la scène de jeu et l'interface HTML. */
export interface HudState {
  levelNumber: number;
  title: string;
  score: number;
  shots: number;
  percent: number;
  target: number;
}

export interface LevelResult {
  levelIndex: number;
  levelNumber: number;
  title: string;
  score: number;
  stars: number;
  percent: number;
  shotsLeft: number;
  hasNext: boolean;
  reason?: 'shots' | 'line';
}

export interface BusEvents {
  hud: HudState;
  win: LevelResult;
  lose: LevelResult;
  ready: { levelIndex: number };
}

type Handler<T> = (payload: T) => void;

class Bus {
  private handlers: { [K in keyof BusEvents]?: Array<Handler<BusEvents[K]>> } = {};

  on<K extends keyof BusEvents>(event: K, handler: Handler<BusEvents[K]>): void {
    const list = (this.handlers[event] ??= []) as Array<Handler<BusEvents[K]>>;
    list.push(handler);
  }

  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void {
    const list = this.handlers[event] as Array<Handler<BusEvents[K]>> | undefined;
    if (list) for (const h of list) h(payload);
  }
}

export const bus = new Bus();
