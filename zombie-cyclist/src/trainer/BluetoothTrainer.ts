import type { ITrainer, TrainerData } from './ITrainer';
import { DataSmoother } from './DataSmoother';

declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }
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

export class BluetoothTrainer implements ITrainer {
  private device: BluetoothDevice | null = null;
  private smoother = new DataSmoother(5);
  private latestData: TrainerData = { watt: 0, speed: 0, cadence: 0 };
  private onDisconnectCb?: () => void;

  /** Which characteristic is delivering power data — shown in the connecting UI. */
  source: 'ftms' | 'cycling_power' | 'none' = 'none';

  async connect(onDisconnect?: () => void): Promise<void> {
    this.onDisconnectCb = onDisconnect;

    this.device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['fitness_machine'] },
        { services: ['cycling_power'] },
        { namePrefix: 'KICKR' },
        { namePrefix: 'Wahoo' },
      ],
      optionalServices: ['fitness_machine', 'cycling_power'],
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      this.onDisconnectCb?.();
    });

    const server = await this.device.gatt!.connect();

    // Try FTMS Indoor Bike Data first, then fall back to Cycling Power Measurement.
    let connected = false;

    try {
      const svc = await server.getPrimaryService('fitness_machine');
      const char = await svc.getCharacteristic(0x2acd);
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (e: Event) => {
        const c = e.target as unknown as BluetoothRemoteGATTCharacteristic;
        if (c.value) this.latestData = this.parseFtms(c.value);
      });
      this.source = 'ftms';
      connected = true;
      console.log('[BT] Using FTMS Indoor Bike Data (0x2ACD)');
    } catch (err) {
      console.warn('[BT] FTMS not available or 0x2ACD missing:', err);
    }

    if (!connected) {
      try {
        const svc = await server.getPrimaryService('cycling_power');
        const char = await svc.getCharacteristic(0x2a63);
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e: Event) => {
          const c = e.target as unknown as BluetoothRemoteGATTCharacteristic;
          if (c.value) this.latestData = this.parseCyclingPower(c.value);
        });
        this.source = 'cycling_power';
        connected = true;
        console.log('[BT] Using Cycling Power Measurement (0x2A63)');
      } catch (err) {
        console.warn('[BT] Cycling Power not available:', err);
      }
    }

    if (!connected) {
      throw new Error('No supported power characteristic found on this device (tried FTMS 0x2ACD and Cycling Power 0x2A63).');
    }
  }

  /**
   * FTMS Indoor Bike Data (0x2ACD) parser.
   * Correctly advances offset for ALL optional fields between speed and power
   * so the power value is read from the right bytes.
   *
   * Field order per Bluetooth FTMS spec:
   *   [0-1]  Flags (uint16)
   *   [+2]   Instantaneous Speed  (if bit 0 = 0) – uint16 * 0.01 km/h
   *   [+2]   Average Speed        (if bit 1)      – uint16 * 0.01 km/h
   *   [+2]   Instantaneous Cadence(if bit 2)      – uint16 * 0.5  rpm
   *   [+2]   Average Cadence      (if bit 3)      – uint16 * 0.5  rpm
   *   [+3]   Total Distance       (if bit 4)      – uint24 m
   *   [+2]   Resistance Level     (if bit 5)      – int16
   *   [+2]   Instantaneous Power  (if bit 6)      – int16 W   ← we want this
   */
  private parseFtms(value: DataView): TrainerData {
    if (value.byteLength < 2) return this.latestData;
    const flags = value.getUint16(0, true);
    let offset = 2;

    let speed = 0;
    if (!(flags & 0x01)) {           // bit 0 = 0 → Instantaneous Speed present
      if (offset + 2 <= value.byteLength) {
        speed = value.getUint16(offset, true) * 0.01;
      }
      offset += 2;
    }

    if (flags & 0x02) offset += 2;   // Average Speed (skip)

    let cadence = 0;
    if (flags & 0x04) {              // Instantaneous Cadence
      if (offset + 2 <= value.byteLength) {
        cadence = value.getUint16(offset, true) * 0.5;
      }
      offset += 2;
    }

    if (flags & 0x08) offset += 2;   // Average Cadence (skip)
    if (flags & 0x10) offset += 3;   // Total Distance – 3 bytes! (skip)
    if (flags & 0x20) offset += 2;   // Resistance Level (skip)

    let power = 0;
    if (flags & 0x40) {              // Instantaneous Power
      if (offset + 2 <= value.byteLength) {
        power = value.getInt16(offset, true);
      }
    }

    console.log(`[BT/FTMS] flags=0x${flags.toString(16).padStart(4,'0')} speed=${speed.toFixed(1)} cadence=${cadence} power=${power}W`);

    const smoothedWatt = this.smoother.push(power);
    return { watt: smoothedWatt, speed, cadence };
  }

  /**
   * Cycling Power Measurement (0x2A63) parser.
   * Instantaneous Power is always at bytes [2-3] regardless of flags.
   */
  private parseCyclingPower(value: DataView): TrainerData {
    if (value.byteLength < 4) return this.latestData;
    const power = value.getInt16(2, true);
    console.log(`[BT/CyclingPower] power=${power}W`);
    const smoothedWatt = this.smoother.push(power);
    return { watt: smoothedWatt, speed: this.latestData.speed, cadence: this.latestData.cadence };
  }

  update(_dt: number): void {}

  getCurrentData(): TrainerData {
    return this.latestData;
  }

  dispose(): void {
    this.device?.gatt?.disconnect();
  }
}
