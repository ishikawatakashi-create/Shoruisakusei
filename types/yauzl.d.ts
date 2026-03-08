declare module "yauzl" {
  import { EventEmitter } from "events";

  export interface Entry {
    fileName: string;
  }

  export interface Options {
    lazyEntries?: boolean;
    autoClose?: boolean;
    decodeStrings?: boolean;
    validateEntrySizes?: boolean;
  }

  export interface ZipFile extends EventEmitter {
    readEntry(): void;
    close(): void;
    openReadStream(
      entry: Entry,
      callback: (error: Error | null, stream: NodeJS.ReadableStream) => void
    ): void;
  }

  export function fromBuffer(
    buffer: Buffer,
    options: Options,
    callback: (error: Error | null, zipFile: ZipFile) => void
  ): void;
}
