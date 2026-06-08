export const GameState = {
  MENU: 'MENU',
  DIFFICULTY_SELECT: 'DIFFICULTY_SELECT',
  DEMO: 'DEMO',
  CONFIG: 'CONFIG',
  CONNECTING: 'CONNECTING',
  RECONNECTING: 'RECONNECTING',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER',
  HIGHSCORES: 'HIGHSCORES',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];
