import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';
import { PRESETS, type Difficulty } from '../game/DifficultyPreset';

export type DifficultyAction = Difficulty | 'back';

interface Btn {
  difficulty: Difficulty;
  x: number;
  y: number;
  w: number;
  h: number;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'brutal'];

const ACCENT_COLORS: Record<Difficulty, string> = {
  easy: '#4caf50',
  medium: '#ffc107',
  hard: '#ff5722',
  brutal: '#9c27b0',
};

const DESCRIPTIONS: Record<Difficulty, string> = {
  easy: '200 W reference · 800 px head start · ~3:20 min',
  medium: '300 W reference · 600 px head start · ~3:10 min',
  hard: '400 W reference · 500 px head start · ~3:00 min',
  brutal: '400 W reference · 400 px head start · ~1:30 min',
};

export class DifficultySelectScreen {
  private btns: Btn[] = [];
  private backBtn = { x: 0, y: 0, w: 130, h: 44 };

  constructor() {
    this.layout();
  }

  private layout(): void {
    const cx = CANVAS_WIDTH / 2;
    const bw = 360;
    const bh = 82;
    const gap = 16;
    const total = DIFFICULTIES.length * (bh + gap) - gap;
    const startY = CANVAS_HEIGHT / 2 - total / 2 + 20;

    this.btns = DIFFICULTIES.map((d, i) => ({
      difficulty: d,
      x: cx - bw / 2,
      y: startY + i * (bh + gap),
      w: bw,
      h: bh,
    }));

    this.backBtn = { x: 44, y: CANVAS_HEIGHT - 68, w: 130, h: 44 };
  }

  handleClick(mx: number, my: number): DifficultyAction | null {
    for (const btn of this.btns) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        return btn.difficulty;
      }
    }
    const b = this.backBtn;
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return 'back';
    return null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(1, '#0d1117');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 16;
    ctx.fillText('SELECT DIFFICULTY', CANVAS_WIDTH / 2, 90);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#888';
    ctx.font = '16px monospace';
    ctx.fillText('Choose your challenge level before the game starts', CANVAS_WIDTH / 2, 126);

    for (const btn of this.btns) {
      const preset = PRESETS[btn.difficulty];
      const accent = ACCENT_COLORS[btn.difficulty];

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${preset.emoji}  ${preset.label}`, btn.x + 20, btn.y + 33);

      ctx.fillStyle = '#aaa';
      ctx.font = '13px monospace';
      ctx.fillText(DESCRIPTIONS[btn.difficulty], btn.x + 20, btn.y + 60);
    }

    // Back button
    const b = this.backBtn;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('← Back', b.x + b.w / 2, b.y + b.h / 2 + 1);

    ctx.restore();
  }
}
