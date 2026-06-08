export type Difficulty = 'easy' | 'medium' | 'hard' | 'brutal';
export type ZombieType = 'standard' | 'runner' | 'cyclist' | 'mutant';

export interface DifficultyConfig {
  label: string;
  emoji: string;
  gameDurationSeconds: number;
  escalationExponent: number;
  zombieStartDistancePx: number;
  waveIntervalSeconds: number;
  maxWattReference: number;
  /** Zombie starting speed = player speed at this watt output. */
  zombieStartWatt: number;
  zombieTypeUnlockSeconds: Record<ZombieType, number>;
}

// Calibration: zombie starts at player speed (zombieStartWatt = referenceWatt).
// gameDurationSeconds and escalationExponent are chosen so that a rider maintaining
// exactly the reference watt closes the initial ~760 px gap at t ≈ 60 s.
//   Gap formula: (endSpeed - startSpeed) * gameDurationSeconds/(exp+1) * (60/T)^(exp+1) * 60 ≈ 760
export const PRESETS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    emoji: '🟢',
    gameDurationSeconds: 200,
    escalationExponent: 2.0,
    zombieStartDistancePx: 800,
    waveIntervalSeconds: 40,
    maxWattReference: 200,
    zombieStartWatt: 100,
    zombieTypeUnlockSeconds: { standard: 0, runner: 30, cyclist: 60, mutant: 90 },
  },
  medium: {
    label: 'Medium',
    emoji: '🟡',
    gameDurationSeconds: 190,
    escalationExponent: 2.0,
    zombieStartDistancePx: 600,
    waveIntervalSeconds: 35,
    maxWattReference: 300,
    zombieStartWatt: 200,
    zombieTypeUnlockSeconds: { standard: 0, runner: 25, cyclist: 50, mutant: 75 },
  },
  hard: {
    label: 'Hard',
    emoji: '🔴',
    gameDurationSeconds: 180,
    escalationExponent: 2.0,
    zombieStartDistancePx: 500,
    waveIntervalSeconds: 30,
    maxWattReference: 400,
    zombieStartWatt: 300,
    zombieTypeUnlockSeconds: { standard: 0, runner: 20, cyclist: 45, mutant: 70 },
  },
  brutal: {
    label: 'Brutal',
    emoji: '💀',
    gameDurationSeconds: 90,
    escalationExponent: 4.0,
    zombieStartDistancePx: 400,
    waveIntervalSeconds: 25,
    maxWattReference: 400,
    zombieStartWatt: 300,
    zombieTypeUnlockSeconds: { standard: 0, runner: 20, cyclist: 40, mutant: 55 },
  },
};
