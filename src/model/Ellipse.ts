import { NumberValue } from './NumberValue.js';
import { Shape, type AttributeValue, type GeometryState, type ShapeAttributes } from './Shape.js';

export class Ellipse extends Shape {
  public constructor(
    id: string,
    private cx: number,
    private cy: number,
    private rx: number,
    private ry: number,
    fill?: string,
  ) {
    super(id, fill);
    NumberValue.finite(cx, 'cx');
    NumberValue.finite(cy, 'cy');
    NumberValue.nonNegative(rx, 'rx');
    NumberValue.nonNegative(ry, 'ry');
  }

  public override getType(): string {
    return 'ellipse';
  }

  public override getAttributes(): ShapeAttributes {
    return { ...this.captureGeometry(), ...this.getStyleAttributes() };
  }

  public override move(dx: number, dy: number): void {
    NumberValue.finite(dx, 'dx');
    NumberValue.finite(dy, 'dy');
    this.restoreGeometry({ cx: this.cx + dx, cy: this.cy + dy, rx: this.rx, ry: this.ry });
  }

  public override scale(factor: number): void {
    NumberValue.positive(factor, 'scale factor');
    this.restoreGeometry({
      cx: this.cx * factor, cy: this.cy * factor, rx: this.rx * factor, ry: this.ry * factor,
    });
  }

  public override captureGeometry(): Readonly<Record<string, number>> {
    return { cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry };
  }

  public override restoreGeometry(state: GeometryState): void {
    const cx = NumberValue.fromState(state, 'cx');
    const cy = NumberValue.fromState(state, 'cy');
    const rx = NumberValue.nonNegative(NumberValue.fromState(state, 'rx'), 'rx');
    const ry = NumberValue.nonNegative(NumberValue.fromState(state, 'ry'), 'ry');
    this.cx = cx;
    this.cy = cy;
    this.rx = rx;
    this.ry = ry;
  }

  protected override setSpecificAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'cx': this.cx = NumberValue.attribute(value, name); return;
      case 'cy': this.cy = NumberValue.attribute(value, name); return;
      case 'rx': this.rx = NumberValue.nonNegative(NumberValue.attribute(value, name), name); return;
      case 'ry': this.ry = NumberValue.nonNegative(NumberValue.attribute(value, name), name); return;
      default: throw new Error(`unknown attribute: ${name}`);
    }
  }
}
