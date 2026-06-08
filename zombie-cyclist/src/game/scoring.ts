import type { Difficulty } from './DifficultyPreset';

export interface HighscoreEntry {
  rank: number;
  name: string;
  survivalSeconds: number;
  maxWatt: number;
  avgWatt: number;
  difficulty: Difficulty;
  mode: 'trainer' | 'demo' | 'keyboard';
  timestamp: number;
  zombieDistance: number;
}

const STORAGE_KEY = 'zombieCyclist.highscores';
const MAX_ENTRIES = 50;

export class HighscoreBoard {
  private entries: HighscoreEntry[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.entries = JSON.parse(raw);
    } catch {
      this.entries = [];
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
  }

  getTop(n: number, difficulty?: Difficulty): HighscoreEntry[] {
    let filtered = this.entries.filter(e => e.mode !== 'demo');
    if (difficulty) filtered = filtered.filter(e => e.difficulty === difficulty);
    return filtered
      .sort((a, b) => b.survivalSeconds - a.survivalSeconds)
      .slice(0, n)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  addEntry(entry: Omit<HighscoreEntry, 'rank'>): number | null {
    if (entry.mode === 'demo') return null;
    this.entries.push({ ...entry, rank: 0 });
    this.entries.sort((a, b) => b.survivalSeconds - a.survivalSeconds);
    if (this.entries.length > MAX_ENTRIES) this.entries = this.entries.slice(0, MAX_ENTRIES);
    this.save();
    const rank = this.entries.findIndex(
      e => e.timestamp === entry.timestamp && e.name === entry.name
    ) + 1;
    return rank > 0 ? rank : null;
  }

  wouldMakeTop10(seconds: number, difficulty: Difficulty): boolean {
    const top = this.getTop(10, difficulty);
    return top.length < 10 || seconds > (top[top.length - 1]?.survivalSeconds ?? 0);
  }

  clear(difficulty?: Difficulty): void {
    if (difficulty) {
      this.entries = this.entries.filter(e => e.difficulty !== difficulty);
    } else {
      this.entries = [];
    }
    this.save();
  }
}
