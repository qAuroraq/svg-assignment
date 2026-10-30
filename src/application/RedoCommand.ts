import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';

export class RedoCommand extends Command {
  public constructor(private readonly editor: Editor, private readonly args: CommandArguments) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(0, 0, 'redo');
    this.editor.requireDocument();
    return this.editor.getHistory().redo();
  }
}
