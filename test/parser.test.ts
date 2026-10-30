import assert from 'node:assert/strict';
import test from 'node:test';
import { InputParser } from '../src/cli/InputParser.js';

test('ignores blank/indented comment lines but preserves hashes within arguments', () => {
  const parser = new InputParser();
  for (const line of ['', '   \t', '# comment', ' \t# comment with an unmatched "']) {
    assert.deepEqual(parser.parse(line), []);
  }
  assert.deepEqual(parser.parse('create rect r1 1 2 3 4 #4a90d9'), ['create', 'rect', 'r1', '1', '2', '3', '4', '#4a90d9']);
  assert.deepEqual(parser.parse('show "#id"'), ['show', '#id']);
  assert.deepEqual(parser.parse('help # extra'), ['help', '#', 'extra']);
});

test('handles double quotes, empty arguments, whitespace, Unicode and limited escapes', () => {
  const parser = new InputParser();
  assert.deepEqual(parser.parse('  create\ttext t1 1 2 "开始 My Diagram"  '), ['create', 'text', 't1', '1', '2', '开始 My Diagram']);
  assert.deepEqual(parser.parse('show ""'), ['show', '']);
  assert.deepEqual(parser.parse(String.raw`show "a\"b\\c\q"`), ['show', String.raw`a"b\c\q`]);
  assert.deepEqual(parser.parse(String.raw`show C:\temp\file`), ['show', String.raw`C:\temp\file`]);
});

test('rejects unmatched quotes and ambiguous quoted/unquoted concatenation', () => {
  const parser = new InputParser();
  assert.throws(() => parser.parse('show "abc'), /unclosed double quote/);
  assert.throws(() => parser.parse('show a"bc"'), /double quote must start an argument/);
  assert.throws(() => parser.parse('show "a"bc'), /expected whitespace after closing quote/);
  assert.throws(() => parser.parse('show "a""b"'), /expected whitespace after closing quote/);
});
