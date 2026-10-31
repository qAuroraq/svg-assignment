import type { Document } from '../model/Document.js';
import type { ShapeDescription } from '../model/Shape.js';
import { FileAccess } from './FileAccess.js';

export class SvgWriter {
  public constructor(private readonly files = new FileAccess()) {}

  public write(document: Document, file: string): void {
    const xml = this.serialize(document);
    this.files.write(file, xml);
  }

  public serialize(document: Document): string {
    const width = document.getWidth();
    const height = document.getHeight();
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      ...document.getChildren().map((shape) => this.element(shape.describe(), 1)),
      '</svg>', '',
    ].join('\n');
  }

  private element(description: ShapeDescription, depth: number): string {
    const indent = '  '.repeat(depth);
    const attributes = Object.entries(description.attributes)
      .map(([name, value]) => ` ${name}="${this.attribute(String(value))}"`).join('');
    const opening = `${indent}<${description.tag}${attributes}`;
    if (description.text !== undefined) {
      return `${opening}>${this.text(description.text)}</${description.tag}>`;
    }
    if (description.children.length === 0) return `${opening}/>`;
    return [
      `${opening}>`,
      ...description.children.map((child) => this.element(child, depth + 1)),
      `${indent}</${description.tag}>`,
    ].join('\n');
  }

  private text(value: string): string {
    for (const character of value) {
      const code = character.codePointAt(0)!;
      if (!(code === 9 || code === 10 || code === 13 || (code >= 0x20 && code <= 0xd7ff)
        || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff))) {
        throw new Error(`cannot serialize invalid XML character: U+${code.toString(16).toUpperCase()}`);
      }
    }
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\r', '&#13;');
  }

  private attribute(value: string): string {
    return this.text(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
      .replaceAll('\t', '&#9;').replaceAll('\n', '&#10;');
  }
}
