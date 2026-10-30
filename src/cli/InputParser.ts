export class InputParser {
  public parse(line: string): readonly string[] {
    if (line.trimStart().startsWith('#')) {
      return [];
    }
    const tokens: string[] = [];
    let value = '';
    let active = false;
    let quoted = false;
    let afterQuote = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index]!;
      if (quoted) {
        if (character === '"') {
          quoted = false;
          afterQuote = true;
        } else if (character === '\\' && (line[index + 1] === '"' || line[index + 1] === '\\')) {
          value += line[index + 1];
          index += 1;
        } else {
          value += character;
        }
      } else if (/\s/u.test(character)) {
        if (active) {
          tokens.push(value);
          value = '';
          active = false;
        }
        afterQuote = false;
      } else if (afterQuote) {
        throw new Error('expected whitespace after closing quote');
      } else if (character === '"') {
        if (active) {
          throw new Error('double quote must start an argument');
        }
        active = true;
        quoted = true;
      } else {
        active = true;
        value += character;
      }
    }
    if (quoted) {
      throw new Error('unclosed double quote');
    }
    if (active) {
      tokens.push(value);
    }
    return tokens;
  }
}
