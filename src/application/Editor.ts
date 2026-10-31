import { Document } from '../model/Document.js';
import type { HistoryManager } from './HistoryManager.js';

export class Editor {
  private document: Document | undefined;
  private readPath: string | undefined;

  public constructor(private readonly history: HistoryManager) {}

  public initialize(width: number, height: number): Document {
    // Construction may fail. Replace the document and reset history only afterwards.
    const document = new Document(width, height);
    this.document = document;
    this.readPath = undefined;
    this.history.resetAfterDocumentCommand();
    return document;
  }

  public acceptRead(document: Document, path: string): void {
    this.document = document;
    this.readPath = path;
    this.history.resetAfterDocumentCommand();
  }

  public requireSavePath(): string {
    if (this.readPath === undefined) {
      throw new Error('no save path. use \'save <file.svg>\' or read a file first');
    }
    return this.readPath;
  }

  public resizeCanvas(width: number, height: number): Document {
    const document = this.requireDocument();
    document.resize(width, height);
    this.history.resetAfterDocumentCommand();
    return document;
  }

  public saved(): void {
    this.history.resetAfterDocumentCommand();
  }

  public requireDocument(): Document {
    if (this.document === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.document;
  }

  public getHistory(): HistoryManager {
    return this.history;
  }
}
