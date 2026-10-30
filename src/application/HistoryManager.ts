import type { EditingCommand } from './EditingCommand.js';

export class HistoryManager {
  private readonly undoStack: EditingCommand[] = [];
  private readonly redoStack: EditingCommand[] = [];
  private disabledAfterDocumentCommand = false;

  public execute(command: EditingCommand): string {
    const result = command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.disabledAfterDocumentCommand = false;
    return result;
  }

  public resetAfterDocumentCommand(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.disabledAfterDocumentCommand = true;
  }

  public undo(): string {
    this.requireEnabled();
    const command = this.undoStack.at(-1);
    if (command === undefined) {
      throw new Error('nothing to undo');
    }
    const result = command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return result;
  }

  public redo(): string {
    this.requireEnabled();
    const command = this.redoStack.at(-1);
    if (command === undefined) {
      throw new Error('nothing to redo');
    }
    const result = command.redo();
    this.redoStack.pop();
    this.undoStack.push(command);
    return result;
  }

  private requireEnabled(): void {
    if (this.disabledAfterDocumentCommand) {
      throw new Error('undo not allowed after io command');
    }
  }
}
