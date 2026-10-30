import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class ShowCommand extends Command {
  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(1, 1, 'show <id>');
    return this.formatter.show(this.editor.requireDocument().find(this.args.get(0)));
  }
}
