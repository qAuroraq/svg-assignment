import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { NumberValue } from './NumberValue.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { Text } from './Text.js';

export class ShapeFactory {
  // The only shape-name dispatch; registration can replace this switch later.
  public create(type: string, id: string, parameters: readonly string[]): Shape {
    switch (type) {
      case 'rect': {
        this.requireParameters(parameters, 4, 5, 'create rect <id> <x> <y> <w> <h> [fill]');
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
      case 'circle': {
        this.requireParameters(parameters, 3, 4, 'create circle <id> <cx> <cy> <r> [fill]');
        const [cx, cy, r, fill] = parameters;
        return new Circle(id, NumberValue.parse(cx!, 'cx'), NumberValue.parse(cy!, 'cy'), NumberValue.parse(r!, 'r'), fill);
      }
      case 'ellipse': {
        this.requireParameters(parameters, 4, 5, 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]');
        const [cx, cy, rx, ry, fill] = parameters;
        return new Ellipse(
          id, NumberValue.parse(cx!, 'cx'), NumberValue.parse(cy!, 'cy'),
          NumberValue.parse(rx!, 'rx'), NumberValue.parse(ry!, 'ry'), fill,
        );
      }
      case 'line': {
        this.requireParameters(parameters, 4, 5, 'create line <id> <x1> <y1> <x2> <y2> [stroke]');
        const [x1, y1, x2, y2, stroke] = parameters;
        return new Line(
          id, NumberValue.parse(x1!, 'x1'), NumberValue.parse(y1!, 'y1'),
          NumberValue.parse(x2!, 'x2'), NumberValue.parse(y2!, 'y2'), stroke,
        );
      }
      case 'text': {
        this.requireParameters(parameters, 3, 3, 'create text <id> <x> <y> "content"');
        const [x, y, content] = parameters;
        return new Text(id, NumberValue.parse(x!, 'x'), NumberValue.parse(y!, 'y'), content!);
      }
      case 'g':
        this.requireParameters(parameters, 0, 0, 'create g <id>');
        return new Group(id);
      default:
        throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private requireParameters(parameters: readonly string[], min: number, max: number, syntax: string): void {
    if (parameters.length < min || parameters.length > max) {
      throw new Error(`usage: ${syntax}`);
    }
  }
}
