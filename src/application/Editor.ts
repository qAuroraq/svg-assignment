import { Document } from '../model/Document.js';
import type { HistoryManager } from './HistoryManager.js';

export class Editor {
  private document: Document | undefined;

  public constructor(private readonly history: HistoryManager) {}

  public initialize(width: number, height: number): Document {
    // Construction may fail. Replace the document and reset history only afterwards.
    const document = new Document(width, height);
    this.document = document;
    this.history.resetAfterDocumentCommand();
    return document;
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
