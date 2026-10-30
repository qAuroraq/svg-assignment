import { NumberValue } from './NumberValue.js';
import { Shape, type AttributeValue, type GeometryState, type ShapeAttributes } from './Shape.js';

export class Line extends Shape {
  public constructor(
    id: string,
    private x1: number,
    private y1: number,
    private x2: number,
    private y2: number,
    stroke?: string,
  ) {
    super(id, undefined, stroke);
    NumberValue.finite(x1, 'x1');
    NumberValue.finite(y1, 'y1');
    NumberValue.finite(x2, 'x2');
    NumberValue.finite(y2, 'y2');
  }

  public override getType(): string {
    return 'line';
  }

  public override getAttributes(): ShapeAttributes {
    return { ...this.captureGeometry(), ...this.getStyleAttributes() };
  }

  public override move(dx: number, dy: number): void {
    NumberValue.finite(dx, 'dx');
    NumberValue.finite(dy, 'dy');
    this.restoreGeometry({ x1: this.x1 + dx, y1: this.y1 + dy, x2: this.x2 + dx, y2: this.y2 + dy });
  }

  public override scale(factor: number): void {
    NumberValue.positive(factor, 'scale factor');
    this.restoreGeometry({
      x1: this.x1 * factor, y1: this.y1 * factor, x2: this.x2 * factor, y2: this.y2 * factor,
    });
  }

  public override captureGeometry(): Readonly<Record<string, number>> {
    return { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
  }

  public override restoreGeometry(state: GeometryState): void {
    const x1 = NumberValue.fromState(state, 'x1');
    const y1 = NumberValue.fromState(state, 'y1');
    const x2 = NumberValue.fromState(state, 'x2');
    const y2 = NumberValue.fromState(state, 'y2');
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  protected override setSpecificAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'x1': this.x1 = NumberValue.attribute(value, name); return;
      case 'y1': this.y1 = NumberValue.attribute(value, name); return;
      case 'x2': this.x2 = NumberValue.attribute(value, name); return;
      case 'y2': this.y2 = NumberValue.attribute(value, name); return;
      default: throw new Error(`unknown attribute: ${name}`);
    }
  }
}
