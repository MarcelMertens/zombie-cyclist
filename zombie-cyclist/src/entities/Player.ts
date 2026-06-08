import { GROUND_Y, PLAYER_X } from '../game/config';

const JUMP_VELOCITY = -14;
const GRAVITY = 0.6;
const FRAME_COUNT = 13;
const FRAME_W = 200; // source frame width in the spriteset
const FRAME_H = 200; // source frame height
const DISPLAY_W = 180;
const DISPLAY_H = 180;
// How many game ticks per animation frame (lower = faster pedalling animation)
const TICKS_PER_FRAME = 4;

let spriteSheet: HTMLImageElement | null = null;
let spriteRequested = false;

function initSprite(): void {
  if (spriteRequested) return;
  spriteRequested = true;
  const img = new Image();
  img.onload = () => { spriteSheet = img; };
  img.src = '/cyclist-spriteset.png';
}

export class Player {
  x = PLAYER_X;
  y = GROUND_Y;
  vy = 0;
  isGrounded = true;
  tick = 0;
  readonly W = DISPLAY_W;
  readonly H = DISPLAY_H;

  constructor() {
    initSprite();
  }

  update(_dt: number, jumping: boolean): void {
    if (jumping && this.isGrounded) {
      this.vy = JUMP_VELOCITY;
      this.isGrounded = false;
    }
    this.vy += GRAVITY;
    this.y += this.vy;
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.isGrounded = true;
    }
    this.tick++;
  }

  // Hitbox inset to avoid transparent borders
  get rect() {
    return {
      x: this.x + Math.round(this.W * 0.08),
      y: this.y - Math.round(this.H * 0.88),
      w: Math.round(this.W * 0.82),
      h: Math.round(this.H * 0.80),
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bob = Math.sin(this.tick * 0.14) * 2;
    const dx = Math.floor(this.x);
    const dy = Math.floor(this.y - this.H + Math.round(this.H * 0.05) + bob + 100);

    ctx.save();
    if (spriteSheet) {
      const frame = Math.floor(this.tick / TICKS_PER_FRAME) % FRAME_COUNT;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        spriteSheet,
        frame * FRAME_W, 0, FRAME_W, FRAME_H, // source rect
        dx, dy, this.W, this.H,               // dest rect
      );
    } else {
      // Fallback while loading
      ctx.fillStyle = '#fdd835';
      ctx.fillRect(dx + 20, dy + 30, this.W - 30, this.H - 50);
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(dx + 25, dy + this.H - 15, 14, 0, Math.PI * 2);
      ctx.arc(dx + this.W - 25, dy + this.H - 15, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
