import Phaser from 'phaser';
import { bus } from '../app/bus';
import { view } from '../app/view';
import { sfx } from '../audio/Sfx';
import {
  BUBBLE_COLORS,
  BUBBLE_R,
  CANNON_FROM_BOTTOM,
  DEPTH,
  DESIGN_W,
  MIN_AIM_DEG,
  MIN_MATCH,
  SCORE_DROP,
  SCORE_POP,
  SCORE_SHOT_LEFT,
  SHOT_SPEED,
} from '../config/gameConfig';
import { EMPTY, type Cell, type HexGrid } from '../core/HexGrid';
import { buildGrid } from '../core/LevelGenerator';
import { GEOM, cellX, cellY } from '../core/geometry';
import { traceShot, type Point, type ShotTrace } from '../core/trajectory';
import { wallRect, type Rect } from '../core/walls';
import { WALL_PAD, wallTexture } from '../render/WallTextures';
import { LEVELS, type LevelDef } from '../data/levels';
import { BUBBLE_SPRITE_SIZE, bubbleKey, createGameTextures } from '../render/BubbleTextures';
import { BARREL_H, BARREL_W, BASE_SIZE, HOLDER_SIZE, STAND_H, STAND_W } from '../render/CannonTextures';
import { FogReveal } from '../render/FogReveal';
import { createPlaceholderPhoto, photoTextureKey, photoUrl } from '../services/PhotoService';
import { recordResult } from '../services/SaveService';

type Image = Phaser.GameObjects.Image;
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;
type State = 'idle' | 'aiming' | 'flying' | 'settling' | 'won' | 'lost';

interface Flight {
  sprite: Image;
  color: number;
  points: Point[];
  seg: number;
  cell: Cell | null;
  carve: number;
  lost: boolean;
}

interface Faller {
  sprite: Image;
  color: number;
  vx: number;
  vy: number;
  spin: number;
  carve: number;
}

export interface SceneData {
  levelIndex?: number;
  autostart?: boolean;
}

const cellKey = (row: number, col: number): number => row * 64 + col;
const GRAVITY = 2600;
/** Délai (ms) avant que la boule chargée soit remplacée automatiquement. */
const SKIP_DELAY = 3000;
/** Distance du centre du canon à la bouche du fût. */
const MUZZLE_DIST = 180;
/** Accélération du temps, réservée aux tests d'équilibrage (1 = normal). */
let debugSpeed = 1;

export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: LevelDef;
  private autostart = false;
  private viewH = 1280;

  private grid!: HexGrid;
  private wallRects: Rect[] = [];
  private fog!: FogReveal;
  private state: State = 'idle';
  private score = 0;
  private shots = 0;
  private lastPercent = -1;

  private cannonX = DESIGN_W / 2;
  private cannonY = 0;
  private loseRow = 0;
  private nextX = 0;
  private nextY = 0;
  private bScale = 1;
  /** Sur les écrans hauts, les dissipations sont un peu plus larges (équité entre appareils). */
  private hScale = 1;

  private aimAngle = -Math.PI / 2;
  private aiming = false;
  private guideVisible = false;
  private trace: ShotTrace | null = null;
  private traceDirty = true;

  private current = 0;
  private next = 0;
  private currentSprite!: Image;
  private nextSprite!: Image;
  private barrel!: Image;
  private barrelScaleY = 1;
  private guide!: Phaser.GameObjects.Graphics;

  private skipX = 0;
  private skipY = 0;
  /** Temps restant (ms) avant le changement automatique de la boule chargée. */
  private skipCooldown = SKIP_DELAY;
  private skipRing!: Phaser.GameObjects.Graphics;
  private skipText!: Phaser.GameObjects.Text;

  private sprites = new Map<number, Image>();
  private pool: Image[] = [];
  private ringPool: Image[] = [];
  private fallers: Faller[] = [];
  private flight: Flight | null = null;
  private pendingFx = 0;

  private sparks!: Emitter;
  private shards!: Emitter;
  private mist!: Emitter;
  private trail!: Emitter;
  private confetti!: Emitter;

  constructor() {
    super('Game');
  }

  init(data: SceneData): void {
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex ?? 0, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex];
    this.autostart = data.autostart ?? false;
    this.viewH = view.h;
    this.state = 'idle';
    this.score = 0;
    this.shots = this.level.shots;
    this.lastPercent = -1;
    this.aimAngle = -Math.PI / 2;
    this.aiming = false;
    this.guideVisible = false;
    this.trace = null;
    this.traceDirty = true;
    this.sprites = new Map();
    this.pool = [];
    this.ringPool = [];
    this.fallers = [];
    this.flight = null;
    this.pendingFx = 0;
    this.skipCooldown = SKIP_DELAY;
  }

  preload(): void {
    const url = photoUrl(this.level);
    const key = photoTextureKey(this.level);
    // Si le fichier est absent ou illisible, la texture n'existera pas et
    // create() basculera automatiquement sur la photo provisoire.
    if (url && !this.textures.exists(key)) this.load.image(key, url);
  }

  create(): void {
    const cam = this.cameras.main;
    cam.setZoom(view.scale);
    cam.centerOn(DESIGN_W / 2, this.viewH / 2);

    createGameTextures(this, view.scale);
    this.bScale = BUBBLE_SPRITE_SIZE / this.textures.get(bubbleKey(0)).getSourceImage().width;

    this.hScale = Math.sqrt(this.viewH / 1280);
    this.time.timeScale = debugSpeed;
    this.tweens.timeScale = debugSpeed;

    this.cannonY = this.viewH - CANNON_FROM_BOTTOM;
    this.loseRow = Math.ceil((this.cannonY - 200 - GEOM.top - GEOM.r) / GEOM.rowH);
    this.nextX = this.cannonX - 178;
    this.nextY = this.cannonY + 44;

    this.createPhoto();
    this.fog = new FogReveal(this, this.viewH);
    this.createEffects();
    this.createBoard();
    this.createCannon();
    this.bindInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.fog.destroy();
    });

    if (import.meta.env.DEV) (window as unknown as { __game: GameScene }).__game = this;

    this.emitHud();
    bus.emit('ready', { levelIndex: this.levelIndex });
    if (this.autostart) this.beginPlay();
  }

  /** Lance la partie (appelé par l'interface après l'écran de démarrage). */
  beginPlay(): void {
    if (this.state === 'idle') this.state = 'aiming';
  }

  // ───────────────────────────── Construction ─────────────────────────────

  private createPhoto(): void {
    const key = photoTextureKey(this.level);
    if (!this.textures.exists(key)) createPlaceholderPhoto(this, this.level);
    const photo = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(DEPTH.photo);
    // Cadrage « cover » : la photo remplit tout le plateau, sans déformation.
    const sc = Math.max(DESIGN_W / photo.width, this.viewH / photo.height);
    const fx = this.level.photo.focusX ?? 0.5;
    const fy = this.level.photo.focusY ?? 0.3;
    photo.setScale(sc);
    photo.setPosition(-(photo.width * sc - DESIGN_W) * fx, -(photo.height * sc - this.viewH) * fy);
  }

  private createEffects(): void {
    const all = { min: 0, max: 360 };
    this.mist = this.add
      .particles(0, 0, 'fx-puff', {
        speed: { min: 15, max: 100 },
        angle: all,
        scale: { start: 0.5, end: 2.2 },
        alpha: { start: 0.5, end: 0 },
        lifespan: { min: 900, max: 1500 },
        tint: 0xe9e2ff,
        emitting: false,
      })
      .setDepth(DEPTH.mist);
    this.trail = this.add
      .particles(0, 0, 'fx-glow', {
        speed: 0,
        scale: { start: 0.75, end: 0 },
        alpha: { start: 0.55, end: 0 },
        lifespan: 300,
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(DEPTH.bubbles - 1);
    this.sparks = this.add
      .particles(0, 0, 'fx-glow', {
        speed: { min: 120, max: 460 },
        angle: all,
        scale: { start: 0.55, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 300, max: 620 },
        gravityY: 520,
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    this.shards = this.add
      .particles(0, 0, 'fx-shard', {
        speed: { min: 160, max: 430 },
        angle: all,
        scale: { start: 0.75, end: 0.1 },
        rotate: { start: 0, end: 360 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 450, max: 800 },
        gravityY: 900,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    this.confetti = this.add
      .particles(0, 0, 'fx-shard', {
        speed: { min: 250, max: 900 },
        angle: { min: 220, max: 320 },
        scale: { start: 1, end: 0.4 },
        rotate: { start: 0, end: 720 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 1200, max: 2200 },
        gravityY: 700,
        tint: BUBBLE_COLORS.map((c) => c.tint),
        emitting: false,
      })
      .setDepth(DEPTH.popup);
    this.guide = this.add.graphics().setDepth(DEPTH.guide);
  }

  /** Trajectoire d'un tir à l'angle donné, murs du niveau compris. */
  private traceAt(angle: number): ShotTrace {
    return traceShot(this.grid, GEOM, this.cannonX, this.cannonY, angle, {
      walls: this.wallRects,
      floorY: this.viewH + 50,
    });
  }

  private createBoard(): void {
    this.grid = buildGrid(this.level);

    // Murs incassables : mêmes rectangles pour le calcul des rebonds et l'affichage.
    this.wallRects = (this.level.walls ?? []).map((w) => wallRect(GEOM, w));
    for (const r of this.wallRects) {
      this.add
        .image(r.x + r.w / 2, r.y + r.h / 2, wallTexture(this, r.w, r.h, view.scale))
        .setDisplaySize(r.w + WALL_PAD * 2, r.h + WALL_PAD * 2)
        .setDepth(DEPTH.bubbles - 2);
    }

    for (const { row, col } of this.grid.occupied()) {
      const x = cellX(GEOM, row, col);
      const y = cellY(GEOM, row);
      const sprite = this.takeBubble(this.grid.get(row, col), x, y - 90);
      sprite.setAlpha(0);
      this.sprites.set(cellKey(row, col), sprite);
      this.tweens.add({
        targets: sprite,
        y,
        alpha: 1,
        duration: 420,
        delay: row * 45 + col * 8,
        ease: 'Back.easeOut',
      });
    }

    // Ligne de danger : si une boule se fixe en dessous, la partie est perdue.
    const lineY = cellY(GEOM, this.loseRow) - GEOM.r;
    const line = this.add.graphics().setDepth(DEPTH.guide);
    line.fillStyle(0xffffff, 0.22);
    for (let x = GEOM.left + 8; x < GEOM.left + GEOM.width - 8; x += 26) line.fillRoundedRect(x, lineY - 1.5, 13, 3, 1.5);
  }

  private createCannon(): void {
    this.add
      .image(this.cannonX, this.cannonY + 72, 'cannon-stand')
      .setDisplaySize(STAND_W, STAND_H)
      .setDepth(DEPTH.cannon - 1);
    this.barrel = this.add
      .image(this.cannonX, this.cannonY, 'cannon-barrel')
      .setOrigin(0.5, 0.92)
      .setDisplaySize(BARREL_W, BARREL_H)
      .setDepth(DEPTH.cannon);
    this.barrelScaleY = this.barrel.scaleY;
    this.add
      .image(this.cannonX, this.cannonY, 'cannon-base')
      .setDisplaySize(BASE_SIZE, BASE_SIZE)
      .setDepth(DEPTH.cannon + 1);
    this.add
      .image(this.nextX, this.nextY, 'round-holder')
      .setDisplaySize(HOLDER_SIZE, HOLDER_SIZE)
      .setDepth(DEPTH.cannon);

    // Minuteur de changement automatique : au bout de 3 s sans tirer, la boule
    // chargée est remplacée par la suivante (simple affichage, pas un bouton).
    this.skipX = this.cannonX + 178;
    this.skipY = this.nextY;
    this.add
      .image(this.skipX, this.skipY, 'round-holder')
      .setDisplaySize(HOLDER_SIZE, HOLDER_SIZE)
      .setDepth(DEPTH.cannon);
    this.skipRing = this.add.graphics().setDepth(DEPTH.cannon + 1);
    this.skipText = this.add
      .text(this.skipX, this.skipY, '3', {
        fontFamily: '"Fredoka Variable", system-ui, sans-serif',
        fontStyle: '700',
        fontSize: '40px',
        color: '#ffe27a',
        stroke: '#2a1466',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.cannon + 2)
      .setResolution(view.scale);
    for (const [x, label] of [[this.nextX, 'SUIVANTE'], [this.skipX, 'CHANGEMENT']] as const) {
      this.add
        .text(x, this.nextY + 62, label, {
          fontFamily: '"Fredoka Variable", system-ui, sans-serif',
          fontStyle: '600',
          fontSize: '18px',
          color: '#ffffff',
          stroke: '#2a1466',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.cannon + 2)
        .setResolution(view.scale)
        .setLetterSpacing(1.5);
    }

    this.current = this.pickColor();
    this.next = this.pickColor();
    this.currentSprite = this.add.image(this.cannonX, this.cannonY, bubbleKey(this.current)).setDepth(DEPTH.cannon + 2);
    this.nextSprite = this.add.image(this.nextX, this.nextY, bubbleKey(this.next)).setDepth(DEPTH.cannon + 2);
    this.currentSprite.setScale(this.bScale);
    this.nextSprite.setScale(this.bScale * 0.72);
    this.refreshLoader(false);
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      sfx.unlock();
      if (this.state !== 'aiming') return;
      if (Math.hypot(p.worldX - this.nextX, p.worldY - this.nextY) < 58) {
        this.swapBubbles();
        return;
      }
      this.aiming = true;
      this.setAim(p.worldX, p.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (this.state !== 'aiming') return;
      if (this.aiming || !p.wasTouch) this.setAim(p.worldX, p.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (!this.aiming) return;
      this.aiming = false;
      if (this.state === 'aiming' && this.guideVisible) this.fire();
      if (p.wasTouch) this.guideVisible = false;
    });
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      this.aiming = false;
      this.guideVisible = false;
    });
  }

  // ───────────────────────────── Visée et tir ─────────────────────────────

  private setAim(wx: number, wy: number): void {
    // Relâcher sous le canon annule le tir.
    if (wy > this.cannonY - 24) {
      this.guideVisible = false;
      return;
    }
    const min = Phaser.Math.DegToRad(MIN_AIM_DEG);
    const angle = Math.atan2(wy - this.cannonY, wx - this.cannonX);
    this.aimAngle = Phaser.Math.Clamp(angle, -Math.PI + min, -min);
    this.barrel.rotation = this.aimAngle + Math.PI / 2;
    this.guideVisible = true;
    this.traceDirty = true;
  }

  private swapBubbles(): void {
    if (this.shots < 2) return;
    [this.current, this.next] = [this.next, this.current];
    sfx.swap();
    this.refreshLoader(true);
    this.traceDirty = true;
  }

  private refreshLoader(animate: boolean): void {
    this.currentSprite.setTexture(bubbleKey(this.current)).setVisible(this.shots > 0);
    this.nextSprite.setTexture(bubbleKey(this.next)).setVisible(this.shots > 1);
    if (!animate) return;
    this.currentSprite.setScale(this.bScale * 0.5);
    this.nextSprite.setScale(this.bScale * 0.4);
    this.tweens.add({ targets: this.currentSprite, scale: this.bScale, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.nextSprite, scale: this.bScale * 0.72, duration: 180, ease: 'Back.easeOut' });
  }

  /**
   * Changement automatique : quand le minuteur arrive à zéro, la boule chargée
   * cède sa place à la suivante, sans coûter de tir.
   */
  private autoChangeBubble(): void {
    const old = this.current;
    const ghost = this.takeBubble(old, this.cannonX, this.cannonY).setDepth(DEPTH.cannon + 3);
    this.tweens.add({
      targets: ghost,
      x: this.skipX,
      y: this.skipY,
      scale: this.bScale * 0.2,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeIn',
      onComplete: () => this.recycle(ghost),
    });
    this.mist.explode(2, this.cannonX, this.cannonY);
    // La boule proposée est toujours d'une autre couleur que celle passée.
    this.current = this.next !== old ? this.next : this.pickColor(old);
    this.next = this.pickColor(old);
    sfx.swap();
    this.refreshLoader(true);
    this.traceDirty = true;
    this.skipCooldown = SKIP_DELAY;
  }

  private updateSkip(dt: number): void {
    // Le minuteur ne tourne que lorsque le joueur peut tirer, et se fige tant
    // que le doigt vise : la boule ne change jamais au milieu d'un tir préparé.
    const running = this.state === 'aiming' && this.shots > 0;
    if (running && !this.aiming) {
      this.skipCooldown -= dt;
      if (this.skipCooldown <= 0) this.autoChangeBubble();
    }
    const left = Math.max(0, this.skipCooldown) / SKIP_DELAY;
    const g = this.skipRing;
    g.clear();
    g.lineStyle(7, 0x0e0830, 0.55);
    g.strokeCircle(this.skipX, this.skipY, 40);
    if (running) {
      // L'anneau se vide ; il vire au rose pendant la dernière seconde.
      g.lineStyle(7, this.skipCooldown <= 1000 ? 0xff7bd5 : 0xffd66b, 1);
      g.beginPath();
      g.arc(this.skipX, this.skipY, 40, -Math.PI / 2, -Math.PI / 2 + Math.max(0.001, left) * Math.PI * 2, false);
      g.strokePath();
    }
    this.skipText
      .setText(String(Math.max(1, Math.ceil(this.skipCooldown / 1000))))
      .setAlpha(running ? 1 : 0.35);
  }

  /** Couleur au hasard parmi celles encore présentes (en évitant `except` si possible). */
  private pickColor(except = -1): number {
    let present = this.grid.colorsPresent();
    if (present.length > 1) present = present.filter((c) => c !== except);
    if (present.length) return present[Math.floor(Math.random() * present.length)];
    return Math.floor(Math.random() * this.level.colors);
  }

  private fire(): void {
    const trace = this.traceAt(this.aimAngle);
    const sprite = this.takeBubble(this.current, this.cannonX, this.cannonY);
    sprite.setDepth(DEPTH.falling);
    this.flight = {
      sprite,
      color: this.current,
      points: trace.points,
      seg: 0,
      cell: trace.cell,
      carve: 0,
      lost: trace.lost,
    };
    this.state = 'flying';
    this.shots--;
    this.guide.clear();
    sfx.shoot();
    this.skipCooldown = SKIP_DELAY;
    // Éclair à la bouche du canon.
    const mx = this.cannonX + Math.cos(this.aimAngle) * MUZZLE_DIST;
    const my = this.cannonY + Math.sin(this.aimAngle) * MUZZLE_DIST;
    this.sparks.setParticleTint(BUBBLE_COLORS[this.current].tint);
    this.sparks.explode(8, mx, my);
    this.mist.explode(1, mx, my);

    this.current = this.next;
    this.next = this.pickColor();
    this.refreshLoader(true);
    this.tweens.add({
      targets: this.barrel,
      scaleY: this.barrelScaleY * 0.84,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.emitHud();
  }

  private updateFlight(dt: number): void {
    const f = this.flight!;
    const s = f.sprite;
    let remaining = (SHOT_SPEED * dt) / 1000;
    const last = f.points.length - 1;
    while (remaining > 0 && f.seg < last) {
      const target = f.points[f.seg + 1];
      const dx = target.x - s.x;
      const dy = target.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d <= remaining) {
        s.setPosition(target.x, target.y);
        remaining -= d;
        f.carve += d;
        f.seg++;
        if (f.seg < last) {
          sfx.bounce();
          this.sparks.setParticleTint(0xffffff);
          this.sparks.explode(5, s.x, s.y);
        }
      } else {
        s.x += (dx / d) * remaining;
        s.y += (dy / d) * remaining;
        f.carve += remaining;
        remaining = 0;
      }
    }
    this.trail.setParticleTint(BUBBLE_COLORS[f.color].tint);
    this.trail.emitParticleAt(s.x, s.y, 1);
    // Le projectile laisse un léger sillage dans le brouillard (voile partiel).
    if (f.carve > 70) {
      f.carve = 0;
      this.fog.addBlob(s.x, s.y, 46, 0.07, 450);
    }
    if (f.seg >= last) this.land();
  }

  private land(): void {
    const f = this.flight!;
    this.flight = null;
    const sprite = f.sprite;

    if (f.lost) {
      // Renvoyée vers le bas par un mur, la boule est sortie du plateau : tir perdu.
      this.recycle(sprite);
      sfx.drop(1);
      this.popup(Phaser.Math.Clamp(sprite.x, 120, DESIGN_W - 120), this.viewH - 150, 'Tir perdu', 38, '#ff9db0');
      this.afterShot();
      return;
    }
    if (!f.cell) {
      // Cas rarissime : aucune place libre, la boule éclate simplement.
      this.burst(sprite, f.color, 0);
      this.afterShot();
      return;
    }

    const { row, col } = f.cell;
    this.grid.set(row, col, f.color);
    this.sprites.set(cellKey(row, col), sprite);
    sprite.setDepth(DEPTH.bubbles);
    const tx = cellX(GEOM, row, col);
    const ty = cellY(GEOM, row);
    this.tweens.add({ targets: sprite, x: tx, y: ty, duration: 90, ease: 'Back.easeOut' });
    this.nudgeNeighbors(row, col, tx, ty);

    const cluster = this.grid.findCluster(row, col);
    if (cluster.length >= MIN_MATCH) {
      this.popCluster(cluster, tx, ty);
    } else {
      sfx.land();
      if (row >= this.loseRow) {
        this.lose('line');
        return;
      }
    }
    this.afterShot();
  }

  /** Petit choc élastique transmis aux boules voisines. */
  private nudgeNeighbors(row: number, col: number, x: number, y: number): void {
    for (const n of this.grid.neighbors(row, col)) {
      const sprite = this.sprites.get(cellKey(n.row, n.col));
      if (!sprite) continue;
      const nx = cellX(GEOM, n.row, n.col);
      const ny = cellY(GEOM, n.row);
      const d = Math.hypot(nx - x, ny - y) || 1;
      this.tweens.add({
        targets: sprite,
        x: nx + ((nx - x) / d) * 5,
        y: ny + ((ny - y) / d) * 5,
        duration: 70,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => sprite.setPosition(nx, ny),
      });
    }
  }

  // ─────────────────────── Combinaisons, chutes, score ───────────────────────

  private popCluster(cluster: Cell[], ox: number, oy: number): void {
    const n = cluster.length;
    const radius = BUBBLE_R * (2.5 + 0.28 * Math.min(n, 10)) * this.level.reveal.radius * this.hScale;
    const strength = this.level.reveal.strength;
    const sorted = cluster
      .map((c) => ({ c, x: cellX(GEOM, c.row, c.col), y: cellY(GEOM, c.row) }))
      .sort((a, b) => Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy));

    let sumX = 0;
    let sumY = 0;
    sorted.forEach(({ c, x, y }, i) => {
      const key = cellKey(c.row, c.col);
      const sprite = this.sprites.get(key);
      const color = this.grid.get(c.row, c.col);
      this.grid.set(c.row, c.col, EMPTY);
      this.sprites.delete(key);
      sumX += x;
      sumY += y;
      const delay = i * 45;
      // Chaque boule détruite dissipe une zone bien plus large qu'elle-même.
      this.fog.reveal(x, y, radius, strength, delay + 50);
      if (sprite) {
        this.pendingFx++;
        this.time.delayedCall(delay, () => {
          this.pendingFx--;
          this.burst(sprite, color, i);
        });
      }
    });

    const gained = n * SCORE_POP + (n - MIN_MATCH) * n * 5;
    this.score += gained;
    this.popup(sumX / n, sumY / n, `+${gained}`, n >= 6 ? 54 : 42);
    sfx.combo(n);
    this.time.delayedCall(90, () => sfx.mist());
    if (n >= 6) this.cameras.main.shake(140, 0.0035);

    const floating = this.grid.findFloating();
    if (floating.length) this.detach(floating, n * 45 + 60);
  }

  private detach(cells: Cell[], delay: number): void {
    const list: Array<{ sprite: Image; color: number }> = [];
    let sumX = 0;
    let sumY = 0;
    for (const c of cells) {
      const key = cellKey(c.row, c.col);
      const sprite = this.sprites.get(key);
      const color = this.grid.get(c.row, c.col);
      this.grid.set(c.row, c.col, EMPTY);
      this.sprites.delete(key);
      sumX += cellX(GEOM, c.row, c.col);
      sumY += cellY(GEOM, c.row);
      if (sprite) list.push({ sprite, color });
    }
    const gained = cells.length * SCORE_DROP + (cells.length >= 4 ? cells.length * 10 : 0);
    this.score += gained;

    this.pendingFx++;
    this.time.delayedCall(delay, () => {
      this.pendingFx--;
      sfx.drop(list.length);
      this.popup(sumX / cells.length, sumY / cells.length + 30, `+${gained}`, 46, '#ffe27a');
      for (const { sprite, color } of list) {
        this.tweens.killTweensOf(sprite);
        sprite.setDepth(DEPTH.falling);
        this.fallers.push({
          sprite,
          color,
          vx: Phaser.Math.FloatBetween(-150, 150),
          vy: Phaser.Math.FloatBetween(-320, -90),
          spin: Phaser.Math.FloatBetween(-5, 5),
          carve: 0,
        });
      }
    });
  }

  private updateFallers(dt: number): void {
    const s = dt / 1000;
    const minX = GEOM.left + GEOM.r;
    const maxX = GEOM.left + GEOM.width - GEOM.r;
    const rMul = this.level.reveal.radius * this.hScale;
    for (let i = this.fallers.length - 1; i >= 0; i--) {
      const f = this.fallers[i];
      const sp = f.sprite;
      f.vy += GRAVITY * s;
      const dx = f.vx * s;
      const dy = f.vy * s;
      sp.x += dx;
      sp.y += dy;
      sp.rotation += f.spin * s;
      if (sp.x < minX) {
        sp.x = minX;
        f.vx = Math.abs(f.vx) * 0.6;
      } else if (sp.x > maxX) {
        sp.x = maxX;
        f.vx = -Math.abs(f.vx) * 0.6;
      }
      // En tombant, les boules percent le brouillard jusqu'en bas de la photo.
      f.carve += Math.abs(dx) + Math.abs(dy);
      if (f.carve > 96) {
        f.carve = 0;
        this.fog.addBlob(sp.x, sp.y, BUBBLE_R * 2.5 * rMul, 0.5 * this.level.reveal.strength, 420);
      }
      if (sp.y > this.viewH - 36) {
        this.fog.addBlob(sp.x, this.viewH - 60, BUBBLE_R * 3.8 * rMul, 0.95 * this.level.reveal.strength, 700);
        this.burst(sp, f.color, 2 + (i % 5), true);
        this.fallers[i] = this.fallers[this.fallers.length - 1];
        this.fallers.pop();
      }
    }
  }

  /** Explosion d'une boule : éclats, étincelles, onde, bouffée de brume. */
  private burst(sprite: Image, color: number, index: number, quiet = false): void {
    const { x, y } = sprite;
    const tint = BUBBLE_COLORS[color].tint;
    if (!quiet) sfx.pop(index);
    this.sparks.setParticleTint(tint);
    this.sparks.explode(9, x, y);
    this.shards.setParticleTint(tint);
    this.shards.explode(4, x, y);
    this.mist.explode(3, x, y);

    const ring = this.ringPool.pop() ?? this.add.image(0, 0, 'fx-ring').setDepth(DEPTH.fx).setBlendMode('ADD');
    ring.setPosition(x, y).setTint(tint).setScale(0.3).setAlpha(0.9).setVisible(true);
    this.tweens.add({
      targets: ring,
      scale: 1.25,
      alpha: 0,
      duration: 340,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        ring.setVisible(false);
        this.ringPool.push(ring);
      },
    });

    this.tweens.killTweensOf(sprite);
    this.tweens.add({
      targets: sprite,
      scale: this.bScale * 1.4,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => this.recycle(sprite),
    });
  }

  private popup(x: number, y: number, text: string, size: number, color = '#ffffff'): void {
    const label = this.add
      .text(Phaser.Math.Clamp(x, 80, DESIGN_W - 80), y, text, {
        fontFamily: '"Fredoka Variable", system-ui, sans-serif',
        fontStyle: '700',
        fontSize: `${size}px`,
        color,
        stroke: '#2a1466',
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.popup)
      .setResolution(view.scale)
      .setScale(0.4);
    this.tweens.add({ targets: label, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: label,
      y: y - 80,
      alpha: 0,
      duration: 650,
      delay: 380,
      ease: 'Quad.easeIn',
      onComplete: () => label.destroy(),
    });
  }

  private afterShot(): void {
    // Les couleurs disparues du plateau ne sont plus proposées.
    const present = this.grid.colorsPresent();
    if (present.length) {
      let changed = false;
      if (!present.includes(this.current)) {
        this.current = this.pickColor();
        changed = true;
      }
      if (!present.includes(this.next)) {
        this.next = this.pickColor();
        changed = true;
      }
      if (changed) this.refreshLoader(true);
    }
    this.traceDirty = true;
    this.emitHud();

    if (this.grid.count() === 0) {
      this.win();
      return;
    }
    this.state = this.shots > 0 ? 'aiming' : 'settling';
  }

  // ─────────────────────────── Victoire / défaite ───────────────────────────

  private win(): void {
    if (this.state === 'won' || this.state === 'lost') return;
    this.state = 'won';
    this.aiming = false;
    this.guide.clear();

    // Les boules restantes éclatent en cascade.
    const rest = this.grid.occupied().sort((a, b) => b.row - a.row || a.col - b.col);
    const step = rest.length ? Math.min(30, 900 / rest.length) : 0;
    rest.forEach((c, i) => {
      const key = cellKey(c.row, c.col);
      const sprite = this.sprites.get(key);
      const color = this.grid.get(c.row, c.col);
      this.grid.set(c.row, c.col, EMPTY);
      this.sprites.delete(key);
      if (sprite) this.time.delayedCall(200 + i * step, () => this.burst(sprite, color, i % 11, i % 3 !== 0));
    });
    this.score += rest.length * SCORE_POP;
    const bonus = this.shots * SCORE_SHOT_LEFT;
    this.score += bonus;

    // Dissipation totale : la photographie entière se dévoile.
    this.fog.clearAll(this.cannonX, this.viewH * 0.4);
    sfx.mist();
    sfx.win();
    this.time.addEvent({
      delay: 260,
      repeat: 4,
      callback: () => {
        this.confetti.explode(26, Phaser.Math.Between(120, DESIGN_W - 120), this.viewH * 0.62);
      },
    });

    const ratio = this.shots / this.level.shots;
    const stars = ratio >= 0.35 ? 3 : ratio >= 0.12 ? 2 : 1;
    recordResult(this.level.id, this.levelIndex, this.score, stars);
    this.emitHud();
    this.time.delayedCall(2300, () => bus.emit('win', this.result(stars)));
  }

  private lose(reason: 'shots' | 'line'): void {
    if (this.state === 'won' || this.state === 'lost') return;
    this.state = 'lost';
    this.aiming = false;
    this.guide.clear();
    sfx.lose();
    this.cameras.main.shake(220, 0.004);
    this.sprites.forEach((s) => s.setTint(0x9a94c4));
    this.emitHud();
    this.time.delayedCall(1100, () => bus.emit('lose', { ...this.result(0), reason }));
  }

  private result(stars: number) {
    return {
      levelIndex: this.levelIndex,
      levelNumber: this.level.number,
      title: this.level.title,
      score: this.score,
      stars,
      percent: this.percent(),
      shotsLeft: this.shots,
      hasNext: this.levelIndex < LEVELS.length - 1,
    };
  }

  private percent(): number {
    return Math.min(100, Math.floor(this.fog.fraction * 100 + 0.0001));
  }

  private emitHud(): void {
    bus.emit('hud', {
      levelNumber: this.level.number,
      title: this.level.title,
      score: this.score,
      shots: this.shots,
      percent: this.percent(),
      target: this.level.objective.revealPercent,
    });
  }

  // ───────────────────────────── Boucle de jeu ─────────────────────────────

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) * debugSpeed;
    this.fog.update(dt);
    if (this.flight) this.updateFlight(dt);
    if (this.fallers.length) this.updateFallers(dt);
    this.updateSkip(dt);

    const percent = this.percent();
    if (percent !== this.lastPercent) {
      this.lastPercent = percent;
      this.emitHud();
    }

    if (this.state === 'aiming' || this.state === 'settling') {
      if (this.fog.fraction * 100 >= this.level.objective.revealPercent) {
        this.win();
      } else if (this.state === 'settling' && this.fog.idle && !this.fallers.length && this.pendingFx === 0) {
        // Dernier tir joué et plus rien en mouvement : objectif manqué.
        this.lose('shots');
      }
    }

    this.drawGuide();
  }

  private drawGuide(): void {
    const g = this.guide;
    g.clear();
    if (this.state !== 'aiming' || !this.guideVisible) return;
    if (this.traceDirty || !this.trace) {
      this.trace = this.traceAt(this.aimAngle);
      this.traceDirty = false;
    }
    const pts = this.trace.points;
    const tint = BUBBLE_COLORS[this.current].tint;
    const spacing = 30;
    let carry = (this.time.now * 0.07) % spacing;
    let travelled = 0;
    let dots = 0;
    for (let i = 0; i < pts.length - 1 && dots < 150; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.001) continue;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      let d = carry;
      while (d < len && dots < 150) {
        if (travelled + d > MUZZLE_DIST + 14) {
          const alpha = Math.max(0.3, 0.95 - dots * 0.008);
          g.fillStyle(0xffffff, alpha);
          g.fillCircle(a.x + ux * d, a.y + uy * d, 5.2);
          g.fillStyle(tint, alpha);
          g.fillCircle(a.x + ux * d, a.y + uy * d, 3.2);
          dots++;
        }
        d += spacing;
      }
      carry = d - len;
      travelled += len;
    }
    // Emplacement exact où la boule va se fixer.
    const cell = this.trace.cell;
    if (cell) {
      const x = cellX(GEOM, cell.row, cell.col);
      const y = cellY(GEOM, cell.row);
      g.fillStyle(tint, 0.22);
      g.fillCircle(x, y, BUBBLE_R - 3);
      g.lineStyle(3, 0xffffff, 0.85);
      g.strokeCircle(x, y, BUBBLE_R - 3);
    }
  }

  // ─────────────────────────────── Utilitaires ───────────────────────────────

  private takeBubble(color: number, x: number, y: number): Image {
    const sprite = this.pool.pop() ?? this.add.image(0, 0, bubbleKey(color));
    sprite
      .setTexture(bubbleKey(color))
      .setPosition(x, y)
      .setScale(this.bScale)
      .setAlpha(1)
      .setRotation(0)
      .clearTint()
      .setVisible(true)
      .setDepth(DEPTH.bubbles);
    return sprite;
  }

  private recycle(sprite: Image): void {
    this.tweens.killTweensOf(sprite);
    sprite.setVisible(false);
    this.pool.push(sprite);
  }

  /**
   * Outil de test (développement) : joue automatiquement le meilleur tir
   * disponible. Permet de vérifier rapidement une partie complète.
   */
  debugAutoShot(): boolean {
    if (this.state !== 'aiming') return false;
    let best = -Math.PI / 2;
    let bestScore = -1;
    for (let deg = MIN_AIM_DEG + 1; deg < 180 - MIN_AIM_DEG; deg += 1) {
      const angle = -Phaser.Math.DegToRad(deg);
      const t = this.traceAt(angle);
      if (!t.cell) continue;
      this.grid.set(t.cell.row, t.cell.col, this.current);
      const size = this.grid.findCluster(t.cell.row, t.cell.col).length;
      this.grid.set(t.cell.row, t.cell.col, EMPTY);
      const value = (size >= MIN_MATCH ? size * 10 : size) - t.cell.row * 0.1 + Math.random() * 0.5;
      if (value > bestScore) {
        bestScore = value;
        best = angle;
      }
    }
    this.aimAngle = best;
    this.barrel.rotation = best + Math.PI / 2;
    this.fire();
    return true;
  }

  /** Outil de test : accélère le jeu pour dérouler vite des parties entières. */
  debugSetSpeed(speed: number): void {
    debugSpeed = speed;
    this.time.timeScale = speed;
    this.tweens.timeScale = speed;
  }

  /** État résumé pour les tests automatisés. */
  debugState() {
    return {
      level: this.level.number,
      state: this.state,
      score: this.score,
      shots: this.shots,
      percent: this.percent(),
      bubbles: this.grid.count(),
      fallers: this.fallers.length,
      fps: Math.round(this.game.loop.actualFps),
    };
  }
}
