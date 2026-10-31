import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';

export class CanvasCommand extends Command {
  public constructor(private readonly editor: Editor, private readonly args: CommandArguments) {
    super();
  }

  public override execute(): string {
    const count = this.args.getAll().length;
    if (count !== 0 && count !== 2) {
      throw new Error('usage: canvas [w] [h] (omit both dimensions or provide both)');
    }
    const current = this.editor.requireDocument();
    if (count === 0) return `canvas ${current.getWidth()}x${current.getHeight()}`;
    const document = this.editor.resizeCanvas(this.args.number(0, 'width'), this.args.number(1, 'height'));
    return `canvas ${document.getWidth()}x${document.getHeight()} resized`;
  }
}
