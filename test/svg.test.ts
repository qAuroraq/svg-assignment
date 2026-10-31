import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ShapeFormatter } from '../src/application/ShapeFormatter.js';
import { SvgReader } from '../src/io/SvgReader.js';
import { SvgWriter } from '../src/io/SvgWriter.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { IoSession } from './IoSession.js';

const reader = new SvgReader(new ShapeFactory());
const writer = new SvgWriter();

test('assignment other.svg imports seven shapes with the exact missing-ID warning', () => {
  const { document, warnings } = reader.read('test/fixtures/other.svg');
  assert.deepEqual(warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  assert.equal(document.countShapes(), 7);
  assert.equal(new ShapeFormatter().tree(document), [
    'svg (400x300)',
    '├── rect#rect1  x=0 y=0 w=400 h=300 fill=#ffffff',
    '├── text#t1  x=10 y=290 text="imported"',
    '├── circle#c1  cx=50 cy=50 r=10',
    '├── g#g1',
    '│   ├── rect#r2  x=0 y=0 w=10 h=10',
    '│   └── circle#c2  cx=5 cy=5 r=2',
    '└── ellipse#e1  cx=1 cy=2 rx=3 ry=4',
  ].join('\n'));
});

test('anonymous IDs reserve all explicit IDs first, across types, in deterministic preorder', () => {
  const xml = `<svg width="10" height="20">
    <rect width="1" height="2"/><g><text>001</text><rect width="0" height="0"/></g>
    <circle id="rect1" r="1"/><line id="g1"/><text id="text1">false</text>
    <rect id="rect3" width="1" height="1"/><circle id="001" r="2"/>
  </svg>`;
  const first = reader.parse(xml);
  const second = reader.parse(xml);
  assert.deepEqual(first.warnings, [
    'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id g2 to unnamed <g>',
    'warning: assigned id text2 to unnamed <text>', 'warning: assigned id rect4 to unnamed <rect>',
  ]);
  assert.deepEqual(second.warnings, first.warnings);
  assert.deepEqual(first.document.getChildren().map((shape) => shape.getId()), ['rect2', 'g2', 'rect1', 'g1', 'text1', 'rect3', '001']);
  assert.equal(first.document.find('001').getId(), '001');
  assert.equal(first.document.find('text2').getAttributes().text, '001');
  assert.equal(first.document.find('text1').getAttributes().text, 'false');
});

test('import defaults, zero sizes, unitless/px lengths and absent styles follow the declared subset', () => {
  const { document } = reader.parse(`<svg width=" 4e2px " height="300px" viewBox="0, 0,400,300">
    <rect id="r" width="0px" height="1.5px"/><circle id="c" r="0"/>
    <ellipse id="e" rx="2px" ry="3"/><line id="l" x2="-1.25px"/>
    <text id="t"/><g id="g" fill="" stroke="red" stroke-width="2.5px"/>
  </svg>`);
  assert.equal(document.getWidth(), 400);
  assert.deepEqual(document.find('r').getAttributes(), { x: 0, y: 0, width: 0, height: 1.5 });
  assert.deepEqual(document.find('c').getAttributes(), { cx: 0, cy: 0, r: 0 });
  assert.deepEqual(document.find('e').getAttributes(), { cx: 0, cy: 0, rx: 2, ry: 3 });
  assert.deepEqual(document.find('l').getAttributes(), { x1: 0, y1: 0, x2: -1.25, y2: 0 });
  assert.deepEqual(document.find('t').getAttributes(), { x: 0, y: 0, text: '' });
  assert.deepEqual(document.find('g').getAttributes(), { fill: '', stroke: 'red', 'stroke-width': 2.5 });
});

test('XML declaration, SVG prefixes, comments and CDATA preserve mixed sibling order and text', () => {
  const { document } = reader.parse(`<?xml version="1.0" encoding="utf-8"?>
    <!-- before root -->
    <s:svg xmlns:s="http://www.w3.org/2000/svg" width="10" height="20">
      <s:rect id="r1" width="1" height="1"/><!-- middle -->
      <s:line id="l"/><s:rect id="r2" width="2" height="2"/>
      <s:g id="g"><s:text id="inner">  中文<!-- preserve --> <![CDATA[< &amp; >]]>  </s:text></s:g>
      <s:text id="false">001</s:text>
    </s:svg><!-- after root -->`);
  assert.deepEqual(document.getChildren().map((shape) => shape.getId()), ['r1', 'l', 'r2', 'g', 'false']);
  assert.equal(document.find('inner').getAttributes().text, '  中文 < &amp; >  ');
  assert.equal(document.find('false').getAttributes().text, '001');
});

test('six types, nested groups, sibling order and explicit styles survive file save/read', (context) => {
  const session = new IoSession(context);
  session.execute('init 810 610', 'create rect r1 1 2 3 4', 'create line l 0 0 10 20 black',
    'create rect r2 5 6 7 8 red', 'create g outer', 'create circle c -5 1.5 3 in outer',
    'create g inner in outer', 'create ellipse e 1 2 3 4 in inner',
    'create text t 0 0 "中文" in inner', 'create text tail 2 3 ""',
    'set outer fill blue', 'set inner stroke-width 2.5', 'set c fill ""',
    'set e stroke "#123"', 'move outer 5 10', 'scale outer 2');
  const before = session.state();
  const file = session.path('round trip.svg');
  session.execute(`save "${file}"`);
  const xml = readFileSync(file, 'utf8');
  assert.match(xml, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(xml, /viewBox="0 0 810 610"/);
  assert.doesNotMatch(xml, /\stext=|transform=/);
  session.execute('init', `read "${file}"`);
  assert.deepEqual(session.state(), before);
  session.assertParent('c', 'outer');
  session.assertParent('e', 'inner');
  assert.equal(session.editor.requireDocument().find('r1').getFill(), undefined);
});

test('empty, numeric-looking, Chinese, whitespace, XML characters and literal entities roundtrip exactly', (context) => {
  const session = new IoSession(context);
  session.execute('init', 'create text t 1 2 ""');
  const document = session.editor.requireDocument();
  const shape = document.find('t');
  for (const content of ['', '001', 'false', '  中文 😀  ', '& < > " \'', '&amp;', '&#65;', '\tline1\r\nline2\t']) {
    shape.setAttribute('text', content);
    shape.setAttribute('fill', content);
    const xml = writer.serialize(document);
    const restored = reader.parse(xml).document.find('t');
    assert.deepEqual(restored.getAttributes(), shape.getAttributes(), JSON.stringify(content));
    if (content === '&amp;') assert.match(xml, /&amp;amp;/);
    if (content.startsWith('& <')) assert.match(xml, /&amp; &lt; &gt; &quot; &apos;/);
  }
  const specialId = `a&<>"'`;
  document.insert(new ShapeFactory().create('g', specialId, []));
  assert.equal(reader.parse(writer.serialize(document)).document.find(specialId).getId(), specialId);
});

test('entities decode once, character references work, and self-closing text stays empty', () => {
  const { document } = reader.parse(`<svg width="10" height="10">
    <text id="t" fill="&amp;amp;">&amp; &lt; &gt; &quot; &apos; &amp;amp; &#65; &#x4E2D;</text>
    <text id="empty"/>
  </svg>`);
  assert.equal(document.find('t').getAttributes().text, '& < > " \' &amp; A 中');
  assert.equal(document.find('t').getFill(), '&amp;');
  assert.equal(document.find('empty').getAttributes().text, '');
});

test('malformed XML is rejected rather than partially recovered', () => {
  for (const xml of [
    '', '<svg width="1" height="1">', '<svg width="1" height="1"><g></svg>',
    '<svg width="1" height="1"/><svg width="1" height="1"/>',
    '<svg width=1 height="1"/>', '<svg width="1" width="2" height="1"/>',
    '<svg width="1" height="1"><text>&bogus;</text></svg>',
    '<svg width="1" height="1"><text>&</text></svg>',
    '<svg width="1" height="1"><text>&#0;</text></svg>',
    '<svg width="1" height="1"><text>\u0001</text></svg>',
    '<svg width="1" height="1"><text>]]></text></svg>',
    '<svg width="1" height="1"><p:g/></svg>',
    '<svg width="1" height="1"><!-- invalid -- comment --></svg>',
    '<svg width="1" height="1"/>trailing',
  ]) assert.throws(() => reader.parse(xml), /invalid XML|SVG root/, xml);
});

test('DTD, external entity declarations, processing instructions and unsupported encodings are rejected', () => {
  for (const xml of [
    '<!DOCTYPE svg><svg width="1" height="1"/>',
    '<!DOCTYPE svg SYSTEM "https://example.invalid/svg.dtd"><svg width="1" height="1"/>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///private/secret">]><svg width="1" height="1"><text>&x;</text></svg>',
    '<?xml-stylesheet href="a.css"?><svg width="1" height="1"/>',
    '<?xml version="1.1"?><svg width="1" height="1"/>',
    '<?xml version="1.0" encoding="ISO-8859-1"?><svg width="1" height="1"/>',
  ]) assert.throws(() => reader.parse(xml), /not supported|only XML 1.0/);
});

test('unsupported rendering attributes, elements, namespace changes and mismatched viewBox fail explicitly', () => {
  const fragments = [
    '<g transform="translate(1,2)"/>', '<g style="fill:red"/>', '<g class="red"/>',
    '<text font-size="10">x</text>', '<text text-anchor="middle">x</text>', '<text text="x"/>',
    '<text><tspan>x</tspan></text>', '<use href="#x"/>', '<path d="M0 0"/>', '<style>g{fill:red}</style>',
    '<rect width="1" height="1"><g/></rect>', '<g>unexpected</g>',
    '<x:g xmlns:x="urn:foreign"/>', '<g xml:space="preserve"/>', '<svg width="1" height="1"/>',
  ];
  for (const fragment of fragments) {
    assert.throws(() => reader.parse(`<svg width="10" height="20">${fragment}</svg>`), /unsupported|not supported|unknown shape type|unexpected text/, fragment);
  }
  for (const attr of ['fill="red"', 'style="fill:red"', 'id="root"', 'viewBox="1 0 10 20"', 'viewBox="0 0 100 200"', 'viewBox="0 0 10 20,"', 'viewBox="0 0 10px 20"']) {
    assert.throws(() => reader.parse(`<svg width="10" height="20" ${attr}/>`), /unsupported/);
  }
  assert.throws(() => reader.parse('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><g xmlns=""/></svg>'), /namespace/);
});

test('invalid IDs, dimensions, lengths, required geometry and duplicate IDs fail import', () => {
  for (const attrs of ['', 'width="10"', 'width="0" height="10"', 'width="1" height="-1"']) {
    assert.throws(() => reader.parse(`<svg ${attrs}/>`), /missing attribute|must be positive/);
  }
  for (const value of ['100%', '10pxjunk', '1em', 'NaN', 'Infinity', '1e309', '10abc', '']) {
    assert.throws(() => reader.parse(`<svg width="${value}" height="10"/>`));
    assert.throws(() => reader.parse(`<svg width="10" height="10"><rect width="${value}" height="1"/></svg>`));
    assert.throws(() => reader.parse(`<svg width="10" height="10"><g stroke-width="${value}"/></svg>`));
  }
  for (const fragment of ['<rect height="1"/>', '<rect width="1"/>', '<circle/>', '<ellipse rx="1"/>', '<ellipse ry="1"/>', '<circle r="-1"/>', '<g stroke-width="-1"/>', '<g id=""/>', '<g id="bad id"/>', '<g id="a"/><text id="a"/>']) {
    assert.throws(() => reader.parse(`<svg width="10" height="10">${fragment}</svg>`));
  }
});
