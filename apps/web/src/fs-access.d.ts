// Augment FileSystemDirectoryHandle with async iterator methods
// These are standard in Chrome/Edge but missing from TypeScript's DOM lib
interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
  values(): AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle>;
  keys(): AsyncIterableIterator<string>;
}
