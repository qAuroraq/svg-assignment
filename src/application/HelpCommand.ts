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
      '  move <id> <dx> <dy>',
      '  tree [id]',
      '  show <id>',
      '  undo',
      '  redo',
      '  help',
      '',
      'Later rounds (not implemented):',
      '  create circle <id> <cx> <cy> <r> [fill]',
      '  create ellipse <id> <cx> <cy> <rx> <ry> [fill]',
      '  create line <id> <x1> <y1> <x2> <y2> [stroke]',
      '  create text <id> <x> <y> "content"',
      '  create g <id>',
      '  create ... in <containerId>',
      '  delete <id> | scale <id> <factor> | set <id> <attr> <value>',
      '  group <newGid> <id1> <id2>... | ungroup <gid> | addto <gid> <id>',
      '  front <id> | back <id>',
      '  read <file.svg> | save [file.svg] | canvas [w] [h]',
      '  box/plugins belong to a subsequent assignment phase (unknown shape type).',
      '',
      'Input: blank lines and lines starting with # are ignored; no inline comments.',
      'Double-quoted arguments support spaces, \\" and \\\\; other backslashes are literal.',
      'Canvas dimensions must be > 0; rectangle dimensions must be >= 0.',
      'IDs are case-sensitive, non-empty and contain no whitespace.',
      'EOF exits normally. init clears history and blocks undo/redo until a successful edit.',
    ].join('\n');
  }
}
