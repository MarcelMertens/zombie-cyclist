import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';
import { HighscoreBoard as HSBoard } from '../game/scoring';
import type { Difficulty } from '../game/DifficultyPreset';
import { PRESETS } from '../game/DifficultyPreset';

type Tab = Difficulty | 'all';

export class HighscoreBoardUI {
  private board: HSBoard;
  private tab: Tab = 'all';
  private newTimestamp: number | null = null;

  constructor(board: HSBoard) {
    this.board = board;
  }

  setNewEntry(_rank: number | null, timestamp: number | null): void {
    this.newTimestamp = timestamp;
  }

  handleClick(mx: number, my: number): 'close' | null {
    // Tab clicks
    const tabs: Tab[] = ['easy', 'medium', 'hard', 'brutal', 'all'];
    const tabW = 160, tabH = 36, tabY = 110;
    const totalW = tabs.length * tabW + (tabs.length - 1) * 8;
    const tabX0 = CANVAS_WIDTH / 2 - totalW / 2;
    for (let i = 0; i < tabs.length; i++) {
      const tx = tabX0 + i * (tabW + 8);
      if (mx >= tx && mx <= tx + tabW && my >= tabY && my <= tabY + tabH) {
        this.tab = tabs[i];
        return null;
      }
    }
    // Close
    if (mx >= CANVAS_WIDTH - 140 && mx <= CANVAS_WIDTH - 40 && my >= CANVAS_HEIGHT - 70 && my <= CANVAS_HEIGHT - 30) {
      return 'close';
    }
    return null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = CANVAS_WIDTH / 2;
    ctx.save();

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#ffd600';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 HIGHSCORES', cx, 80);

    // Tabs
    const tabs: Tab[] = ['easy', 'medium', 'hard', 'brutal', 'all'];
    const tabW = 160, tabH = 36, tabY = 110;
    const totalW = tabs.length * tabW + (tabs.length - 1) * 8;
    const tabX0 = cx - totalW / 2;
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const tx = tabX0 + i * (tabW + 8);
      const selected = this.tab === t;
      ctx.fillStyle = selected ? '#ffd600' : 'rgba(255,214,0,0.1)';
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(tx, tabY, tabW, tabH, 6);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = selected ? '#000' : '#fff';
      ctx.font = '15px monospace';
      ctx.textAlign = 'center';
      const label = t === 'all' ? 'All' : `${PRESETS[t].emoji} ${PRESETS[t].label}`;
      ctx.fillText(label, tx + tabW / 2, tabY + tabH / 2 + 1);
    }

    // Table header
    const rowY0 = 165;
    const rowH = 36;
    const COL = { rank: 30, name: 68, time: 240, avg: 345, max: 448, best60s: 555, diff: 668, date: 870 };
    ctx.fillStyle = '#555';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('#', COL.rank, rowY0);
    ctx.fillText('Name', COL.name, rowY0);
    ctx.fillText('Time', COL.time, rowY0);
    ctx.fillText('Avg W', COL.avg, rowY0);
    ctx.fillText('Max W', COL.max, rowY0);
    ctx.fillText('Best 60s W', COL.best60s, rowY0);
    ctx.fillText('Difficulty', COL.diff, rowY0);
    ctx.fillText('Date', COL.date, rowY0);

    // Entries
    const entries = this.tab === 'all'
      ? this.board.getTop(10)
      : this.board.getTop(10, this.tab);

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const ry = rowY0 + (i + 1) * rowH;
      const isNew = this.newTimestamp !== null && e.timestamp === this.newTimestamp;

      if (isNew) {
        ctx.fillStyle = 'rgba(255, 214, 0, 0.15)';
        ctx.fillRect(20, ry - 24, CANVAS_WIDTH - 40, rowH);
      }

      ctx.fillStyle = isNew ? '#ffd600' : '#ddd';
      ctx.font = isNew ? 'bold 15px monospace' : '15px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${e.rank}`, COL.rank, ry);
      ctx.fillText(e.name, COL.name, ry);
      const mins = Math.floor(e.survivalSeconds / 60);
      const secs = Math.floor(e.survivalSeconds % 60);
      ctx.fillText(`${mins}:${String(secs).padStart(2,'0')}`, COL.time, ry);
      ctx.fillText(`${Math.round(e.avgWatt)} W`, COL.avg, ry);
      ctx.fillText(`${Math.round(e.maxWatt)} W`, COL.max, ry);
      const b60 = (e as { best60sWatt?: number }).best60sWatt;
      ctx.fillStyle = isNew ? '#ffd600' : '#00e5ff';
      ctx.fillText(b60 ? `${Math.round(b60)} W` : '—', COL.best60s, ry);
      ctx.fillStyle = isNew ? '#ffd600' : '#ddd';
      ctx.fillText(`${PRESETS[e.difficulty].emoji} ${PRESETS[e.difficulty].label}`, COL.diff, ry);
      const d = new Date(e.timestamp);
      ctx.fillText(d.toLocaleDateString(), COL.date, ry);
    }

    if (entries.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No scores yet — go ride!', cx, 300);
    }

    // Close button
    ctx.fillStyle = 'rgba(255,82,82,0.15)';
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(CANVAS_WIDTH - 140, CANVAS_HEIGHT - 70, 100, 40, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Close', CANVAS_WIDTH - 90, CANVAS_HEIGHT - 44);

    ctx.restore();
  }
}
