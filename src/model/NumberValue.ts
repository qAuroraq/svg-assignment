export class NumberValue {
  public static parse(token: string, name: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) {
      throw new Error(`invalid number for ${name}: ${token}`);
    }
    return this.finite(Number(token), name);
  }

  public static finite(value: number, name: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`${name} must be finite`);
    }
    return value;
  }

  public static positive(value: number, name: string): number {
    this.finite(value, name);
    if (value <= 0) {
      throw new Error(`${name} must be positive`);
    }
    return value;
  }

  public static nonNegative(value: number, name: string): number {
    this.finite(value, name);
    if (value < 0) {
      throw new Error(`${name} must be non-negative`);
    }
    return value;
  }
}
