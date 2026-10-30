import { CommandDispatcher } from '../src/application/CommandDispatcher.js';
import { Editor } from '../src/application/Editor.js';
import { HistoryManager } from '../src/application/HistoryManager.js';
import { ShapeFormatter } from '../src/application/ShapeFormatter.js';
import { CommandLine } from '../src/cli/CommandLine.js';
import { InputParser } from '../src/cli/InputParser.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';

export class TestSession {
  public readonly editor = new Editor(new HistoryManager());
  private readonly cli = new CommandLine(
    new InputParser(),
    new CommandDispatcher(this.editor, new ShapeFactory(), new ShapeFormatter()),
  );

  public run(line: string): string {
    return this.cli.processLine(line) ?? '';
  }
}
