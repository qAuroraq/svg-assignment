import type { Shape } from './Shape.js';

export class ChildList {
  private children: readonly Shape[] = [];

  public getChildren(): readonly Shape[] {
    return [...this.children];
  }

  /** @internal Document calls this only after validating the complete candidate tree. */
  public replaceValidated(children: readonly Shape[]): void {
    this.children = [...children];
  }
}
