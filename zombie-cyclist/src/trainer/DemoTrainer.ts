import type { ITrainer, TrainerData } from './ITrainer';
import { DataSmoother } from './DataSmoother';

export class DemoTrainer implements ITrainer {
  private t = 0;
  private smoother = new DataSmoother(5);

  private getRawWatt(): number {
    const base = 180 + Math.sin(this.t * 0.05) * 60;
    const sprint = Math.random() < 0.01 ? 80 : 0;
    const fatigue = Math.random() < 0.005 ? -100 : 0;
    return Math.max(80, base + sprint + fatigue);
  }

  update(dt: number): void {
    this.t += dt / 1000;
  }

  getCurrentData(): TrainerData {
    const raw = this.getRawWatt();
    const watt = this.smoother.push(raw);
    return { watt, speed: watt * 0.15, cadence: watt * 0.3 };
  }

  dispose(): void {}
}
