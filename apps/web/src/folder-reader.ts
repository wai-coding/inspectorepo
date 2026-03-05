import { filterExcludedPaths } from '@inspectorepo/core';
import { isAnalyzableFile } from '@inspectorepo/core';
import type { VirtualFile } from '@inspectorepo/shared';

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
      // Read content for analyzable files only
      if (isAnalyzableFile(entry.name)) {
        try {
          const fileHandle = await handle.getFileHandle(entry.name);
          const file = await fileHandle.getFile();
          const content = await file.text();
          files.push({ path: entryPath, content });
        } catch {
          files.push({ path: entryPath, content: '' });
        }
      } else {
        files.push({ path: entryPath, content: '' });
      }
    }
  }

  return files;
}

// Fallback: <input webkitdirectory>
export async function readUploadedFiles(fileList: FileList): Promise<{ name: string; files: VirtualFile[] }> {
  const files: VirtualFile[] = [];
  let folderName = '';

  const readPromises: Promise<void>[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const relativePath = file.webkitRelativePath || file.name;

    if (!folderName && relativePath.includes('/')) {
      folderName = relativePath.split('/')[0];
    }

    const path = relativePath.replace(/^[^/]+\//, '');

    if (isAnalyzableFile(file.name)) {
      const idx = files.length;
      files.push({ path, content: '' });
      readPromises.push(
        file.text().then((content) => {
          files[idx].content = content;
        }),
      );
    } else {
      files.push({ path, content: '' });
    }
  }

  await Promise.all(readPromises);
  return { name: folderName || 'uploaded', files };
}

// Filter to TS/TSX only and remove excluded dirs
export function processFiles(files: VirtualFile[]): VirtualFile[] {
  const paths = files.map((f) => f.path);
  const filtered = filterExcludedPaths(paths).filter((p) => isAnalyzableFile(p));
  const filteredSet = new Set(filtered);
  return files.filter((f) => filteredSet.has(f.path));
}
