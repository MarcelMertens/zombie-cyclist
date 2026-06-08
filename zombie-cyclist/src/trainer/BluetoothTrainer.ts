import type { ITrainer, TrainerData } from './ITrainer';
import { DataSmoother } from './DataSmoother';

declare global {
  interface Navigator { bluetooth: Bluetooth; }
  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  }
  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
  }
  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
  }
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  interface BluetoothRemoteGATTCharacteristic {
    value?: DataView;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: 'characteristicvaluechanged', listener: (e: Event) => void): void;
  }
  interface RequestDeviceOptions {
    filters?: Array<{ services?: string[]; namePrefix?: string }>;
    optionalServices?: string[];
    acceptAllDevices?: boolean;
  }
}

export type BTStatus =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'reconnected'
  | 'reconnect_failed';

/**
 * BLE service UUIDs for all power/fitness services we read from.
 * Listed as optionalServices so they can be accessed regardless of which
 * filter matched the device.
 */
const OPTIONAL_SERVICES = ['fitness_machine', 'cycling_power'] as const;

/**
 * Filter list. Service-based entries catch any trainer that advertises the
 * UUID in its BLE advertisement (most modern firmware 2018+). Name prefixes
 * are a fallback for devices that only advertise by name.
 */
const TRAINER_FILTERS: NonNullable<RequestDeviceOptions['filters']> = [
  // ── Service-based (catches the majority of modern trainers) ────────────────
  { services: ['fitness_machine'] },  // FTMS — Wahoo, Tacx, Elite, Saris, …
  { services: ['cycling_power'] },    // Cycling Power — all power meter/trainer combos

  // ── Name prefix fallback (older firmware / non-advertising devices) ────────
  // Wahoo
  ...['KICKR', 'Wahoo'].map(p => ({ namePrefix: p })),
  // Tacx / Garmin
  ...['Tacx', 'TACX', 'NEO', 'FLUX', 'Vortex', 'Bushido', 'Genius'].map(p => ({ namePrefix: p })),
  // Elite
  ...['Direto', 'Suito', 'Drivo', 'Kura', 'Justo', 'Rampa', 'ELITE'].map(p => ({ namePrefix: p })),
  // Saris / CycleOps
  ...['Saris', 'Hammer', 'H3 '].map(p => ({ namePrefix: p })),
  // Stages
  ...['Stages', 'SB20'].map(p => ({ namePrefix: p })),
  // Kinetic
  ...['inRide', 'Kinetic'].map(p => ({ namePrefix: p })),
  // BKOOL
  ...['BKOOL'].map(p => ({ namePrefix: p })),
  // Wattbike
  ...['Wattbike'].map(p => ({ namePrefix: p })),
  // Magene
  ...['Magene', 'T100', 'T300'].map(p => ({ namePrefix: p })),
  // Favero (power meter pedals with BLE)
  ...['Favero', 'assioma'].map(p => ({ namePrefix: p })),
];

const MAX_RECONNECT_ATTEMPTS = 8;

export class BluetoothTrainer implements ITrainer {
  /** Which BLE characteristic is delivering power — shown in the HUD. */
  source: 'ftms' | 'cycling_power' | 'none' = 'none';
  /** How many reconnect attempts have been made since last disconnect. */
  reconnectAttempts = 0;

  private device: BluetoothDevice | null = null;
  private smoother = new DataSmoother(5);
  private latestData: TrainerData = { watt: 0, speed: 0, cadence: 0 };
  private onStatusCb?: (status: BTStatus) => void;
  private shouldReconnect = false;

  async connect(onStatus?: (status: BTStatus) => void): Promise<void> {
    this.onStatusCb = onStatus;
    this.shouldReconnect = true;

    this.device = await navigator.bluetooth.requestDevice({
      filters: TRAINER_FILTERS,
      optionalServices: [...OPTIONAL_SERVICES],
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      if (!this.shouldReconnect) return;
      this.onStatusCb?.('disconnected');
      this.scheduleReconnect(1);
    });

    const server = await this.device.gatt!.connect();
    await this.subscribeToServer(server);
    console.info('[BT] Connected to', this.device.gatt ? 'trainer' : 'device');
  }

  /**
   * Subscribes to the best available power characteristic on this server.
   * Called both on initial connect and on every reconnect.
   *
   * Priority: FTMS Indoor Bike Data (0x2ACD) → Cycling Power Measurement (0x2A63)
   */
  private async subscribeToServer(server: BluetoothRemoteGATTServer): Promise<void> {
    // 1. FTMS Indoor Bike Data
    const ftmsOk = await this.trySubscribeFtms(server);
    if (ftmsOk) return;

    // 2. Cycling Power Measurement
    const cpOk = await this.trySubscribeCyclingPower(server);
    if (cpOk) return;

    throw new Error(
      'Kein unterstützter Leistungs-Characteristic gefunden.\n' +
      'Versucht: FTMS Indoor Bike Data (0x2ACD) und Cycling Power (0x2A63).\n' +
      'Bitte prüfe die Trainer-Firmware.'
    );
  }

  private async trySubscribeFtms(server: BluetoothRemoteGATTServer): Promise<boolean> {
    try {
      const svc = await server.getPrimaryService('fitness_machine');
      const char = await svc.getCharacteristic(0x2acd);
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (e: Event) => {
        const c = e.target as unknown as BluetoothRemoteGATTCharacteristic;
        if (c.value) this.latestData = this.parseFtms(c.value);
      });
      this.source = 'ftms';
      console.info('[BT] Using FTMS Indoor Bike Data (0x2ACD)');
      return true;
    } catch {
      return false;
    }
  }

  private async trySubscribeCyclingPower(server: BluetoothRemoteGATTServer): Promise<boolean> {
    try {
      const svc = await server.getPrimaryService('cycling_power');
      const char = await svc.getCharacteristic(0x2a63);
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (e: Event) => {
        const c = e.target as unknown as BluetoothRemoteGATTCharacteristic;
        if (c.value) this.latestData = this.parseCyclingPower(c.value);
      });
      this.source = 'cycling_power';
      console.info('[BT] Using Cycling Power Measurement (0x2A63)');
      return true;
    } catch {
      return false;
    }
  }

  private scheduleReconnect(attempt: number): void {
    if (!this.shouldReconnect || !this.device) return;
    this.reconnectAttempts = attempt;
    this.onStatusCb?.('reconnecting');

    // Exponential backoff: 1s, 2s, 3s, … capped at 5s
    const delay = Math.min(1000 * attempt, 5000);

    setTimeout(async () => {
      if (!this.shouldReconnect || !this.device) return;
      try {
        const server = await this.device.gatt!.connect();
        await this.subscribeToServer(server);
        this.reconnectAttempts = 0;
        this.onStatusCb?.('reconnected');
        console.info('[BT] Reconnected successfully');
      } catch (err) {
        console.warn(`[BT] Reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}:`, err);
        if (attempt < MAX_RECONNECT_ATTEMPTS && this.shouldReconnect) {
          this.scheduleReconnect(attempt + 1);
        } else {
          console.error('[BT] Reconnect failed after', attempt, 'attempts');
          this.onStatusCb?.('reconnect_failed');
        }
      }
    }, delay);
  }

  /**
   * FTMS Indoor Bike Data (0x2ACD) parser.
   *
   * Field layout (Bluetooth FTMS spec, all little-endian):
   *   [0-1]  Flags (uint16)
   *   [+2]   Instantaneous Speed  (present if bit 0 = 0) — uint16 × 0.01 km/h
   *   [+2]   Average Speed        (present if bit 1)     — uint16 × 0.01 km/h
   *   [+2]   Instantaneous Cadence(present if bit 2)     — uint16 × 0.5 rpm
   *   [+2]   Average Cadence      (present if bit 3)     — uint16 × 0.5 rpm
   *   [+3]   Total Distance       (present if bit 4)     — uint24 m  (3 bytes!)
   *   [+2]   Resistance Level     (present if bit 5)     — int16
   *   [+2]   Instantaneous Power  (present if bit 6)     — int16 W   ← we want this
   */
  private parseFtms(value: DataView): TrainerData {
    if (value.byteLength < 2) return this.latestData;
    const flags = value.getUint16(0, true);
    let offset = 2;

    let speed = 0;
    if (!(flags & 0x01)) {
      if (offset + 2 <= value.byteLength) speed = value.getUint16(offset, true) * 0.01;
      offset += 2;
    }
    if (flags & 0x02) offset += 2;   // Average Speed

    let cadence = 0;
    if (flags & 0x04) {
      if (offset + 2 <= value.byteLength) cadence = value.getUint16(offset, true) * 0.5;
      offset += 2;
    }
    if (flags & 0x08) offset += 2;   // Average Cadence
    if (flags & 0x10) offset += 3;   // Total Distance (3 bytes)
    if (flags & 0x20) offset += 2;   // Resistance Level

    let power = 0;
    if (flags & 0x40) {
      if (offset + 2 <= value.byteLength) power = value.getInt16(offset, true);
    }

    return { watt: this.smoother.push(Math.max(0, power)), speed, cadence };
  }

  /**
   * Cycling Power Measurement (0x2A63) parser.
   * Instantaneous Power is always at bytes [2-3] (signed int16, little-endian),
   * regardless of which optional fields the flags enable.
   */
  private parseCyclingPower(value: DataView): TrainerData {
    if (value.byteLength < 4) return this.latestData;
    const power = value.getInt16(2, true);
    return {
      watt: this.smoother.push(Math.max(0, power)),
      speed: this.latestData.speed,
      cadence: this.latestData.cadence,
    };
  }

  update(_dt: number): void {}

  getCurrentData(): TrainerData { return this.latestData; }

  dispose(): void {
    this.shouldReconnect = false;
    this.device?.gatt?.disconnect();
  }
}
