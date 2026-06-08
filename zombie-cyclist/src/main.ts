import { Game } from './game/Game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/config';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const game = new Game(canvas);
game.start();
