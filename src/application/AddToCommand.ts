import type { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { StructureChange } from '../model/StructureChange.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class AddToCommand extends EditingCommand {
  private state: { document: Document; shape: Shape; change: StructureChange } | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(2, 2, 'addto <gid> <id>');
    const document = this.editor.requireDocument();
    const container = document.findContainer(this.args.get(0));
    const shape = document.find(this.args.get(1));
    const change = document.addTo(container, shape);
    this.state = { document, shape, change };
    return `${this.formatter.label(shape)} added to ${this.formatter.parent(document, shape)}`;
  }

  public override undo(): string {
    const { document, shape, change } = this.requireAdded();
    change.restoreBefore();
    return `${this.formatter.label(shape)} restored into ${this.formatter.parent(document, shape)}`;
  }

  public override redo(): string {
    const { document, shape, change } = this.requireAdded();
    change.restoreAfter();
    return `${this.formatter.label(shape)} added to ${this.formatter.parent(document, shape)}`;
  }

  private requireAdded(): { document: Document; shape: Shape; change: StructureChange } {
    if (this.state === undefined) {
      throw new Error('addto command has not executed');
    }
    return this.state;
  }
}
