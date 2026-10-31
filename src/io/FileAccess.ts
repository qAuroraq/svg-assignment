import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';

type FileSystem = Pick<typeof fs, 'readFileSync' | 'openSync' | 'writeFileSync' | 'closeSync' | 'renameSync' | 'unlinkSync'>;

export class FileAccess {
  public constructor(private readonly files: FileSystem = fs) {}

  public read(file: string): string {
    let bytes: Buffer;
    try {
      bytes = this.files.readFileSync(file);
    } catch {
      throw new Error(`cannot read file: ${file}`);
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('SVG input must be valid UTF-8');
    }
  }

  public write(file: string, content: string): void {
    const target = resolve(file);
    const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    let created = false;
    try {
      descriptor = this.files.openSync(temporary, 'wx', 0o666);
      created = true;
      this.files.writeFileSync(descriptor, content, 'utf8');
      this.files.closeSync(descriptor);
      descriptor = undefined;
      this.files.renameSync(temporary, target);
    } catch {
      // Cleanup errors must never hide the original failure; only remove our file.
      if (descriptor !== undefined) {
        try { this.files.closeSync(descriptor); } catch { /* best effort */ }
      }
      if (created) {
        try { this.files.unlinkSync(temporary); } catch { /* best effort */ }
      }
      throw new Error(`cannot write file: ${file}`);
    }
  }
}
