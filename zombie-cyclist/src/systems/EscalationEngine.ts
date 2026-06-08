import { SPEED_CONFIG } from '../game/config';
import type { DifficultyConfig } from '../game/DifficultyPreset';

export class EscalationEngine {
  private elapsedSeconds = 0;
  private cfg: DifficultyConfig;

  // Zombie speed at t=end is this many px/frame above the player's absolute max.
  // At MAX_SPEED (12) + 4 = 16 px/frame the zombies are literally unbeatable.
  private static readonly ZOMBIE_END_SPEED = SPEED_CONFIG.MAX_SPEED + 4;

  constructor(cfg: DifficultyConfig) {
    this.cfg = cfg;
  }

  update(dt: number): void {
    this.elapsedSeconds += dt / 1000;
  }

  get elapsed(): number {
    return this.elapsedSeconds;
  }

  getZombieSpeed(): number {
    const { gameDurationSeconds, escalationExponent, maxWattReference, zombieStartWatt } = this.cfg;
    // Start at the speed equivalent to zombieStartWatt, ramp up to unbeatable by end.
    const startSpeed = SPEED_CONFIG.curve(zombieStartWatt, maxWattReference);
    const endSpeed = EscalationEngine.ZOMBIE_END_SPEED;
    const normalized = Math.min(this.elapsedSeconds / gameDurationSeconds, 1);
    return startSpeed + Math.pow(normalized, escalationExponent) * (endSpeed - startSpeed);
  }

  getSpawnCount(): number {
    return Math.floor(1 + this.elapsedSeconds / 45);
  }

  isGameOver(): boolean {
    return this.elapsedSeconds >= this.cfg.gameDurationSeconds;
  }

  reset(): void {
    this.elapsedSeconds = 0;
  }
}
