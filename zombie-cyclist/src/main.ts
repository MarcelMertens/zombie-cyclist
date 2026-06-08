import { Game } from './game/Game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/config';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const game = new Game(canvas);
game.start();

// ── Fullscreen ────────────────────────────────────────────────────────────────

const fsBtn = document.getElementById('fullscreenBtn') as HTMLButtonElement;

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function updateFsButton(): void {
  fsBtn.innerHTML = document.fullscreenElement
    ? '&#x26F6; Beenden'
    : '&#x26F6; Vollbild';
}

fsBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFsButton);

document.addEventListener('keydown', (e) => {
  if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !game.isNameInputActive()) {
    e.preventDefault();
    toggleFullscreen();
  }
});
