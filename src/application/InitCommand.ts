import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';

export class InitCommand extends Command {
  public constructor(private readonly editor: Editor, private readonly args: CommandArguments) {
    super();
  }

  public override execute(): string {
    const count = this.args.getAll().length;
    if (count !== 0 && count !== 2) {
      throw new Error('usage: init [w] [h] (omit both dimensions or provide both)');
    }
    const width = count === 0 ? 800 : this.args.number(0, 'width');
    const height = count === 0 ? 600 : this.args.number(1, 'height');
    const document = this.editor.initialize(width, height);
    return `canvas ${document.getWidth()}x${document.getHeight()} created`;
  }
}
