/**
 * Effets sonores synthétisés (Web Audio) : 100 % originaux, aucun fichier à
 * charger. Le contexte audio n'est créé qu'au premier geste du joueur, comme
 * l'exigent les navigateurs mobiles.
 */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02);
  }

  /** À appeler depuis un geste utilisateur (toucher / clic). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this._muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo = freq, delay = 0): void {
    if (!this.ctx || !this.master || this._muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, from: number, to: number, type: BiquadFilterType = 'bandpass', delay = 0, q = 1): void {
    if (!this.ctx || !this.master || !this.noiseBuf || this._muted) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private note(step: number, base = 523.25): number {
    const semis = PENTATONIC[Math.min(step, PENTATONIC.length - 1)];
    return base * Math.pow(2, semis / 12);
  }

  shoot(): void {
    this.noise(0.16, 0.22, 900, 3200, 'bandpass', 0, 0.8);
    this.tone(420, 0.13, 'sine', 0.22, 880);
  }

  bounce(): void {
    this.tone(640, 0.07, 'sine', 0.16, 420);
  }

  land(): void {
    this.tone(260, 0.09, 'triangle', 0.26, 150);
    this.noise(0.04, 0.1, 2400, 1200, 'highpass');
  }

  /** `index` = rang de la boule dans la combinaison : la mélodie monte. */
  pop(index: number): void {
    const f = this.note(index);
    this.tone(f, 0.16, 'sine', 0.26, f * 1.5);
    this.tone(f * 2, 0.09, 'triangle', 0.09, f * 2.6);
    this.noise(0.05, 0.12, 3500, 1800, 'highpass');
  }

  /** Accent selon la taille de la combinaison. */
  combo(size: number): void {
    if (size < 5) return;
    const base = size >= 8 ? 783.99 : 659.25;
    this.tone(base, 0.3, 'triangle', 0.16, base, 0.05);
    this.tone(base * 1.5, 0.4, 'sine', 0.14, base * 1.5, 0.12);
  }

  drop(count: number): void {
    this.tone(620, 0.4, 'sine', 0.22, 110);
    if (count > 3) this.tone(820, 0.5, 'triangle', 0.1, 130, 0.06);
  }

  /** Souffle de dissipation du brouillard. */
  mist(): void {
    this.noise(0.85, 0.11, 500, 2600, 'lowpass', 0.03, 0.4);
  }

  swap(): void {
    this.tone(700, 0.06, 'sine', 0.14, 940);
  }

  click(): void {
    this.tone(880, 0.05, 'sine', 0.12, 1100);
  }

  win(): void {
    [0, 2, 4, 5, 7].forEach((s, i) => {
      const f = this.note(s);
      this.tone(f, 0.34, 'triangle', 0.2, f, i * 0.11);
      this.tone(f * 2, 0.3, 'sine', 0.08, f * 2, i * 0.11);
    });
    this.noise(1.4, 0.1, 600, 5000, 'lowpass', 0, 0.3);
  }

  lose(): void {
    [392, 349.23, 293.66, 220].forEach((f, i) => this.tone(f, 0.38, 'triangle', 0.18, f * 0.97, i * 0.17));
  }
}

export const sfx = new SfxEngine();
