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
      '  create rect <id> <x> <y> <w> <h> [fill]  (root only)',
      '  create circle <id> <cx> <cy> <r> [fill]  (root only)',
      '  create ellipse <id> <cx> <cy> <rx> <ry> [fill]  (root only)',
      '  create line <id> <x1> <y1> <x2> <y2> [stroke]  (root only)',
      '  create text <id> <x> <y> "content"  (root only; no optional fill)',
      '  move <id> <dx> <dy>',
      '  scale <id> <factor>  (positive factor; scales position and size)',
      '  set <id> <attr> <value>',
      '  delete <id>',
      '  front <id>  (last in root order / visually on top)',
      '  back <id>   (first in root order / visually underneath)',
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
      'scale leaves styles and text content unchanged; no font-size model yet.',
      'All successful edits, including no-ops, enter history and clear redo.',
      '',
      'Later rounds (not implemented):',
      '  create g <id>',
      '  create ... in <containerId>',
      '  group <newGid> <id1> <id2>... | ungroup <gid> | addto <gid> <id>',
      '  read <file.svg> | save [file.svg] | canvas [w] [h]',
      '  box/plugins belong to a subsequent assignment phase (unknown shape type).',
      '',
      'Input: blank lines and lines starting with # are ignored; no inline comments.',
      'Double-quoted arguments support spaces, \\" and \\\\; other backslashes are literal.',
      'Canvas dimensions must be > 0; shape sizes/radii and stroke-width must be >= 0.',
      'IDs are case-sensitive, non-empty and contain no whitespace.',
      'EOF exits normally. init clears history and blocks undo/redo until a successful edit.',
    ].join('\n');
  }
}
