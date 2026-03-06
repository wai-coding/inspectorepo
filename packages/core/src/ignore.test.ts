import { describe, it, expect } from 'vitest';
import { parseIgnoreFile, isIgnored, filterIgnoredPaths } from './ignore.js';

describe('parseIgnoreFile', () => {
  it('parses patterns from ignore file content', () => {
    const content = 'dist\nbuild\n\n# Comment\nnode_modules\n';
    expect(parseIgnoreFile(content)).toEqual(['dist', 'build', 'node_modules']);
  });

  it('handles empty content', () => {
    expect(parseIgnoreFile('')).toEqual([]);
  });

  it('strips whitespace from lines', () => {
    expect(parseIgnoreFile('  dist  \n  build  ')).toEqual(['dist', 'build']);
  });
});

describe('isIgnored', () => {
  it('matches ignored folder in path', () => {
    expect(isIgnored('dist/bundle.js', ['dist'])).toBe(true);
  });

  it('matches ignored file name', () => {
    expect(isIgnored('src/tests/app.test.ts', ['tests'])).toBe(true);
  });

  it('matches nested ignore pattern', () => {
    expect(isIgnored('packages/core/coverage/report.html', ['coverage'])).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(isIgnored('src/app.ts', ['dist', 'build'])).toBe(false);
  });

  it('matches wildcard pattern', () => {
    expect(isIgnored('src/app.test.ts', ['*.test.ts'])).toBe(true);
  });

  it('does not match wildcard against wrong extension', () => {
    expect(isIgnored('src/app.ts', ['*.test.ts'])).toBe(false);
  });
});

describe('filterIgnoredPaths', () => {
  it('removes ignored paths', () => {
    const paths = [
      'src/app.ts',
      'dist/bundle.js',
      'src/utils.ts',
      'coverage/report.html',
    ];
    const result = filterIgnoredPaths(paths, ['dist', 'coverage']);
    expect(result).toEqual(['src/app.ts', 'src/utils.ts']);
  });

  it('returns all paths when no patterns', () => {
    const paths = ['src/app.ts', 'dist/bundle.js'];
    expect(filterIgnoredPaths(paths, [])).toEqual(paths);
  });
});
