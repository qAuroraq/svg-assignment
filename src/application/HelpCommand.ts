import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';

export class HelpCommand extends Command {
  public constructor(private readonly args: CommandArguments) {
    super();
  }

  public override execute(): string {
    this.args.requireCount(0, 0, 'help');
    return [
      'Implemented in this round:',
      '  init [w] [h]  (default 800x600; omit both dimensions or provide both)',
      '  read <file.svg>  (replace document only after complete validation)',
      '  save [file.svg]  (default: last successfully read path; explicit save does not change it)',
      '  canvas [w] [h]  (no arguments: query; two arguments: resize without scaling shapes)',
      '  create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]',
      '  create circle <id> <cx> <cy> <r> [fill] [in <containerId>]',
      '  create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]',
      '  create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]',
      '  create text <id> <x> <y> "content" [in <containerId>]  (no optional fill)',
      '  create g <id> [in <containerId>]',
      '  group <newGid> <id1> <id2>...  (at least two distinct targets)',
      '  addto <gid> <id>  (append to container; cycles are rejected)',
      '  ungroup <gid>  (nested groups only; expand at the original position)',
      '  move <id> <dx> <dy>',
      '  scale <id> <factor>  (positive factor; scales position and size)',
      '  set <id> <attr> <value>',
      '  delete <id>  (including the complete subtree)',
      '  front <id>  (last among current siblings / visually on top)',
      '  back <id>   (first among current siblings / visually underneath)',
      '  tree [id]',
      '  show <id>',
      '  undo',
      '  redo',
      '  help',
      '',
      'set attributes:',
      '  all shapes: fill, stroke, stroke-width',
      '  rect: x, y, width, height; circle: cx, cy, r; ellipse: cx, cy, rx, ry',
      '  line: x1, y1, x2, y2; text: x, y, text',
      '  g: only its own fill, stroke, stroke-width; explicit child styles stay unchanged',
      'Group move/scale recursively edit leaf geometry; no cumulative transform is stored.',
      'group orders members by document preorder: same parent -> earliest selected slot;',
      'different parents -> append the new group to the SVG root. Empty old groups remain.',
      'Hierarchy edits preserve explicit attributes, not computed/inherited appearance.',
      'scale leaves styles and text content unchanged; no font-size model yet.',
      'All successful edits, including no-ops, enter history and clear redo.',
      '',
      'Later rounds (not implemented):',
      '  box/plugins belong to a subsequent assignment phase (unknown shape type).',
      '  GUI, general SVG transforms and CSS rendering are not implemented.',
      '',
      'SVG IO subset: UTF-8 XML 1.0; SVG namespace (including prefixes) or no namespace.',
      'Six built-in tags, existing geometry, id and explicit common styles; plain text only.',
      'Lengths: numbers or px; root width/height required; viewBox must match 0 0 width height.',
      'Missing positions default to 0; sizes/radii are required; missing text is empty.',
      'DTD, foreign namespaces, unsupported elements/attributes, transform and CSS are rejected.',
      '',
      'Input: blank lines and lines starting with # are ignored; no inline comments.',
      'Double-quoted arguments support spaces, \\" and \\\\; other backslashes are literal.',
      'Canvas dimensions must be > 0; shape sizes/radii and stroke-width must be >= 0.',
      'IDs are case-sensitive, non-empty and contain no whitespace.',
      'EOF exits normally. Successful init/read/save/canvas resize clear history and block undo/redo',
      'until a successful edit. Queries and failures leave history unchanged. init clears the read path.',
    ].join('\n');
  }
}
