import type { AnalysisReport, Issue, VirtualFile } from '@inspectorepo/shared';
import { Project } from 'ts-morph';
import type { Rule } from './rule.js';
import { allRules } from './rules/index.js';
import { filterAnalyzableFiles } from './scanner.js';
import { filterExcludedPaths, filterBySelectedDirs } from './file-filter.js';
import { computeScore } from './scoring.js';
import type { RuleConfig } from './config.js';
import { filterRulesByConfig } from './config.js';
import { filterIgnoredPaths } from './ignore.js';

const SEVERITY_ORDER: Record<string, number> = { error: 0, warn: 1, info: 2 };

function sortIssues(issues: Issue[]): Issue[] {
  return issues.slice().sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (sevDiff !== 0) return sevDiff;
    const ruleDiff = a.ruleId.localeCompare(b.ruleId);
    if (ruleDiff !== 0) return ruleDiff;
    const fileDiff = a.filePath.localeCompare(b.filePath);
    if (fileDiff !== 0) return fileDiff;
    const lineDiff = a.range.start.line - b.range.start.line;
    if (lineDiff !== 0) return lineDiff;
    return a.range.start.column - b.range.start.column;
  });
}

export interface AnalyzeInput {
  files: VirtualFile[];
  selectedDirectories: string[];
  options?: {
    rules?: Rule[];
    ruleConfig?: RuleConfig;
    ignorePatterns?: string[];
    customRules?: Rule[];
  };
}

export function analyzeCodebase(input: AnalyzeInput): AnalysisReport {
  const { files, selectedDirectories, options } = input;

  // Determine which rules to run
  let rules: Rule[];
  if (options?.rules) {
    // Explicit rules array takes priority (used in tests)
    rules = options.rules;
  } else if (options?.ruleConfig) {
    rules = filterRulesByConfig(allRules, options.ruleConfig);
  } else {
    rules = allRules;
  }

  // Append custom rules if provided
  if (options?.customRules && options.customRules.length > 0) {
    rules = [...rules, ...options.customRules];
  }

  // Filter: only files under selected directories, exclude noise, apply ignore patterns, keep .ts/.tsx
  let paths = files.map((f) => f.path);
  if (selectedDirectories.length > 0) {
    paths = filterBySelectedDirs(paths, selectedDirectories);
  }
  paths = filterExcludedPaths(paths);
  if (options?.ignorePatterns) {
    paths = filterIgnoredPaths(paths, options.ignorePatterns);
  }
  paths = filterAnalyzableFiles(paths);

  // Sort for determinism
  paths.sort((a, b) => a.localeCompare(b));

  const pathSet = new Set(paths);
  const filesToAnalyze = files.filter((f) => pathSet.has(f.path));

  // Create in-memory ts-morph project
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 99, // ESNext
      module: 99, // ESNext
      jsx: 4, // ReactJSX
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
    },
  });

  for (const file of filesToAnalyze) {
    project.createSourceFile(file.path, file.content);
  }

  // Run rules on each file
  const allIssues: Issue[] = [];

  for (const file of filesToAnalyze) {
    const sourceFile = project.getSourceFile(file.path);
    if (!sourceFile) continue;

    for (const rule of rules) {
      try {
        const issues = rule.run({ sourceFile, filePath: file.path });
        allIssues.push(...issues);
      } catch {
        // Rule failed on this file — skip silently
      }
    }
  }

  const sorted = sortIssues(allIssues);
  const summary = computeScore(sorted);

  // Extract unique top-level directories from analyzed files
  const dirSet = new Set<string>();
  for (const p of paths) {
    const first = p.split('/')[0];
    if (first) dirSet.add(first);
  }

  return {
    summary,
    issues: sorted,
    meta: {
      analyzedFilesCount: filesToAnalyze.length,
      analyzedDirectories: Array.from(dirSet).sort(),
    },
  };
}
