import { CommandDispatcher } from './application/CommandDispatcher.js';
import { Editor } from './application/Editor.js';
import { HistoryManager } from './application/HistoryManager.js';
import { ShapeFormatter } from './application/ShapeFormatter.js';
import { CommandLine } from './cli/CommandLine.js';
import { InputParser } from './cli/InputParser.js';
import { ShapeFactory } from './model/ShapeFactory.js';
import { FileAccess } from './io/FileAccess.js';
import { SvgReader } from './io/SvgReader.js';
import { SvgWriter } from './io/SvgWriter.js';

export class Main {
  public run(): void {
    const editor = new Editor(new HistoryManager());
    const factory = new ShapeFactory();
    const files = new FileAccess();
    const dispatcher = new CommandDispatcher(editor, factory, new ShapeFormatter(), new SvgReader(factory, files), new SvgWriter(files));
    const cli = new CommandLine(new InputParser(), dispatcher);
    cli.start(process.stdin, process.stdout, Boolean(process.stdin.isTTY && process.stdout.isTTY));
  }
}

new Main().run();
