import { CommandDispatcher } from '../src/application/CommandDispatcher.js';
import { Editor } from '../src/application/Editor.js';
import { HistoryManager } from '../src/application/HistoryManager.js';
import { ShapeFormatter } from '../src/application/ShapeFormatter.js';
import { CommandLine } from '../src/cli/CommandLine.js';
import { InputParser } from '../src/cli/InputParser.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { FileAccess } from '../src/io/FileAccess.js';
import { SvgReader } from '../src/io/SvgReader.js';
import { SvgWriter } from '../src/io/SvgWriter.js';

export class TestSession {
  public readonly editor = new Editor(new HistoryManager());
  private readonly cli: CommandLine;

  public constructor(files = new FileAccess()) {
    const factory = new ShapeFactory();
    this.cli = new CommandLine(new InputParser(), new CommandDispatcher(
      this.editor, factory, new ShapeFormatter(), new SvgReader(factory, files), new SvgWriter(files),
    ));
  }

  public run(line: string): string {
    return this.cli.processLine(line) ?? '';
  }
}
