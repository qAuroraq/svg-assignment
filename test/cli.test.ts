import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CommandDispatcher } from '../src/application/CommandDispatcher.js';
import { Editor } from '../src/application/Editor.js';
import { HistoryManager } from '../src/application/HistoryManager.js';
import { ShapeFormatter } from '../src/application/ShapeFormatter.js';
import { CommandLine } from '../src/cli/CommandLine.js';
import { InputParser } from '../src/cli/InputParser.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';

test('real CLI runs the required core session through EOF', () => {
  const input = readFileSync('test/fixtures/core.svgcmd', 'utf8');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/Main.js', import.meta.url))], {
    input, encoding: 'utf8', timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, [
    'canvas 800x600 created',
    'rect#r1 created',
    'svg (800x600)',
    '└── rect#r1  x=10 y=20 w=100 h=50 fill=#4a90d9',
    'rect#r1 moved: x=40 y=15 w=100 h=50 fill=#4a90d9',
    'rect#r1  parent=svg', '  x=40', '  y=15', '  width=100', '  height=50', '  fill=#4a90d9',
    'rect#r1 moved back: x=10 y=20 w=100 h=50 fill=#4a90d9',
    'rect#r1  parent=svg', '  x=10', '  y=20', '  width=100', '  height=50', '  fill=#4a90d9',
    'rect#r1 moved: x=40 y=15 w=100 h=50 fill=#4a90d9',
    'rect#r1  parent=svg', '  x=40', '  y=15', '  width=100', '  height=50', '  fill=#4a90d9',
    '',
  ].join('\n'));
});

test('real CLI preserves redo across failure and clears it after successful editing', () => {
  const input = readFileSync('test/fixtures/history.svgcmd', 'utf8');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/Main.js', import.meta.url))], {
    input, encoding: 'utf8', timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /error: no such shape: r9\nrect#r1 moved: x=40 y=15/);
  assert.match(result.stdout, /error: nothing to redo\nrect#r1  parent=svg\n  x=8\n  y=23/);
});

test('real CLI replays all five shapes and new edits with verifiable final state', () => {
  const input = readFileSync('test/fixtures/shapes-and-edits.svgcmd', 'utf8');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/Main.js', import.meta.url))], {
    input, encoding: 'utf8', timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.doesNotMatch(result.stdout, /^error:/m);
  assert.match(result.stdout, /line#l1 moved: x1=5 y1=-10 x2=105 y2=40 stroke=black/);
  assert.match(result.stdout, /circle#c1 scaled: cx=200 cy=200 r=40/);
  assert.match(result.stdout, /text#t1 restored: x=20 y=40 text="My Diagram 开始"/);
  assert.match(result.stdout, /ellipse#e1 restored: cx=200 cy=100 rx=30 ry=15\n/);
  const finalTree = [
    'svg (800x600)',
    '├── rect#r1  x=10 y=20 w=120 h=50 fill=#4a90d9',
    '├── circle#c1  cx=200 cy=200 r=40',
    '├── ellipse#e1  cx=200 cy=100 rx=30 ry=15',
    '├── line#l1  x1=5 y1=-10 x2=105 y2=40 stroke=black stroke-width=2.5',
    '└── text#t1  x=20 y=40 text="My Diagram 开始"',
    '',
  ].join('\n');
  assert.ok(result.stdout.endsWith(finalTree));
});

test('real CLI replays the flowchart and hierarchy edits with correct parents and exact restoration', () => {
  const input = readFileSync('test/fixtures/hierarchy.svgcmd', 'utf8');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/Main.js', import.meta.url))], {
    input, encoding: 'utf8', timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(result.stdout.match(/^error:.*$/gm), ['error: cannot ungroup top-level container: flowchart']);
  assert.match(result.stdout, /rect#process  parent=g#node2\n  x=520\n  y=200\n/);
  assert.match(result.stdout, /text#process-label  parent=g#node2\n  x=545\n  y=235\n/);
  assert.match(result.stdout, /rect#start  parent=g#node1\n  x=120\n  y=100\n/);
  assert.match(result.stdout, /line#arrow1  parent=g#flowchart\n  x1=280\n  y1=130\n  x2=520\n  y2=130\n/);
  assert.match(result.stdout, /g#node2 moved back\ng#node2\n├── rect#process  x=520 y=100/);
  assert.match(result.stdout, /rect#start  parent=g#flowchart\n/);
  assert.match(result.stdout, /g#node1  parent=g#node-pair\n/);
  assert.match(result.stdout, /g#node1  parent=g#flowchart\n/);
  for (const parent of ['node1', 'node2', 'labels']) {
    assert.ok(result.stdout.includes(`text#start-label  parent=g#${parent}\n`));
  }
  assert.match(result.stdout, /text#process-label  parent=g#flowchart\n/);
  const originalTree = [
    'svg (800x600)',
    '└── g#flowchart',
    '    ├── g#node1',
    '    │   ├── rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9',
    '    │   └── text#start-label  x=155 y=135 text="开始"',
    '    ├── g#node2',
    '    │   ├── rect#process  x=520 y=100 w=160 h=60 fill=#f5a623',
    '    │   └── text#process-label  x=545 y=135 text="处理数据"',
    '    └── line#arrow1  x1=280 y1=130 x2=520 y2=130 stroke=black',
    '',
  ].join('\n');
  assert.ok(result.stdout.includes(originalTree));
  assert.ok(result.stdout.endsWith(originalTree));
});

test('real CLI recovers after input errors, supports CRLF and a final line without newline', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/Main.js', import.meta.url))], {
    input: ' \r\n# comment "\r\ninit\r\ncreate rect r1 0 0 1 1 "bad\r\ncreate rect r1 0 0 1 1 #abc\r\nshow r1',
    encoding: 'utf8', timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /error: unclosed double quote\nrect#r1 created\nrect#r1  parent=svg/);
  assert.match(result.stdout, /fill=#abc\n$/);
});

test('empty input exits normally without a prompt in script mode', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/Main.js', import.meta.url))], {
    input: '', encoding: 'utf8', timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
});

test('interactive mode displays the svg> prompt and continues after an error', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = '';
  output.on('data', (chunk: Buffer) => { text += chunk.toString(); });
  const cli = new CommandLine(new InputParser(), new CommandDispatcher(
    new Editor(new HistoryManager()), new ShapeFactory(), new ShapeFormatter(),
  ));
  cli.start(input, output, true);
  input.end('bad-command\ninit\n');
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.match(text, /svg>/);
  assert.match(text, /error: unknown command: bad-command/);
  assert.match(text, /canvas 800x600 created/);
});
