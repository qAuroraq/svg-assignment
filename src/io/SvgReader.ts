import { SaxesParser } from 'saxes';
import { Document } from '../model/Document.js';
import { NumberValue } from '../model/NumberValue.js';
import { Shape } from '../model/Shape.js';
import type { ShapeFactory } from '../model/ShapeFactory.js';
import { FileAccess } from './FileAccess.js';

interface ParsedElement {
  readonly name: string;
  readonly attributes: Record<string, string>;
  readonly children: ParsedElement[];
  text: string;
}

export interface SvgReadResult {
  readonly document: Document;
  readonly warnings: readonly string[];
}

export class SvgReader {
  public constructor(private readonly factory: ShapeFactory, private readonly files = new FileAccess()) {}

  public read(file: string): SvgReadResult {
    return this.parse(this.files.read(file));
  }

  public parse(xml: string): SvgReadResult {
    const root = this.parseXml(xml);
    if (root.name !== 'svg') throw new Error('SVG root must be <svg>');
    for (const name of Object.keys(root.attributes)) {
      if (!['width', 'height', 'viewBox'].includes(name)) {
        throw new Error(`unsupported attribute on <svg>: ${name}`);
      }
    }
    if (!/^[\t\r\n ]*$/.test(root.text)) throw new Error('unexpected text in <svg>');
    const dimension = (name: string): number => {
      const value = root.attributes[name];
      if (value === undefined) throw new Error(`missing attribute on <svg>: ${name}`);
      return NumberValue.length(value, name);
    };
    const document = new Document(dimension('width'), dimension('height'));
    if (root.attributes.viewBox !== undefined) this.validateViewBox(root.attributes.viewBox, document);

    const elements: ParsedElement[] = [];
    const collect = (element: ParsedElement): void => {
      elements.push(element);
      element.children.forEach(collect);
    };
    root.children.forEach(collect);
    const occupied = new Set<string>();
    for (const element of elements) {
      const id = element.attributes.id;
      if (id === undefined) continue;
      Shape.validateId(id);
      if (occupied.has(id)) throw new Error(`id already exists: ${id}`);
      occupied.add(id);
    }
    const warnings: string[] = [];
    const next = new Map<string, number>();
    const build = (element: ParsedElement, parent?: Shape): void => {
      let id = element.attributes.id;
      if (id === undefined) {
        let number = next.get(element.name) ?? 1;
        while (occupied.has(`${element.name}${number}`)) number++;
        id = `${element.name}${number}`;
        next.set(element.name, number + 1);
        occupied.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${element.name}>`);
      }
      const shape = this.factory.fromAttributes(element.name, id, element.attributes, element.text);
      if (element.children.length > 0 && shape.getChildList() === undefined) {
        throw new Error(`child elements are not supported in <${element.name}>`);
      }
      document.insert(shape, undefined, parent);
      element.children.forEach((child) => build(child, shape));
    };
    root.children.forEach((child) => build(child));
    return { document, warnings };
  }

  private parseXml(xml: string): ParsedElement {
    const parser = new SaxesParser({ xmlns: true });
    const stack: ParsedElement[] = [];
    let root: ParsedElement | undefined;
    let namespace: string | undefined;
    parser.on('error', (error) => { throw new Error(`invalid XML: ${error.message}`); });
    parser.on('doctype', () => { throw new Error('DTD is not supported'); });
    parser.on('processinginstruction', () => { throw new Error('XML processing instructions are not supported'); });
    parser.on('xmldecl', (declaration) => {
      if (declaration.version !== '1.0' || (declaration.encoding !== undefined && declaration.encoding.toUpperCase() !== 'UTF-8')) {
        throw new Error('only XML 1.0 with UTF-8 encoding is supported');
      }
    });
    parser.on('opentag', (tag) => {
      namespace ??= tag.uri;
      if ((namespace !== '' && namespace !== 'http://www.w3.org/2000/svg') || tag.uri !== namespace) {
        throw new Error(`unsupported SVG namespace: ${tag.uri || '(none)'}`);
      }
      const attributes: Record<string, string> = Object.create(null) as Record<string, string>;
      for (const attribute of Object.values(tag.attributes)) {
        if (attribute.uri === 'http://www.w3.org/2000/xmlns/') continue;
        if (attribute.uri !== '') throw new Error(`unsupported namespaced attribute: ${attribute.name}`);
        attributes[attribute.local] = attribute.value;
      }
      const element: ParsedElement = { name: tag.local, attributes, children: [], text: '' };
      const parent = stack.at(-1);
      if (parent === undefined) root = element;
      else parent.children.push(element);
      stack.push(element);
    });
    const appendText = (text: string): void => {
      const element = stack.at(-1);
      if (element !== undefined) element.text += text;
    };
    parser.on('text', appendText);
    parser.on('cdata', appendText);
    parser.on('closetag', () => { stack.pop(); });
    // No entity resolver or resource loader is installed. Comments are ignored.
    parser.write(xml).close();
    if (root === undefined) throw new Error('SVG root must be <svg>');
    return root;
  }

  private validateViewBox(value: string, document: Document): void {
    // SVG comma/whitespace separators; reject empty items, units and trailing commas.
    const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
    const separator = '(?:[\\t\\r\\n ]+,?[\\t\\r\\n ]*|[\\t\\r\\n ]*,[\\t\\r\\n ]*)';
    const match = new RegExp(`^[\\t\\r\\n ]*(${number})${separator}(${number})${separator}(${number})${separator}(${number})[\\t\\r\\n ]*$`).exec(value);
    const expected = [0, 0, document.getWidth(), document.getHeight()];
    if (match === null || expected.some((n, index) => NumberValue.parse(match[index + 1]!, 'viewBox') !== n)) {
      throw new Error('unsupported viewBox: expected 0 0 width height matching the canvas');
    }
  }
}
