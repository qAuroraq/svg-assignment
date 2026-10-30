import assert from 'node:assert/strict';
import type { Shape } from '../src/model/Shape.js';
import { TestSession } from './TestSession.js';

export class HierarchySession extends TestSession {
  public execute(...commands: string[]): void {
    for (const command of commands) {
      assert.doesNotMatch(this.run(command), /^error:/, command);
      this.assertConsistent();
    }
  }

  public ids(parent?: string): string[] {
    const document = this.editor.requireDocument();
    const children = parent === undefined ? document.getChildren() : document.find(parent).getChildren();
    return children.map((shape) => shape.getId());
  }

  public assertParent(id: string, parent?: string): void {
    assert.equal(this.run(`show ${id}`).split('\n')[0]?.split('  ')[1], `parent=${parent === undefined ? 'svg' : `g#${parent}`}`);
  }

  public assertConsistent(): void {
    const document = this.editor.requireDocument();
    const seen = new Set<Shape>();
    const ids = new Set<string>();
    const visit = (children: readonly Shape[], parent?: Shape): void => {
      children.forEach((shape, index) => {
        assert.ok(!seen.has(shape), 'no cycle or multiple parent');
        assert.ok(!ids.has(shape.getId()), 'global ID uniqueness');
        seen.add(shape);
        ids.add(shape.getId());
        assert.strictEqual(document.find(shape.getId()), shape);
        assert.strictEqual(document.getParent(shape), parent);
        assert.deepEqual(document.getPosition(shape), { parent, index });
        visit(shape.getChildren(), shape);
      });
    };
    visit(document.getChildren());
  }
}
