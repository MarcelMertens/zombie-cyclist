# CLAUDE.md — Zombie Cyclist: Ride or Die

## Projektübersicht

Ein browserbasiertes 2D-Sidescroller-Spiel, bei dem ein Radfahrer vor einer wachsenden Zombie-Horde flieht. Das Besondere: Die Spielgeschwindigkeit wird direkt über einen Smart Trainer (z. B. Wahoo KICKR Core) via Web Bluetooth oder ANT+ USB gesteuert. Je schneller der Spieler in die Pedale tritt, desto schneller flüchtet der Radfahrer. Nach 4–5 Minuten eskalieren die Zombies unweigerlich und überholen den Radfahrer — Game Over.

---

## Spielkonzept & Mechanics

### Kernidee
- **Genre**: Endless Sidescroller / Survival
- **Steuerung**: Smart Trainer (Geschwindigkeit/Leistung in Watt) → Spielergeschwindigkeit
- **Ziel**: So lange wie möglich überleben (Highscore in Sekunden)
- **Spielende**: Zwingend nach 4–5 Minuten (Zombies werden unbesiegbar schnell) ODER wenn Zombie den Radfahrer einholt
- **Modi**: Smart Trainer (Echtbetrieb) | Demo (automatische KI-Steuerung) | Config (Schwierigkeitseinstellungen)

### Spielmechaniken

#### Bewegung & Physik
- Der Radfahrer scrollt horizontal durch eine endlose Welt
- **Spielergeschwindigkeit** = direkt proportional zur aktuellen Trittfrequenz/Leistung vom Trainer
  - Minimale Geschwindigkeit bei 0 W (Radfahrer verlangsamt, Zombies holen auf)
  - Optimale Geschwindigkeit bei ~150–250 W (je nach Einstellung)
  - Maximale Kapselung: Sehr hohe Wattzahlen bringen keinen linearen Vorteil mehr (Kurve abflachen)
- **Terrain**: Leichte Hügel (Uphills verlangsamen leicht, Downhills beschleunigen kurz) — rein visuell, da Trainer die Echtzahlen liefert
- **Hindernisse**: Schlaglöcher, umgestürzte Autos, Barrikaden → Ausweichen durch Springen (Leertaste oder Tastendruck)

#### Zombie-System
- Zombies starten mit niedriger Grundgeschwindigkeit (sichtbar hinter dem Radfahrer)
- **Zombie-Beschleunigung über Zeit** (Kurve, keine lineare Steigerung):
  - 0–60 s: Zombies locker hinter ihm, keine Bedrohung
  - 60–120 s: Zombies holen langsam auf bei niedriger Leistung
  - 120–180 s: Deutlicher Druck, 200 W nötig um Abstand zu halten
  - 180–240 s: Kritische Phase — nur Hochleistung rettet
  - 240–300 s: Zombies werden uneinholbar schnell → unvermeidbares Game Over
- **Zombie-Wellen**: Alle 30 Sekunden erscheinen neue Zombies (mehr und schnellere Typen)
- **Zombie-Typen** (eskalierend):
  - 🧟 Standard-Zombie: Langsam, schwerfällig
  - 🏃 Läufer-Zombie: Schnell, taucht ab Min. 2 auf
  - 🚴 Fahrrad-Zombie: Sehr schnell, taucht ab Min. 3 auf
  - 💨 Mutanten-Zombie: Endgame-Typ, ab Min. 4

#### Power-Ups (optional, sammelbar)
- **Energiegel** ⚡: Kurzer Geschwindigkeitsboost unabhängig vom Trainer
- **Straßensperre** 🚧: Verlangsamt Zombies für 5 Sekunden
- **Rückenwind** 🌬️: Multiplikator auf Trainergeschwindigkeit für 10 Sekunden

---

## Smart Trainer Integration

### Technischer Ansatz

#### Option 1: Web Bluetooth API (bevorzugt, kabellos)
- Viele moderne Smart Trainer unterstützen Bluetooth LE + FTMS (Fitness Machine Service Profile)
- **Wahoo KICKR Core**: Unterstützt Bluetooth LE
- API-Zugriff:
  ```javascript
  navigator.bluetooth.requestDevice({
    filters: [{ services: ['fitness_machine'] }]
  })
  ```
- Ausgelesen wird: **Instantaneous Speed** (km/h) oder **Instantaneous Power** (Watt)
- GATT-Charakteristik: `0x2ACD` (Indoor Bike Data)

#### Option 2: ANT+ via USB (Fallback)
- Benötigt ANT+ USB-Stick (z. B. Garmin ANT+ Stick)
- Browser kann ANT+ nicht nativ — benötigt lokale Node.js Bridge oder Electron-App
- **Empfehlung**: Web Bluetooth als Primärlösung; ANT+ Bridge als optionales Backend

#### Option 3: Manuelle Eingabe / Simulation (Entwicklung & Fallback)
- Slider im UI der Geschwindigkeit simuliert den Trainer
- Tastatur: Pfeiltasten erhöhen/senken simulierte Wattzahl

### Bluetooth Datenverarbeitung
```
Rohdaten (Watt/km/h) → Normalisierung (0–1) → Spielergeschwindigkeit (px/frame)
```
- Smoothing: Rolling Average über 3–5 Messwerte (verhindert ruckartige Sprünge)
- Update-Rate: 1 Hz vom Trainer → Interpolation im Spiel auf 60 fps

---

## Technischer Stack

### Empfohlener Stack
- **Sprache**: TypeScript
- **Framework**: Vanilla Canvas API oder Phaser.js (leichtgewichtig, perfekt für 2D-Sidescroller)
- **Build-Tool**: Vite
- **Bluetooth**: Web Bluetooth API (native Browser-API, kein NPM-Paket nötig)
- **Grafik**: 
  - Sprite-basiert (Pixel-Art-Style empfohlen, thematisch passend)
  - Alternativ: SVG-Charaktere mit CSS-Animationen

### Projektstruktur
```
zombie-cyclist/
├── CLAUDE.md                  # Diese Datei
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.ts                # Einstiegspunkt
│   ├── game/
│   │   ├── Game.ts            # Hauptspielloop (requestAnimationFrame)
│   │   ├── GameState.ts       # Enum: MENU | DEMO | CONFIG | CONNECTING | PLAYING | GAMEOVER
│   │   ├── config.ts          # Alle Tuning-Parameter (Geschwindigkeitskurven etc.)
│   │   ├── DifficultyPreset.ts # Easy/Intermediate/Hard Preset-Definitionen
│   │   └── scoring.ts         # Highscore-Logik (localStorage, getrennt nach Schwierigkeit)
│   ├── entities/
│   │   ├── Player.ts          # Radfahrer: Position, Animationen, Kollision
│   │   ├── Zombie.ts          # Basis-Zombie-Klasse
│   │   ├── ZombieTypes.ts     # Standard, Läufer, Fahrrad, Mutant
│   │   └── PowerUp.ts         # Power-Up-Typen und Effekte
│   ├── systems/
│   │   ├── ZombieSpawner.ts   # Spawn-Logik, Wellen, Timing
│   │   ├── EscalationEngine.ts # Zeitbasierte Schwierigkeitskurve
│   │   ├── CollisionSystem.ts  # AABB-Kollisionserkennung
│   │   └── BackgroundScroller.ts # Parallax-Hintergrund
│   ├── trainer/
│   │   ├── TrainerManager.ts  # Abstraktionsschicht (Bluetooth/Demo/Simulation)
│   │   ├── BluetoothTrainer.ts # Web Bluetooth FTMS Implementation
│   │   ├── DemoTrainer.ts     # Automatische KI-Steuerung für Demo-Modus
│   │   ├── SimulatedTrainer.ts # Keyboard/Slider-Simulation für Dev
│   │   └── DataSmoother.ts    # Rolling Average, Interpolation
│   ├── ui/
│   │   ├── HUD.ts             # Power-Anzeige, Timer, Zombie-Distanz, Schwierigkeits-Badge
│   │   ├── MainMenu.ts        # Startscreen: Trainer | Demo | Config | Highscores
│   │   ├── ConfigScreen.ts    # Difficulty Preset + Feineinstellung einzelner Parameter
│   │   ├── HighscoreBoard.ts  # Top-10 Board, gefiltert nach Schwierigkeit & Modus
│   │   └── GameOver.ts        # Statistiken, Einordnung in Highscore, Retry
│   └── assets/
│       ├── sprites/           # Sprite Sheets (PNG)
│       ├── backgrounds/       # Parallax-Layer
│       └── sounds/            # Optionale Soundeffekte
```

---

## Game Design Details

### Spieler-Geschwindigkeitsformel
```typescript
// config.ts
export const SPEED_CONFIG = {
  MIN_SPEED: 1,          // px/frame bei 0 Watt
  MAX_SPEED: 12,         // px/frame bei MAX_WATT
  MAX_WATT: 400,         // Sättigung ab hier
  SMOOTHING_FRAMES: 5,   // Rolling Average
  // Kurventyp: Wurzel-Funktion (frühe Gains, dann abflachen)
  curve: (watt: number) => Math.sqrt(watt / MAX_WATT) * (MAX_SPEED - MIN_SPEED) + MIN_SPEED
};
```

### Zombie-Eskalationskurve
```typescript
// EscalationEngine.ts
export const ESCALATION_CONFIG = {
  GAME_DURATION_SECONDS: 270,  // 4:30 Minuten bis unvermeidlicher Tod
  // Zombie-Grundgeschwindigkeit als Funktion der Spielzeit (t in Sekunden)
  zombieSpeed: (t: number) => {
    const normalized = t / GAME_DURATION_SECONDS; // 0 → 1
    return 1 + Math.pow(normalized, 1.5) * 14;    // 1 px/f → 15 px/f
  },
  // Spawn-Rate: Zombies pro Welle
  spawnRate: (t: number) => Math.floor(1 + t / 45),
  WAVE_INTERVAL_SECONDS: 30
};
```

### HUD-Elemente
```
┌─────────────────────────────────────────────────────────┐
│  🚴 237 W   ⏱ 02:34   💀 Zombies: 8m hinter dir   ❤️❤️  │
│  [==========---------] Leistungsbalken                  │
│                                 ⚠️ SIE WERDEN SCHNELLER │
└─────────────────────────────────────────────────────────┘
```

### Visueller Stil (Empfehlung)
- **Pixel Art**, 16x16 oder 32x32 Sprites
- **Farbpalette**: Gedämpfte, apokalyptische Töne (Grau, Braun, Rostrot) mit knalligem Cyan für den Spieler
- **Hintergrund-Parallax**: 3 Layer (Himmel mit Ruinen, Gebäude, Vordergrund-Straße)
- **Tageszeit**: Anfangs Dämmerung, gegen Ende Nacht (dynamischer Wechsel über Spielzeit)

---

## Demo-Modus

### Zweck
- Spiel auf einem Monitor/Display zeigen ohne angeschlossenen Trainer
- Attraktionsmodus für Messen, Showrooms, Fitness-Studios
- Neue Spieler können Mechaniken beobachten bevor sie einsteigen
- Entwicklung & Testing ohne Trainer

### DemoTrainer — Automatische KI-Steuerung
Der `DemoTrainer` emuliert einen realen Trainer durch ein geskriptetes Watt-Profil mit zufälligen Variationen:

```typescript
// DemoTrainer.ts
export class DemoTrainer implements ITrainer {
  private t = 0; // Spielzeit in Sekunden

  getCurrentWatt(): number {
    // Basiswert: sinusförmige Schwankung (simuliert echtes Fahrverhalten)
    const base = 180 + Math.sin(this.t * 0.05) * 60;  // 120–240 W
    // Gelegentliche "Sprints" (realistisch)
    const sprint = Math.random() < 0.01 ? 80 : 0;
    // Gelegentliche "Erschöpfung" (lässt Zombies näher ran, Spannung)
    const fatigue = Math.random() < 0.005 ? -100 : 0;
    return Math.max(80, base + sprint + fatigue);
  }
  
  // Liefert auch eine sichtbare "Simulierte Watt"-Anzeige im HUD
}
```

### Demo-Modus UI-Verhalten
- **Banner** im HUD: `🎮 DEMO-MODUS — Drücke [ENTER] zum Spielen mit Trainer`
- HUD zeigt simulierte Wattzahl (realistisch wirkend, aber gefaked)
- Game Over im Demo-Modus → automatischer Neustart nach 5 Sekunden (kein Highscore-Eintrag)
- Demo-Scores werden **nicht** im Highscore-Board gespeichert (klar kennzeichnen)
- Mainmenu-Button: `▶ Demo ansehen` startet sofort ohne Konfiguration

---

## Schwierigkeitsgrade & Konfiguration

### Drei Presets

| Parameter | 🟢 Easy | 🟡 Intermediate | 🔴 Hard |
|-----------|---------|-----------------|---------|
| `GAME_DURATION_SECONDS` | 300 (5:00) | 270 (4:30) | 210 (3:30) |
| `ESCALATION_EXPONENT` | 1.2 | 1.5 | 2.0 |
| `ZOMBIE_START_DISTANCE_PX` | 500 | 300 | 200 |
| `WAVE_INTERVAL_SECONDS` | 40 | 30 | 20 |
| `MAX_WATT_REFERENCE` | 200 | 300 | 400 |
| `LÄUFER_ZOMBIE_START_SEC` | 150 | 120 | 60 |
| `FAHRRAD_ZOMBIE_START_SEC` | 210 | 180 | 120 |
| `MUTANT_ZOMBIE_START_SEC` | 270 | 240 | 180 |
| Highscore-Tabelle | Eigene | Eigene | Eigene |

`MAX_WATT_REFERENCE` skaliert die Spielergeschwindigkeitskurve — auf Easy reicht bereits 200 W für Maximalspeed, auf Hard braucht man 400 W. Dadurch ist das Spiel auch für Gelegenheitsfahrer zugänglich.

### DifficultyPreset.ts
```typescript
export type Difficulty = 'easy' | 'intermediate' | 'hard';

export interface DifficultyConfig {
  label: string;
  emoji: string;
  gameDurationSeconds: number;
  escalationExponent: number;
  zombieStartDistancePx: number;
  waveIntervalSeconds: number;
  maxWattReference: number;
  zombieTypeUnlockSeconds: Record<ZombieType, number>;
}

export const PRESETS: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'Easy', emoji: '🟢', gameDurationSeconds: 300, escalationExponent: 1.2, ... },
  intermediate: { label: 'Intermediate', emoji: '🟡', gameDurationSeconds: 270, escalationExponent: 1.5, ... },
  hard: { label: 'Hard', emoji: '🔴', gameDurationSeconds: 210, escalationExponent: 2.0, ... },
};
```

### Config-Screen UI
```
┌─────────────────── EINSTELLUNGEN ───────────────────┐
│                                                     │
│  Schwierigkeit:  [🟢 Easy] [🟡 Mittel] [🔴 Hard]   │
│                                                     │
│  ── Erweiterte Einstellungen (aufklappbar) ──       │
│  Referenz-Watt:      [====|====] 300 W              │
│  Zombie-Startabstand:[===|=====] 300 px             │
│  Eskalations-Kurve:  [====|====] 1.5                │
│  Spieldauer (Max):   [=======|=] 4:30 min           │
│                                                     │
│  [← Zurück]                    [✓ Speichern]        │
└─────────────────────────────────────────────────────┘
```

- Preset-Buttons überschreiben alle Slider-Werte sofort
- Manuelle Slider-Änderung deaktiviert Preset-Highlighting (zeigt "Custom")
- Einstellungen werden in `localStorage` unter `zombieCyclist.config` gespeichert
- Änderungen gelten erst ab dem nächsten Spiel (kein Hot-Reload während des Spiels)

---

## Highscore-Board

### Datenstruktur
```typescript
export interface HighscoreEntry {
  rank: number;
  name: string;           // 3-Buchstaben-Kürzel (Arcade-Style) oder freier Name
  survivalSeconds: number;
  maxWatt: number;
  avgWatt: number;
  difficulty: Difficulty;
  mode: 'trainer' | 'demo' | 'keyboard'; // Demo-Einträge werden gefiltert
  timestamp: number;      // Unix ms
  zombieDistance: number; // Abstand bei Game Over in px (Nähe = Dramatik)
}
```

### Speicherung
- **localStorage** unter `zombieCyclist.highscores` (JSON-Array)
- Maximal **50 Einträge** gesamt (älteste werden verdrängt)
- **Getrennte Ansichten** per Difficulty-Tab (Easy / Intermediate / Hard / Alle)
- Demo-Einträge: werden **nie** gespeichert

### Highscore-Board UI
```
┌──────────────────── 🏆 HIGHSCORES ─────────────────────────┐
│  [🟢 Easy]  [🟡 Mittel]  [🔴 Hard]  [Alle]                 │
│                                                             │
│  #   Name    Zeit     Ø Watt   Max W   Schwierigkeit  Datum │
│  ─────────────────────────────────────────────────────────  │
│  1   MRC     4:12     243 W   387 W   🔴 Hard        heute  │
│  2   ZOM     3:58     198 W   312 W   🟡 Mittel      gestern│
│  3   BKR     3:44     220 W   295 W   🔴 Hard        Mo.    │
│  ...                                                        │
│                                                  [Schließen]│
└─────────────────────────────────────────────────────────────┘
```

- **Neue Einträge** werden animiert eingeblendet (Zeile pulst kurz auf)
- **Eigener Eintrag** in der Game-Over-Ansicht hervorgehoben (Ranking-Position direkt sichtbar)
- **Namenseingabe** Arcade-Style: 3 Zeichen, Pfeiltasten/Buchstaben (oder freies Textfeld als Alternative)
- Highscore-Button auch im Hauptmenü erreichbar (nicht nur nach Game Over)

### HighscoreBoard.ts Interface
```typescript
export class HighscoreBoard {
  // Gibt Top-N Einträge zurück, gefiltert nach Difficulty und Modus
  getTop(n: number, difficulty?: Difficulty): HighscoreEntry[];
  
  // Fügt neuen Eintrag ein, gibt Rank zurück (null wenn nicht in Top 50)
  addEntry(entry: Omit<HighscoreEntry, 'rank'>): number | null;
  
  // Prüft ob ein Score es in die Top 10 schaffen würde (für "New Highscore!" Banner)
  wouldMakeTop10(seconds: number, difficulty: Difficulty): boolean;
  
  // Reset (für Config-Screen "Scores löschen"-Option)
  clear(difficulty?: Difficulty): void;
}
```

---

## Wichtige Implementierungshinweise für Claude

### Priorisierung
1. **Zuerst**: Spielbarer Prototyp mit Keyboard/Slider-Steuerung (SimulatedTrainer) + Easy-Preset
2. **Dann**: Demo-Modus (DemoTrainer, Auto-Neustart, kein Highscore)
3. **Dann**: Config-Screen mit Preset-Auswahl + erweiterter Feineinstellung
4. **Dann**: Highscore-Board (localStorage, Namenseingabe, Difficulty-Tabs)
5. **Dann**: Bluetooth-Integration (BluetoothTrainer)
6. **Optional**: ANT+ Bridge, Soundeffekte, Power-Ups

### Bekannte Herausforderungen
- **Web Bluetooth** funktioniert nur über HTTPS oder localhost (nicht über file://)
- **FTMS Indoor Bike Data** (0x2ACD): Bytes müssen korrekt geparst werden (Little Endian, Flags-Byte beachten)
- **Bluetooth-Verbindungsabbruch**: Reconnect-Logik implementieren, Spiel pausieren
- **60 fps Loop**: `requestAnimationFrame` mit Delta-Time verwenden, nicht `setInterval`
- **Mobile**: Web Bluetooth funktioniert nicht auf iOS Safari → explizit ausschließen oder Hinweis anzeigen

### FTMS Byte-Parsing (Indoor Bike Data)
```typescript
// BluetoothTrainer.ts — kritische Stelle
parseIndoorBikeData(value: DataView): TrainerData {
  const flags = value.getUint16(0, true);
  let offset = 2;
  
  // Bit 0: More Data (Instantaneous Speed vorhanden wenn 0)
  const speed = value.getUint16(offset, true) * 0.01; // km/h
  offset += 2;
  
  // Bit 2: Instantaneous Cadence
  if (flags & 0x04) {
    const cadence = value.getUint16(offset, true) * 0.5; // rpm
    offset += 2;
  }
  
  // Bit 6: Instantaneous Power
  if (flags & 0x40) {
    const power = value.getInt16(offset, true); // Watt
    offset += 2;
  }
  
  return { speed, cadence, power };
}
```

### Performance-Budget
- Ziel: 60 fps auf normaler Hardware
- Canvas-Rendering: Dirty-Rect-Updates bevorzugen
- Zombie-Array: Maximale Größe auf 50 kappen (älteste entfernen wenn außerhalb Viewport)
- Keine DOM-Manipulation im Game Loop (nur Canvas)

---

## Spielbalancing-Parameter (Tuning nach Playtesting)

| Parameter | Startwert | Bereich | Notiz |
|-----------|-----------|---------|-------|
| `MAX_WATT` | 400 | 200–600 | An Spieler-FTP anpassen |
| `GAME_DURATION_SECONDS` | 270 | 180–300 | Schwierigkeitsgrad |
| `WAVE_INTERVAL_SECONDS` | 30 | 20–45 | Spawn-Frequenz |
| `MIN_DISTANCE_START` | 300px | 200–500px | Zombie-Startabstand |
| `ESCALATION_EXPONENT` | 1.5 | 1.0–2.5 | Kurvensteile |

---

## Definition of Done

- [ ] Spielbarer Prototyp im Browser lauffähig (localhost:5173)
- [ ] SimulatedTrainer funktioniert mit Tastatur/Slider
- [ ] **Demo-Modus**: Automatische KI-Steuerung, DEMO-Banner im HUD, Auto-Neustart nach Game Over
- [ ] **Config-Screen**: Preset-Buttons (Easy/Intermediate/Hard) + aufklappbare Feineinstellung
- [ ] **Highscore-Board**: Top-10 pro Difficulty, Namenseingabe Arcade-Style, localStorage-Persistenz
- [ ] Highscore: Demo-Einträge werden nicht gespeichert (klar gekennzeichnet)
- [ ] BluetoothTrainer verbindet sich mit KICKR Core und liest Watt/Speed
- [ ] Zombie-Eskalation führt nach konfigurierter Zeit zuverlässig zu Game Over
- [ ] HUD zeigt Watt, Timer, Zombie-Distanz, Difficulty-Badge in Echtzeit
- [ ] Reconnect-Handling bei Bluetooth-Verlust
- [ ] Responsive: funktioniert auf 1920×1080 und 1280×720

---

## Entwicklungsstart

```bash
npm create vite@latest zombie-cyclist -- --template vanilla-ts
cd zombie-cyclist
npm install
npm run dev
```

Dann mit `src/main.ts` beginnen, Game-Loop aufbauen, SimulatedTrainer zuerst verdrahten.
