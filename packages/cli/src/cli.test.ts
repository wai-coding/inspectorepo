import { describe, it, expect } from 'vitest';
import { parseDirs, filterByDirs } from './fs-reader.js';
import type { VirtualFile } from '@inspectorepo/shared';

describe('parseDirs', () => {
  it('splits comma-separated input', () => {
    expect(parseDirs('src,lib,utils')).toEqual(['src', 'lib', 'utils']);
  });

  it('trims whitespace', () => {
    expect(parseDirs(' src , lib ')).toEqual(['src', 'lib']);
  });

  it('returns empty array for empty input', () => {
    expect(parseDirs('')).toEqual([]);
  });

  it('handles single directory', () => {
    expect(parseDirs('src')).toEqual(['src']);
  });
});

describe('filterByDirs', () => {
  const files: VirtualFile[] = [
    { path: 'src/index.ts', content: '' },
    { path: 'src/utils/helpers.ts', content: '' },
    { path: 'lib/core.ts', content: '' },
    { path: 'test/app.test.ts', content: '' },
  ];

  it('returns all files when dirs is empty', () => {
    expect(filterByDirs(files, [])).toEqual(files);
  });

  it('filters to files under specified dirs', () => {
    const result = filterByDirs(files, ['src']);
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.path)).toEqual(['src/index.ts', 'src/utils/helpers.ts']);
  });

  it('supports multiple dirs', () => {
    const result = filterByDirs(files, ['src', 'lib']);
    expect(result).toHaveLength(3);
  });

  it('returns empty when no files match', () => {
    const result = filterByDirs(files, ['components']);
    expect(result).toHaveLength(0);
  });

  it('does not match partial path prefix', () => {
    const result = filterByDirs(
      [{ path: 'srcode/file.ts', content: '' }],
      ['src'],
    );
    expect(result).toHaveLength(0);
  });
});
