import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';

export type MenuAction = 'play' | 'demo' | 'config' | 'highscores' | 'bluetooth';

interface Button {
  label: string;
  action: MenuAction;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class MainMenu {
  private buttons: Button[] = [];
  private bluetoothAvailable = 'bluetooth' in navigator;

  constructor() {
    this.buildButtons();
  }

  private buildButtons(): void {
    const cx = CANVAS_WIDTH / 2;
    const bw = 280;
    const bh = 52;
    const gap = 14;
    const startY = CANVAS_HEIGHT / 2 - 10;

    const defs: { label: string; action: MenuAction }[] = [
      { label: '⌨️  Play (Keyboard)', action: 'play' },
      ...(this.bluetoothAvailable ? [{ label: '📡  Connect Trainer (BT)', action: 'bluetooth' as MenuAction }] : []),
      { label: '▶  Watch Demo', action: 'demo' },
      { label: '⚙️  Settings', action: 'config' },
      { label: '🏆  Highscores', action: 'highscores' },
    ];

    this.buttons = defs.map((d, i) => ({
      ...d,
      x: cx - bw / 2,
      y: startY + i * (bh + gap),
      w: bw,
      h: bh,
    }));
  }

  handleClick(mx: number, my: number): MenuAction | null {
    for (const btn of this.buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        return btn.action;
      }
    }
    return null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(1, '#0d1117');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20;
    ctx.fillText('ZOMBIE CYCLIST', CANVAS_WIDTH / 2, 120);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('RIDE OR DIE', CANVAS_WIDTH / 2, 165);

    // Subtitle
    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText('Pedal faster. Or they catch you.', CANVAS_WIDTH / 2, 200);

    // Buttons
    for (const btn of this.buttons) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
    }

    // Controls hint
    ctx.fillStyle = '#666';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys: adjust watts   |   Enter: play', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 24);

    ctx.restore();
  }
}
