import { NumberValue } from './NumberValue.js';
import type { ChildList } from './ChildList.js';

// Opaque to commands; containers include recursive child snapshots here.
export type GeometryState = Readonly<Record<string, unknown>>;
export type AttributeValue = string | number;
export type ShapeAttributes = Readonly<Record<string, AttributeValue>>;

export abstract class Shape {
  private strokeWidth: number | undefined;

  protected constructor(
    private readonly id: string,
    private fill: string | undefined = undefined,
    private stroke: string | undefined = undefined,
  ) {
    if (id.length === 0 || /\s/u.test(id)) {
      throw new Error('id must be non-empty and contain no whitespace');
    }
  }

  public getId(): string {
    return this.id;
  }

  public getFill(): string | undefined {
    return this.fill;
  }

  public abstract getType(): string;
  public abstract getAttributes(): ShapeAttributes;
  public abstract move(dx: number, dy: number): void;
  public abstract scale(factor: number): void;
  public abstract captureGeometry(): GeometryState;
  public abstract restoreGeometry(state: GeometryState): void;
  protected abstract setSpecificAttribute(name: string, value: AttributeValue | undefined): void;

  // undefined restores an absent optional style, rather than an SVG default.
  public setAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'fill':
        this.fill = this.styleValue(value, name);
        return;
      case 'stroke':
        this.stroke = this.styleValue(value, name);
        return;
      case 'stroke-width':
        this.strokeWidth = value === undefined
          ? undefined
          : NumberValue.nonNegative(NumberValue.attribute(value, name), name);
        return;
      default:
        this.setSpecificAttribute(name, value);
    }
  }

  protected getStyleAttributes(): ShapeAttributes {
    return {
      ...(this.fill === undefined ? {} : { fill: this.fill }),
      ...(this.stroke === undefined ? {} : { stroke: this.stroke }),
      ...(this.strokeWidth === undefined ? {} : { 'stroke-width': this.strokeWidth }),
    };
  }

  private styleValue(value: AttributeValue | undefined, name: string): string | undefined {
    if (value !== undefined && typeof value !== 'string') {
      throw new Error(`${name} must be a string`);
    }
    return value;
  }

  public getChildren(): readonly Shape[] {
    return [];
  }

  /** Container capability; leaves have no child list. Structural edits go through Document. */
  public getChildList(): ChildList | undefined {
    return undefined;
  }
}
