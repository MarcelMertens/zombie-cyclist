import type { ITrainer, TrainerData } from './ITrainer';
import { DataSmoother } from './DataSmoother';

export class SimulatedTrainer implements ITrainer {
  private targetWatt = 150;
  private smoother = new DataSmoother(5);
  private keysDown = new Set<string>();

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keysDown.add(e.key);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.key);
  }

  setTargetWatt(w: number): void {
    this.targetWatt = Math.max(0, Math.min(600, w));
  }

  getTargetWatt(): number {
    return this.targetWatt;
  }

  update(dt: number): void {
    const step = 30 * (dt / 1000);
    if (this.keysDown.has('ArrowUp')) this.targetWatt = Math.min(600, this.targetWatt + step);
    if (this.keysDown.has('ArrowDown')) this.targetWatt = Math.max(0, this.targetWatt - step);
  }

  getCurrentData(): TrainerData {
    const smoothed = this.smoother.push(this.targetWatt);
    return { watt: smoothed, speed: smoothed * 0.15, cadence: smoothed * 0.3 };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
