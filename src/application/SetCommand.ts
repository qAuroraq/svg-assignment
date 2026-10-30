import type { Shape, AttributeValue } from '../model/Shape.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class SetCommand extends EditingCommand {
  private state: {
    shape: Shape; attribute: string;
    before: AttributeValue | undefined; after: AttributeValue | undefined;
  } | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(3, 3, 'set <id> <attr> <value>');
    const shape = this.editor.requireDocument().find(this.args.get(0));
    const attribute = this.args.get(1);
    const before = shape.getAttributes()[attribute];
    shape.setAttribute(attribute, this.args.get(2));
    this.state = { shape, attribute, before, after: shape.getAttributes()[attribute] };
    return this.formatter.change(shape, 'updated');
  }

  public override undo(): string {
    const { shape, attribute, before } = this.requireSet();
    shape.setAttribute(attribute, before);
    return this.formatter.change(shape, 'restored');
  }

  public override redo(): string {
    const { shape, attribute, after } = this.requireSet();
    shape.setAttribute(attribute, after);
    return this.formatter.change(shape, 'updated');
  }

  private requireSet(): NonNullable<SetCommand['state']> {
    if (this.state === undefined) {
      throw new Error('set command has not executed');
    }
    return this.state;
  }
}
