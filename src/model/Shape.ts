// Opaque to commands; future containers can include child snapshots here.
export type GeometryState = Readonly<Record<string, unknown>>;
export type ShapeAttributes = Readonly<Record<string, string | number>>;

export abstract class Shape {
  protected constructor(
    private readonly id: string,
    private readonly fill: string | undefined,
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
  public abstract captureGeometry(): GeometryState;
  public abstract restoreGeometry(state: GeometryState): void;

  public getChildren(): readonly Shape[] {
    return [];
  }
}
