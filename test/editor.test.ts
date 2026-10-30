import assert from 'node:assert/strict';
import test from 'node:test';
import { TestSession } from './TestSession.js';

test('create preserves ID, geometry, fill and root placement in tree/show', () => {
  const session = new TestSession();
  assert.equal(session.run('init 800 600'), 'canvas 800x600 created');
  assert.equal(session.run('create rect r1 10 20 100 50 #4a90d9'), 'rect#r1 created');
  assert.equal(session.run('tree'), 'svg (800x600)\n└── rect#r1  x=10 y=20 w=100 h=50 fill=#4a90d9');
  assert.equal(session.run('tree r1'), 'rect#r1  x=10 y=20 w=100 h=50 fill=#4a90d9');
  assert.equal(session.run('show r1'), [
    'rect#r1  parent=svg', '  x=10', '  y=20', '  width=100', '  height=50', '  fill=#4a90d9',
  ].join('\n'));
});

test('move, undo and redo restore exact geometry while preserving other attributes', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 10 20 100 50 #4a90d9');
  const original = session.run('show r1');
  assert.equal(session.run('move r1 30 -5'), 'rect#r1 moved: x=40 y=15 w=100 h=50 fill=#4a90d9');
  const moved = session.run('show r1');
  session.run('undo');
  assert.equal(session.run('show r1'), original);
  session.run('redo');
  assert.equal(session.run('show r1'), moved);
});

test('move uses snapshots rather than inverse arithmetic for floating point restoration', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 .1 -.1 2.5 3.5');
  const original = session.run('show r1');
  session.run('move r1 .2 -.2');
  const moved = session.run('show r1');
  for (let i = 0; i < 3; i += 1) {
    session.run('undo');
    assert.equal(session.run('show r1'), original);
    session.run('redo');
    assert.equal(session.run('show r1'), moved);
  }
});

test('create can be undone and redone with the same IDs, properties and sibling order', () => {
  const session = new TestSession();
  session.run('init');
  for (const id of ['a', 'b', 'c']) {
    session.run(`create rect ${id} 1 2 3 4`);
  }
  const tree = session.run('tree');
  assert.equal(session.run('undo'), 'rect#c removed');
  assert.equal(session.run('show c'), 'error: no such shape: c');
  session.run('undo');
  session.run('undo');
  assert.equal(session.run('tree'), 'svg (800x600)');
  assert.equal(session.run('undo'), 'error: nothing to undo');
  session.run('redo');
  session.run('redo');
  session.run('redo');
  assert.equal(session.run('tree'), tree);
  assert.equal(session.run('create rect b 0 0 1 1'), 'error: id already exists: b');
  assert.equal(session.run('redo'), 'error: nothing to redo');
});

test('a failed edit after undo preserves redo; a successful edit clears it', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 10 20 100 50');
  session.run('move r1 30 -5');
  const moved = session.run('show r1');
  session.run('undo');
  assert.equal(session.run('move r9 1 2'), 'error: no such shape: r9');
  assert.match(session.run('redo'), /^rect#r1 moved:/);
  assert.equal(session.run('show r1'), moved);
  session.run('undo');
  session.run('move r1 -2 3');
  assert.equal(session.run('redo'), 'error: nothing to redo');
  assert.match(session.run('show r1'), /x=8\n  y=23/);
  session.run('undo');
  assert.match(session.run('show r1'), /x=10\n  y=20/);
});

test('all failed edits leave document and both history directions intact', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 10 20 100 50');
  session.run('move r1 1 2');
  const moved = session.run('show r1');
  session.run('undo');
  const original = session.run('tree');
  const failures = [
    'create rect r1 0 0 1 1',
    'create rect r2 0 0 -1 1',
    'create rect r2 10abc 0 1 1',
    'move r9 1 2',
    'move r1 10abc 2',
    'move r1 NaN 2',
    'move r1 Infinity 2',
    'move r1 1e999 2',
    'move r1 0x10 2',
    'move r1 "" 2',
    'move r1 " 1 " 2',
    'move r1 1 2 extra',
    'create rect r2 0 0 1 1 blue extra',
    'create rect r2 0 0 1 1 in root',
    'create rect r2 0 0 1 1 blue in root',
    'create circle c1 1 2 -3',
    'create rect r2 0 0 1 1 "unclosed',
  ];
  for (const command of failures) {
    assert.match(session.run(command), /^error: [^\r\n]+$/, command);
    assert.equal(session.run('tree'), original, command);
  }
  session.run('redo');
  assert.equal(session.run('show r1'), moved);
  session.run('undo');
  session.run('undo');
  assert.equal(session.run('tree'), 'svg (800x600)');
});

test('overflow in the second coordinate changes neither coordinate nor redo', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 10 1e308 2 3');
  session.run('move r1 30 0');
  const moved = session.run('show r1');
  session.run('undo');
  const original = session.run('show r1');
  assert.equal(session.run('move r1 7 1e308'), 'error: y must be finite');
  assert.equal(session.run('show r1'), original);
  session.run('redo');
  assert.equal(session.run('show r1'), moved);
});

test('no document, history disabled and empty history have distinct errors', () => {
  const session = new TestSession();
  for (const command of ['tree', 'show r1', 'move r1 1 2', 'create rect r1 0 0 1 1', 'undo', 'redo']) {
    assert.equal(session.run(command), "error: no document. use 'init' or 'read' first");
  }
  assert.match(session.run('help'), /Implemented in this round:/);
  session.run('init');
  assert.equal(session.run('undo'), 'error: undo not allowed after io command');
  assert.equal(session.run('redo'), 'error: undo not allowed after io command');
  session.run('create rect r1 0 0 1 1');
  assert.equal(session.run('redo'), 'error: nothing to redo');
  session.run('undo');
  assert.equal(session.run('undo'), 'error: nothing to undo');
});

test('queries and failures do not lift init history prohibition; successful edits do', () => {
  const session = new TestSession();
  session.run('init');
  for (const command of [
    'tree', 'help', 'show r9', 'tree r9', 'move r9 1 2',
    'create rect r1 0 0 -1 1', 'init 0 10', 'create circle c1 1 2 -3',
  ]) {
    session.run(command);
    assert.equal(session.run('undo'), 'error: undo not allowed after io command', command);
    assert.equal(session.run('redo'), 'error: undo not allowed after io command', command);
  }
  session.run('create rect r1 0 0 1 1');
  assert.equal(session.run('undo'), 'rect#r1 removed');
  assert.equal(session.run('redo'), 'rect#r1 restored into svg');
});

test('invalid init preserves original document and pending redo', () => {
  const session = new TestSession();
  session.run('init 100 200');
  session.run('create rect r1 1 2 3 4');
  session.run('move r1 4 5');
  const moved = session.run('show r1');
  session.run('undo');
  const tree = session.run('tree');
  for (const command of ['init 100', 'init 0 10', 'init -1 1', 'init NaN 2', 'init 1 2 3', 'init 10abc 2']) {
    assert.match(session.run(command), /^error:/);
    assert.equal(session.run('tree'), tree);
  }
  session.run('redo');
  assert.equal(session.run('show r1'), moved);
  session.run('undo');
  session.run('undo');
  assert.equal(session.run('tree'), 'svg (100x200)');
});

test('successful init replaces the document and clears both history stacks', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect old 0 0 1 1');
  session.run('move old 1 2');
  session.run('undo');
  assert.equal(session.run('init 2.5 3.5'), 'canvas 2.5x3.5 created');
  assert.equal(session.run('tree'), 'svg (2.5x3.5)');
  assert.equal(session.run('show old'), 'error: no such shape: old');
  assert.equal(session.run('redo'), 'error: undo not allowed after io command');
  session.run('create rect old 0 0 1 1');
  assert.equal(session.run('redo'), 'error: nothing to redo');
  session.run('undo');
  assert.equal(session.run('undo'), 'error: nothing to undo');
  assert.equal(session.run('tree'), 'svg (2.5x3.5)');
});

test('successful and failed queries preserve redo and undo order', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 1 2 3 4');
  session.run('move r1 5 6');
  session.run('undo');
  for (const query of ['tree', 'tree r1', 'show r1', 'help', 'tree r9', 'show r9']) {
    session.run(query);
  }
  session.run('redo');
  assert.match(session.run('show r1'), /x=6\n  y=8/);
  session.run('undo');
  session.run('undo');
  assert.equal(session.run('tree'), 'svg (800x600)');
});

test('IDs are unique and case sensitive, omitted fill stays unset, zero-size rect is valid', () => {
  const session = new TestSession();
  session.run('init');
  assert.equal(session.run('create rect r1 -1.5 .2 0 0'), 'rect#r1 created');
  assert.doesNotMatch(session.run('show r1'), /fill=/);
  assert.equal(session.editor.requireDocument().find('r1').getFill(), undefined);
  assert.equal(session.run('create rect R1 0 0 1 1'), 'rect#R1 created');
  assert.equal(session.run('create rect r1 0 0 1 1'), 'error: id already exists: r1');
  assert.match(session.run('create rect "" 0 0 1 1'), /^error: id must/);
  assert.match(session.run('create rect "bad id" 0 0 1 1'), /^error: id must/);
});

test('undo releases IDs; creating a replacement after undo clears redo', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 1 2 3 4');
  session.run('undo');
  assert.equal(session.run('create rect r1 5 6 7 8 red'), 'rect#r1 created');
  assert.equal(session.run('redo'), 'error: nothing to redo');
  assert.equal(session.run('tree r1'), 'rect#r1  x=5 y=6 w=7 h=8 fill=red');
});

test('blank lines, comments, colors and quoted parameters work together', () => {
  const session = new TestSession();
  assert.equal(session.run(''), '');
  assert.equal(session.run('   # init should not execute "'), '');
  assert.equal(session.run('tree'), "error: no document. use 'init' or 'read' first");
  session.run('init');
  assert.equal(session.run('create rect "r1" "-1.5" 2 3 4 "#4a90d9"'), 'rect#r1 created');
  assert.match(session.run('show r1'), /fill=#4a90d9$/);
  assert.equal(session.run('create rect r2 0 0 1 1 "rgb(1, 2, 3)"'), 'rect#r2 created');
  assert.match(session.run('show r2'), /fill="rgb\(1, 2, 3\)"$/);
  assert.match(session.run('create rect r3 0 0 1 1 #fff # comment'), /^error: usage:/);
  assert.equal(session.run('show r3'), 'error: no such shape: r3');
});

test('pending commands and types report their stage; unknown shape error matches assignment', () => {
  const session = new TestSession();
  session.run('init');
  const before = session.run('tree');
  for (const name of ['read', 'save', 'canvas', 'group', 'ungroup', 'addto']) {
    assert.equal(session.run(name), `error: not implemented in this round: ${name}`);
  }
  for (const type of ['g']) {
    assert.equal(session.run(`create ${type} example`), `error: not implemented in this round: create ${type}`);
  }
  for (const type of ['hexagon', 'box']) {
    assert.equal(session.run(`create ${type} example`), `error: unknown shape type: ${type} (is the plugin loaded?)`);
  }
  assert.equal(session.run('tree'), before);
  assert.equal(session.run('undo'), 'error: undo not allowed after io command');
  const help = session.run('help');
  assert.match(help, /Implemented in this round:[\s\S]*create rect/);
  assert.match(help, /Later rounds \(not implemented\):[\s\S]*read <file.svg>/);
});

test('every implemented command rejects surplus arguments', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 0 0 1 1');
  const before = session.run('tree');
  for (const command of ['init 1 2 3', 'create rect r2 0 0 1 1 red extra', 'move r1 1 2 3', 'tree r1 extra', 'show r1 extra', 'undo extra', 'redo extra', 'help extra']) {
    assert.match(session.run(command), /^error: usage:/, command);
    assert.equal(session.run('tree'), before);
  }
  assert.equal(session.run('undo'), 'rect#r1 removed');
});

test('failed undo/redo keep the corresponding command available for retry', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect r1 1 2 3 4');
  const document = session.editor.requireDocument();
  const shape = document.find('r1');
  // Inject model conflicts to exercise failure paths unavailable in normal CLI use.
  document.remove(shape);
  assert.equal(session.run('undo'), 'error: no such shape: r1');
  document.insert(shape);
  assert.equal(session.run('undo'), 'rect#r1 removed');
  document.insert(shape);
  assert.equal(session.run('redo'), 'error: id already exists: r1');
  document.remove(shape);
  assert.equal(session.run('redo'), 'rect#r1 restored into svg');
  assert.equal(session.run('tree r1'), 'rect#r1  x=1 y=2 w=3 h=4');
});
