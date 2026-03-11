import { describe, it, expect, vi } from 'vitest';
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

describe('summary-only mode', () => {
  it('run() prints score and severity counts when --summary-only is used', async () => {
    const { run } = await import('./cli.js');
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const fixtureDir = new URL('../../../examples/fixture-repo', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    run(['analyze', fixtureDir, '--summary-only']);

    spy.mockRestore();
    errSpy.mockRestore();

    const output = logs.join('\n');
    expect(output).toContain('Score:');
    expect(output).toContain('Total issues:');
    expect(output).toContain('Errors:');
    expect(output).toContain('Warnings:');
    expect(output).toContain('Info:');
  });

  it('--summary-only works with --group-by package', async () => {
    const { run } = await import('./cli.js');
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const fixtureDir = new URL('../../../examples/fixture-repo', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    run(['analyze', fixtureDir, '--summary-only', '--group-by', 'package']);

    spy.mockRestore();
    errSpy.mockRestore();

    const output = logs.join('\n');
    expect(output).toContain('Score:');
    expect(output).toContain('Total issues:');
    // Should not contain full issue listings
    expect(output).not.toContain('# InspectoRepo');
  });
});
