import assert from 'node:assert/strict';
import test from 'node:test';
import { TestSession } from './TestSession.js';

function rootIds(session: TestSession): string[] {
  return [...session.run('tree').matchAll(/\n[├└]── [^#]+#(\S+)/g)].map((match) => match[1]!);
}

test('delete restores the original middle position, all attributes, ID and object identity', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect a 0 0 1 1');
  session.run('create text b 10 20 "original"');
  session.run('create line c 0 0 100 50');
  const shape = session.editor.requireDocument().find('b');
  const original = session.run('show b');
  session.run('move b 5 -10');
  const moved = session.run('show b');
  session.run('set b text "changed 中文"');
  const changed = session.run('show b');
  session.run('set b stroke #123');
  const styled = session.run('show b');
  assert.equal(session.run('delete b'), 'text#b deleted');
  assert.deepEqual(rootIds(session), ['a', 'c']);
  assert.equal(session.run('show b'), 'error: no such shape: b');
  assert.equal(session.run('undo'), 'text#b restored into svg');
  assert.strictEqual(session.editor.requireDocument().find('b'), shape);
  assert.equal(session.run('show b'), styled);
  assert.deepEqual(rootIds(session), ['a', 'b', 'c']);
  assert.equal(session.run('create circle b 1 2 3'), 'error: id already exists: b');
  session.run('undo');
  assert.equal(session.run('show b'), changed);
  session.run('undo');
  assert.equal(session.run('show b'), moved);
  session.run('undo');
  assert.equal(session.run('show b'), original);
  for (let i = 0; i < 4; i += 1) {
    assert.doesNotMatch(session.run('redo'), /^error:/);
  }
  assert.equal(session.run('show b'), 'error: no such shape: b');
  assert.deepEqual(rootIds(session), ['a', 'c']);
  session.run('undo');
  assert.equal(session.run('show b'), styled);
  assert.deepEqual(rootIds(session), ['a', 'b', 'c']);
});

test('delete supports every leaf shape and releases IDs for successful new edits', () => {
  for (const create of [
    'create rect s 1 2 3 4 red', 'create circle s 1 2 3 red',
    'create ellipse s 1 2 3 4 red', 'create line s 1 2 3 4 black',
    'create text s 1 2 "hello"',
  ]) {
    const session = new TestSession();
    session.run('init');
    session.run(create);
    const before = session.run('tree');
    session.run('delete s');
    assert.equal(session.run('tree'), 'svg (800x600)');
    session.run('undo');
    assert.equal(session.run('tree'), before);
    session.run('redo');
    assert.equal(session.run('show s'), 'error: no such shape: s');
    assert.equal(session.run('create rect s 5 6 7 8'), 'rect#s created');
    assert.equal(session.run('redo'), 'error: nothing to redo');
  }
});

test('front/back preserve other siblings and undo restores exact prior indexes', () => {
  const session = new TestSession();
  session.run('init');
  for (const create of [
    'create rect a 1 2 3 4', 'create circle b 1 2 3', 'create ellipse c 1 2 3 4',
    'create line d 1 2 3 4', 'create text e 1 2 "hello"',
  ]) {
    session.run(create);
  }
  const initial = session.run('tree');
  session.run('front b');
  assert.deepEqual(rootIds(session), ['a', 'c', 'd', 'e', 'b']);
  const front = session.run('tree');
  session.run('undo');
  assert.equal(session.run('tree'), initial);
  session.run('redo');
  assert.equal(session.run('tree'), front);
  session.run('back d');
  assert.deepEqual(rootIds(session), ['d', 'a', 'c', 'e', 'b']);
  const back = session.run('tree');
  session.run('delete c');
  assert.deepEqual(rootIds(session), ['d', 'a', 'e', 'b']);
  session.run('undo');
  assert.equal(session.run('tree'), back);
  session.run('undo');
  assert.equal(session.run('tree'), front);
  session.run('undo');
  assert.equal(session.run('tree'), initial);
  session.run('redo');
  session.run('redo');
  session.run('redo');
  assert.deepEqual(rootIds(session), ['d', 'a', 'e', 'b']);
  session.run('undo');
  session.run('undo');
  session.run('undo');
  assert.equal(session.run('tree'), initial);
  session.run('back b');
  assert.deepEqual(rootIds(session), ['b', 'a', 'c', 'd', 'e']);
  session.run('undo');
  assert.equal(session.run('tree'), initial);
});

test('failed edits preserve state, order and the existing redo branch', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect a 10 20 30 40 red');
  session.run('create circle b 1 2 3');
  session.run('create line c 1 2 3 4 black');
  session.run('move a 5 6');
  const moved = session.run('show a');
  session.run('undo');
  const before = session.run('tree');
  for (const command of [
    'set a width -1', 'set a height 10abc', 'set a stroke-width -1', 'set a stroke-width NaN',
    'set a id other', 'set b width 3', 'set a w 3', 'set a text "wrong type"',
    'set a x Infinity', 'set a y 1e999', 'set a fill red extra', 'set missing fill red',
    'scale a 0', 'scale a -1', 'scale a -0', 'scale a NaN', 'scale a Infinity',
    'scale a 10abc', 'scale a 1e999', 'scale a 1e308', 'scale missing 2',
    'delete missing', 'front missing', 'back missing',
    'delete a extra', 'front a extra', 'back a extra', 'scale a 2 extra',
  ]) {
    assert.match(session.run(command), /^error: [^\r\n]+$/, command);
    assert.equal(session.run('tree'), before, command);
    // Prove each individual failure keeps the branch executable.
    assert.doesNotMatch(session.run('redo'), /^error:/, command);
    assert.equal(session.run('show a'), moved, command);
    session.run('undo');
    assert.equal(session.run('tree'), before, command);
  }
  session.run('undo');
  assert.equal(session.run('show c'), 'error: no such shape: c');
  assert.deepEqual(rootIds(session), ['a', 'b']);
});

test('unknown attributes use the original error and never mutate any shape', () => {
  const cases = [
    { create: 'create rect s 1 2 3 4', invalid: ['w', 'h', 'cx', 'text'] },
    { create: 'create circle s 1 2 3', invalid: ['x', 'y', 'width', 'text'] },
    { create: 'create ellipse s 1 2 3 4', invalid: ['r', 'x', 'width', 'text'] },
    { create: 'create line s 1 2 3 4', invalid: ['x', 'y', 'r', 'text'] },
    { create: 'create text s 1 2 "hello"', invalid: ['width', 'height', 'r', 'font-size', 'label'] },
  ];
  for (const shape of cases) {
    const session = new TestSession();
    session.run('init');
    session.run(shape.create);
    const before = session.run('show s');
    for (const attribute of [...shape.invalid, 'id', 'constructor', '__proto__']) {
      assert.equal(session.run(`set s ${attribute} 10`), `error: unknown attribute: ${attribute}`);
      assert.equal(session.run('show s'), before);
    }
    session.run('undo');
    assert.equal(session.run('tree'), 'svg (800x600)');
  }
});

test('all size/radius/stroke-width setters reject negative and non-finite values atomically', () => {
  const cases = [
    { create: 'create rect s 1 2 3 4', sizes: ['width', 'height'] },
    { create: 'create circle s 1 2 3', sizes: ['r'] },
    { create: 'create ellipse s 1 2 3 4', sizes: ['rx', 'ry'] },
    { create: 'create line s 1 2 3 4', sizes: [] },
    { create: 'create text s 1 2 "hello"', sizes: [] },
  ];
  for (const shape of cases) {
    const session = new TestSession();
    session.run('init');
    session.run(shape.create);
    const before = session.run('show s');
    for (const attribute of [...shape.sizes, 'stroke-width']) {
      for (const value of ['-1', 'NaN', 'Infinity', '1e999', '10abc', '""']) {
        assert.match(session.run(`set s ${attribute} ${value}`), /^error:/);
        assert.equal(session.run('show s'), before);
      }
    }
  }
});

test('move and scale overflow preserve every field and pending history for all five types', () => {
  for (const create of [
    'create rect s 10 1e308 2 3', 'create circle s 10 1e308 2',
    'create ellipse s 10 1e308 2 3', 'create line s 10 20 30 1e308',
    'create text s 10 1e308 "hello"',
  ]) {
    const session = new TestSession();
    session.run('init');
    session.run(create);
    session.run('set s stroke-width 2.5');
    session.run('move s 1 0');
    const moved = session.run('show s');
    session.run('undo');
    const before = session.run('tree');
    for (const command of ['scale s 2', 'move s 7 1e308']) {
      assert.match(session.run(command), /^error: \w+ must be finite$/, create);
      assert.equal(session.run('tree'), before, create);
      session.run('redo');
      assert.equal(session.run('show s'), moved, create);
      session.run('undo');
    }
    session.run('undo');
    assert.doesNotMatch(session.run('show s'), /stroke-width/);
  }
});

test('non-positive scale factors keep the exact assignment error', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect s 1 2 3 4');
  for (const factor of ['0', '-0', '-1', '-0.5']) {
    assert.equal(session.run(`scale s ${factor}`), 'error: scale factor must be positive');
  }
});

test('scale snapshots restore exact floating point values repeatedly', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect s .1 -.1 .2 .3');
  const before = session.run('show s');
  session.run('scale s 3');
  const after = session.run('show s');
  for (let i = 0; i < 3; i += 1) {
    session.run('undo');
    assert.equal(session.run('show s'), before);
    session.run('redo');
    assert.equal(session.run('show s'), after);
  }
});

test('successful no-op edits enter history and clear redo consistently', () => {
  for (const command of ['move s 0 0', 'scale s 1', 'set s x 10', 'set s fill red', 'front s', 'back s']) {
    const session = new TestSession();
    session.run('init');
    session.run('create rect s 10 20 30 40 red');
    const before = session.run('tree');
    session.run('move s 1 2');
    session.run('undo');
    assert.doesNotMatch(session.run(command), /^error:/, command);
    assert.equal(session.run('tree'), before, command);
    assert.equal(session.run('redo'), 'error: nothing to redo', command);
    assert.doesNotMatch(session.run('undo'), /^error:/, command);
    assert.equal(session.run('tree'), before, command);
    session.run('undo');
    assert.equal(session.run('tree'), 'svg (800x600)', command);
  }
});

test('new edits respect no-document errors and init history prohibition', () => {
  const session = new TestSession();
  const commands = ['set s fill red', 'scale s 2', 'delete s', 'front s', 'back s'];
  for (const command of commands) {
    assert.equal(session.run(command), "error: no document. use 'init' or 'read' first");
  }
  session.run('init');
  for (const command of commands) {
    assert.equal(session.run(command), 'error: no such shape: s');
    assert.equal(session.run('undo'), 'error: undo not allowed after io command');
    assert.equal(session.run('redo'), 'error: undo not allowed after io command');
  }
});
