import { GameState } from './GameState';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SPEED_CONFIG, PLAYER_X } from './config';
import { HighscoreBoard } from './scoring';
import { loadConfig, resolveConfig, ConfigScreen } from '../ui/ConfigScreen';
import { TrainerManager, type TrainerMode } from '../trainer/TrainerManager';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { BackgroundScroller } from '../systems/BackgroundScroller';
import { EscalationEngine } from '../systems/EscalationEngine';
import { ZombieSpawner } from '../systems/ZombieSpawner';
import { rectsOverlap } from '../systems/CollisionSystem';
import { HUD } from '../ui/HUD';
import { MainMenu, type MenuAction } from '../ui/MainMenu';
import { HighscoreBoardUI } from '../ui/HighscoreBoard';
import { GameOverScreen } from '../ui/GameOver';

const COUNTDOWN_SECONDS = 10;
const DEATH_ANIM_MS = 4500;

type DeathCause = 'caught' | 'timeout';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState = GameState.MENU;
  private lastTime = 0;

  private mainMenu = new MainMenu();
  private configScreen = new ConfigScreen();
  private highscoreUI: HighscoreBoardUI;
  private gameOverScreen = new GameOverScreen();
  private hud = new HUD();
  private hsBoard = new HighscoreBoard();

  private trainer: TrainerManager | null = null;
  private player: Player | null = null;
  private zombies: Zombie[] = [];
  private bg = new BackgroundScroller();
  private escalation: EscalationEngine | null = null;
  private spawner: ZombieSpawner | null = null;

  private wattHistory: number[] = [];
  private maxWatt = 0;
  private demoRestartTimer = 0;
  private countdownSec = COUNTDOWN_SECONDS;

  /** Counts down from DEATH_ANIM_MS after game over. Score screen shows only when this reaches 0. */
  private deathAnimMs = 0;
  private deathCause: DeathCause = 'caught';

  private zombieDistPx = 9999;
  private dangerIntensity = 0;
  private contactTimeMs = 0;

  private static readonly ZOMBIE_MIN_X = -600;
  private static readonly MIN_ZOMBIE_GAP = 130;
  private static readonly DANGER_DIST_START = 220;
  private static readonly DANGER_DIST_FULL = 60;

  private jumping = false;
  private prevHighscoresState: GameState = GameState.MENU;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.highscoreUI = new HighscoreBoardUI(this.hsBoard);
    this.bindInput();
  }

  start(): void {
    requestAnimationFrame(this.loop.bind(this));
  }

  isNameInputActive(): boolean {
    return this.state === GameState.GAMEOVER
      && this.deathAnimMs === 0
      && !this.gameOverScreen.isSubmitted();
  }

  private loop(timestamp: number): void {
    const dt = Math.min(timestamp - this.lastTime, 100);
    this.lastTime = timestamp;

    // Tick death animation timer outside the normal update path
    if (this.state === GameState.GAMEOVER && this.deathAnimMs > 0) {
      this.deathAnimMs = Math.max(0, this.deathAnimMs - dt);
    }

    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private bindInput(): void {
    window.addEventListener('keydown', e => this.onKeyDown(e));
    window.addEventListener('keyup', e => this.onKeyUp(e));
    this.canvas.addEventListener('click', e => this.onClick(e));
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.configScreen.handleMouseUp());
  }

  private canvasPos(e: MouseEvent): { mx: number; my: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      mx: (e.clientX - r.left) * (CANVAS_WIDTH / r.width),
      my: (e.clientY - r.top) * (CANVAS_HEIGHT / r.height),
    };
  }

  private onClick(e: MouseEvent): void {
    const { mx, my } = this.canvasPos(e);
    if (this.state === GameState.MENU) {
      const action = this.mainMenu.handleClick(mx, my);
      if (action) this.handleMenuAction(action);
    } else if (this.state === GameState.CONFIG) {
      const action = this.configScreen.handleClick(mx, my);
      if (action === 'back' || action === 'save') this.setState(GameState.MENU);
    } else if (this.state === GameState.HIGHSCORES) {
      const action = this.highscoreUI.handleClick(mx, my);
      if (action === 'close') this.setState(this.prevHighscoresState);
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.state !== GameState.CONFIG) return;
    const { mx, my } = this.canvasPos(e);
    this.configScreen.handleMouseDown(mx, my);
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.state !== GameState.CONFIG) return;
    const { mx } = this.canvasPos(e);
    this.configScreen.handleMouseMove(mx);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.state === GameState.PLAYING || this.state === GameState.DEMO) {
      if (e.code === 'Space') { e.preventDefault(); this.jumping = true; }
      if (e.key === 'Escape') this.setState(GameState.MENU);
    }
    if (this.state === GameState.GAMEOVER && this.deathAnimMs === 0) {
      const action = this.gameOverScreen.handleKey(e.key);
      if (action === 'retry') this.startGame(this.trainer?.getMode() ?? 'keyboard');
      if (action === 'menu') this.setState(GameState.MENU);
      if (action === 'submit') this.submitScore();
    }
    if (this.state === GameState.MENU && e.key === 'Enter') this.handleMenuAction('play');
    if (this.state === GameState.DEMO && e.key === 'Enter') this.startGame('keyboard');
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') this.jumping = false;
  }

  // ── State ──────────────────────────────────────────────────────────────────

  private setState(s: GameState): void {
    this.state = s;
    if (s === GameState.MENU) {
      this.trainer?.dispose();
      this.trainer = null;
    }
  }

  private handleMenuAction(action: MenuAction): void {
    if (action === 'play') this.startGame('keyboard');
    else if (action === 'demo') this.startGame('demo');
    else if (action === 'config') this.setState(GameState.CONFIG);
    else if (action === 'highscores') {
      this.prevHighscoresState = GameState.MENU;
      this.highscoreUI.setNewEntry(null, null);
      this.setState(GameState.HIGHSCORES);
    } else if (action === 'bluetooth') this.connectBluetooth();
  }

  private connectError = '';

  private async connectBluetooth(): Promise<void> {
    this.connectError = '';
    this.setState(GameState.CONNECTING);
    try {
      const tm = new TrainerManager('bluetooth');
      await tm.getBluetooth()!.connect(() => {
        if (this.state === GameState.PLAYING) alert('Trainer disconnected! Reconnect and press OK.');
      });
      this.startGameWithTrainer(tm);
    } catch (err) {
      this.connectError = err instanceof Error ? err.message : String(err);
      console.error('[BT] Connection failed:', err);
      this.setState(GameState.MENU);
    }
  }

  private startGame(mode: TrainerMode): void {
    this.trainer?.dispose();
    this.startGameWithTrainer(new TrainerManager(mode));
  }

  private startGameWithTrainer(tm: TrainerManager): void {
    this.trainer = tm;
    const cfg = resolveConfig(loadConfig());

    this.player = new Player();
    this.zombies = [];
    this.wattHistory = [];
    this.maxWatt = 0;
    this.demoRestartTimer = 0;
    this.deathAnimMs = 0;
    this.countdownSec = COUNTDOWN_SECONDS;
    this.zombieDistPx = 9999;
    this.dangerIntensity = 0;
    this.contactTimeMs = 0;
    this.bg = new BackgroundScroller();
    this.escalation = new EscalationEngine(cfg);
    this.spawner = new ZombieSpawner(cfg);
    this.gameOverScreen.reset();

    this.setState(tm.getMode() === 'demo' ? GameState.DEMO : GameState.PLAYING);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  private update(dt: number): void {
    if (this.state !== GameState.PLAYING && this.state !== GameState.DEMO) return;

    const { trainer, player, escalation, spawner } = this;
    if (!trainer || !player || !escalation || !spawner) return;

    trainer.update(dt);
    const data = trainer.getCurrentData();
    const cfg = resolveConfig(loadConfig());
    const worldSpeed = SPEED_CONFIG.curve(data.watt, cfg.maxWattReference);

    this.wattHistory.push(data.watt);
    if (data.watt > this.maxWatt) this.maxWatt = data.watt;

    this.bg.update(worldSpeed, dt);
    player.update(dt, this.jumping);
    this.jumping = false;

    // Countdown: animate freely, no zombies yet
    if (this.countdownSec > 0) {
      this.countdownSec = Math.max(0, this.countdownSec - dt / 1000);
      if (this.countdownSec === 0) this.spawnInitialZombies();
      return;
    }

    escalation.update(dt);

    const newZombies = spawner.update(dt, escalation.elapsed, escalation.getSpawnCount(), this.zombies);
    this.zombies.push(...newZombies);

    const zombieSpeed = escalation.getZombieSpeed();
    const elapsed = escalation.elapsed;
    for (const z of this.zombies) {
      const variation = z.speedAmp * Math.sin(elapsed * z.speedFreq + z.speedPhase);
      z.x += (zombieSpeed * z.speedMultiplier + variation) - worldSpeed;
      if (z.x < Game.ZOMBIE_MIN_X) z.x = Game.ZOMBIE_MIN_X;
      z.tick();
    }

    // Enforce minimum horizontal gap — prevents stacking when pushed to the left edge
    const byXDesc = [...this.zombies].sort((a, b) => b.x - a.x);
    for (let i = 1; i < byXDesc.length; i++) {
      const cap = byXDesc[i - 1].x - Game.MIN_ZOMBIE_GAP;
      if (byXDesc[i].x > cap) byXDesc[i].x = cap;
    }

    // If any zombie has fully passed the player → immediate game over (no grace period)
    for (const z of this.zombies) {
      if (z.rect.x > player.rect.x + player.rect.w) {
        this.triggerGameOver('caught');
        return;
      }
    }

    // Contact (overlap): 3-second grace period so player can sprint away
    let hasContact = false;
    for (const z of this.zombies) {
      if (rectsOverlap(player.rect, z.rect)) { hasContact = true; break; }
    }
    if (hasContact) {
      this.contactTimeMs += dt;
      if (this.contactTimeMs >= 3000) {
        this.triggerGameOver('caught');
        return;
      }
    } else {
      this.contactTimeMs = 0;
    }

    this.zombies = this.zombies.filter(z => z.x > -CANVAS_WIDTH && z.x < CANVAS_WIDTH + 200);
    if (this.zombies.length > 50) this.zombies = this.zombies.slice(0, 50);

    // Distance: hitbox right-edge of zombie → hitbox left-edge of player (= 0 at actual contact)
    let minGap = Infinity;
    for (const z of this.zombies) {
      const gap = player.rect.x - (z.rect.x + z.rect.w);
      if (gap < minGap) minGap = gap;
    }
    this.zombieDistPx = isFinite(minGap) ? Math.max(0, minGap) : 9999;

    if (hasContact) {
      this.dangerIntensity = 1;
    } else if (this.zombieDistPx < Game.DANGER_DIST_START) {
      const frac = (Game.DANGER_DIST_START - this.zombieDistPx) / (Game.DANGER_DIST_START - Game.DANGER_DIST_FULL);
      this.dangerIntensity = Math.min(1, Math.max(0, frac));
    } else {
      this.dangerIntensity = Math.max(0, this.dangerIntensity - dt / 400);
    }

    if (escalation.isGameOver()) this.triggerGameOver('timeout');
  }

  private spawnInitialZombies(): void {
    const z = new Zombie('standard', -80);
    z.yOffset = 70;
    this.zombies.push(z);
  }

  private triggerGameOver(cause: DeathCause): void {
    this.deathCause = cause;
    // Demo mode: short animation, then auto-restart
    this.deathAnimMs = this.trainer?.getMode() === 'demo' ? 2000 : DEATH_ANIM_MS;
    this.setState(GameState.GAMEOVER);
    this.gameOverScreen.reset();
    this.demoRestartTimer = 0;
  }

  private submitScore(): void {
    const { escalation, wattHistory, maxWatt, trainer } = this;
    if (!escalation || !trainer) return;
    const avgWatt = wattHistory.length
      ? wattHistory.reduce((a, b) => a + b, 0) / wattHistory.length
      : 0;
    const playerX = this.player?.x ?? PLAYER_X;
    const closestZombie = this.zombies.reduce((min, z) => Math.min(min, playerX - z.x), Infinity);
    const mode = trainer.getMode() === 'bluetooth' ? 'trainer' : trainer.getMode() as 'keyboard' | 'demo';
    const rank = this.hsBoard.addEntry({
      name: this.gameOverScreen.getName(),
      survivalSeconds: escalation.elapsed,
      maxWatt,
      avgWatt,
      difficulty: loadConfig().difficulty,
      mode,
      timestamp: Date.now(),
      zombieDistance: Math.max(0, isFinite(closestZombie) ? closestZombie : 9999),
    });
    this.gameOverScreen.setRank(rank);
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  private draw(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.state === GameState.MENU) {
      this.mainMenu.draw(ctx);
      if (this.connectError) this.drawConnectError(this.connectError);
      return;
    }
    if (this.state === GameState.CONFIG) { this.configScreen.draw(ctx); return; }
    if (this.state === GameState.HIGHSCORES) { this.highscoreUI.draw(ctx); return; }
    if (this.state === GameState.CONNECTING) { this.drawConnecting(); return; }

    if (this.state === GameState.PLAYING || this.state === GameState.DEMO) {
      this.drawGame();
      return;
    }

    if (this.state === GameState.GAMEOVER) {
      this.drawGame(true);

      if (this.deathAnimMs > 0) {
        this.drawDeathAnim();
        return; // score screen appears only after animation
      }

      // Score screen
      const { escalation, wattHistory, maxWatt } = this;
      if (!escalation) return;
      const avgWatt = wattHistory.length
        ? wattHistory.reduce((a, b) => a + b, 0) / wattHistory.length
        : 0;
      const isDemo = this.trainer?.getMode() === 'demo';
      this.gameOverScreen.draw(ctx, escalation.elapsed, maxWatt, avgWatt, resolveConfig(loadConfig()), isDemo);

      if (isDemo) {
        this.demoRestartTimer += 16;
        if (this.demoRestartTimer > 5000) this.startGame('demo');
      }
    }
  }

  private drawGame(frozen = false): void {
    const { ctx, player, escalation } = this;
    if (!player || !escalation) return;

    const diffCfg = resolveConfig(loadConfig());
    const gameFraction = Math.min(escalation.elapsed / diffCfg.gameDurationSeconds, 1);

    this.bg.draw(ctx, gameFraction);
    player.draw(ctx);

    // Draw back-to-front by yOffset (lower offset = further back in scene)
    const leader = this.zombies.reduce<Zombie | null>((best, z) => !best || z.x > best.x ? z : best, null);
    const sorted = [...this.zombies].sort((a, b) => a.yOffset - b.yOffset);
    for (const z of sorted) {
      const wobble = z === leader && this.dangerIntensity > 0
        ? Math.sin(escalation.elapsed * 5) * 8 * this.dangerIntensity
        : 0;
      z.draw(ctx, z.x + wobble);
    }

    if (!frozen) {
      if (this.dangerIntensity > 0) this.drawDangerEffects(this.dangerIntensity, escalation.elapsed);

      const trainerData = this.trainer?.getCurrentData() ?? { watt: 0, speed: 0, cadence: 0 };
      this.hud.draw(
        ctx,
        trainerData.watt,
        escalation.elapsed,
        diffCfg.maxWattReference,
        diffCfg,
        this.trainer?.getMode() === 'demo',
        this.zombieDistPx,
      );

      if (this.countdownSec > 0) this.drawCountdown(this.countdownSec);
      if (this.trainer?.getMode() === 'keyboard') this.drawWattSlider(trainerData.watt, diffCfg.maxWattReference);
      if (this.trainer?.getMode() === 'bluetooth') this.drawBluetoothSource();
    }
  }

  private drawDangerEffects(intensity: number, elapsed: number): void {
    const { ctx } = this;

    // Pulsing red vignette around screen edges
    const pulse = (Math.sin(elapsed * 11) + 1) / 2;
    const grad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.25,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.85,
    );
    const edgeAlpha = intensity * (0.25 + pulse * 0.3);
    grad.addColorStop(0, 'rgba(200,0,0,0)');
    grad.addColorStop(1, `rgba(200,0,0,${edgeAlpha.toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // "Schneller!!" text — appears only at 0 m (actual hitbox contact)
    if (this.contactTimeMs > 0) {
      const textPulse = (Math.sin(elapsed * 8) + 1) / 2;
      const textAlpha = 0.75 + textPulse * 0.25;
      const fontSize = Math.round(76 + textPulse * 14);

      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText('Schneller!!', CANVAS_WIDTH / 2, 200);
      ctx.restore();
    }
  }

  private drawDeathAnim(): void {
    const { ctx } = this;
    const t = this.deathAnimMs / DEATH_ANIM_MS; // 1 → 0

    // Red pulse: fast at first, slows down
    const freq = 4 + t * 6; // 10 → 4 oscillations/cycle as it slows
    const pulse = (Math.sin(t * Math.PI * freq) + 1) / 2;
    const alpha = pulse * Math.min(t * 4, 1) * 0.65; // ramps in quickly, steady, then fades
    ctx.fillStyle = `rgba(220, 20, 20, ${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // "CAUGHT!" / "TIME'S UP!" text — fades in during first 0.6s, stays visible
    const textAlpha = Math.min(1, (1 - t) * (DEATH_ANIM_MS / 600));
    ctx.save();
    ctx.globalAlpha = Math.min(1, textAlpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 88px monospace';
    const headline = this.deathCause === 'caught' ? 'CAUGHT!' : "TIME'S UP!";
    ctx.fillText(headline, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffcccc';
    ctx.font = '26px monospace';
    const sub = this.deathCause === 'caught'
      ? 'The zombie horde got you...'
      : 'The zombies became unstoppable.';
    ctx.fillText(sub, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

    ctx.restore();
  }

  private drawCountdown(remaining: number): void {
    const { ctx } = this;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const secs = Math.ceil(remaining);

    ctx.save();
    const pulse = 1 + Math.sin(remaining * Math.PI * 2) * 0.05;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, 90 * pulse, 0, Math.PI * 2);
    ctx.fill();

    const fraction = remaining / COUNTDOWN_SECONDS;
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 80, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${secs === 1 ? 90 : 72}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(secs), cx, cy);

    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('ZOMBIES INCOMING', cx, cy + 70);
    ctx.restore();
  }

  private drawWattSlider(currentWatt: number, maxRef: number): void {
    const { ctx } = this;
    const x = CANVAS_WIDTH - 200;
    const y = CANVAS_HEIGHT - 60;
    const w = 160;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 8, y - 30, w + 16, 50);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ Arrow keys = Watts', x + w / 2, y - 14);
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(x, y, w * Math.min(currentWatt / maxRef, 1), 10);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.round(currentWatt)} W`, x + w / 2, y + 25);
    ctx.restore();
  }

  private drawConnecting(): void {
    const { ctx } = this;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Connecting to trainer…', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.fillStyle = '#aaa';
    ctx.font = '18px monospace';
    ctx.fillText('Select your KICKR / Wahoo device in the browser dialog', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    ctx.fillText('(searches for FTMS and Cycling Power services)', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 48);
    ctx.fillStyle = '#666';
    ctx.fillText('Press Esc to cancel', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 84);
  }

  private drawConnectError(msg: string): void {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(200,0,0,0.85)';
    ctx.fillRect(60, CANVAS_HEIGHT - 80, CANVAS_WIDTH - 120, 60);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Bluetooth Fehler: ' + msg, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 58);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffcccc';
    ctx.fillText('Öffne die Browser-Konsole (F12) für Details', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 38);
    ctx.restore();
  }

  private drawBluetoothSource(): void {
    const bt = this.trainer?.getBluetooth();
    if (!bt || bt.source === 'none') return;
    const { ctx } = this;
    const label = bt.source === 'ftms' ? '📡 BT: FTMS Indoor Bike' : '📡 BT: Cycling Power';
    ctx.save();
    ctx.fillStyle = 'rgba(0,229,255,0.15)';
    ctx.fillRect(CANVAS_WIDTH - 260, 62, 250, 26);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '13px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, CANVAS_WIDTH - 10, 75);
    ctx.restore();
  }
}
