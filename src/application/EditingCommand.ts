import { Command } from './Command.js';

export abstract class EditingCommand extends Command {
  public abstract undo(): string;
  public abstract redo(): string;
}
