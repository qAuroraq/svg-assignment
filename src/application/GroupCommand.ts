import type { Shape } from '../model/Shape.js';
import type { ShapeFactory } from '../model/ShapeFactory.js';
import type { StructureChange } from '../model/StructureChange.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class GroupCommand extends EditingCommand {
  private state: { group: Shape; change: StructureChange } | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly factory: ShapeFactory,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(3, Infinity, 'group <newGid> <id1> <id2>...');
    const document = this.editor.requireDocument();
    const group = this.factory.create('g', this.args.get(0), []);
    const targets = this.args.getAll().slice(1).map((id) => document.find(id));
    const change = document.group(group, targets);
    this.state = { group, change };
    return `${this.formatter.label(group)} created with ${targets.length} children`;
  }

  public override undo(): string {
    const { group, change } = this.requireGrouped();
    // Restore the saved lists directly; user-level top-level ungroup restrictions do not apply.
    change.restoreBefore();
    return `${this.formatter.label(group)} grouping undone`;
  }

  public override redo(): string {
    const { group, change } = this.requireGrouped();
    change.restoreAfter();
    return `${this.formatter.label(group)} restored with ${group.getChildren().length} children`;
  }

  private requireGrouped(): { group: Shape; change: StructureChange } {
    if (this.state === undefined) {
      throw new Error('group command has not executed');
    }
    return this.state;
  }
}
