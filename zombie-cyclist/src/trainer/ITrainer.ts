export interface TrainerData {
  watt: number;
  speed: number; // km/h
  cadence: number; // rpm
}

export interface ITrainer {
  getCurrentData(): TrainerData;
  update(dt: number): void;
  dispose(): void;
}
