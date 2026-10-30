import assert from 'node:assert/strict';
import test from 'node:test';
import { TestSession } from './TestSession.js';

const shapes = [
  {
    create: 'create rect s 10 20 30 40 red',
    tree: 'rect#s  x=10 y=20 w=30 h=40 fill=red',
    moved: 'rect#s  x=15 y=10 w=30 h=40 fill=red',
    scaled: 'rect#s  x=20 y=40 w=60 h=80 fill=red',
    attributes: { x: 10, y: 20, width: 30, height: 40, fill: 'red' },
  },
  {
    create: 'create circle s 100 100 20 #abc',
    tree: 'circle#s  cx=100 cy=100 r=20 fill=#abc',
    moved: 'circle#s  cx=105 cy=90 r=20 fill=#abc',
    scaled: 'circle#s  cx=200 cy=200 r=40 fill=#abc',
    attributes: { cx: 100, cy: 100, r: 20, fill: '#abc' },
  },
  {
    create: 'create ellipse s -10 20 30 15 blue',
    tree: 'ellipse#s  cx=-10 cy=20 rx=30 ry=15 fill=blue',
    moved: 'ellipse#s  cx=-5 cy=10 rx=30 ry=15 fill=blue',
    scaled: 'ellipse#s  cx=-20 cy=40 rx=60 ry=30 fill=blue',
    attributes: { cx: -10, cy: 20, rx: 30, ry: 15, fill: 'blue' },
  },
  {
    create: 'create line s 0 0 100 50 #333',
    tree: 'line#s  x1=0 y1=0 x2=100 y2=50 stroke=#333',
    moved: 'line#s  x1=5 y1=-10 x2=105 y2=40 stroke=#333',
    scaled: 'line#s  x1=0 y1=0 x2=200 y2=100 stroke=#333',
    attributes: { x1: 0, y1: 0, x2: 100, y2: 50, stroke: '#333' },
  },
  {
    create: 'create text s 20 40 "My Diagram 开始"',
    tree: 'text#s  x=20 y=40 text="My Diagram 开始"',
    moved: 'text#s  x=25 y=30 text="My Diagram 开始"',
    scaled: 'text#s  x=40 y=80 text="My Diagram 开始"',
    attributes: { x: 20, y: 40, text: 'My Diagram 开始' },
  },
];

test('all five types create correct root shapes, tree and show attributes', () => {
  for (const shape of shapes) {
    const session = new TestSession();
    session.run('init');
    assert.doesNotMatch(session.run(shape.create), /^error:/, shape.create);
    assert.equal(session.run('tree s'), shape.tree);
    assert.equal(session.run('tree'), `svg (800x600)\n└── ${shape.tree}`);
    const label = shape.tree.split('  ')[0];
    const attributes = Object.entries(shape.attributes).map(([name, value]) =>
      `  ${name}=${name === 'text' ? JSON.stringify(value) : value}`);
    assert.equal(session.run('show s'), [`${label}  parent=svg`, ...attributes].join('\n'));
    const created = session.run('tree');
    session.run('undo');
    assert.equal(session.run('show s'), 'error: no such shape: s');
    session.run('redo');
    assert.equal(session.run('tree'), created);
  }
});

test('move and scale use polymorphic geometry and exact undo/redo for every type', () => {
  for (const shape of shapes) {
    const session = new TestSession();
    session.run('init');
    session.run(shape.create);
    const before = session.run('show s');
    assert.doesNotMatch(session.run('move s 5 -10'), /^error:/);
    assert.equal(session.run('tree s'), shape.moved);
    session.run('undo');
    assert.equal(session.run('show s'), before);
    session.run('redo');
    assert.equal(session.run('tree s'), shape.moved);
    session.run('undo');
    assert.doesNotMatch(session.run('scale s 2'), /^error:/);
    assert.equal(session.run('tree s'), shape.scaled);
    session.run('undo');
    assert.equal(session.run('show s'), before);
    session.run('redo');
    assert.equal(session.run('tree s'), shape.scaled);
  }
});

test('creation enforces type-specific arity, finite numbers and non-negative sizes', () => {
  const session = new TestSession();
  session.run('init');
  const failures = [
    'create circle s 1 2', 'create circle s 1 2 3 red extra',
    'create circle s 1 2 -1', 'create circle s NaN 2 3', 'create circle s 1 2 1e999',
    'create ellipse s 1 2 3', 'create ellipse s 1 2 3 4 red extra',
    'create ellipse s 1 2 -3 4', 'create ellipse s 1 2 3 -4', 'create ellipse s 1 Infinity 3 4',
    'create line s 1 2 3', 'create line s 1 2 3 4 red extra',
    'create line s 1 2 10abc 4', 'create line s 1 2 3 NaN',
    'create text s 1 2', 'create text s 1 2 "hello" red',
    'create text s Infinity 2 "hello"', 'create text s 1 10abc "hello"',
  ];
  for (const command of failures) {
    assert.match(session.run(command), /^error: [^\r\n]+$/, command);
    assert.equal(session.run('tree'), 'svg (800x600)', command);
    assert.equal(session.run('show s'), 'error: no such shape: s', command);
    assert.equal(session.run('undo'), 'error: undo not allowed after io command', command);
  }
  for (const command of [
    'create circle zeroCircle 0 0 0', 'create ellipse zeroEllipse 0 0 0 0',
    'create line negativeLine -1.5 -.2 -3 -4',
  ]) {
    assert.doesNotMatch(session.run(command), /^error:/);
  }
});

test('IDs remain unique across shape types and case sensitive', () => {
  const session = new TestSession();
  session.run('init');
  session.run('create rect s 1 2 3 4');
  const before = session.run('tree');
  for (const shape of shapes) {
    assert.equal(session.run(shape.create), 'error: id already exists: s');
    assert.equal(session.run('tree'), before);
  }
  assert.equal(session.run('create circle S 1 2 3'), 'circle#S created');
  session.run('undo');
  session.run('undo');
  assert.equal(session.run('tree'), 'svg (800x600)');
});

test('text preserves Chinese, spaces, empty content, escapes and the literal in', () => {
  const session = new TestSession();
  session.run('init');
  for (const content of ['开始 My Diagram', '', 'in', '他说 "你好"', String.raw`C:\temp\文件`]) {
    const quoted = JSON.stringify(content);
    assert.equal(session.run(`create text t 1 2 ${quoted}`), 'text#t created');
    assert.equal(session.run('tree t'), `text#t  x=1 y=2 text=${quoted}`);
    assert.equal(session.run('set t text "My Diagram v2"'), 'text#t updated: x=1 y=2 text="My Diagram v2"');
    session.run('undo');
    assert.equal(session.run('tree t'), `text#t  x=1 y=2 text=${quoted}`);
    session.run('redo');
    assert.equal(session.run('tree t'), 'text#t  x=1 y=2 text="My Diagram v2"');
    session.run('delete t');
  }
  session.run('create text t 1 2 "nonempty"');
  session.run('set t text ""');
  assert.equal(session.run('tree t'), 'text#t  x=1 y=2 text=""');
  session.run('undo');
  assert.equal(session.run('tree t'), 'text#t  x=1 y=2 text="nonempty"');
});

test('in suffix is explicitly deferred for all types without hiding unknown types', () => {
  const session = new TestSession();
  session.run('init');
  for (const shape of shapes) {
    assert.equal(session.run(`${shape.create} in root`), 'error: not implemented in this round: create ... in <containerId>');
  }
  assert.equal(session.run('create circle s 1 2 3 in root'), 'error: not implemented in this round: create ... in <containerId>');
  assert.equal(session.run('create text s 1 2 "in" in root'), 'error: not implemented in this round: create ... in <containerId>');
  assert.equal(session.run('create box s 1 2 3 4 "in" in root'), 'error: unknown shape type: box (is the plugin loaded?)');
  assert.equal(session.run('tree'), 'svg (800x600)');
  assert.equal(session.run('create text s 1 2 "in"'), 'text#s created');
});

test('set supports every type-specific numeric attribute with reversible changes', () => {
  const cases = [
    { create: 'create rect s 1 2 3 4', attributes: [['x', '-1.25'], ['y', '.5'], ['width', '0'], ['height', '8']] },
    { create: 'create circle s 1 2 3', attributes: [['cx', '-1.25'], ['cy', '.5'], ['r', '0']] },
    { create: 'create ellipse s 1 2 3 4', attributes: [['cx', '-1.25'], ['cy', '.5'], ['rx', '0'], ['ry', '8']] },
    { create: 'create line s 1 2 3 4', attributes: [['x1', '-1.25'], ['y1', '.5'], ['x2', '-3'], ['y2', '8']] },
    { create: 'create text s 1 2 "hello"', attributes: [['x', '-1.25'], ['y', '.5']] },
  ];
  for (const shape of cases) {
    const session = new TestSession();
    session.run('init');
    session.run(shape.create);
    for (const [attribute, value] of shape.attributes) {
      const before = session.run('show s');
      assert.doesNotMatch(session.run(`set s ${attribute} ${value}`), /^error:/);
      const after = session.run('show s');
      assert.ok(after.split('\n').includes(`  ${attribute}=${Number(value)}`));
      session.run('undo');
      assert.equal(session.run('show s'), before);
      session.run('redo');
      assert.equal(session.run('show s'), after);
      session.run('undo');
    }
  }
});

test('shared styles support set and restore absence, empty strings and prior values', () => {
  const creates = [
    'create rect s 1 2 3 4', 'create circle s 1 2 3', 'create ellipse s 1 2 3 4',
    'create line s 1 2 3 4', 'create text s 1 2 "hello"',
  ];
  for (const create of creates) {
    const session = new TestSession();
    session.run('init');
    session.run(create);
    const unset = session.run('show s');
    assert.doesNotMatch(unset, /fill=|stroke=/);
    for (const [attribute, value] of [['fill', '#abc'], ['stroke', '#def'], ['stroke-width', '2.5']]) {
      assert.doesNotMatch(session.run(`set s ${attribute} ${value}`), /^error:/);
      const set = session.run('show s');
      assert.ok(set.split('\n').includes(`  ${attribute}=${value}`));
      session.run('undo');
      assert.equal(session.run('show s'), unset);
      session.run('redo');
      assert.equal(session.run('show s'), set);
      session.run('set s ' + attribute + (attribute === 'stroke-width' ? ' 0' : ' ""'));
      const empty = session.run('show s');
      assert.ok(empty.split('\n').includes(`  ${attribute}=${attribute === 'stroke-width' ? '0' : '""'}`));
      session.run('undo');
      assert.equal(session.run('show s'), set);
      session.run('undo');
      assert.equal(session.run('show s'), unset);
    }
  }
});

test('scale leaves stroke-width, fill, stroke and text content unchanged', () => {
  for (const shape of shapes) {
    const session = new TestSession();
    session.run('init');
    session.run(shape.create);
    session.run('set s fill "rgb(1, 2, 3)"');
    session.run('set s stroke #123');
    session.run('set s stroke-width 2.5');
    const before = session.run('show s');
    session.run('scale s .5');
    const scaled = session.run('show s');
    assert.match(scaled, /fill="rgb\(1, 2, 3\)"\n  stroke=#123\n  stroke-width=2.5$/);
    assert.equal(scaled.includes('text="My Diagram 开始"'), before.includes('text="My Diagram 开始"'));
    session.run('undo');
    assert.equal(session.run('show s'), before);
    session.run('redo');
    assert.equal(session.run('show s'), scaled);
  }
});
