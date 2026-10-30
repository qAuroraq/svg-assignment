import { NumberValue } from './NumberValue.js';
import { Shape, type AttributeValue, type GeometryState, type ShapeAttributes } from './Shape.js';

export class Rect extends Shape {
  public constructor(
    id: string,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    fill?: string,
  ) {
    super(id, fill);
    NumberValue.finite(x, 'x');
    NumberValue.finite(y, 'y');
    NumberValue.nonNegative(width, 'width');
    NumberValue.nonNegative(height, 'height');
  }

  public override getType(): string {
    return 'rect';
  }

  public override getAttributes(): ShapeAttributes {
    return { ...this.captureGeometry(), ...this.getStyleAttributes() };
  }

  public override move(dx: number, dy: number): void {
    NumberValue.finite(dx, 'dx');
    NumberValue.finite(dy, 'dy');
    // Validate both results before changing either coordinate (including overflow).
    const x = NumberValue.finite(this.x + dx, 'x');
    const y = NumberValue.finite(this.y + dy, 'y');
    this.x = x;
    this.y = y;
  }

  public override scale(factor: number): void {
    NumberValue.positive(factor, 'scale factor');
    this.restoreGeometry({
      x: this.x * factor, y: this.y * factor,
      width: this.width * factor, height: this.height * factor,
    });
  }

  protected override setSpecificAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'x': this.x = NumberValue.attribute(value, name); return;
      case 'y': this.y = NumberValue.attribute(value, name); return;
      case 'width': this.width = NumberValue.nonNegative(NumberValue.attribute(value, name), name); return;
      case 'height': this.height = NumberValue.nonNegative(NumberValue.attribute(value, name), name); return;
      default: throw new Error(`unknown attribute: ${name}`);
    }
  }

  public override captureGeometry(): Readonly<Record<string, number>> {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  public override restoreGeometry(state: GeometryState): void {
    const { x, y, width, height } = state;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
      throw new Error('invalid rectangle geometry state');
    }
    NumberValue.finite(x, 'x');
    NumberValue.finite(y, 'y');
    NumberValue.nonNegative(width, 'width');
    NumberValue.nonNegative(height, 'height');
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}
