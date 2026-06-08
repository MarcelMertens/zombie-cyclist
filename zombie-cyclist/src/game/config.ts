export const SPEED_CONFIG = {
  MIN_SPEED: 1,
  MAX_SPEED: 12,
  MAX_WATT: 400,
  SMOOTHING_FRAMES: 5,
  curve(watt: number, maxWattRef: number): number {
    const clamped = Math.min(watt, maxWattRef);
    return Math.sqrt(clamped / maxWattRef) * (SPEED_CONFIG.MAX_SPEED - SPEED_CONFIG.MIN_SPEED) + SPEED_CONFIG.MIN_SPEED;
  },
};

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const PLAYER_X = Math.round(1280 * 2 / 3); // 2/3 of screen width
export const GROUND_Y = CANVAS_HEIGHT - 120;

