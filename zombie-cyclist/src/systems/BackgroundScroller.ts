import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from '../game/config';

const CHURCH_W = 338;
const CHURCH_H = 406;
const CHURCH_CYCLE_MS = 60_000; // one traversal per minute

let churchImg: HTMLImageElement | null = null;
let churchImgRequested = false;

function loadChurchImg(): void {
  if (churchImgRequested) return;
  churchImgRequested = true;
  const img = new Image();
  img.onload = () => { churchImg = img; };
  img.src = '/kirche.png';
}

export class BackgroundScroller {
  private o = [0, 0, 0]; // layer offsets
  private churchMs = 0;  // ms elapsed within the current 60-s cycle

  // Deterministic scene elements
  private readonly clouds = makeCloud();
  private readonly mountains = makeMountains();
  private readonly trees = makeTrees();
  private readonly lampX = makeLamps();

  constructor() {
    loadChurchImg();
  }

  update(worldSpeed: number, dt: number): void {
    this.o[0] = (this.o[0] + worldSpeed * 0.12) % 2000;
    this.o[1] = (this.o[1] + worldSpeed * 0.40) % 2400;
    this.o[2] = (this.o[2] + worldSpeed * 1.00) % 320;
    this.churchMs = (this.churchMs + dt) % CHURCH_CYCLE_MS;
  }

  draw(ctx: CanvasRenderingContext2D, gameFraction: number): void {
    this.drawSky(ctx, gameFraction);
    this.drawSun(ctx, gameFraction);
    this.drawClouds(ctx);
    this.drawMountains(ctx);
    this.drawChurch(ctx);
    this.drawLake(ctx);
    this.drawForest(ctx);
    this.drawGrass(ctx);
    this.drawRoad(ctx);
    this.drawLamps(ctx);
  }

  private drawSky(ctx: CanvasRenderingContext2D, f: number): void {
    // Clear day → golden afternoon
    const topColor = lerpRgb([100, 180, 235], [255, 160, 60], f * 0.6);
    const botColor = lerpRgb([190, 230, 250], [255, 200, 120], f * 0.5);
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y - 60);
    g.addColorStop(0, rgb(topColor));
    g.addColorStop(1, rgb(botColor));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y - 60);
  }

  private drawSun(ctx: CanvasRenderingContext2D, f: number): void {
    const sx = CANVAS_WIDTH * 0.82;
    const sy = 55 + f * 55;
    ctx.save();
    // Soft glow
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90);
    glow.addColorStop(0, 'rgba(255,230,80,0.35)');
    glow.addColorStop(1, 'rgba(255,220,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, 90, 0, Math.PI * 2);
    ctx.fill();
    // Disk
    ctx.fillStyle = f < 0.5 ? '#ffe066' : '#ffaa00';
    ctx.beginPath();
    ctx.arc(sx, sy, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawClouds(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const c of this.clouds) {
      const x = wrap(c.x - this.o[0], 2000) - 200;
      if (x > CANVAS_WIDTH + 200) continue;
      drawCloud(ctx, x, c.y, c.w, c.h);
    }
    ctx.restore();
  }

  private drawMountains(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const m of this.mountains) {
      const x = wrap(m.x - this.o[0] * 0.6, 2000) - 60;
      if (x > CANVAS_WIDTH + 200 || x + m.w < -200) continue;
      // Two-tone hills
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y - 60);
      ctx.quadraticCurveTo(x + m.w * 0.5, GROUND_Y - 60 - m.h, x + m.w, GROUND_Y - 60);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      ctx.moveTo(x + m.w * 0.3, GROUND_Y - 60);
      ctx.quadraticCurveTo(x + m.w * 0.6, GROUND_Y - 60 - m.h * 0.6, x + m.w * 0.9, GROUND_Y - 60);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawChurch(ctx: CanvasRenderingContext2D): void {
    if (!churchImg) return;
    // Drifts from right to left over 60 seconds; invisible outside screen edges
    const progress = this.churchMs / CHURCH_CYCLE_MS;
    const x = Math.round(CANVAS_WIDTH - progress * (CANVAS_WIDTH + CHURCH_W));
    if (x > CANVAS_WIDTH || x + CHURCH_W < 0) return;
    const y = GROUND_Y - 62 - CHURCH_H + 60; // base rests on the grass strip
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(churchImg, x, y, CHURCH_W, CHURCH_H);
    ctx.restore();
  }

  private drawLake(ctx: CanvasRenderingContext2D): void {
    const lakeY = GROUND_Y - 80;
    const lakeH = 50;
    const g = ctx.createLinearGradient(0, lakeY, 0, lakeY + lakeH);
    g.addColorStop(0, '#64b5f6');
    g.addColorStop(1, '#1565c0');
    ctx.fillStyle = g;
    // Lake patches (between tree clusters)
    for (let i = 0; i < 5; i++) {
      const lx = wrap(i * 480 + 240 - this.o[1], 2400) - 100;
      if (lx > CANVAS_WIDTH + 100) continue;
      ctx.fillRect(lx, lakeY, 200, lakeH);
      // Shimmer
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.moveTo(lx + 20 + s * 50, lakeY + 14 + s * 12);
        ctx.lineTo(lx + 60 + s * 50, lakeY + 14 + s * 12);
        ctx.stroke();
      }
    }
  }

  private drawForest(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const t of this.trees) {
      const x = wrap(t.x - this.o[1], 2400) - 40;
      if (x > CANVAS_WIDTH + 60 || x < -60) continue;
      if (t.kind === 0) drawPine(ctx, x, GROUND_Y - 62, t.h);
      else drawRound(ctx, x, GROUND_Y - 62, t.h);
    }
    ctx.restore();
  }

  private drawGrass(ctx: CanvasRenderingContext2D): void {
    // Thick grass strip
    ctx.fillStyle = '#558b2f';
    ctx.fillRect(0, GROUND_Y - 62, CANVAS_WIDTH, 32);
    ctx.fillStyle = '#689f38';
    ctx.fillRect(0, GROUND_Y - 38, CANVAS_WIDTH, 14);
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(0, GROUND_Y - 28, CANVAS_WIDTH, 10);
    // Curb
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(0, GROUND_Y - 8, CANVAS_WIDTH, 8);
  }

  private drawRoad(ctx: CanvasRenderingContext2D): void {
    const roadH = CANVAS_HEIGHT - GROUND_Y;
    // Asphalt
    ctx.fillStyle = '#455a64';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, roadH);
    // Road top edge
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 5);

    // Center dashes (yellow)
    const dashW = 52, dashGap = 80, lineY = GROUND_Y + Math.floor(roadH / 2) - 3;
    const step = dashW + dashGap;
    const startX = -(this.o[2] % step);
    ctx.fillStyle = '#fdd835';
    for (let x = startX - step; x < CANVAS_WIDTH + step; x += step) {
      ctx.fillRect(Math.floor(x), lineY, dashW, 5);
    }

    // White edge lines
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(0, GROUND_Y + 3, CANVAS_WIDTH, 4);
    ctx.fillRect(0, CANVAS_HEIGHT - 14, CANVAS_WIDTH, 4);

    // Road texture (subtle dark patches)
    for (let i = 0; i < 8; i++) {
      const px = ((i * 173 - this.o[2] * 0.3) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.floor(px), GROUND_Y + 20, 80, 30);
    }
  }

  private drawLamps(ctx: CanvasRenderingContext2D): void {
    const cycleW = 320;
    for (const lx of this.lampX) {
      const x = wrap(lx - this.o[2], cycleW);
      // Draw at all positions that fall on screen
      for (let tile = -1; tile <= Math.ceil(CANVAS_WIDTH / cycleW) + 1; tile++) {
        const dx = x + tile * cycleW;
        if (dx < -80 || dx > CANVAS_WIDTH + 80) continue;
        drawLamp(ctx, dx, GROUND_Y);
      }
    }
  }
}

// ── Scene element generators ──────────────────────────────────────────────────

function makeCloud() {
  return [
    { x: 80,   y: 55,  w: 140, h: 60 },
    { x: 340,  y: 35,  w: 100, h: 45 },
    { x: 610,  y: 75,  w: 170, h: 70 },
    { x: 870,  y: 48,  w: 120, h: 50 },
    { x: 1100, y: 68,  w: 150, h: 62 },
    { x: 1350, y: 40,  w: 108, h: 44 },
    { x: 1620, y: 80,  w: 130, h: 55 },
    { x: 1850, y: 52,  w: 100, h: 42 },
  ];
}

function makeMountains() {
  return [
    { x: 0,    w: 420, h: 170 },
    { x: 370,  w: 380, h: 140 },
    { x: 690,  w: 450, h: 190 },
    { x: 1060, w: 370, h: 150 },
    { x: 1370, w: 430, h: 180 },
    { x: 1720, w: 390, h: 160 },
  ];
}

function makeTrees() {
  const result: { x: number; h: number; kind: number }[] = [];
  for (let i = 0; i < 60; i++) {
    const x = i * 42 + Math.abs(Math.sin(i * 2.7)) * 18;
    result.push({
      x: Math.floor(x),
      h: 55 + Math.abs(Math.sin(i * 1.7)) * 40,
      kind: i % 3 === 0 ? 1 : 0,
    });
  }
  return result;
}

function makeLamps(): number[] {
  // Single lamp position within the 320px cycle
  return [60];
}

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.93)';
  const cx = x + w / 2, cy = y + h * 0.55;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.42, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - w * 0.24, cy + h * 0.08, w * 0.26, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + w * 0.26, cy + h * 0.05, w * 0.28, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - w * 0.06, cy - h * 0.18, w * 0.30, h * 0.40, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(240,248,255,0.5)';
  ctx.beginPath(); ctx.ellipse(cx + w * 0.10, cy - h * 0.22, w * 0.18, h * 0.26, 0, 0, Math.PI * 2); ctx.fill();
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, baseY: number, h: number): void {
  const w = h * 0.50;
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(x - 3, baseY - h * 0.18, 7, h * 0.18);
  const shades = ['#1b5e20', '#2e7d32', '#388e3c'];
  for (let t = 0; t < 3; t++) {
    const ty = baseY - h * 0.18 - t * h * 0.31 - h * 0.22;
    const tw = w * (1 - t * 0.26);
    ctx.fillStyle = shades[t];
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.lineTo(x + tw / 2, ty + h * 0.36);
    ctx.lineTo(x - tw / 2, ty + h * 0.36);
    ctx.closePath();
    ctx.fill();
    // Highlight on top tier
    if (t === 2) {
      ctx.fillStyle = '#43a047';
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + tw * 0.22, ty + h * 0.18);
      ctx.lineTo(x - tw * 0.22, ty + h * 0.18);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRound(ctx: CanvasRenderingContext2D, x: number, baseY: number, h: number): void {
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x - 5, baseY - h * 0.32, 10, h * 0.32);
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath(); ctx.arc(x, baseY - h * 0.52, h * 0.46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#388e3c';
  ctx.beginPath(); ctx.arc(x + 5, baseY - h * 0.62, h * 0.30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4caf50';
  ctx.beginPath(); ctx.arc(x - 6, baseY - h * 0.66, h * 0.22, 0, Math.PI * 2); ctx.fill();
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, baseY: number): void {
  // Pole
  ctx.fillStyle = '#78909c';
  ctx.fillRect(x - 3, baseY - 95, 6, 95);
  // Arm curving outward
  ctx.strokeStyle = '#78909c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, baseY - 95);
  ctx.quadraticCurveTo(x + 20, baseY - 105, x + 38, baseY - 100);
  ctx.stroke();
  // Lamp housing
  ctx.fillStyle = '#546e7a';
  ctx.fillRect(x + 28, baseY - 108, 22, 14);
  ctx.fillStyle = '#37474f';
  ctx.fillRect(x + 26, baseY - 94, 26, 4);
  // Warm light bulb
  ctx.fillStyle = '#fff9c4';
  ctx.fillRect(x + 30, baseY - 106, 18, 9);
  // Glow cone downward
  const glow = ctx.createRadialGradient(x + 39, baseY - 96, 0, x + 39, baseY - 96, 55);
  glow.addColorStop(0, 'rgba(255,240,140,0.28)');
  glow.addColorStop(1, 'rgba(255,240,140,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x + 39, baseY - 96, 55, 0, Math.PI * 2);
  ctx.fill();
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function lerpRgb(a: number[], b: number[], t: number): number[] {
  const c = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * c, a[1] + (b[1] - a[1]) * c, a[2] + (b[2] - a[2]) * c];
}

function rgb(c: number[]): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}
