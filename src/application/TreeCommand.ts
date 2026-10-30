import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';
import type { ShapeFormatter } from './ShapeFormatter.js';

export class TreeCommand extends Command {
  public constructor(
    private readonly editor: Editor,
    private readonly args: CommandArguments,
    private readonly formatter: ShapeFormatter,
  ) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(0, 1, 'tree [id]');
    const document = this.editor.requireDocument();
    const root = this.args.getAll().length === 0 ? undefined : document.find(this.args.get(0));
    return this.formatter.tree(document, root);
  }
}
