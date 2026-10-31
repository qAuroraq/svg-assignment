import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import type { FileAccess } from '../src/io/FileAccess.js';
import type { ShapeDescription } from '../src/model/Shape.js';
import { HierarchySession } from './HierarchySession.js';

export class IoSession extends HierarchySession {
  private readonly directory = mkdtempSync(join(tmpdir(), 'svg-pj-test-'));

  public constructor(context: TestContext, files?: FileAccess) {
    super(files);
    context.after(() => rmSync(this.directory, { recursive: true, force: true }));
  }

  public path(name: string = ''): string {
    return join(this.directory, name);
  }

  public input(xml: string, name: string = 'input.svg'): string {
    const file = this.path(name);
    writeFileSync(file, xml, 'utf8');
    return file;
  }

  public state(): { width: number; height: number; shapes: readonly ShapeDescription[] } {
    const document = this.editor.requireDocument();
    return { width: document.getWidth(), height: document.getHeight(), shapes: document.getChildren().map((shape) => shape.describe()) };
  }
}
