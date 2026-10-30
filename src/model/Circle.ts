import { NumberValue } from './NumberValue.js';
import { Shape, type AttributeValue, type GeometryState, type ShapeAttributes } from './Shape.js';

export class Circle extends Shape {
  public constructor(
    id: string,
    private cx: number,
    private cy: number,
    private r: number,
    fill?: string,
  ) {
    super(id, fill);
    NumberValue.finite(cx, 'cx');
    NumberValue.finite(cy, 'cy');
    NumberValue.nonNegative(r, 'r');
  }

  public override getType(): string {
    return 'circle';
  }

  public override getAttributes(): ShapeAttributes {
    return { ...this.captureGeometry(), ...this.getStyleAttributes() };
  }

  public override move(dx: number, dy: number): void {
    NumberValue.finite(dx, 'dx');
    NumberValue.finite(dy, 'dy');
    this.restoreGeometry({ cx: this.cx + dx, cy: this.cy + dy, r: this.r });
  }

  public override scale(factor: number): void {
    NumberValue.positive(factor, 'scale factor');
    this.restoreGeometry({ cx: this.cx * factor, cy: this.cy * factor, r: this.r * factor });
  }

  public override captureGeometry(): Readonly<Record<string, number>> {
    return { cx: this.cx, cy: this.cy, r: this.r };
  }

  public override restoreGeometry(state: GeometryState): void {
    const cx = NumberValue.fromState(state, 'cx');
    const cy = NumberValue.fromState(state, 'cy');
    const r = NumberValue.nonNegative(NumberValue.fromState(state, 'r'), 'r');
    this.cx = cx;
    this.cy = cy;
    this.r = r;
  }

  protected override setSpecificAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'cx': this.cx = NumberValue.attribute(value, name); return;
      case 'cy': this.cy = NumberValue.attribute(value, name); return;
      case 'r': this.r = NumberValue.nonNegative(NumberValue.attribute(value, name), name); return;
      default: throw new Error(`unknown attribute: ${name}`);
    }
  }
}
