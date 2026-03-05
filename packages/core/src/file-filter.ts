const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'out',
  'coverage',
  '.turbo',
  '.cache',
]);

export function isExcludedDir(name: string): boolean {
  if (EXCLUDED_DIRS.has(name)) return true;
  if (name.startsWith('.') && name !== '.') return true;
  return false;
}

export interface DirEntry {
  name: string;
  fileCount: number;
}

export interface FileEntry {
  path: string;
  content?: string;
}

export function buildDirectoryTree(filePaths: string[]): DirEntry[] {
  const dirCounts = new Map<string, number>();

  for (const filePath of filePaths) {
    const parts = filePath.split('/');
    if (parts.length < 2) continue;
    const topDir = parts[0];
    dirCounts.set(topDir, (dirCounts.get(topDir) || 0) + 1);
  }

  return Array.from(dirCounts.entries())
    .map(([name, fileCount]) => ({ name, fileCount }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterExcludedPaths(filePaths: string[]): string[] {
  return filePaths.filter((p) => {
    const parts = p.split('/');
    return !parts.some((part) => isExcludedDir(part));
  });
}

export function pickDefaultDirs(dirs: DirEntry[]): string[] {
  const srcDir = dirs.find((d) => d.name === 'src');
  if (srcDir) return ['src'];

  // Pick first dir that has files (already filtered to TS/TSX)
  if (dirs.length > 0) return [dirs[0].name];
  return [];
}

export function filterBySelectedDirs(filePaths: string[], selectedDirs: string[]): string[] {
  const dirSet = new Set(selectedDirs);
  return filePaths.filter((p) => {
    const topDir = p.split('/')[0];
    return dirSet.has(topDir);
  });
}
