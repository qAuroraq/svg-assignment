import type { SvgWriter } from '../io/SvgWriter.js';
import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';

export class SaveCommand extends Command {
  public constructor(private readonly editor: Editor, private readonly args: CommandArguments, private readonly writer: SvgWriter) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(0, 1, 'save [file.svg]');
    const document = this.editor.requireDocument();
    const file = this.args.getAll().length === 0 ? this.editor.requireSavePath() : this.args.get(0);
    this.writer.write(document, file);
    this.editor.saved();
    return `saved to ${file} (${document.countShapes()} elements)`;
  }
}
