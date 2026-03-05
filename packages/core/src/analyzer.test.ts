import { describe, expect, it } from 'vitest';
import { analyzeCodebase } from './analyzer.js';
import { isAnalyzableFile, filterAnalyzableFiles } from './scanner.js';
import { unusedImportsRule } from './rules/unused-imports.js';
import { complexityHotspotRule } from './rules/complexity-hotspot.js';
import { buildMarkdownReport } from './report.js';

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

describe('analyzeCodebase', () => {
  it('returns empty report for no files', () => {
    const report = analyzeCodebase({ files: [], selectedDirectories: [] });
    expect(report.summary.totalIssues).toBe(0);
    expect(report.summary.score).toBe(100);
    expect(report.issues).toEqual([]);
  });

  it('scans only .ts/.tsx files', () => {
    const files = [
      { path: 'src/app.ts', content: 'const x = 1;\n' },
      { path: 'src/style.css', content: 'body {}' },
    ];
    const report = analyzeCodebase({ files, selectedDirectories: ['src'] });
    expect(report.meta.analyzedFilesCount).toBe(1);
  });

  it('sorts issues deterministically', () => {
    const files = [
      {
        path: 'src/b.ts',
        content: 'import { foo } from "./foo";\nconst x = 1;\n',
      },
      {
        path: 'src/a.ts',
        content: 'import { bar } from "./bar";\nconst y = 2;\n',
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    // Should be sorted: same severity+rule, then by file path (a before b)
    if (report.issues.length >= 2) {
      expect(report.issues[0].filePath.localeCompare(report.issues[1].filePath)).toBeLessThanOrEqual(0);
    }
  });
});

describe('unused-imports rule', () => {
  it('detects completely unused import', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: 'import { useState } from "react";\n\nconst x = 1;\n',
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('unused-imports');
    expect(report.issues[0].message).toContain('react');
  });

  it('detects partially unused named imports', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: [
          'import { useState, useEffect } from "react";',
          '',
          'export function App() { return useState(0); }',
          '',
        ].join('\n'),
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('useEffect');
  });

  it('does not flag used imports', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: [
          'import { useState } from "react";',
          '',
          'export const x = useState(0);',
          '',
        ].join('\n'),
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    expect(report.issues.length).toBe(0);
  });

  it('does not flag side-effect imports', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: 'import "./polyfill";\n\nconst x = 1;\n',
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    expect(report.issues.length).toBe(0);
  });
});

describe('complexity-hotspot rule', () => {
  it('flags functions above threshold', () => {
    // Build a function with many branches to exceed threshold of 12
    const code = [
      'export function complex(a: number, b: number, c: boolean) {',
      '  if (a > 0) {',
      '    if (b > 0) {',
      '      if (c) {',
      '        for (let i = 0; i < a; i++) {',
      '          if (i % 2 === 0) {',
      '            console.log(i);',
      '          } else if (i % 3 === 0) {',
      '            console.log(i * 2);',
      '          }',
      '        }',
      '      }',
      '    }',
      '  } else if (a < 0) {',
      '    switch (b) {',
      '      case 1: break;',
      '      case 2: break;',
      '      case 3: break;',
      '    }',
      '  }',
      '  return a && b || c ? a : b;',
      '}',
    ].join('\n');

    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [complexityHotspotRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('complexity-hotspot');
    expect(report.issues[0].severity).toBe('warn');
  });

  it('does not flag simple functions', () => {
    const code = [
      'export function simple(x: number) {',
      '  if (x > 0) return x;',
      '  return -x;',
      '}',
    ].join('\n');

    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [complexityHotspotRule] },
    });
    expect(report.issues.length).toBe(0);
  });
});

describe('buildMarkdownReport', () => {
  it('contains expected sections for report with issues', () => {
    const report = analyzeCodebase({
      files: [
        {
          path: 'src/test.ts',
          content: 'import { foo } from "./foo";\nconst x = 1;\n',
        },
      ],
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    const md = buildMarkdownReport(report);
    expect(md).toContain('# InspectoRepo Analysis Report');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Issues');
    expect(md).toContain('## Details');
    expect(md).toContain('Score');
    expect(md).toContain('unused-imports');
  });

  it('shows no-issues message for clean report', () => {
    const report = analyzeCodebase({
      files: [
        { path: 'src/clean.ts', content: 'export const x = 1;\n' },
      ],
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    const md = buildMarkdownReport(report);
    expect(md).toContain('No issues found');
    expect(md).not.toContain('## Issues');
  });
});
