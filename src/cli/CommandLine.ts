import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CommandDispatcher } from '../application/CommandDispatcher.js';
import type { InputParser } from './InputParser.js';

export class CommandLine {
  public constructor(
    private readonly parser: InputParser,
    private readonly dispatcher: CommandDispatcher,
  ) {}

  public processLine(line: string): string | undefined {
    try {
      return this.dispatcher.dispatch(this.parser.parse(line));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `error: ${message.replace(/[\r\n\u2028\u2029]/gu, ' ')}`;
    }
  }

  public start(input: Readable, output: Writable, interactive: boolean): void {
    const reader = createInterface({ input, output, terminal: interactive, crlfDelay: Infinity });
    reader.setPrompt('svg>');
    if (interactive) {
      output.write("svg-editor 0.1 — type 'help' for commands\n");
      reader.prompt();
    }
    reader.on('line', (line) => {
      const result = this.processLine(line);
      if (result !== undefined) {
        output.write(`${result}\n`);
      }
      if (interactive) {
        reader.prompt();
      }
    });
  }
}
