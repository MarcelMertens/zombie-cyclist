import type { ITrainer, TrainerData } from './ITrainer';
import { SimulatedTrainer } from './SimulatedTrainer';
import { DemoTrainer } from './DemoTrainer';
import { BluetoothTrainer } from './BluetoothTrainer';

export type TrainerMode = 'keyboard' | 'demo' | 'bluetooth';

export class TrainerManager {
  private trainer: ITrainer;
  private mode: TrainerMode;

  constructor(mode: TrainerMode) {
    this.mode = mode;
    this.trainer = this.create(mode);
  }

  private create(mode: TrainerMode): ITrainer {
    switch (mode) {
      case 'keyboard': return new SimulatedTrainer();
      case 'demo': return new DemoTrainer();
      case 'bluetooth': return new BluetoothTrainer();
    }
  }

  getMode(): TrainerMode { return this.mode; }

  getSimulated(): SimulatedTrainer | null {
    return this.trainer instanceof SimulatedTrainer ? this.trainer : null;
  }

  getBluetooth(): BluetoothTrainer | null {
    return this.trainer instanceof BluetoothTrainer ? this.trainer : null;
  }

  update(dt: number): void {
    this.trainer.update(dt);
  }

  getCurrentData(): TrainerData {
    return this.trainer.getCurrentData();
  }

  dispose(): void {
    this.trainer.dispose();
  }
}
