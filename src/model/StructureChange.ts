import type { ChildList } from './ChildList.js';
import type { Shape } from './Shape.js';

export type StructureState = ReadonlyMap<ChildList, readonly Shape[]>;

// Only affected child lists are saved. All entries retain their original objects.
export class StructureChange {
  public constructor(
    private readonly before: StructureState,
    private readonly after: StructureState,
    private readonly apply: (state: StructureState) => void,
  ) {}

  public restoreBefore(): void {
    this.apply(this.before);
  }

  public restoreAfter(): void {
    this.apply(this.after);
  }
}
