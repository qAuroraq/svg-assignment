import { NumberValue } from '../model/NumberValue.js';

export class CommandArguments {
  public constructor(private readonly values: readonly string[]) {}

  public requireCount(min: number, max: number, syntax: string): void {
    if (this.values.length < min || this.values.length > max) {
      throw new Error(`usage: ${syntax}`);
    }
  }

  public get(index: number): string {
    const value = this.values[index];
    if (value === undefined) {
      throw new Error('missing argument');
    }
    return value;
  }

  public number(index: number, name: string): number {
    return NumberValue.parse(this.get(index), name);
  }

  public getAll(): readonly string[] {
    return [...this.values];
  }
}
