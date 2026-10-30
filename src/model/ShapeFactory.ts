import { NumberValue } from './NumberValue.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';

export class ShapeFactory {
  // The only shape-name dispatch. Future types are explicitly distinguished
  // from unknown/plugin types; their constructors will be added here later.
  public create(type: string, id: string, parameters: readonly string[]): Shape {
    switch (type) {
      case 'rect': {
        if (parameters.length < 4 || parameters.length > 5) {
          throw new Error('usage: create rect <id> <x> <y> <w> <h> [fill]');
        }
        const [x, y, width, height, fill] = parameters;
        return new Rect(
          id,
          NumberValue.parse(x!, 'x'),
          NumberValue.parse(y!, 'y'),
          NumberValue.parse(width!, 'width'),
          NumberValue.parse(height!, 'height'),
          fill,
        );
      }
      case 'circle':
      case 'ellipse':
      case 'line':
      case 'text':
      case 'g':
        throw new Error(`not implemented in this round: create ${type}`);
      default:
        throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }
}
