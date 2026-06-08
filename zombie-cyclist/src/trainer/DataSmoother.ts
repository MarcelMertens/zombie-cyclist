export class DataSmoother {
  private buffer: number[] = [];
  private size: number;

  constructor(size: number) {
    this.size = size;
  }

  push(value: number): number {
    this.buffer.push(value);
    if (this.buffer.length > this.size) this.buffer.shift();
    return this.average();
  }

  average(): number {
    if (this.buffer.length === 0) return 0;
    return this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;
  }

  reset(): void {
    this.buffer = [];
  }
}
