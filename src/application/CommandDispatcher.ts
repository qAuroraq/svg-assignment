import type { ShapeFactory } from '../model/ShapeFactory.js';
import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import { CreateCommand } from './CreateCommand.js';
import type { Editor } from './Editor.js';
import { EditingCommand } from './EditingCommand.js';
import { HelpCommand } from './HelpCommand.js';
import { InitCommand } from './InitCommand.js';
import { MoveCommand } from './MoveCommand.js';
import { RedoCommand } from './RedoCommand.js';
import type { ShapeFormatter } from './ShapeFormatter.js';
import { ShowCommand } from './ShowCommand.js';
import { TreeCommand } from './TreeCommand.js';
import { UndoCommand } from './UndoCommand.js';

export class CommandDispatcher {
  public constructor(
    private readonly editor: Editor,
    private readonly factory: ShapeFactory,
    private readonly formatter: ShapeFormatter,
  ) {}

  public dispatch(tokens: readonly string[]): string | undefined {
    const name = tokens[0];
    if (name === undefined) {
      return undefined;
    }
    const command = this.createCommand(name, new CommandArguments(tokens.slice(1)));
    return command instanceof EditingCommand
      ? this.editor.getHistory().execute(command)
      : command.execute();
  }

  // The only command-name dispatch; later refactoring can replace this switch
  // with registration without moving any selection logic into the CLI.
  private createCommand(name: string, args: CommandArguments): Command {
    switch (name) {
      case 'init': return new InitCommand(this.editor, args);
      case 'create': return new CreateCommand(this.editor, args, this.factory, this.formatter);
      case 'move': return new MoveCommand(this.editor, args, this.formatter);
      case 'tree': return new TreeCommand(this.editor, args, this.formatter);
      case 'show': return new ShowCommand(this.editor, args, this.formatter);
      case 'undo': return new UndoCommand(this.editor, args);
      case 'redo': return new RedoCommand(this.editor, args);
      case 'help': return new HelpCommand(args);
      case 'read':
      case 'save':
      case 'canvas':
      case 'delete':
      case 'scale':
      case 'set':
      case 'group':
      case 'ungroup':
      case 'addto':
      case 'front':
      case 'back':
        throw new Error(`not implemented in this round: ${name}`);
      default:
        throw new Error(`unknown command: ${name}`);
    }
  }
}
