import type { Shape, GeometryState } from '../model/Shape.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class MoveCommand extends EditingCommand {
  private shape: Shape | undefined;
  private before: GeometryState | undefined;
  private after: GeometryState | undefined;

  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(3, 3, 'move <id> <dx> <dy>');
    const shape = this.editor.requireDocument().find(this.args.get(0));
    const dx = this.args.number(1, 'dx');
    const dy = this.args.number(2, 'dy');
    const before = shape.captureGeometry();
    shape.move(dx, dy);
    this.shape = shape;
    this.before = before;
    this.after = shape.captureGeometry();
    return this.formatter.change(shape, 'moved');
  }

  public override undo(): string {
    const { shape, before } = this.requireMoved();
    shape.restoreGeometry(before);
    return this.formatter.change(shape, 'moved back');
  }

  public override redo(): string {
    const { shape, after } = this.requireMoved();
    shape.restoreGeometry(after);
    return this.formatter.change(shape, 'moved');
  }

  private requireMoved(): { shape: Shape; before: GeometryState; after: GeometryState } {
    if (this.shape === undefined || this.before === undefined || this.after === undefined) {
      throw new Error('move command has not executed');
    }
    return { shape: this.shape, before: this.before, after: this.after };
  }
}
