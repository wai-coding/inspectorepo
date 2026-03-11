import { describe, expect, it } from 'vitest';
import { analyzeCodebase, groupIssuesByPackage } from './analyzer.js';
import { isAnalyzableFile, filterAnalyzableFiles } from './scanner.js';
import { unusedImportsRule } from './rules/unused-imports.js';
import { complexityHotspotRule } from './rules/complexity-hotspot.js';
import { optionalChainingRule } from './rules/optional-chaining.js';
import { booleanSimplificationRule } from './rules/boolean-simplification.js';
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

  it('generates correct patch for default + named imports with unused named', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: [
          'import React, { useState, useEffect } from "react";',
          '',
          'export function App() { return React.createElement("div", null, useState(0)); }',
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
    expect(report.issues[0].suggestion.proposedDiff).toContain("import React, { useState } from 'react';");
  });

  it('removes entire namespace import when unused', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: 'import * as fs from "fs";\n\nconst x = 1;\n',
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('fs');
    expect(report.issues[0].suggestion.proposedDiff).toContain('- import * as fs from "fs";');
  });

  it('removes entire import when all named imports unused', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: 'import { a, b } from "x";\n\nconst z = 1;\n',
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('entire import');
    expect(report.issues[0].suggestion.proposedDiff).toContain('- import { a, b } from "x";');
  });

  it('removes entire import when unused default only', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: 'import React from "react";\n\nconst x = 1;\n',
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('react');
    expect(report.issues[0].suggestion.proposedDiff).toContain('- import React from "react";');
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

describe('optional-chaining rule', () => {
  it('detects a && a.b guard chain', () => {
    const code = 'const x = a && a.b;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [optionalChainingRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('optional-chaining');
    expect(report.issues[0].message).toContain('a?.b');
  });

  it('detects a && a.b && a.b.c triple chain', () => {
    const code = 'const x = a && a.b && a.b.c;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [optionalChainingRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('a?.b?.c');
  });

  it('does not flag non-monotonic chains', () => {
    const code = 'const x = a && b.c;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [optionalChainingRule] },
    });
    expect(report.issues.length).toBe(0);
  });

  it('does not flag chains with function calls', () => {
    const code = 'const x = a() && a().b;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [optionalChainingRule] },
    });
    expect(report.issues.length).toBe(0);
  });

  it('provides proposedDiff with diff', () => {
    const code = 'const x = user && user.name;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [optionalChainingRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].suggestion.proposedDiff).toContain('user?.name');
  });
});

describe('boolean-simplification rule', () => {
  it('detects x === true', () => {
    const code = 'const y = isValid === true;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [booleanSimplificationRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('isValid');
  });

  it('detects x === false', () => {
    const code = 'const y = isValid === false;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [booleanSimplificationRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('!isValid');
  });

  it('detects !!x double negation', () => {
    const code = 'const y = !!value;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [booleanSimplificationRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('Boolean(value)');
  });

  it('detects x ? true : false ternary', () => {
    const code = 'const y = isOk ? true : false;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [booleanSimplificationRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('isOk');
  });

  it('detects x ? false : true ternary', () => {
    const code = 'const y = isOk ? false : true;\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [booleanSimplificationRule] },
    });
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].message).toContain('!isOk');
  });

  it('does not flag non-boolean comparisons', () => {
    const code = 'const y = x === "hello";\n';
    const files = [{ path: 'src/test.ts', content: code }];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [booleanSimplificationRule] },
    });
    expect(report.issues.length).toBe(0);
  });
});

describe('proposedDiff standardisation', () => {
  it('all rules produce proposedDiff, not only proposedPatch', () => {
    const code = [
      'import { unused } from "x";',
      'const a = user && user.name;',
      'const b = isOk === true;',
      '',
    ].join('\n');
    const files = [{ path: 'src/test.ts', content: code }];
    const rules = [unusedImportsRule, optionalChainingRule, booleanSimplificationRule];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules },
    });
    expect(report.issues.length).toBeGreaterThanOrEqual(3);
    for (const issue of report.issues) {
      if (issue.suggestion.proposedDiff || issue.suggestion.proposedPatch) {
        expect(issue.suggestion.proposedDiff).toBeTruthy();
      }
    }
  });
});

describe('buildMarkdownReport format', () => {
  const makeReport = () => {
    const code = [
      'import { unused } from "x";',
      'const a = user && user.name;',
      '',
    ].join('\n');
    return analyzeCodebase({
      files: [{ path: 'src/test.ts', content: code }],
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule, optionalChainingRule] },
    });
  };

  it('includes severity emojis in summary table', () => {
    const md = buildMarkdownReport(makeReport());
    expect(md).toContain('🔴');
    expect(md).toContain('🟡');
    expect(md).toContain('🔵');
  });

  it('wraps diffs in collapsible <details> tags', () => {
    const md = buildMarkdownReport(makeReport());
    expect(md).toContain('<details>');
    expect(md).toContain('<summary>Proposed fix</summary>');
    expect(md).toContain('</details>');
  });

  it('uses separator lines between issues in the same file', () => {
    const md = buildMarkdownReport(makeReport());
    // Two issues in same file should have --- between them
    expect(md).toContain('---');
  });

  it('prefixes suggestions with 💡', () => {
    const md = buildMarkdownReport(makeReport());
    expect(md).toContain('> 💡');
  });
});

describe('groupIssuesByPackage', () => {
  it('groups issues by packages/ and apps/ prefixes', () => {
    const issues = [
      { id: '1', ruleId: 'unused-imports', severity: 'info' as const, message: '', filePath: 'packages/core/src/a.ts', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, suggestion: { summary: '', details: '' } },
      { id: '2', ruleId: 'unused-imports', severity: 'warn' as const, message: '', filePath: 'packages/core/src/b.ts', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, suggestion: { summary: '', details: '' } },
      { id: '3', ruleId: 'unused-imports', severity: 'error' as const, message: '', filePath: 'apps/web/src/c.ts', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, suggestion: { summary: '', details: '' } },
    ];
    const groups = groupIssuesByPackage(issues);
    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe('apps/web');
    expect(groups[0].issueCount).toBe(1);
    expect(groups[1].name).toBe('packages/core');
    expect(groups[1].issueCount).toBe(2);
  });

  it('returns empty array for no issues', () => {
    expect(groupIssuesByPackage([])).toEqual([]);
  });

  it('computes per-package severity breakdown', () => {
    const issues = [
      { id: '1', ruleId: 'r', severity: 'error' as const, message: '', filePath: 'packages/cli/src/a.ts', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, suggestion: { summary: '', details: '' } },
      { id: '2', ruleId: 'r', severity: 'warn' as const, message: '', filePath: 'packages/cli/src/b.ts', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, suggestion: { summary: '', details: '' } },
    ];
    const groups = groupIssuesByPackage(issues);
    expect(groups).toHaveLength(1);
    expect(groups[0].bySeverity.error).toBe(1);
    expect(groups[0].bySeverity.warn).toBe(1);
    expect(groups[0].bySeverity.info).toBe(0);
  });
});

describe('analyzeCodebase with groupBy', () => {
  it('populates packageGroups when groupBy is package', () => {
    const files = [
      { path: 'packages/core/src/a.ts', content: 'import { x } from "y";\nconst z = 1;\n' },
      { path: 'packages/cli/src/b.ts', content: 'import { a } from "b";\nconst c = 1;\n' },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['packages'],
      options: { rules: [unusedImportsRule], groupBy: 'package' },
    });
    expect(report.packageGroups).toBeDefined();
    expect(report.packageGroups!.length).toBeGreaterThanOrEqual(1);
    for (const pg of report.packageGroups!) {
      expect(pg.name).toMatch(/^packages\//);
      expect(pg.score).toBeDefined();
    }
  });

  it('does not include packageGroups without groupBy', () => {
    const files = [
      { path: 'src/a.ts', content: 'import { x } from "y";\nconst z = 1;\n' },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [unusedImportsRule] },
    });
    expect(report.packageGroups).toBeUndefined();
  });
});

describe('buildMarkdownReport with packageGroups', () => {
  it('includes Packages section when groups are present', () => {
    const report = analyzeCodebase({
      files: [
        { path: 'packages/core/src/a.ts', content: 'import { x } from "y";\nconst z = 1;\n' },
      ],
      selectedDirectories: ['packages'],
      options: { rules: [unusedImportsRule], groupBy: 'package' },
    });
    const md = buildMarkdownReport(report);
    expect(md).toContain('## Packages');
    expect(md).toContain('packages/core');
  });
});
