import type { Shape } from '../model/Shape.js';
import type { StructureChange } from '../model/StructureChange.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class UngroupCommand extends EditingCommand {
  private state: { group: Shape; change: StructureChange } | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(1, 1, 'ungroup <gid>');
    const document = this.editor.requireDocument();
    const group = document.find(this.args.get(0));
    const change = document.ungroup(group);
    this.state = { group, change };
    return `${this.formatter.label(group)} ungrouped`;
  }

  public override undo(): string {
    const { group, change } = this.requireUngrouped();
    change.restoreBefore();
    return `${this.formatter.label(group)} restored`;
  }

  public override redo(): string {
    const { group, change } = this.requireUngrouped();
    change.restoreAfter();
    return `${this.formatter.label(group)} ungrouped`;
  }

  private requireUngrouped(): { group: Shape; change: StructureChange } {
    if (this.state === undefined) {
      throw new Error('ungroup command has not executed');
    }
    return this.state;
  }
}
