import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';
import { PRESETS, type Difficulty, type DifficultyConfig } from '../game/DifficultyPreset';

const STORAGE_KEY = 'zombieCyclist.config';

export interface GameConfig {
  difficulty: Difficulty;
  custom: Partial<DifficultyConfig>;
}

export function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { difficulty: 'medium', custom: {} };
}

export function saveConfig(cfg: GameConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function resolveConfig(cfg: GameConfig): DifficultyConfig {
  return { ...PRESETS[cfg.difficulty], ...cfg.custom };
}

type ConfigAction = 'back' | 'save' | 'delete_scores' | null;

interface Slider {
  key: keyof DifficultyConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const SLIDERS: Slider[] = [
  { key: 'maxWattReference', label: 'Reference Watt', min: 100, max: 600, step: 10, format: v => `${v} W` },
  { key: 'zombieStartDistancePx', label: 'Zombie Start Distance', min: 100, max: 800, step: 10, format: v => `${v} px` },
  { key: 'escalationExponent', label: 'Escalation Curve', min: 0.5, max: 3.0, step: 0.1, format: v => v.toFixed(1) },
  { key: 'gameDurationSeconds', label: 'Max Duration', min: 120, max: 360, step: 10, format: v => `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')} min` },
];

export class ConfigScreen {
  private cfg: GameConfig;
  private expanded = false;
  private dragging: Slider | null = null;
  private deleteClickMs = 0;

  constructor() {
    this.cfg = loadConfig();
  }

  getConfig(): GameConfig { return this.cfg; }

  handleClick(mx: number, my: number): ConfigAction {
    const cx = CANVAS_WIDTH / 2;

    // Preset buttons
    const presets: Difficulty[] = ['easy', 'medium', 'hard', 'brutal'];
    const bw = 130, bh = 48, gap = 16;
    const totalW = presets.length * bw + (presets.length - 1) * gap;
    const bx0 = cx - totalW / 2;
    const by = 230;
    for (let i = 0; i < presets.length; i++) {
      const bx = bx0 + i * (bw + gap);
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        this.cfg.difficulty = presets[i];
        this.cfg.custom = {};
        this.deleteClickMs = 0;
        return null;
      }
    }

    // Expand toggle
    if (mx >= cx - 100 && mx <= cx + 100 && my >= 310 && my <= 340) {
      this.expanded = !this.expanded;
      this.deleteClickMs = 0;
      return null;
    }

    // Delete Highscores button (two-click confirm)
    const delX = cx - 110, delY = CANVAS_HEIGHT - 70, delW = 220, delH = 40;
    if (mx >= delX && mx <= delX + delW && my >= delY && my <= delY + delH) {
      const isPending = this.deleteClickMs > 0 && Date.now() - this.deleteClickMs < 3000;
      if (isPending) {
        this.deleteClickMs = 0;
        return 'delete_scores';
      }
      this.deleteClickMs = Date.now();
      return null;
    }

    // Any other click resets the delete confirm state
    this.deleteClickMs = 0;

    // Back
    if (mx >= 40 && mx <= 160 && my >= CANVAS_HEIGHT - 70 && my <= CANVAS_HEIGHT - 30) return 'back';
    // Save
    if (mx >= CANVAS_WIDTH - 180 && mx <= CANVAS_WIDTH - 40 && my >= CANVAS_HEIGHT - 70 && my <= CANVAS_HEIGHT - 30) {
      saveConfig(this.cfg);
      return 'save';
    }

    return null;
  }

  handleMouseDown(mx: number, my: number): void {
    if (!this.expanded) return;
    SLIDERS.forEach((s, i) => {
      const { trackX, trackY, trackW } = this.sliderLayout(i);
      if (my >= trackY - 10 && my <= trackY + 20) {
        this.dragging = s;
        this.updateSlider(s, mx, trackX, trackW);
      }
    });
  }

  handleMouseMove(mx: number): void {
    if (!this.dragging || !this.expanded) return;
    const i = SLIDERS.indexOf(this.dragging);
    const { trackX, trackW } = this.sliderLayout(i);
    this.updateSlider(this.dragging, mx, trackX, trackW);
  }

  handleMouseUp(): void {
    this.dragging = null;
  }

  private updateSlider(s: Slider, mx: number, trackX: number, trackW: number): void {
    const t = Math.max(0, Math.min(1, (mx - trackX) / trackW));
    const val = Math.round((s.min + t * (s.max - s.min)) / s.step) * s.step;
    (this.cfg.custom as Record<string, number>)[s.key as string] = val;
  }

  private sliderLayout(i: number) {
    const trackX = CANVAS_WIDTH / 2 - 160;
    const trackW = 320;
    const trackY = 380 + i * 60;
    return { trackX, trackW, trackY };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = CANVAS_WIDTH / 2;
    const resolved = resolveConfig(this.cfg);

    ctx.save();
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SETTINGS', cx, 80);

    // Preset buttons
    const presets: Difficulty[] = ['easy', 'medium', 'hard', 'brutal'];
    const bw = 130, bh = 48, gap = 16;
    const totalW = presets.length * bw + (presets.length - 1) * gap;
    const bx0 = cx - totalW / 2;
    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      const preset = PRESETS[p];
      const bx = bx0 + i * (bw + gap);
      const selected = this.cfg.difficulty === p && Object.keys(this.cfg.custom).length === 0;
      ctx.fillStyle = selected ? '#00e5ff' : 'rgba(0,229,255,0.1)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(bx, 230, bw, bh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = selected ? '#000' : '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${preset.emoji} ${preset.label}`, bx + bw / 2, 230 + bh / 2 + 1);
    }

    // Custom label
    if (Object.keys(this.cfg.custom).length > 0) {
      ctx.fillStyle = '#ffeb3b';
      ctx.font = '14px monospace';
      ctx.fillText('Custom', cx, 295);
    }

    // Expand toggle
    ctx.fillStyle = '#00e5ff';
    ctx.font = '15px monospace';
    ctx.fillText(`${this.expanded ? '▲' : '▼'} Advanced Settings`, cx, 330);

    if (this.expanded) {
      SLIDERS.forEach((s, i) => {
        const { trackX, trackW, trackY } = this.sliderLayout(i);
        const val = (resolved[s.key] as number);
        const t = (val - s.min) / (s.max - s.min);

        ctx.fillStyle = '#aaa';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(s.label + ':', trackX, trackY - 10);

        ctx.fillStyle = '#333';
        ctx.fillRect(trackX, trackY, trackW, 8);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(trackX, trackY, trackW * t, 8);

        // Thumb
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(trackX + trackW * t, trackY + 4, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(s.format(val), trackX + trackW + 80, trackY + 4);
      });
    }

    // Buttons
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';

    // ← Back
    ctx.fillStyle = 'rgba(255,82,82,0.15)';
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(40, CANVAS_HEIGHT - 70, 120, 40, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5252';
    ctx.fillText('← Back', 100, CANVAS_HEIGHT - 44);

    // 🗑 Delete Highscores (center, two-click confirm)
    const isPending = this.deleteClickMs > 0 && Date.now() - this.deleteClickMs < 3000;
    ctx.fillStyle = isPending ? 'rgba(255,152,0,0.25)' : 'rgba(255,82,82,0.08)';
    ctx.strokeStyle = isPending ? '#ff9800' : '#ff5252';
    ctx.lineWidth = isPending ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(cx - 110, CANVAS_HEIGHT - 70, 220, 40, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = isPending ? '#ff9800' : '#ff5252';
    ctx.font = isPending ? 'bold 15px monospace' : '15px monospace';
    ctx.fillText(
      isPending ? '⚠ Wirklich? Nochmal klicken' : '🗑 Delete Highscores',
      cx, CANVAS_HEIGHT - 44,
    );

    // ✓ Save
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = 'rgba(0,229,255,0.15)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(CANVAS_WIDTH - 180, CANVAS_HEIGHT - 70, 140, 40, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('✓ Save', CANVAS_WIDTH - 110, CANVAS_HEIGHT - 44);

    ctx.restore();
  }
}
