import { ChildList } from './ChildList.js';
import { NumberValue } from './NumberValue.js';
import { Shape, type AttributeValue, type GeometryState, type ShapeAttributes } from './Shape.js';

export class Group extends Shape {
  private readonly children = new ChildList();

  public constructor(id: string) {
    super(id);
  }

  public override getType(): string {
    return 'g';
  }

  public override getAttributes(): ShapeAttributes {
    return this.getStyleAttributes();
  }

  public override getChildList(): ChildList {
    return this.children;
  }

  public override getChildren(): readonly Shape[] {
    return this.children.getChildren();
  }

  public override move(dx: number, dy: number): void {
    NumberValue.finite(dx, 'dx');
    NumberValue.finite(dy, 'dy');
    this.changeChildrenAtomically((child) => child.move(dx, dy));
  }

  public override scale(factor: number): void {
    // Validate even an empty group; it must reject scale 0.
    NumberValue.positive(factor, 'scale factor');
    this.changeChildrenAtomically((child) => child.scale(factor));
  }

  public override captureGeometry(): GeometryState {
    return {
      children: this.getChildren().map((shape) => ({ shape, geometry: shape.captureGeometry() })),
    };
  }

  public override restoreGeometry(state: GeometryState): void {
    const entries: unknown = state.children;
    const children = this.getChildren();
    if (!Array.isArray(entries) || entries.length !== children.length) {
      throw new Error('invalid group geometry state');
    }
    const geometries = children.map((shape, index): GeometryState => {
      const entry: unknown = entries[index];
      if (typeof entry !== 'object' || entry === null || !('shape' in entry) || entry.shape !== shape
        || !('geometry' in entry) || typeof entry.geometry !== 'object' || entry.geometry === null
        || Array.isArray(entry.geometry)) {
        throw new Error('invalid group geometry state');
      }
      return entry.geometry as GeometryState;
    });
    this.changeChildrenAtomically((child, index) => child.restoreGeometry(geometries[index]!));
  }

  protected override setSpecificAttribute(name: string, _value: AttributeValue | undefined): void {
    throw new Error(`unknown attribute: ${name}`);
  }

  private changeChildrenAtomically(change: (child: Shape, index: number) => void): void {
    const children = this.getChildren();
    const before = children.map((child) => child.captureGeometry());
    try {
      children.forEach(change);
    } catch (error) {
      // Geometry edits never change structure. These snapshots are valid states
      // of the same objects, so rollback also restores already-completed subgroups.
      children.forEach((child, index) => child.restoreGeometry(before[index]!));
      throw error;
    }
  }
}
