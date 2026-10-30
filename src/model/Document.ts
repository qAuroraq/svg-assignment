import { ChildList } from './ChildList.js';
import { NumberValue } from './NumberValue.js';
import type { Shape } from './Shape.js';
import { StructureChange, type StructureState } from './StructureChange.js';

// undefined denotes the SVG document root, which deliberately has no shape ID.
export interface ShapePosition {
  readonly parent: Shape | undefined;
  readonly index: number;
}

export class Document {
  private readonly root = new ChildList();
  private ids = new Map<string, Shape>();
  private parents = new Map<Shape, Shape | undefined>();

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
    return this.root.getChildren();
  }

  public find(id: string): Shape {
    const shape = this.ids.get(id);
    if (shape === undefined) {
      throw new Error(`no such shape: ${id}`);
    }
    return shape;
  }

  public findContainer(id: string): Shape {
    const shape = this.ids.get(id);
    if (shape === undefined) {
      throw new Error(`no such container: ${id}`);
    }
    this.requireChildList(shape);
    return shape;
  }

  public getParent(shape: Shape): Shape | undefined {
    this.requireActive(shape);
    return this.parents.get(shape);
  }

  public getPosition(shape: Shape): ShapePosition {
    const parent = this.getParent(shape);
    return { parent, index: this.parentList(parent).getChildren().indexOf(shape) };
  }

  public getSiblings(shape: Shape): readonly Shape[] {
    return this.parentList(this.getParent(shape)).getChildren();
  }

  public insert(shape: Shape, index?: number, parent?: Shape): number {
    if (this.ids.has(shape.getId())) {
      throw new Error(`id already exists: ${shape.getId()}`);
    }
    const list = this.parentList(parent);
    const children = [...list.getChildren()];
    const position = index ?? children.length;
    if (!Number.isInteger(position) || position < 0 || position > children.length) {
      throw new Error('invalid insertion index');
    }
    children.splice(position, 0, shape);
    this.applyStructure(new Map([[list, children]]));
    return position;
  }

  public remove(shape: Shape): void {
    const list = this.parentList(this.getParent(shape));
    this.applyStructure(new Map([[list, list.getChildren().filter((child) => child !== shape)]]));
  }

  public indexOf(shape: Shape): number {
    return this.getPosition(shape).index;
  }

  public reorder(shape: Shape, index: number): void {
    const { parent, index: originalIndex } = this.getPosition(shape);
    const list = this.parentList(parent);
    const children = [...list.getChildren()];
    if (!Number.isInteger(index) || index < 0 || index >= children.length) {
      throw new Error('invalid ordering index');
    }
    children.splice(originalIndex, 1);
    children.splice(index, 0, shape);
    this.applyStructure(new Map([[list, children]]));
  }

  public group(group: Shape, targets: readonly Shape[]): StructureChange {
    const groupList = this.requireChildList(group);
    if (this.ids.has(group.getId())) {
      throw new Error(`id already exists: ${group.getId()}`);
    }
    if (groupList.getChildren().length !== 0) {
      throw new Error('new group must be empty');
    }
    if (targets.length < 2) {
      throw new Error('group requires at least two shapes');
    }
    const selected = new Set<Shape>();
    for (const target of targets) {
      this.requireActive(target);
      if (selected.has(target)) {
        throw new Error(`duplicate group member: ${target.getId()}`);
      }
      selected.add(target);
    }
    // ids is rebuilt in document preorder after each structural change.
    const members = [...this.ids.values()].filter((shape) => selected.has(shape));
    for (const member of members) {
      for (let ancestor = this.getParent(member); ancestor !== undefined; ancestor = this.getParent(ancestor)) {
        if (selected.has(ancestor)) {
          throw new Error(`cannot group a container into its own descendant: ${ancestor.getId()}`);
        }
      }
    }
    const positions = members.map((member) => this.getPosition(member));
    const first = positions[0]!;
    const sameParent = positions.every((position) => position.parent === first.parent);
    const updates = new Map<ChildList, readonly Shape[]>();
    for (const position of positions) {
      const list = this.parentList(position.parent);
      updates.set(list, list.getChildren().filter((shape) => !selected.has(shape)));
    }
    const destination = this.parentList(sameParent ? first.parent : undefined);
    const remaining = [...(updates.get(destination) ?? destination.getChildren())];
    remaining.splice(sameParent ? first.index : remaining.length, 0, group);
    updates.set(destination, remaining);
    updates.set(groupList, members);
    return this.changeStructure(updates);
  }

  public addTo(container: Shape, shape: Shape): StructureChange {
    this.requireActive(container);
    this.requireActive(shape);
    const destination = this.requireChildList(container);
    if (container === shape) {
      throw new Error(`cannot add a container to itself: ${shape.getId()}`);
    }
    for (let ancestor = this.getParent(container); ancestor !== undefined; ancestor = this.getParent(ancestor)) {
      if (ancestor === shape) {
        throw new Error(`cannot move a container into its own descendant: ${shape.getId()}`);
      }
    }
    const source = this.parentList(this.getParent(shape));
    const updates = new Map<ChildList, readonly Shape[]>([
      [source, source.getChildren().filter((child) => child !== shape)],
    ]);
    updates.set(destination, [...(updates.get(destination) ?? destination.getChildren()), shape]);
    return this.changeStructure(updates);
  }

  public ungroup(group: Shape): StructureChange {
    const parent = this.getParent(group);
    const children = this.requireChildList(group);
    if (parent === undefined) {
      throw new Error(`cannot ungroup top-level container: ${group.getId()}`);
    }
    const siblings = this.parentList(parent);
    const replacement = siblings.getChildren().flatMap((shape) => shape === group ? children.getChildren() : [shape]);
    return this.changeStructure(new Map([
      [siblings, replacement],
      [children, []],
    ]));
  }

  private requireActive(shape: Shape): void {
    if (this.find(shape.getId()) !== shape) {
      throw new Error(`shape identity changed: ${shape.getId()}`);
    }
  }

  private requireChildList(shape: Shape): ChildList {
    const children = shape.getChildList();
    if (children === undefined) {
      throw new Error(`not a container: ${shape.getId()}`);
    }
    return children;
  }

  private parentList(parent: Shape | undefined): ChildList {
    if (parent === undefined) {
      return this.root;
    }
    this.requireActive(parent);
    return this.requireChildList(parent);
  }

  private changeStructure(after: StructureState): StructureChange {
    const before = new Map([...after.keys()].map((list) => [list, list.getChildren()]));
    this.applyStructure(after);
    return new StructureChange(before, after, (state) => this.applyStructure(state));
  }

  private applyStructure(updates: StructureState): void {
    const ids = new Map<string, Shape>();
    const parents = new Map<Shape, Shape | undefined>();
    const ancestors = new Set<Shape>();
    const visit = (list: ChildList, parent: Shape | undefined): void => {
      for (const shape of updates.get(list) ?? list.getChildren()) {
        if (ancestors.has(shape)) {
          throw new Error(`cyclic hierarchy: ${shape.getId()}`);
        }
        if (ids.has(shape.getId())) {
          throw new Error(`id already exists: ${shape.getId()}`);
        }
        ids.set(shape.getId(), shape);
        parents.set(shape, parent);
        const children = shape.getChildList();
        if (children !== undefined) {
          ancestors.add(shape);
          visit(children, shape);
          ancestors.delete(shape);
        }
      }
    };
    // All validation precedes mutation. The candidate index includes only nodes
    // reachable from the root, so deleted subtrees never remain active by ID.
    visit(this.root, undefined);
    for (const [list, children] of updates) {
      list.replaceValidated(children);
    }
    this.ids = ids;
    this.parents = parents;
  }
}
