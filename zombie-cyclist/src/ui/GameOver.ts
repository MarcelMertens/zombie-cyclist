import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';
import type { DifficultyConfig } from '../game/DifficultyPreset';

const MAX_NAME_LENGTH = 16;

export class GameOverScreen {
  private name = '';
  private submitted = false;
  private rank: number | null = null;

  reset(): void {
    this.name = '';
    this.submitted = false;
    this.rank = null;
  }

  setRank(rank: number | null): void {
    this.rank = rank;
  }

  isSubmitted(): boolean { return this.submitted; }
  isEnteringName(): boolean { return !this.submitted; }
  getName(): string { return this.name.trim() || 'ANONYM'; }

  handleKey(key: string): 'retry' | 'menu' | 'submit' | null {
    if (this.submitted) {
      if (key === 'Enter' || key === 'r' || key === 'R') return 'retry';
      if (key === 'm' || key === 'M') return 'menu';
      return null;
    }

    if (key === 'Enter') {
      this.submitted = true;
      return 'submit';
    }

    if (key === 'Backspace') {
      this.name = this.name.slice(0, -1);
      return null;
    }

    if (key.length === 1 && this.name.length < MAX_NAME_LENGTH) {
      this.name += key;
    }

    return null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    survivalSeconds: number,
    maxWatt: number,
    avgWatt: number,
    best60sWatt: number,
    difficulty: DifficultyConfig,
    isDemo: boolean,
  ): void {
    const cx = CANVAS_WIDTH / 2;
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff5252';
    ctx.shadowBlur = 30;
    ctx.fillText('GAME OVER', cx, 160);
    ctx.shadowBlur = 0;

    const mins = Math.floor(survivalSeconds / 60);
    const secs = Math.floor(survivalSeconds % 60);
    ctx.fillStyle = '#fff';
    ctx.font = '22px monospace';
    ctx.fillText(`Survived: ${mins}:${String(secs).padStart(2, '0')}`, cx, 228);
    ctx.fillText(`Avg Power: ${Math.round(avgWatt)} W   Max: ${Math.round(maxWatt)} W`, cx, 260);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`Best 60s avg: ${best60sWatt > 0 ? Math.round(best60sWatt) + ' W' : '—'}`, cx, 292);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Difficulty: ${difficulty.emoji} ${difficulty.label}`, cx, 324);

    if (isDemo) {
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('DEMO — score not saved', cx, 364);
      ctx.fillStyle = '#aaa';
      ctx.font = '18px monospace';
      ctx.fillText('Restarting in a moment...', cx, 404);
      ctx.restore();
      return;
    }

    if (!this.submitted) {
      ctx.fillStyle = '#ffd600';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('Gib deinen Namen ein:', cx, 382);

      const fieldW = 440;
      const fieldH = 56;
      const fx = cx - fieldW / 2;
      const fy = 400;

      ctx.fillStyle = 'rgba(255,214,0,0.08)';
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(fx, fy, fieldW, fieldH, 8);
      ctx.fill();
      ctx.stroke();

      const cursorOn = Math.floor(Date.now() / 530) % 2 === 0;
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'left';

      if (this.name.length === 0) {
        ctx.fillStyle = 'rgba(255,214,0,0.28)';
        ctx.fillText('Dein Name...', fx + 14, fy + fieldH / 2 + 9);
        if (cursorOn) {
          ctx.fillStyle = 'rgba(255,214,0,0.6)';
          ctx.fillRect(fx + 14, fy + 10, 2, fieldH - 20);
        }
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillText(this.name, fx + 14, fy + fieldH / 2 + 9);
        if (cursorOn) {
          const tw = ctx.measureText(this.name).width;
          ctx.fillStyle = '#ffd600';
          ctx.fillRect(fx + 16 + tw, fy + 10, 2, fieldH - 20);
        }
      }

      ctx.fillStyle = this.name.length >= MAX_NAME_LENGTH ? '#ff5252' : '#555';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${this.name.length}/${MAX_NAME_LENGTH}`, fx + fieldW - 8, fy + fieldH - 5);

      ctx.fillStyle = '#777';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Tippe deinen Namen  ·  Backspace zum Löschen  ·  Enter bestätigt', cx, fy + fieldH + 22);
    } else {
      ctx.fillStyle = '#69f0ae';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(
        this.rank ? `🏆 Platz #${this.rank}!` : 'Score gespeichert!',
        cx, 390,
      );
      ctx.fillStyle = '#aaa';
      ctx.font = '18px monospace';
      ctx.fillText('[Enter / R] Nochmal   [M] Hauptmenü', cx, 440);
    }

    ctx.restore();
  }
}
