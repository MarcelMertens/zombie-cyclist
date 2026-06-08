import { GROUND_Y } from '../game/config';
import type { ZombieType } from '../game/DifficultyPreset';

const FRAME_W = 200;
const FRAME_H = 200;

const TYPE_SPEED_MULTIPLIER: Record<ZombieType, number> = {
  standard: 0.80,
  runner:   0.90,
  cyclist:  1.20,
  mutant:   1.45,
};

interface SpriteSpec {
  src: string;
  frameCount: number;
  displayW: number;
  displayH: number;
  ticksPerFrame: number;
}

// Mapping: zombie type → sprite sheet
// standard  = flag carrier (zombi5, slow walk)
// runner    = running zombie with helmet (zombi3)
// cyclist   = zombie on regular bike (zombi1)
// mutant    = zombie on fat-tire BMX (zombi2, fastest)
const SPRITE_SPECS: Record<ZombieType, SpriteSpec> = {
  standard: { src: '/zombi5-spriteset.png', frameCount: 12, displayW: 208, displayH: 208, ticksPerFrame: 7 },
  runner:   { src: '/zombi3-spriteset.png', frameCount:  9, displayW: 180, displayH: 180, ticksPerFrame: 4 },
  cyclist:  { src: '/zombi1-spriteset.png', frameCount:  6, displayW: 200, displayH: 200, ticksPerFrame: 5 },
  mutant:   { src: '/zombi2-spriteset.png', frameCount:  9, displayW: 210, displayH: 210, ticksPerFrame: 4 },
};

const spriteCache = new Map<ZombieType, HTMLCanvasElement | null>();
const spriteLoading = new Set<ZombieType>();

function isBackground(r: number, g: number, b: number): boolean {
  return r > 215 && g > 215 && b > 215;
}

function loadSprite(type: ZombieType): void {
  if (spriteLoading.has(type)) return;
  spriteLoading.add(type);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (isBackground(d[i], d[i + 1], d[i + 2])) d[i + 3] = 0;
    }
    ctx.putImageData(id, 0, 0);
    spriteCache.set(type, c);
  };
  img.src = SPRITE_SPECS[type].src;
}

// Preload all types at module init
(Object.keys(SPRITE_SPECS) as ZombieType[]).forEach(loadSprite);

export class Zombie {
  x: number;
  readonly y = GROUND_Y;
  type: ZombieType;
  animTick = 0;
  yOffset: number = 0;

  // Individual speed variation — each zombie drifts slightly around the horde baseline
  readonly speedMultiplier: number;
  readonly speedPhase: number;
  readonly speedFreq: number;  // rad/s
  readonly speedAmp: number;   // px/frame

  constructor(type: ZombieType, startX: number) {
    this.type = type;
    this.x = startX;
    this.speedMultiplier = TYPE_SPEED_MULTIPLIER[type];
    this.speedPhase = Math.random() * Math.PI * 2;
    this.speedFreq  = 0.12 + Math.random() * 0.18;  // period ~18–52 s
    this.speedAmp   = 0.06 + Math.random() * 0.04;  // max deviation ~15–25 px
  }

  tick(): void {
    this.animTick++;
  }

  private get spec(): SpriteSpec {
    return SPRITE_SPECS[this.type];
  }

  get rect() {
    const { displayW: W, displayH: H } = this.spec;
    return {
      x: this.x + Math.round(W * 0.1),
      y: this.y - H + Math.round(H * 0.05),
      w: Math.round(W * 0.8),
      h: Math.round(H * 0.85),
    };
  }

  draw(ctx: CanvasRenderingContext2D, xOverride?: number): void {
    const spec = this.spec;
    const sheet = spriteCache.get(this.type) ?? null;
    const frame = Math.floor(this.animTick / spec.ticksPerFrame) % spec.frameCount;
    const dx = Math.floor(xOverride ?? this.x);
    const dy = Math.floor(this.y - spec.displayH + this.yOffset);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (sheet) {
      ctx.drawImage(
        sheet,
        frame * FRAME_W, 0, FRAME_W, FRAME_H,
        dx, dy, spec.displayW, spec.displayH,
      );
    } else {
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(dx + 8, dy + 8, spec.displayW - 16, spec.displayH - 16);
    }
    ctx.restore();
  }
}
