import type { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class OrderCommand extends EditingCommand {
  private state: { document: Document; shape: Shape; before: number; after: number } | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
    private readonly toFront: boolean,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(1, 1, `${this.toFront ? 'front' : 'back'} <id>`);
    const document = this.editor.requireDocument();
    const shape = document.find(this.args.get(0));
    const before = document.indexOf(shape);
    const after = this.toFront ? document.getChildren().length - 1 : 0;
    document.reorder(shape, after);
    this.state = { document, shape, before, after };
    return `${this.formatter.label(shape)} moved to ${this.toFront ? 'front' : 'back'} of svg`;
  }

  public override undo(): string {
    const { document, shape, before } = this.requireOrdered();
    document.reorder(shape, before);
    return `${this.formatter.label(shape)} order restored`;
  }

  public override redo(): string {
    const { document, shape, after } = this.requireOrdered();
    document.reorder(shape, after);
    return `${this.formatter.label(shape)} moved to ${this.toFront ? 'front' : 'back'} of svg`;
  }

  private requireOrdered(): { document: Document; shape: Shape; before: number; after: number } {
    if (this.state === undefined) {
      throw new Error('order command has not executed');
    }
    return this.state;
  }
}
