import assert from 'node:assert/strict';
import test from 'node:test';
import { HierarchySession } from './HierarchySession.js';

test('deep group transforms each leaf once and restores geometry without changing styles or text', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g scene', 'create rect r 1 2 3 4 red in scene',
    'create g inner in scene', 'create circle c 5 6 7 in inner',
    'create ellipse e 8 9 10 11 in inner', 'create g deeper in inner',
    'create line l 0 0 100 50 black in deeper', 'create text t 12 13 "开始 in scene" in deeper',
    'set scene fill blue', 'set scene stroke-width 3', 'set l stroke-width 2');
  const original = session.run('tree');
  session.execute('move scene 5 -10');
  assert.equal(session.run('tree r'), 'rect#r  x=6 y=-8 w=3 h=4 fill=red');
  assert.equal(session.run('tree c'), 'circle#c  cx=10 cy=-4 r=7');
  assert.equal(session.run('tree e'), 'ellipse#e  cx=13 cy=-1 rx=10 ry=11');
  assert.equal(session.run('tree l'), 'line#l  x1=5 y1=-10 x2=105 y2=40 stroke=black stroke-width=2');
  assert.equal(session.run('tree t'), 'text#t  x=17 y=3 text="开始 in scene"');
  const moved = session.run('tree');
  session.execute('scale scene 2');
  assert.equal(session.run('tree r'), 'rect#r  x=12 y=-16 w=6 h=8 fill=red');
  assert.equal(session.run('tree c'), 'circle#c  cx=20 cy=-8 r=14');
  assert.equal(session.run('tree e'), 'ellipse#e  cx=26 cy=-2 rx=20 ry=22');
  assert.equal(session.run('tree l'), 'line#l  x1=10 y1=-20 x2=210 y2=80 stroke=black stroke-width=2');
  assert.equal(session.run('tree t'), 'text#t  x=34 y=6 text="开始 in scene"');
  assert.equal(session.run('show scene'), 'g#scene  parent=svg\n  fill=blue\n  stroke-width=3');
  const scaled = session.run('tree');
  session.execute('undo');
  assert.equal(session.run('tree'), moved);
  session.execute('undo');
  assert.equal(session.run('tree'), original);
  session.execute('redo', 'redo');
  assert.equal(session.run('tree'), scaled);
});

test('group transforms are not reapplied when new children are created or moved into it', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g p', 'create rect old 1 2 3 4 in p',
    'move p 100 200', 'scale p 2', 'create rect fresh 1 2 3 4 in p',
    'create rect imported 5 6 7 8', 'addto p imported');
  assert.equal(session.run('tree old'), 'rect#old  x=202 y=404 w=6 h=8');
  assert.equal(session.run('tree fresh'), 'rect#fresh  x=1 y=2 w=3 h=4');
  assert.equal(session.run('tree imported'), 'rect#imported  x=5 y=6 w=7 h=8');
  session.execute('undo', 'undo', 'undo', 'undo');
  assert.equal(session.run('tree old'), 'rect#old  x=101 y=202 w=3 h=4');
  session.execute('undo');
  assert.equal(session.run('tree old'), 'rect#old  x=1 y=2 w=3 h=4');
});

test('group styles are explicit, reversible, and do not overwrite or synthesize child styles', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g p', 'create rect r 1 2 3 4 red in p',
    'create text t 0 0 "hello" in p', 'set p fill blue');
  assert.match(session.run('show p'), /fill=blue$/);
  assert.match(session.run('show r'), /fill=red$/);
  assert.doesNotMatch(session.run('show t'), /fill=/);
  session.execute('undo');
  assert.equal(session.run('show p'), 'g#p  parent=svg');
  session.execute('redo', 'set p stroke black', 'set p stroke-width 2.5');
  assert.equal(session.run('show p'), 'g#p  parent=svg\n  fill=blue\n  stroke=black\n  stroke-width=2.5');
  const before = session.run('tree');
  for (const attr of ['x', 'y', 'width', 'height', 'text', 'id', 'font-size']) {
    assert.equal(session.run(`set p ${attr} 1`), `error: unknown attribute: ${attr}`);
  }
  for (const value of ['-1', '10abc', 'NaN', 'Infinity']) {
    assert.match(session.run(`set p stroke-width ${value}`), /^error:/);
  }
  assert.equal(session.run('tree'), before);
  session.execute('undo', 'undo', 'undo');
  assert.equal(session.run('show p'), 'g#p  parent=svg');
  assert.match(session.run('show r'), /fill=red$/);
});

test('overflow in a late nested descendant rolls back every earlier leaf and subgroup, preserving redo', () => {
  for (const failing of ['scale p 2', 'move p 5 1e308']) {
    const session = new HierarchySession();
    session.execute('init', 'create g p', 'create rect first 1 2 3 4 red in p',
      'create g completed in p', 'create circle c 5 6 7 in completed',
      'create g deep in p', 'create text t 3 4 "unchanged" in deep',
      'create rect overflow 10 1e308 1 1 in deep', 'set p fill blue',
      'move first 10 20');
    const afterRedo = session.run('tree');
    session.execute('undo');
    const before = session.run('tree');
    const document = session.editor.requireDocument();
    const identities = ['p', 'first', 'completed', 'c', 'deep', 't', 'overflow'].map((id) => document.find(id));
    assert.match(session.run(failing), /^error: y must be finite$/);
    assert.equal(session.run('tree'), before);
    assert.equal(document.find('overflow').getAttributes().x, 10);
    for (const shape of identities) assert.strictEqual(document.find(shape.getId()), shape);
    session.assertConsistent();
    session.execute('redo');
    assert.equal(session.run('tree'), afterRedo);
    session.execute('undo', 'undo');
    assert.equal(session.run('show p'), 'g#p  parent=svg');
  }
});

test('empty group move/scale and other successful no-ops count as one edit; invalid factor still fails', () => {
  for (const command of ['move empty 3 4', 'scale empty 2', 'scale empty 1', 'front empty', 'back empty']) {
    const session = new HierarchySession();
    session.execute('init', 'create g empty', 'set empty fill red', 'undo');
    for (const factor of ['0', '-1']) {
      assert.equal(session.run(`scale empty ${factor}`), 'error: scale factor must be positive');
    }
    assert.match(session.run('scale empty Infinity'), /^error:/);
    session.execute(command);
    assert.equal(session.run('redo'), 'error: nothing to redo');
    session.execute('undo');
    assert.equal(session.run('show empty'), 'g#empty  parent=svg');
    session.execute('undo');
    assert.equal(session.run('show empty'), 'error: no such shape: empty');
  }
});

test('leaf edit, whole-group move and subtree delete undo in order on the same live objects', () => {
  for (const leafEdit of ['move leaf 10 20', 'set leaf text "updated"', 'set leaf fill red']) {
    const session = new HierarchySession();
    session.execute('init', 'create g scene', 'create g inner in scene',
      'create text leaf 1 2 "original" in inner', 'create rect sibling 3 4 5 6 in scene');
    const document = session.editor.requireDocument();
    const group = document.find('scene');
    const leaf = document.find('leaf');
    const original = session.run('tree');
    session.execute(leafEdit);
    const edited = session.run('tree');
    session.execute('move scene 100 -20');
    const moved = session.run('tree');
    session.execute('delete scene');
    assert.equal(session.run('tree'), 'svg (800x600)');
    session.execute('undo');
    assert.equal(session.run('tree'), moved);
    assert.strictEqual(document.find('scene'), group);
    assert.strictEqual(document.find('leaf'), leaf);
    session.execute('undo');
    assert.equal(session.run('tree'), edited);
    session.execute('undo');
    assert.equal(session.run('tree'), original);
    session.execute('redo', 'redo');
    assert.equal(session.run('tree'), moved);
    session.execute('redo', 'undo');
    assert.equal(session.run('tree'), moved);
    assert.strictEqual(document.find('leaf'), leaf);
  }
});

test('interleaved hierarchy and geometry commands undo/redo exact trees one command at a time', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g p', 'create g q', 'create rect a 1 2 3 4 in p',
    'create text b 5 6 "b" in p', 'create circle c 7 8 9 in p', 'create ellipse d 1 2 3 4 in q');
  const identities = ['p', 'q', 'a', 'b', 'c', 'd'].map((id) => session.editor.requireDocument().find(id));
  const commands = [
    'set a x 20', 'group picked c a', 'move picked 2 3', 'addto q picked',
    'set picked fill blue', 'scale q 2', 'ungroup picked', 'back c',
    'group mixed b d', 'addto mixed q', 'front b', 'delete mixed',
  ];
  const states = [session.run('tree')];
  for (const command of commands) {
    session.execute(command);
    states.push(session.run('tree'));
  }
  for (let index = commands.length - 1; index >= 0; index--) {
    session.execute('undo');
    assert.equal(session.run('tree'), states[index]);
  }
  for (const shape of identities) assert.strictEqual(session.editor.requireDocument().find(shape.getId()), shape);
  for (let index = 0; index < commands.length; index++) {
    session.execute('redo');
    assert.equal(session.run('tree'), states[index + 1]);
  }
});

test('failed hierarchy edits and queries preserve redo; init still disables history until a success', () => {
  const session = new HierarchySession();
  for (const command of ['create g p', 'group picked a b', 'addto p a', 'ungroup p']) {
    assert.equal(session.run(command), "error: no document. use 'init' or 'read' first");
  }
  session.execute('init');
  for (const command of ['create g bad in missing', 'group picked a b', 'addto p a', 'ungroup p']) {
    assert.match(session.run(command), /^error:/);
  }
  session.run('help');
  session.run('tree');
  assert.equal(session.run('undo'), 'error: undo not allowed after io command');
  assert.equal(session.run('redo'), 'error: undo not allowed after io command');
  session.execute('create g p', 'create g inner in p', 'create rect a 1 2 3 4 in inner',
    'create circle b 1 2 3 in p', 'group picked b a');
  const grouped = session.run('tree');
  session.execute('undo');
  const before = session.run('tree');
  for (const command of [
    'group failed p a', 'group failed a a', 'group failed a missing',
    'addto inner p', 'addto inner inner', 'addto missing a', 'addto a b',
    'ungroup p', 'ungroup a', 'ungroup missing', 'create g failed in missing',
    'create rect a 0 0 1 1', 'init 0 600',
  ]) {
    assert.match(session.run(command), /^error:/, command);
    assert.equal(session.run('tree'), before);
    session.assertConsistent();
  }
  session.run('help');
  session.run('tree p');
  session.assertParent('a', 'inner');
  session.execute('redo');
  assert.equal(session.run('tree'), grouped);
  session.execute('init');
  assert.equal(session.run('undo'), 'error: undo not allowed after io command');
  session.execute('create g fresh', 'undo');
  assert.equal(session.run('undo'), 'error: nothing to undo');
});
