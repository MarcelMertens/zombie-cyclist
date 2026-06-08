import { Zombie } from '../entities/Zombie';
import type { ZombieType, DifficultyConfig } from '../game/DifficultyPreset';

const MAX_PER_TYPE = 1;

// Fixed depth lane per type — lower value = further back in scene
const TYPE_LANE: Record<ZombieType, number> = {
  standard:  70,
  runner:    83,
  cyclist:   97,
  mutant:   110,
};

export class ZombieSpawner {
  private timeSinceLastWave = 0;
  private cfg: DifficultyConfig;

  constructor(cfg: DifficultyConfig) {
    this.cfg = cfg;
  }

  update(dt: number, elapsedSeconds: number, spawnCount: number, existing: Zombie[]): Zombie[] {
    this.timeSinceLastWave += dt / 1000;
    if (this.timeSinceLastWave < this.cfg.waveIntervalSeconds) return [];
    this.timeSinceLastWave = 0;
    return this.spawnWave(elapsedSeconds, spawnCount, existing);
  }

  private spawnWave(elapsed: number, count: number, existing: Zombie[]): Zombie[] {
    const countByType = this.countByType(existing);
    const available = this.availableTypes(elapsed).filter(t => (countByType.get(t) ?? 0) < MAX_PER_TYPE);
    if (available.length === 0) return [];

    const spawned: Zombie[] = [];
    for (let i = 0; i < count; i++) {
      const typeCount = this.countByType([...existing, ...spawned]);
      const eligible = available.filter(t => (typeCount.get(t) ?? 0) < MAX_PER_TYPE);
      if (eligible.length === 0) break;
      const type = eligible[Math.floor(Math.random() * eligible.length)];
      const x = -(80 + i * 220 + Math.random() * 60);
      const z = new Zombie(type, x);
      z.yOffset = TYPE_LANE[type];
      spawned.push(z);
    }
    return spawned;
  }

  private countByType(zombies: Zombie[]): Map<ZombieType, number> {
    const m = new Map<ZombieType, number>();
    for (const z of zombies) m.set(z.type, (m.get(z.type) ?? 0) + 1);
    return m;
  }

  private availableTypes(elapsed: number): ZombieType[] {
    const unlocks = this.cfg.zombieTypeUnlockSeconds;
    return (Object.keys(unlocks) as ZombieType[]).filter(t => elapsed >= unlocks[t]);
  }

  reset(): void {
    this.timeSinceLastWave = 0;
  }
}
