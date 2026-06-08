import { GROUND_Y } from '../game/config';

export type PowerUpType = 'gel' | 'barrier' | 'wind';

interface PowerUpDef {
  label: string;
  color: string;
  durationMs: number;
}

export const POWERUP_DEFS: Record<PowerUpType, PowerUpDef> = {
  gel:     { label: '⚡', color: '#ffd600', durationMs: 5000 },
  barrier: { label: '🚧', color: '#ff6d00', durationMs: 5000 },
  wind:    { label: '🌬️', color: '#40c4ff', durationMs: 10000 },
};

export class PowerUp {
  x: number;
  y = GROUND_Y - 30;
  collected = false;
  readonly W = 28;
  readonly H = 28;
  readonly type: PowerUpType;
  private bob = 0;

  constructor(type: PowerUpType, x: number) {
    this.type = type;
    this.x = x;
  }

  update(worldSpeed: number, dt: number): void {
    this.x -= worldSpeed;
    this.bob += dt * 0.004;
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.W, h: this.H };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.collected) return;
    const def = POWERUP_DEFS[this.type];
    const yOff = Math.sin(this.bob) * 4;
    ctx.save();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y + yOff, this.W, this.H, 6);
    ctx.fill();
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.label, this.x + this.W / 2, this.y + yOff + this.H / 2);
    ctx.restore();
  }
}

export interface ActiveEffect {
  type: PowerUpType;
  remainingMs: number;
}
