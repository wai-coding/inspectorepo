import { describe, expect, it } from 'vitest';
import {
  isExcludedDir,
  filterExcludedPaths,
  buildDirectoryTree,
  pickDefaultDirs,
  filterBySelectedDirs,
  normalizeRelativePath,
} from './file-filter.js';

describe('isExcludedDir', () => {
  it('excludes node_modules', () => {
    expect(isExcludedDir('node_modules')).toBe(true);
  });

  it('excludes dist, build, .git', () => {
    expect(isExcludedDir('dist')).toBe(true);
    expect(isExcludedDir('build')).toBe(true);
    expect(isExcludedDir('.git')).toBe(true);
  });

  it('excludes hidden directories starting with dot', () => {
    expect(isExcludedDir('.next')).toBe(true);
    expect(isExcludedDir('.vscode')).toBe(true);
    expect(isExcludedDir('.hidden')).toBe(true);
  });

  it('allows normal directory names', () => {
    expect(isExcludedDir('src')).toBe(false);
    expect(isExcludedDir('components')).toBe(false);
    expect(isExcludedDir('lib')).toBe(false);
  });
});

describe('filterExcludedPaths', () => {
  it('removes paths containing excluded directories', () => {
    const paths = [
      'src/app.ts',
      'node_modules/react/index.ts',
      'dist/bundle.ts',
      'src/components/Button.tsx',
      '.git/config.ts',
    ];
    expect(filterExcludedPaths(paths)).toEqual([
      'src/app.ts',
      'src/components/Button.tsx',
    ]);
  });

  it('removes paths with deeply nested excluded dirs', () => {
    const paths = [
      'packages/core/node_modules/dep/index.ts',
      'packages/core/src/main.ts',
    ];
    expect(filterExcludedPaths(paths)).toEqual([
      'packages/core/src/main.ts',
    ]);
  });

  it('returns all paths when none are excluded', () => {
    const paths = ['src/app.ts', 'lib/utils.ts'];
    expect(filterExcludedPaths(paths)).toEqual(paths);
  });
});

describe('buildDirectoryTree', () => {
  it('groups files by top-level directory', () => {
    const paths = [
      'src/app.ts',
      'src/main.ts',
      'lib/utils.ts',
    ];
    const tree = buildDirectoryTree(paths);
    expect(tree).toEqual([
      { name: 'lib', fileCount: 1 },
      { name: 'src', fileCount: 2 },
    ]);
  });

  it('ignores root-level files (no directory)', () => {
    const paths = ['README.ts', 'src/app.ts'];
    const tree = buildDirectoryTree(paths);
    expect(tree).toEqual([{ name: 'src', fileCount: 1 }]);
  });

  it('returns empty array for no files', () => {
    expect(buildDirectoryTree([])).toEqual([]);
  });

  it('sorts directories alphabetically', () => {
    const paths = ['z/a.ts', 'a/b.ts', 'm/c.ts'];
    const names = buildDirectoryTree(paths).map((d) => d.name);
    expect(names).toEqual(['a', 'm', 'z']);
  });
});

describe('pickDefaultDirs', () => {
  it('picks src if available', () => {
    const dirs = [
      { name: 'lib', fileCount: 5 },
      { name: 'src', fileCount: 10 },
    ];
    expect(pickDefaultDirs(dirs)).toEqual(['src']);
  });

  it('picks first dir when src is not available', () => {
    const dirs = [
      { name: 'app', fileCount: 3 },
      { name: 'lib', fileCount: 5 },
    ];
    expect(pickDefaultDirs(dirs)).toEqual(['app']);
  });

  it('returns empty when no dirs', () => {
    expect(pickDefaultDirs([])).toEqual([]);
  });
});

describe('filterBySelectedDirs', () => {
  it('filters to only selected directories', () => {
    const paths = ['src/app.ts', 'lib/utils.ts', 'test/app.test.ts'];
    expect(filterBySelectedDirs(paths, ['src', 'test'])).toEqual([
      'src/app.ts',
      'test/app.test.ts',
    ]);
  });

  it('returns empty for no matching dirs', () => {
    expect(filterBySelectedDirs(['src/a.ts'], ['lib'])).toEqual([]);
  });
});

describe('normalizeRelativePath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizeRelativePath('src\\components\\App.tsx')).toBe('src/components/App.tsx');
  });

  it('collapses multiple slashes', () => {
    expect(normalizeRelativePath('src//utils///helper.ts')).toBe('src/utils/helper.ts');
  });

  it('strips leading slash', () => {
    expect(normalizeRelativePath('/src/app.ts')).toBe('src/app.ts');
  });

  it('handles already-clean paths', () => {
    expect(normalizeRelativePath('src/app.ts')).toBe('src/app.ts');
  });

  it('handles empty string', () => {
    expect(normalizeRelativePath('')).toBe('');
  });
});
