import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isExcludedDir } from '@inspectorepo/core';
import type { VirtualFile } from '@inspectorepo/shared';

/** Recursively collect .ts/.tsx files from a directory. */
export function readFilesFromDisk(rootDir: string): VirtualFile[] {
  const files: VirtualFile[] = [];
  walk(rootDir, rootDir, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

function walk(dir: string, rootDir: string, files: VirtualFile[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isExcludedDir(entry.name)) continue;
      walk(join(dir, entry.name), rootDir, files);
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(rootDir, fullPath).split('\\').join('/');
      files.push({
        path: relPath,
        content: readFileSync(fullPath, 'utf-8'),
      });
    }
  }
}

/** Parse comma-separated directory list. */
export function parseDirs(input: string): string[] {
  return input
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}

/** Filter files to only those under the given directories. */
export function filterByDirs(files: VirtualFile[], dirs: string[]): VirtualFile[] {
  if (dirs.length === 0) return files;
  return files.filter((f) => dirs.some((d) => f.path === d || f.path.startsWith(d + '/')));
}
