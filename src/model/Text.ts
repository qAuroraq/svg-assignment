import { NumberValue } from './NumberValue.js';
import { Shape, type AttributeValue, type GeometryState, type ShapeAttributes, type ShapeDescription } from './Shape.js';

export class Text extends Shape {
  public constructor(
    id: string,
    private x: number,
    private y: number,
    private content: string,
  ) {
    super(id);
    NumberValue.finite(x, 'x');
    NumberValue.finite(y, 'y');
  }

  public override getType(): string {
    return 'text';
  }

  public override getAttributes(): ShapeAttributes {
    return { ...this.captureGeometry(), text: this.content, ...this.getStyleAttributes() };
  }

  public override describe(): ShapeDescription {
    return {
      tag: this.getType(),
      attributes: { id: this.getId(), ...this.captureGeometry(), ...this.getStyleAttributes() },
      text: this.content, children: [],
    };
  }

  public override move(dx: number, dy: number): void {
    NumberValue.finite(dx, 'dx');
    NumberValue.finite(dy, 'dy');
    this.restoreGeometry({ x: this.x + dx, y: this.y + dy });
  }

  public override scale(factor: number): void {
    NumberValue.positive(factor, 'scale factor');
    this.restoreGeometry({ x: this.x * factor, y: this.y * factor });
  }

  public override captureGeometry(): Readonly<Record<string, number>> {
    return { x: this.x, y: this.y };
  }

  public override restoreGeometry(state: GeometryState): void {
    const x = NumberValue.fromState(state, 'x');
    const y = NumberValue.fromState(state, 'y');
    this.x = x;
    this.y = y;
  }

  protected override setSpecificAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'x': this.x = NumberValue.attribute(value, name); return;
      case 'y': this.y = NumberValue.attribute(value, name); return;
      case 'text':
        if (typeof value !== 'string') {
          throw new Error('text must be a string');
        }
        this.content = value;
        return;
      default: throw new Error(`unknown attribute: ${name}`);
    }
  }
}
