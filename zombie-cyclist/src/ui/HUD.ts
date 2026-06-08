import { CANVAS_WIDTH, PLAYER_X } from '../game/config';
import type { DifficultyConfig } from '../game/DifficultyPreset';

// Hitbox-edge gap when a standard zombie enters screen at x=0 → ~20 m
// player.rect.x ≈ PLAYER_X + 14, zombie right hitbox ≈ 187px → gap ≈ PLAYER_X - 173
const M_PER_PX = 20 / (PLAYER_X - 173);

export class HUD {
  draw(
    ctx: CanvasRenderingContext2D,
    watt: number,
    elapsedSeconds: number,
    maxWattRef: number,
    difficulty: DifficultyConfig,
    isDemo: boolean,
    zombieDistPx: number,
  ): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 56);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🚴 ${Math.round(watt)} W`, 12, 18);

    const mins = Math.floor(elapsedSeconds / 60);
    const secs = Math.floor(elapsedSeconds % 60);
    ctx.fillText(`⏱ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`, 150, 18);

    // Power bar
    const barX = 12, barY = 34, barW = 240, barH = 14;
    const fill = Math.min(watt / maxWattRef, 1);
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    const barColor = fill > 0.8 ? '#00e5ff' : fill > 0.5 ? '#69f0ae' : fill > 0.25 ? '#ffeb3b' : '#ff5252';
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * fill, barH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(`${difficulty.emoji} ${difficulty.label}`, 270, 42);

    // Zombie distance display (right-aligned)
    if (zombieDistPx < 9999) {
      const distM = Math.round(zombieDistPx * M_PER_PX);
      const distColor = distM < 5 ? '#ff5252' : distM < 10 ? '#ffeb3b' : '#69f0ae';
      ctx.fillStyle = distColor;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`💀 ${distM} m`, CANVAS_WIDTH - 12, 18);
      ctx.textAlign = 'left';
    }

    if (isDemo) {
      ctx.fillStyle = 'rgba(255,152,0,0.85)';
      ctx.fillRect(CANVAS_WIDTH / 2 - 220, 0, 440, 56);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🎮 DEMO MODE — Press [ENTER] to play with trainer', CANVAS_WIDTH / 2, 28);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }
}
