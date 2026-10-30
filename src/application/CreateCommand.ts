import type { Document, ShapePosition } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeFactory } from '../model/ShapeFactory.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class CreateCommand extends EditingCommand {
  private shape: Shape | undefined;
  private document: Document | undefined;
  private position: ShapePosition | undefined;

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
    let parameters = this.args.getAll().slice(2);
    let parentId: string | undefined;
    if (parameters.length >= 2 && parameters.at(-2) === 'in') {
      parentId = parameters.at(-1)!;
      parameters = parameters.slice(0, -2);
    }
    // The factory alone validates the remaining type-specific parameters.
    const shape = this.factory.create(this.args.get(0), this.args.get(1), parameters);
    const parent = parentId === undefined ? undefined : document.findContainer(parentId);
    const index = document.insert(shape, undefined, parent);
    this.shape = shape;
    this.document = document;
    this.position = { parent, index };
    return `${this.formatter.label(shape)} created${parent === undefined ? '' : ` in ${this.formatter.label(parent)}`}`;
  }

  public override undo(): string {
    const { document, shape } = this.requireCreated();
    document.remove(shape);
    return `${this.formatter.label(shape)} removed`;
  }

  public override redo(): string {
    const { document, shape, position } = this.requireCreated();
    document.insert(shape, position.index, position.parent);
    return `${this.formatter.label(shape)} restored into ${this.formatter.parent(document, shape)}`;
  }

  private requireCreated(): { document: Document; shape: Shape; position: ShapePosition } {
    if (this.document === undefined || this.shape === undefined || this.position === undefined) {
      throw new Error('create command has not executed');
    }
    return { document: this.document, shape: this.shape, position: this.position };
  }
}
