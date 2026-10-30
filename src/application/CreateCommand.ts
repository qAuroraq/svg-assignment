import type { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeFactory } from '../model/ShapeFactory.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class CreateCommand extends EditingCommand {
  private shape: Shape | undefined;
  private document: Document | undefined;
  private index: number | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly factory: ShapeFactory,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(2, Number.POSITIVE_INFINITY, 'create <type> <id> <params...>');
    const document = this.editor.requireDocument();
    const parameters = this.args.getAll().slice(2);
    if (parameters.length >= 6 && parameters.at(-2) === 'in') {
      throw new Error('not implemented in this round: create ... in <containerId>');
    }
    const shape = this.factory.create(this.args.get(0), this.args.get(1), parameters);
    const index = document.insert(shape);
    this.shape = shape;
    this.document = document;
    this.index = index;
    return `${this.formatter.label(shape)} created`;
  }

  public override undo(): string {
    const { document, shape } = this.requireCreated();
    document.remove(shape);
    return `${this.formatter.label(shape)} removed`;
  }

  public override redo(): string {
    const { document, shape, index } = this.requireCreated();
    document.insert(shape, index);
    return `${this.formatter.label(shape)} restored into svg`;
  }

  private requireCreated(): { document: Document; shape: Shape; index: number } {
    if (this.document === undefined || this.shape === undefined || this.index === undefined) {
      throw new Error('create command has not executed');
    }
    return { document: this.document, shape: this.shape, index: this.index };
  }
}
