import type { SvgReader } from '../io/SvgReader.js';
import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { Editor } from './Editor.js';

export class ReadCommand extends Command {
  public constructor(private readonly editor: Editor, private readonly args: CommandArguments, private readonly reader: SvgReader) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(1, 1, 'read <file.svg>');
    const file = this.args.get(0);
    const { document, warnings } = this.reader.read(file);
    this.editor.acceptRead(document, file);
    return [...warnings, `read ${file} (${document.countShapes()} elements)`].join('\n');
  }
}
