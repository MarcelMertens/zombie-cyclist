import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';
import type { DifficultyConfig } from '../game/DifficultyPreset';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class GameOverScreen {
  private nameChars = ['A', 'A', 'A'];
  private cursor = 0;
  private submitted = false;
  private rank: number | null = null;

  reset(): void {
    this.nameChars = ['A', 'A', 'A'];
    this.cursor = 0;
    this.submitted = false;
    this.rank = null;
  }

  setRank(rank: number | null): void {
    this.rank = rank;
  }

  isSubmitted(): boolean { return this.submitted; }
  getName(): string { return this.nameChars.join(''); }

  handleKey(key: string): 'retry' | 'menu' | 'submit' | null {
    if (this.submitted) {
      if (key === 'Enter' || key === 'r') return 'retry';
      if (key === 'm') return 'menu';
      return null;
    }
    if (key === 'ArrowLeft') { this.cursor = Math.max(0, this.cursor - 1); return null; }
    if (key === 'ArrowRight') { this.cursor = Math.min(2, this.cursor + 1); return null; }
    if (key === 'ArrowUp') {
      const i = CHARS.indexOf(this.nameChars[this.cursor]);
      this.nameChars[this.cursor] = CHARS[(i + 1) % CHARS.length];
      return null;
    }
    if (key === 'ArrowDown') {
      const i = CHARS.indexOf(this.nameChars[this.cursor]);
      this.nameChars[this.cursor] = CHARS[(i - 1 + CHARS.length) % CHARS.length];
      return null;
    }
    if (key === 'Enter') {
      this.submitted = true;
      return 'submit';
    }
    // Letter shortcut
    const upper = key.toUpperCase();
    if (CHARS.includes(upper)) {
      this.nameChars[this.cursor] = upper;
      this.cursor = Math.min(2, this.cursor + 1);
    }
    return null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    survivalSeconds: number,
    maxWatt: number,
    avgWatt: number,
    difficulty: DifficultyConfig,
    isDemo: boolean,
  ): void {
    const cx = CANVAS_WIDTH / 2;
    ctx.save();

    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff5252';
    ctx.shadowBlur = 30;
    ctx.fillText('GAME OVER', cx, 160);
    ctx.shadowBlur = 0;

    // Stats
    const mins = Math.floor(survivalSeconds / 60);
    const secs = Math.floor(survivalSeconds % 60);
    ctx.fillStyle = '#fff';
    ctx.font = '22px monospace';
    ctx.fillText(`Survived: ${mins}:${String(secs).padStart(2,'0')}`, cx, 230);
    ctx.fillText(`Avg Power: ${Math.round(avgWatt)} W   Max: ${Math.round(maxWatt)} W`, cx, 265);
    ctx.fillText(`Difficulty: ${difficulty.emoji} ${difficulty.label}`, cx, 300);

    if (isDemo) {
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('DEMO — score not saved', cx, 340);
      ctx.fillStyle = '#aaa';
      ctx.font = '18px monospace';
      ctx.fillText('Restarting in a moment...', cx, 380);
      ctx.restore();
      return;
    }

    if (!this.submitted) {
      ctx.fillStyle = '#ffd600';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('Enter your name:', cx, 360);

      // Name entry
      const charW = 60, charH = 70, charGap = 16;
      const totalW = 3 * charW + 2 * charGap;
      const nx = cx - totalW / 2;
      for (let i = 0; i < 3; i++) {
        const bx = nx + i * (charW + charGap);
        ctx.fillStyle = this.cursor === i ? '#ffd600' : 'rgba(255,214,0,0.2)';
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = this.cursor === i ? 3 : 1;
        ctx.beginPath();
        ctx.roundRect(bx, 380, charW, charH, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(this.nameChars[i], bx + charW / 2, 380 + charH / 2 + 2);
      }

      ctx.fillStyle = '#aaa';
      ctx.font = '14px monospace';
      ctx.fillText('↑↓ change   ←→ move   Enter to confirm', cx, 470);
    } else {
      ctx.fillStyle = '#69f0ae';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(
        this.rank ? `🏆 You ranked #${this.rank}!` : 'Score saved!',
        cx, 380
      );

      ctx.fillStyle = '#aaa';
      ctx.font = '18px monospace';
      ctx.fillText('[Enter / R] Play again   [M] Main menu', cx, 440);
    }

    ctx.restore();
  }
}
