import assert from 'node:assert/strict';
import test from 'node:test';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { HierarchySession } from './HierarchySession.js';

test('all six types support nested in creation, recursive tree and direct parent display', () => {
  const session = new HierarchySession();
  session.execute(
    'init', 'create g scene', 'create g inner in scene',
    'create rect r 1 2 3 4 red in inner', 'create circle c 5 6 7 in inner',
    'create ellipse e 8 9 10 11 in inner', 'create line l 0 1 2 3 black in inner',
    'create text t 12 13 "开始" in inner', 'create g empty in inner',
  );
  assert.equal(session.run('tree'), [
    'svg (800x600)', '└── g#scene', '    └── g#inner',
    '        ├── rect#r  x=1 y=2 w=3 h=4 fill=red',
    '        ├── circle#c  cx=5 cy=6 r=7',
    '        ├── ellipse#e  cx=8 cy=9 rx=10 ry=11',
    '        ├── line#l  x1=0 y1=1 x2=2 y2=3 stroke=black',
    '        ├── text#t  x=12 y=13 text="开始"', '        └── g#empty',
  ].join('\n'));
  assert.ok(session.run('tree inner').startsWith('g#inner\n├── rect#r'));
  assert.doesNotMatch(session.run('tree inner'), /g#scene/);
  for (const id of ['r', 'c', 'e', 'l', 't', 'empty']) session.assertParent(id, 'inner');
  session.assertParent('scene');
  session.assertParent('inner', 'scene');
  const before = session.run('tree');
  assert.equal(session.run('create circle r 1 2 3 in scene'), 'error: id already exists: r');
  assert.equal(session.run('create g t'), 'error: id already exists: t');
  assert.equal(session.run('tree'), before);
  session.execute('create text R 0 0 "case sensitive" in scene', 'undo');
  assert.equal(session.run('tree'), before);
  session.execute('undo');
  assert.equal(session.run('show empty'), 'error: no such shape: empty');
  session.execute('redo');
  assert.equal(session.run('tree'), before);
});

test('only the final in pair is a suffix; literal in, quotes and root IDs remain unambiguous', () => {
  const session = new HierarchySession();
  session.execute(
    'init', 'create g scene', 'create g in',
    'create text t1 0 0 "in"', 'create text t2 0 0 "in" in scene',
    'create text t3 0 0 "text in scene"', 'create text t4 0 0 "in" in in',
    'create rect r1 0 0 1 1 "in"', 'create rect r2 0 0 1 1 "in" in in',
  );
  assert.equal(session.run('tree t1'), 'text#t1  x=0 y=0 text="in"');
  assert.equal(session.run('tree t3'), 'text#t3  x=0 y=0 text="text in scene"');
  assert.equal(session.run('tree r1'), 'rect#r1  x=0 y=0 w=1 h=1 fill=in');
  session.assertParent('t2', 'scene');
  session.assertParent('t4', 'in');
  session.assertParent('r2', 'in');
  assert.equal(session.run('show svg'), 'error: no such shape: svg');
  session.execute('create g svg', 'create text user-root-name 0 0 "ok" in svg');
  session.assertParent('svg');
  session.assertParent('user-root-name', 'svg');
  const before = session.run('tree');
  for (const command of [
    'create text bad 0 0 "in" in scene in in', 'create g bad in scene in in',
    'create text bad 0 0 "hello" in scene extra', 'create g bad in',
    'create rect bad 0 0 1 1 red extra in scene', 'create rect bad 0 0 1 1 in scene in in',
  ]) {
    assert.match(session.run(command), /^error: usage:/, command);
    assert.equal(session.run('tree'), before);
    assert.equal(session.run('show bad'), 'error: no such shape: bad');
  }
});

test('bad parent, malformed parameters and nested ID conflicts never reserve new IDs', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g scene', 'create rect r 1 2 3 4 in scene');
  const before = session.run('tree');
  assert.equal(session.run('create text t 0 0 "hello" in missing'), 'error: no such container: missing');
  assert.equal(session.run('create text t 0 0 "hello" in r'), 'error: not a container: r');
  assert.equal(session.run('create circle r 1 2 3'), 'error: id already exists: r');
  assert.match(session.run('create text t NaN 0 "hello" in scene'), /^error: invalid number/);
  assert.equal(session.run('tree'), before);
  session.execute('create text t 0 0 "hello" in scene', 'undo', 'undo');
  assert.equal(session.run('tree'), 'svg (800x600)\n└── g#scene');
});

test('same-parent group uses preorder and earliest selected slot, with exact root/nested undo', () => {
  for (const nested of [false, true]) {
    const session = new HierarchySession();
    session.execute('init');
    if (nested) session.execute('create g parent');
    for (const id of ['a', 'b', 'c', 'd']) session.execute(`create rect ${id} 1 2 3 4${nested ? ' in parent' : ''}`);
    const before = session.run('tree');
    session.execute('group picked d b');
    assert.deepEqual(session.ids(nested ? 'parent' : undefined), ['a', 'picked', 'c']);
    assert.deepEqual(session.ids('picked'), ['b', 'd']);
    session.assertParent('picked', nested ? 'parent' : undefined);
    session.assertParent('b', 'picked');
    const picked = session.editor.requireDocument().find('picked');
    const grouped = session.run('tree');
    if (!nested) {
      assert.equal(session.run('ungroup picked'), 'error: cannot ungroup top-level container: picked');
    }
    session.execute('undo');
    assert.equal(session.run('tree'), before);
    assert.equal(session.run('show picked'), 'error: no such shape: picked');
    session.execute('redo');
    assert.strictEqual(session.editor.requireDocument().find('picked'), picked);
    assert.equal(session.run('tree'), grouped);
    session.execute('undo');
    assert.equal(session.run('tree'), before);
  }
});

test('cross-parent group appends at root and restores all parent indexes, retaining empty containers', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g gA', 'create g gB');
  for (const id of ['a1', 'a2']) session.execute(`create rect ${id} 1 2 3 4 in gA`);
  for (const id of ['b1', 'b2']) session.execute(`create rect ${id} 5 6 7 8 in gB`);
  const before = session.run('tree');
  session.execute('group merged b2 a1');
  assert.deepEqual(session.ids(), ['gA', 'gB', 'merged']);
  assert.deepEqual(session.ids('merged'), ['a1', 'b2']);
  assert.deepEqual(session.ids('gA'), ['a2']);
  assert.deepEqual(session.ids('gB'), ['b1']);
  session.assertParent('a1', 'merged');
  session.assertParent('merged');
  const after = session.run('tree');
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  session.assertParent('a1', 'gA');
  session.assertParent('b2', 'gB');
  session.execute('redo');
  assert.equal(session.run('tree'), after);
  session.execute('undo', 'group merged b2 a2 b1 a1');
  assert.deepEqual(session.ids('merged'), ['a1', 'a2', 'b1', 'b2']);
  assert.deepEqual(session.ids('gA'), []);
  assert.deepEqual(session.ids('gB'), []);
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  // One member at root, one nested: the root destination is still the end.
  session.execute('group mixed gB a1');
  assert.deepEqual(session.ids(), ['gA', 'mixed']);
  assert.deepEqual(session.ids('mixed'), ['a1', 'gB']);
  session.execute('undo');
  assert.equal(session.run('tree'), before);
});

test('invalid group input rejects repeats, missing members and ancestors in either argument order', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g top', 'create g middle in top', 'create g inner in middle',
    'create rect leaf 1 2 3 4 in inner', 'create text other 0 0 "x"');
  const before = session.run('tree');
  const failures = [
    ['group new leaf leaf', 'error: duplicate group member: leaf'],
    ['group new leaf missing', 'error: no such shape: missing'],
    ['group new top leaf', 'error: cannot group a container into its own descendant: top'],
    ['group new leaf top', 'error: cannot group a container into its own descendant: top'],
    ['group new middle leaf', 'error: cannot group a container into its own descendant: middle'],
    ['group new leaf middle', 'error: cannot group a container into its own descendant: middle'],
    ['group top leaf other', 'error: id already exists: top'],
    ['group "" leaf other', 'error: id must be non-empty and contain no whitespace'],
    ['group "bad id" leaf other', 'error: id must be non-empty and contain no whitespace'],
    ['group new leaf', 'error: usage: group <newGid> <id1> <id2>...'],
  ];
  for (const [command, error] of failures) {
    assert.equal(session.run(command!), error, command);
    assert.equal(session.run('tree'), before);
    assert.equal(session.run('show new'), 'error: no such shape: new');
    session.assertConsistent();
  }
});

test('addto rejects cycles, permits promotion and preserves the moved subtree geometry', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g top', 'create g middle in top', 'create g inner in middle',
    'create rect leaf 1 2 3 4 red in inner');
  const before = session.run('tree');
  assert.equal(session.run('addto inner inner'), 'error: cannot add a container to itself: inner');
  assert.equal(session.run('addto inner top'), 'error: cannot move a container into its own descendant: top');
  assert.equal(session.run('addto inner middle'), 'error: cannot move a container into its own descendant: middle');
  assert.equal(session.run('addto absent leaf'), 'error: no such container: absent');
  assert.equal(session.run('addto leaf inner'), 'error: not a container: leaf');
  assert.equal(session.run('tree'), before);
  const subtree = session.run('tree inner');
  session.execute('addto top inner');
  assert.deepEqual(session.ids('top'), ['middle', 'inner']);
  assert.deepEqual(session.ids('middle'), []);
  assert.equal(session.run('tree inner'), subtree);
  session.assertParent('inner', 'top');
  session.assertParent('leaf', 'inner');
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  session.execute('addto middle leaf');
  session.assertParent('leaf', 'middle');
  assert.deepEqual(session.ids('middle'), ['inner', 'leaf']);
  session.execute('undo');
  assert.equal(session.run('tree'), before);
});

test('addto within the same parent moves to the end and restores its original slot', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g p');
  for (const id of ['a', 'b', 'c']) session.execute(`create rect ${id} 1 2 3 4 in p`);
  const before = session.run('tree');
  session.execute('addto p b');
  assert.deepEqual(session.ids('p'), ['a', 'c', 'b']);
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  session.execute('redo');
  assert.deepEqual(session.ids('p'), ['a', 'c', 'b']);
  session.execute('undo', 'move c 1 0', 'undo', 'addto p c');
  assert.equal(session.run('tree'), before);
  assert.equal(session.run('redo'), 'error: nothing to redo');
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  session.execute('undo');
  assert.equal(session.run('show c'), 'error: no such shape: c');
});

test('ungroup expands children at the nested group slot and restores attributes, identities and subtree', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g p', 'create rect before 0 0 1 1 in p', 'create g inner in p',
    'create rect a 1 2 3 4 in inner', 'create g b in inner', 'create text t 5 6 "inside b" in b',
    'create rect after 7 8 9 10 in p', 'set inner fill red', 'set inner stroke-width 2');
  const document = session.editor.requireDocument();
  const inner = document.find('inner');
  const text = document.find('t');
  const before = session.run('tree');
  session.execute('ungroup inner');
  assert.deepEqual(session.ids('p'), ['before', 'a', 'b', 'after']);
  assert.equal(session.run('show inner'), 'error: no such shape: inner');
  session.assertParent('a', 'p');
  session.assertParent('b', 'p');
  session.assertParent('t', 'b');
  assert.doesNotMatch(session.run('show a'), /fill=/);
  const after = session.run('tree');
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  assert.strictEqual(document.find('inner'), inner);
  assert.strictEqual(document.find('t'), text);
  assert.match(session.run('show inner'), /fill=red\n  stroke-width=2$/);
  session.execute('redo');
  assert.equal(session.run('tree'), after);
  session.execute('undo');
  assert.equal(session.run('tree'), before);
});

test('nested empty ungroup is reversible; root groups, including empty ones, are forbidden', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g p', 'create g empty in p', 'create g root-empty');
  const before = session.run('tree');
  assert.equal(session.run('ungroup p'), 'error: cannot ungroup top-level container: p');
  assert.equal(session.run('ungroup root-empty'), 'error: cannot ungroup top-level container: root-empty');
  session.execute('ungroup empty');
  assert.deepEqual(session.ids('p'), []);
  assert.equal(session.run('show empty'), 'error: no such shape: empty');
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  session.execute('redo', 'undo');
  assert.equal(session.run('tree'), before);
});

test('nested front/back only reorder current siblings, for leaves and containers', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g p', 'create g q', 'create rect outside 0 0 1 1 in q',
    'create rect a 1 2 3 4 in p', 'create g inner in p', 'create text t 0 0 "x" in inner',
    'create circle c 1 2 3 in p');
  const before = session.run('tree');
  session.execute('front a');
  assert.deepEqual(session.ids('p'), ['inner', 'c', 'a']);
  assert.deepEqual(session.ids(), ['p', 'q']);
  assert.deepEqual(session.ids('q'), ['outside']);
  session.assertParent('a', 'p');
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  session.execute('back c');
  assert.deepEqual(session.ids('p'), ['c', 'a', 'inner']);
  session.execute('undo', 'front inner');
  assert.deepEqual(session.ids('p'), ['a', 'c', 'inner']);
  session.assertParent('t', 'inner');
  session.execute('undo', 'redo', 'undo');
  assert.equal(session.run('tree'), before);
});

test('subtree delete unregisters every ID and undo retains the original objects and parent slot', () => {
  const session = new HierarchySession();
  session.execute('init', 'create g p', 'create rect before 0 0 1 1 in p', 'create g inner in p',
    'create g deep in inner', 'create text t 1 2 "hello" in deep', 'set inner fill red',
    'create rect after 0 0 1 1 in p');
  const document = session.editor.requireDocument();
  const identities = ['inner', 'deep', 't'].map((id) => document.find(id));
  const before = session.run('tree');
  session.execute('delete inner');
  assert.deepEqual(session.ids('p'), ['before', 'after']);
  for (const shape of identities) assert.equal(session.run(`show ${shape.getId()}`), `error: no such shape: ${shape.getId()}`);
  // A descendant collision makes undo fail before any part of the subtree is inserted.
  const collision = new ShapeFactory().create('rect', 't', ['0', '0', '1', '1']);
  document.insert(collision);
  const conflict = session.run('tree');
  assert.equal(session.run('undo'), 'error: id already exists: t');
  assert.equal(session.run('tree'), conflict);
  assert.equal(session.run('show inner'), 'error: no such shape: inner');
  document.remove(collision);
  session.execute('undo');
  assert.equal(session.run('tree'), before);
  for (const shape of identities) assert.strictEqual(document.find(shape.getId()), shape);
  session.execute('redo', 'create rect t 5 6 7 8', 'undo', 'undo');
  assert.equal(session.run('tree'), before);
  assert.strictEqual(document.find('t'), identities[2]);
});
