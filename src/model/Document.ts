import { NumberValue } from './NumberValue.js';
import type { Shape } from './Shape.js';

export class Document {
  private readonly shapes: Shape[] = [];
  private readonly ids = new Map<string, Shape>();

  public constructor(
    private readonly width: number = 800,
    private readonly height: number = 600,
  ) {
    NumberValue.positive(width, 'canvas width');
    NumberValue.positive(height, 'canvas height');
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getChildren(): readonly Shape[] {
    return [...this.shapes];
  }

  public find(id: string): Shape {
    const shape = this.ids.get(id);
    if (shape === undefined) {
      throw new Error(`no such shape: ${id}`);
    }
    return shape;
  }

  public insert(shape: Shape, index: number = this.shapes.length): number {
    if (this.ids.has(shape.getId())) {
      throw new Error(`id already exists: ${shape.getId()}`);
    }
    if (!Number.isInteger(index) || index < 0 || index > this.shapes.length) {
      throw new Error('invalid insertion index');
    }
    this.shapes.splice(index, 0, shape);
    this.ids.set(shape.getId(), shape);
    return index;
  }

  public remove(shape: Shape): void {
    if (this.find(shape.getId()) !== shape) {
      throw new Error(`shape identity changed: ${shape.getId()}`);
    }
    const index = this.shapes.indexOf(shape);
    this.shapes.splice(index, 1);
    this.ids.delete(shape.getId());
  }
}
