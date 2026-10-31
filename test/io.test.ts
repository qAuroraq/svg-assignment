import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import test from 'node:test';
import { FileAccess } from '../src/io/FileAccess.js';
import { SvgReader } from '../src/io/SvgReader.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { IoSession } from './IoSession.js';

const sample = fs.readFileSync('test/fixtures/other.svg', 'utf8');

test('read without a document succeeds, and importing IDs present in the old document replaces it', (context) => {
  const session = new IoSession(context);
  const file = session.input(sample, 'other copy.svg');
  assert.equal(session.run(`read "${file}"`), `warning: assigned id rect1 to unnamed <rect>\nread ${file} (7 elements)`);
  session.assertConsistent();
  const previous = session.editor.requireDocument();
  const oldShape = previous.find('c1');
  session.execute('move c1 10 20', 'undo', `read "${file}"`);
  assert.notStrictEqual(session.editor.requireDocument(), previous);
  assert.notStrictEqual(session.editor.requireDocument().find('c1'), oldShape);
  assert.equal(session.editor.requireSavePath(), file);
  assert.equal(session.run('redo'), 'error: undo not allowed after io command');
  session.execute('move c1 2 3', 'undo');
  assert.equal(session.run('undo'), 'error: nothing to undo');
});

test('late read failures emit no ID warnings and preserve document identity, read path and redo', (context) => {
  const session = new IoSession(context);
  const original = session.input(sample, 'original.svg');
  session.execute(`read "${original}"`, 'move c1 10 20', 'undo');
  const document = session.editor.requireDocument();
  const shape = document.find('c1');
  const before = session.state();
  const failures = [
    '<svg width="10" height="10"><rect width="1" height="1"/><circle r="bad"/></svg>',
    '<svg width="10" height="10"><rect width="1" height="1"/><g transform="scale(2)"/></svg>',
    '<svg width="10" height="10"><rect width="1" height="1"/><g id="a"/><text id="a"/></svg>',
    '<svg width="10" height="10"><rect width="1" height="1"/><text>',
    '<svg width="10" height="10" viewBox="1 1 10 10"/>',
    '<svg width="10" height="10"><text id="bad id"/></svg>',
  ];
  for (const xml of failures) {
    const file = session.input(xml, 'invalid.svg');
    const result = session.run(`read "${file}"`);
    assert.match(result, /^error: [^\r\n]+$/);
    assert.doesNotMatch(result, /warning:/);
    assert.strictEqual(session.editor.requireDocument(), document);
    assert.strictEqual(document.find('c1'), shape);
    assert.deepEqual(session.state(), before);
    assert.equal(session.editor.requireSavePath(), original);
    session.assertConsistent();
  }
  assert.equal(session.run(`read "${session.path('absent.svg')}"`), `error: cannot read file: ${session.path('absent.svg')}`);
  session.execute('redo');
  assert.equal(document.find('c1').getAttributes().cx, 60);
  assert.equal(document.find('c1').getAttributes().cy, 70);
});

test('file access and invalid UTF-8 failures leave an absent document absent', (context) => {
  const session = new IoSession(context);
  const file = session.path('bad-encoding.svg');
  fs.writeFileSync(file, Buffer.from([0xff, 0xfe, 0x00]));
  assert.equal(session.run(`read "${file}"`), 'error: SVG input must be valid UTF-8');
  assert.equal(session.run(`read "${session.path()}"`), `error: cannot read file: ${session.path()}`);
  assert.equal(session.run('tree'), "error: no document. use 'init' or 'read' first");
  assert.throws(() => session.editor.requireSavePath(), /no save path/);
});

test('read A, save B, save retains A as the default, with quoted paths and unchanged fixture', (context) => {
  const session = new IoSession(context);
  const a = session.input(sample, 'input copy.svg');
  const b = session.path('explicit copy.svg');
  session.execute(`read "${a}"`, 'set t1 text "B version"', `save "${b}"`);
  assert.equal(session.editor.requireSavePath(), a);
  const bBytes = fs.readFileSync(b);
  session.execute('set t1 text "A version"', 'canvas 500 400', 'save');
  const reader = new SvgReader(new ShapeFactory());
  assert.equal(reader.read(a).document.find('t1').getAttributes().text, 'A version');
  assert.equal(reader.read(a).document.getWidth(), 500);
  assert.equal(reader.read(b).document.find('t1').getAttributes().text, 'B version');
  assert.deepEqual(fs.readFileSync(b), bBytes);
  assert.equal(fs.readFileSync('test/fixtures/other.svg', 'utf8'), sample);
  assert.deepEqual(fs.readdirSync(session.path()).sort(), ['explicit copy.svg', 'input copy.svg']);
});

test('init clears the read path only on success; explicit saves never establish a default', (context) => {
  const session = new IoSession(context);
  const a = session.input(sample);
  session.execute(`read "${a}"`);
  assert.match(session.run('init 0 100'), /^error:/);
  assert.equal(session.editor.requireSavePath(), a);
  session.execute('init');
  const missingPath = "error: no save path. use 'save <file.svg>' or read a file first";
  assert.equal(session.run('save'), missingPath);
  session.execute(`save "${session.path('empty.svg')}"`);
  assert.equal(session.run('save'), missingPath);
  session.execute('create rect r 1 2 3 4', 'move r 2 3', 'undo');
  assert.equal(session.run('save'), missingPath);
  session.execute('redo');
  assert.equal(session.editor.requireDocument().find('r').getAttributes().x, 3);
});

test('canvas query preserves redo; resize changes only dimensions and validates both before mutation', (context) => {
  const session = new IoSession(context);
  const file = session.input(sample);
  session.execute(`read "${file}"`, 'move r2 3 4', 'undo');
  const before = session.state();
  const document = session.editor.requireDocument();
  const shape = document.find('r2');
  assert.equal(session.run('canvas'), 'canvas 400x300');
  for (const command of ['canvas 100', 'canvas 100 200 300', 'canvas 500 0', 'canvas 0 500', 'canvas 500 -1', 'canvas 500 10abc', 'canvas 500 NaN', 'canvas Infinity 500', 'canvas 500 1e309']) {
    assert.match(session.run(command), /^error:/);
    assert.deepEqual(session.state(), before);
    assert.equal(session.editor.requireSavePath(), file);
  }
  session.execute('redo');
  assert.equal(shape.getAttributes().x, 3);
  const geometry = session.state().shapes;
  session.execute('canvas 500.5 400.25');
  assert.equal(session.run('canvas'), 'canvas 500.5x400.25');
  assert.deepEqual(session.state().shapes, geometry);
  assert.strictEqual(session.editor.requireDocument(), document);
  assert.strictEqual(document.find('r2'), shape);
  assert.equal(session.editor.requireSavePath(), file);
  assert.equal(session.run('undo'), 'error: undo not allowed after io command');
});

test('every successful document operation clears both stacks and stays disabled through queries and failures', (context) => {
  for (const operation of ['init', 'read', 'save', 'canvas', 'same-canvas']) {
    const session = new IoSession(context);
    const input = session.input(sample);
    session.execute(`read "${input}"`, 'move c1 1 2', 'move c1 3 4', 'undo');
    const command = operation === 'read' ? `read "${input}"`
      : operation === 'save' ? `save "${session.path('output.svg')}"`
      : operation === 'canvas' ? 'canvas 600 700'
      : operation === 'same-canvas' ? 'canvas 400 300' : 'init';
    session.execute(command);
    session.run('help');
    session.execute('tree', 'canvas');
    assert.match(session.run('move missing 1 2'), /^error:/);
    assert.match(session.run('canvas 100 0'), /^error:/);
    assert.match(session.run(`read "${session.path('missing.svg')}"`), /^error:/);
    assert.match(session.run(`save "${session.path('missing/output.svg')}"`), /^error:/);
    assert.equal(session.run('undo'), 'error: undo not allowed after io command');
    assert.equal(session.run('redo'), 'error: undo not allowed after io command');
    session.execute('create g fresh', 'undo');
    assert.equal(session.run('undo'), 'error: nothing to undo');
    session.execute('redo');
    assert.equal(session.run('redo'), 'error: nothing to redo');
  }
});

test('partial temporary writes, close failures and replacement failures keep old bytes and redo', (context) => {
  for (const failure of ['write', 'close', 'rename']) {
    let closeFailed = false;
    const files = new FileAccess({
      ...fs,
      writeFileSync: (file, data, options) => {
        if (failure === 'write' && typeof file === 'number') {
          fs.writeSync(file, 'partial data');
          throw new Error('injected write failure');
        }
        fs.writeFileSync(file, data, options);
      },
      closeSync: (file) => {
        if (failure === 'close' && !closeFailed) {
          closeFailed = true;
          throw new Error('injected close failure');
        }
        fs.closeSync(file);
      },
      renameSync: (from, to) => {
        if (failure === 'rename') throw new Error('injected replacement failure');
        fs.renameSync(from, to);
      },
    });
    const session = new IoSession(context, files);
    const a = session.input(sample, 'read.svg');
    const target = session.input('original target bytes\n', 'target.svg');
    const originalBytes = fs.readFileSync(target);
    session.execute(`read "${a}"`, 'move c1 2 3', 'undo');
    const document = session.editor.requireDocument();
    const before = session.state();
    assert.equal(session.run(`save "${target}"`), `error: cannot write file: ${target}`);
    assert.deepEqual(fs.readFileSync(target), originalBytes);
    assert.deepEqual(fs.readdirSync(session.path()).sort(), ['read.svg', 'target.svg']);
    assert.deepEqual(session.state(), before);
    assert.strictEqual(session.editor.requireDocument(), document);
    assert.equal(session.editor.requireSavePath(), a);
    session.execute('redo');
    assert.equal(document.find('c1').getAttributes().cx, 52);
  }
});

test('real filesystem open and rename failures use repeatable conditions and leave no temporary file', (context) => {
  const session = new IoSession(context);
  const a = session.input(sample);
  const directory = session.path('target.svg');
  fs.mkdirSync(directory);
  fs.writeFileSync(session.path('target.svg/keep'), 'keep');
  const blocker = session.input('regular file', 'blocker');
  session.execute(`read "${a}"`, 'move c1 1 2', 'undo');
  const before = session.state();
  const names = fs.readdirSync(session.path()).sort();
  for (const target of [directory, `${blocker}/out.svg`, session.path('missing/out.svg')]) {
    assert.equal(session.run(`save "${target}"`), `error: cannot write file: ${target}`);
    assert.deepEqual(session.state(), before);
    assert.deepEqual(fs.readdirSync(session.path()).sort(), names);
    assert.equal(session.editor.requireSavePath(), a);
  }
  assert.equal(fs.readFileSync(session.path('target.svg/keep'), 'utf8'), 'keep');
  assert.equal(fs.readFileSync(blocker, 'utf8'), 'regular file');
  session.execute('redo');
});

test('serialization rejects invalid XML characters before touching the target or history', (context) => {
  const session = new IoSession(context);
  const target = session.input('original', 'target.svg');
  session.execute('init', 'create text t 0 0 "text"');
  session.editor.requireDocument().find('t').setAttribute('text', '\u0000');
  session.execute('move t 1 2', 'undo');
  const before = session.state();
  assert.match(session.run(`save "${target}"`), /^error: cannot serialize invalid XML character/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'original');
  assert.deepEqual(fs.readdirSync(session.path()), ['target.svg']);
  assert.deepEqual(session.state(), before);
  session.execute('redo');
});

test('read/save/canvas arity and no-document errors are explicit and do not alter history', (context) => {
  const session = new IoSession(context);
  for (const command of ['canvas', 'canvas 10 20', 'save', 'save output.svg']) {
    assert.equal(session.run(command), "error: no document. use 'init' or 'read' first");
  }
  session.execute('init', 'create rect r 1 2 3 4', 'move r 2 3', 'undo');
  const before = session.state();
  for (const command of ['read', 'read a b', 'save a b', 'canvas 100', 'canvas 100 200 300']) {
    assert.match(session.run(command), /^error: usage:/);
    assert.deepEqual(session.state(), before);
  }
  session.execute('redo');
});
