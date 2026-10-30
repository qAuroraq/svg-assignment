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
