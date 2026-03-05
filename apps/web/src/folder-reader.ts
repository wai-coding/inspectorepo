import { filterExcludedPaths } from '@inspectorepo/core';
import { isAnalyzableFile } from '@inspectorepo/core';

export interface VirtualFile {
  path: string;
  content: string;
}

// File System Access API (Chrome/Edge)
export async function selectFolderViaAPI(): Promise<{ name: string; files: VirtualFile[] } | null> {
  if (!('showDirectoryPicker' in window)) return null;

  try {
    const handle = await (window as never as { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
    const files = await readDirectoryHandle(handle, '');
    return { name: handle.name, files };
  } catch {
    // User cancelled
    return null;
  }
}

async function readDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  prefix: string,
): Promise<VirtualFile[]> {
  const files: VirtualFile[] = [];
  // Use the async iterable protocol — cast needed because TS DOM types lag behind
  const iter = (handle as unknown as AsyncIterable<FileSystemHandle>)[Symbol.asyncIterator]();

  for (;;) {
    const { value: entry, done } = await iter.next();
    if (done) break;

    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      const sub = await handle.getDirectoryHandle(entry.name).catch(() => null);
      if (sub) {
        files.push(...(await readDirectoryHandle(sub, entryPath)));
      }
    } else {
      files.push({ path: entryPath, content: '' });
    }
  }

  return files;
}

// Fallback: <input webkitdirectory>
export function readUploadedFiles(fileList: FileList): { name: string; files: VirtualFile[] } {
  const files: VirtualFile[] = [];
  let folderName = '';

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const relativePath = file.webkitRelativePath || file.name;

    if (!folderName && relativePath.includes('/')) {
      folderName = relativePath.split('/')[0];
    }

    files.push({ path: relativePath.replace(/^[^/]+\//, ''), content: '' });
  }

  return { name: folderName || 'uploaded', files };
}

// Filter to TS/TSX only and remove excluded dirs
export function processFiles(files: VirtualFile[]): VirtualFile[] {
  const paths = files.map((f) => f.path);
  const filtered = filterExcludedPaths(paths).filter((p) => isAnalyzableFile(p));
  const filteredSet = new Set(filtered);
  return files.filter((f) => filteredSet.has(f.path));
}

// Read content via FS Access API
export async function readFileContent(
  handle: FileSystemDirectoryHandle,
  filePath: string,
): Promise<string> {
  const parts = filePath.split('/');
  let current: FileSystemDirectoryHandle = handle;

  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i]);
  }

  const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
  const file = await fileHandle.getFile();
  return file.text();
}

// Read content from uploaded File objects
export async function readUploadedFileContent(file: File): Promise<string> {
  return file.text();
}
