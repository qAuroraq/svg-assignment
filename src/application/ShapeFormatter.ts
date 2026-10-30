import type { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';

export class ShapeFormatter {
  public label(shape: Shape): string {
    return `${shape.getType()}#${shape.getId()}`;
  }

  public inline(shape: Shape): string {
    return `${this.label(shape)}  ${this.attributes(shape)}`.trimEnd();
  }

  public attributes(shape: Shape): string {
    const attributes = Object.entries(shape.getAttributes()).map(([name, value]) => {
      const shortName = name === 'width' ? 'w' : name === 'height' ? 'h' : name;
      return `${shortName}=${this.value(value, name === 'text')}`;
    });
    return attributes.join(' ');
  }

  public parent(document: Document, shape: Shape): string {
    const parent = document.getParent(shape);
    return parent === undefined ? 'svg' : this.label(parent);
  }

  public change(shape: Shape, action: string): string {
    const attributes = this.attributes(shape);
    return `${this.label(shape)} ${action}${attributes === '' ? '' : `: ${attributes}`}`;
  }

  public show(shape: Shape, document: Document): string {
    const attributes = Object.entries(shape.getAttributes()).map(
      ([name, value]) => `  ${name}=${this.value(value, name === 'text')}`,
    );
    return [`${this.label(shape)}  parent=${this.parent(document, shape)}`, ...attributes].join('\n');
  }

  public tree(document: Document, root?: Shape): string {
    const lines = [root === undefined
      ? `svg (${document.getWidth()}x${document.getHeight()})`
      : this.inline(root)];
    this.appendChildren(root === undefined ? document.getChildren() : root.getChildren(), '', lines);
    return lines.join('\n');
  }

  private appendChildren(children: readonly Shape[], prefix: string, lines: string[]): void {
    children.forEach((shape, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${this.inline(shape)}`);
      this.appendChildren(shape.getChildren(), `${prefix}${last ? '    ' : '│   '}`, lines);
    });
  }

  private value(value: string | number, quote: boolean = false): string {
    return typeof value === 'string' && (quote || value.length === 0 || /\s|"|\\/u.test(value))
      ? JSON.stringify(value)
      : String(value);
  }
}
