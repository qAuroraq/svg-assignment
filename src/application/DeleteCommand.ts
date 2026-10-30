import type { Document, ShapePosition } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class DeleteCommand extends EditingCommand {
  private state: { document: Document; shape: Shape; position: ShapePosition } | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(1, 1, 'delete <id>');
    const document = this.editor.requireDocument();
    const shape = document.find(this.args.get(0));
    const position = document.getPosition(shape);
    document.remove(shape);
    this.state = { document, shape, position };
    return `${this.formatter.label(shape)} deleted`;
  }

  public override undo(): string {
    const { document, shape, position } = this.requireDeleted();
    document.insert(shape, position.index, position.parent);
    return `${this.formatter.label(shape)} restored into ${this.formatter.parent(document, shape)}`;
  }

  public override redo(): string {
    const { document, shape } = this.requireDeleted();
    document.remove(shape);
    return `${this.formatter.label(shape)} deleted`;
  }

  private requireDeleted(): { document: Document; shape: Shape; position: ShapePosition } {
    if (this.state === undefined) {
      throw new Error('delete command has not executed');
    }
    return this.state;
  }
}
