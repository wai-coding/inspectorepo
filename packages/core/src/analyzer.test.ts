import { describe, expect, it } from 'vitest';
import { analyzeFiles } from './analyzer.js';
import { isAnalyzableFile, filterAnalyzableFiles } from './scanner.js';

describe('scanner', () => {
  it('identifies .ts files as analyzable', () => {
    expect(isAnalyzableFile('app.ts')).toBe(true);
  });

  it('identifies .tsx files as analyzable', () => {
    expect(isAnalyzableFile('Component.tsx')).toBe(true);
  });

  it('rejects non-TS files', () => {
    expect(isAnalyzableFile('style.css')).toBe(false);
    expect(isAnalyzableFile('readme.md')).toBe(false);
    expect(isAnalyzableFile('data.json')).toBe(false);
  });

  it('filters a mixed list of files', () => {
    const files = ['a.ts', 'b.tsx', 'c.js', 'd.css'];
    expect(filterAnalyzableFiles(files)).toEqual(['a.ts', 'b.tsx']);
  });
});

describe('analyzer', () => {
  it('returns empty report for no files', () => {
    const report = analyzeFiles([]);
    expect(report.totalIssues).toBe(0);
    expect(report.scannedFiles).toBe(0);
    expect(report.results).toEqual([]);
  });

  it('scans only .ts/.tsx files', () => {
    const files = [
      { path: 'app.ts', content: 'const x = 1;' },
      { path: 'style.css', content: 'body {}' },
    ];
    const report = analyzeFiles(files);
    expect(report.scannedFiles).toBe(1);
    expect(report.results[0].filePath).toBe('app.ts');
  });

  it('returns zero issues with placeholder rule', () => {
    const files = [{ path: 'test.ts', content: 'const x = 1;' }];
    const report = analyzeFiles(files);
    expect(report.totalIssues).toBe(0);
  });
});
