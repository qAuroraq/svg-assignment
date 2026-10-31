import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { NumberValue } from './NumberValue.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { Text } from './Text.js';

interface ShapeDefinition {
  readonly syntax: string;
  readonly geometry: readonly string[];
  readonly defaults: Readonly<Record<string, number>>;
  readonly tail?: 'fill' | 'stroke' | 'text';
  readonly construct: (id: string, geometry: readonly number[], tail: string | undefined) => Shape;
}

export class ShapeFactory {
  public create(type: string, id: string, parameters: readonly string[]): Shape {
    const definition = this.definition(type);
    const min = definition.geometry.length + (definition.tail === 'text' ? 1 : 0);
    const max = definition.geometry.length + (definition.tail === undefined ? 0 : 1);
    if (parameters.length < min || parameters.length > max) {
      throw new Error(`usage: ${definition.syntax}`);
    }
    const geometry = definition.geometry.map((name, index) => NumberValue.parse(parameters[index]!, name));
    return definition.construct(id, geometry, parameters[definition.geometry.length]);
  }

  public fromAttributes(type: string, id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    const definition = this.definition(type);
    const styles = ['fill', 'stroke', 'stroke-width'];
    const allowed = new Set(['id', ...definition.geometry, ...styles]);
    for (const name of Object.keys(attributes)) {
      if (!allowed.has(name)) {
        throw new Error(`unsupported attribute on <${type}>: ${name}`);
      }
    }
    if (definition.tail !== 'text' && !/^[\t\r\n ]*$/.test(text)) {
      throw new Error(`unexpected text in <${type}>`);
    }
    const geometry = definition.geometry.map((name) => {
      const value = attributes[name];
      if (value !== undefined) return NumberValue.length(value, name);
      const fallback = definition.defaults[name];
      if (fallback === undefined) throw new Error(`missing attribute on <${type}>: ${name}`);
      return fallback;
    });
    const shape = definition.construct(id, geometry, definition.tail === 'text' ? text : undefined);
    for (const name of styles) {
      const value = attributes[name];
      if (value !== undefined) {
        shape.setAttribute(name, name === 'stroke-width' ? NumberValue.length(value, name) : value);
      }
    }
    return shape;
  }

  // The only shape-name dispatch, shared by CLI and structured imports.
  // Pending refactoring: replace this switch with provider registration.
  private definition(type: string): ShapeDefinition {
    switch (type) {
      case 'rect': return {
        syntax: 'create rect <id> <x> <y> <w> <h> [fill]',
        geometry: ['x', 'y', 'width', 'height'], defaults: { x: 0, y: 0 }, tail: 'fill',
        construct: (id, n, fill) => new Rect(id, n[0]!, n[1]!, n[2]!, n[3]!, fill),
      };
      case 'circle': return {
        syntax: 'create circle <id> <cx> <cy> <r> [fill]',
        geometry: ['cx', 'cy', 'r'], defaults: { cx: 0, cy: 0 }, tail: 'fill',
        construct: (id, n, fill) => new Circle(id, n[0]!, n[1]!, n[2]!, fill),
      };
      case 'ellipse': return {
        syntax: 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]',
        geometry: ['cx', 'cy', 'rx', 'ry'], defaults: { cx: 0, cy: 0 }, tail: 'fill',
        construct: (id, n, fill) => new Ellipse(id, n[0]!, n[1]!, n[2]!, n[3]!, fill),
      };
      case 'line': return {
        syntax: 'create line <id> <x1> <y1> <x2> <y2> [stroke]',
        geometry: ['x1', 'y1', 'x2', 'y2'], defaults: { x1: 0, y1: 0, x2: 0, y2: 0 }, tail: 'stroke',
        construct: (id, n, stroke) => new Line(id, n[0]!, n[1]!, n[2]!, n[3]!, stroke),
      };
      case 'text': return {
        syntax: 'create text <id> <x> <y> "content"',
        geometry: ['x', 'y'], defaults: { x: 0, y: 0 }, tail: 'text',
        construct: (id, n, text) => new Text(id, n[0]!, n[1]!, text!),
      };
      case 'g': return {
        syntax: 'create g <id>', geometry: [], defaults: {}, construct: (id) => new Group(id),
      };
      default: throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }
}
