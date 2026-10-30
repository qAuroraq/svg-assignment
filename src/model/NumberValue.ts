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

  public static attribute(value: string | number | undefined, name: string): number {
    if (typeof value === 'string') {
      return this.parse(value, name);
    }
    if (typeof value === 'number') {
      return this.finite(value, name);
    }
    throw new Error(`missing numeric value for ${name}`);
  }

  public static fromState(state: Readonly<Record<string, unknown>>, name: string): number {
    const value = state[name];
    if (typeof value !== 'number') {
      throw new Error(`invalid geometry state: ${name}`);
    }
    return this.finite(value, name);
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
