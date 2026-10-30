import type { Shape, GeometryState } from '../model/Shape.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class ScaleCommand extends EditingCommand {
  private state: { shape: Shape; before: GeometryState; after: GeometryState } | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(2, 2, 'scale <id> <factor>');
    const shape = this.editor.requireDocument().find(this.args.get(0));
    const factor = this.args.number(1, 'scale factor');
    const before = shape.captureGeometry();
    shape.scale(factor);
    this.state = { shape, before, after: shape.captureGeometry() };
    return this.formatter.change(shape, 'scaled');
  }

  public override undo(): string {
    const { shape, before } = this.requireScaled();
    shape.restoreGeometry(before);
    return this.formatter.change(shape, 'scale restored');
  }

  public override redo(): string {
    const { shape, after } = this.requireScaled();
    shape.restoreGeometry(after);
    return this.formatter.change(shape, 'scaled');
  }

  private requireScaled(): { shape: Shape; before: GeometryState; after: GeometryState } {
    if (this.state === undefined) {
      throw new Error('scale command has not executed');
    }
    return this.state;
  }
}
