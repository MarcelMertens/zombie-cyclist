export const GameState = {
  MENU: 'MENU',
  DEMO: 'DEMO',
  CONFIG: 'CONFIG',
  CONNECTING: 'CONNECTING',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER',
  HIGHSCORES: 'HIGHSCORES',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];
