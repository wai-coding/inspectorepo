import { resolve, join } from 'node:path';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import {
  analyzeCodebase,
  buildMarkdownReport,
  allRules,
  parseConfig,
  mergeConfig,
  cliRulesToConfig,
  parseIgnoreFile,
} from '@inspectorepo/core';
import type { RuleConfig } from '@inspectorepo/core';
import { readFilesFromDisk, parseDirs, filterByDirs } from './fs-reader.js';
import { applyFix, formatFixPreview, formatPreviewReport, buildFixPlan, computeFixSummary, formatFixSummary, formatSkipReason } from './fixer.js';
import type { FixResult } from './fixer.js';

interface CliOptions {
  path: string;
  dirs: string[];
  format: 'md' | 'json';
  out?: string;
  maxIssues?: number;
  rules?: string;
  preset?: string;
  preview?: boolean;
}

function printUsage(): void {
  console.log(`Usage: inspectorepo <command> <path> [options]

Commands:
  analyze <path>       Analyze a TypeScript project
  fix <path>           Apply safe auto-fixes to a project

Options:
  --dirs <dirs>        Comma-separated directories to analyze (e.g. src,lib)
  --rules <rules>      Comma-separated rules to run (e.g. optional-chaining,unused-imports)
  --preset <name>      Rule preset: recommended, strict, cleanup, react
  --preview            Show proposed fixes without modifying files (fix only)
  --format <md|json>   Output format (default: md) (analyze only)
  --out <file>         Write output to file instead of stdout (analyze only)
  --max-issues <n>     Limit number of issues reported (analyze only)
  --help               Show this help message
`);
}

function parseArgs(args: string[]): CliOptions | null {
  if (args.length === 0 || args[0] === '--help') {
    printUsage();
    return null;
  }

  if (args[0] !== 'analyze' && args[0] !== 'fix') {
    console.error(`Unknown command: ${args[0]}\n`);
    printUsage();
    return null;
  }

  if (args.length < 2) {
    console.error('Missing required <path> argument\n');
    printUsage();
    return null;
  }

  const opts: CliOptions = {
    path: args[1],
    dirs: [],
    format: 'md',
  };

  let i = 2;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case '--dirs':
        opts.dirs = parseDirs(args[++i] || '');
        break;
      case '--rules':
        opts.rules = args[++i] || '';
        break;
      case '--preset':
        opts.preset = args[++i] || '';
        break;
      case '--preview':
        opts.preview = true;
        break;
      case '--format':
        {
          const fmt = args[++i];
          if (fmt !== 'md' && fmt !== 'json') {
            console.error(`Invalid format: ${fmt}. Use "md" or "json".`);
            return null;
          }
          opts.format = fmt;
        }
        break;
      case '--out':
        opts.out = args[++i];
        break;
      case '--max-issues':
        {
          const n = parseInt(args[++i], 10);
          if (isNaN(n) || n < 0) {
            console.error('--max-issues must be a non-negative number');
            return null;
          }
          opts.maxIssues = n;
        }
        break;
      case '--help':
        printUsage();
        return null;
      default:
        console.error(`Unknown option: ${arg}\n`);
        printUsage();
        return null;
    }
    i++;
  }

  return opts;
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function runFix(args: string[]): Promise<void> {
  const opts = parseArgs(['fix', ...args.slice(1)]);
  if (!opts) {
    process.exitCode = 1;
    return;
  }

  const rootDir = resolve(opts.path);
  if (!existsSync(rootDir)) {
    console.error(`Path does not exist: ${rootDir}`);
    process.exitCode = 1;
    return;
  }

  const allFiles = readFilesFromDisk(rootDir);
  const files = filterByDirs(allFiles, opts.dirs);

  if (files.length === 0) {
    console.error('No .ts/.tsx files found.');
    process.exitCode = 1;
    return;
  }

  const selectedDirs = opts.dirs.length > 0 ? opts.dirs : [];

  // Build rule config: CLI --rules flag overrides config file
  let ruleConfig: RuleConfig | undefined;
  if (opts.rules) {
    const allRuleIds = allRules.map((r) => r.id);
    ruleConfig = cliRulesToConfig(opts.rules, allRuleIds);
  } else {
    const configPath = join(rootDir, '.inspectorepo.json');
    if (existsSync(configPath)) {
      const configJson = readFileSync(configPath, 'utf-8');
      const parsed = parseConfig(configJson);
      if (parsed) {
        ruleConfig = mergeConfig(parsed.rules, opts.preset ?? parsed.preset);
      }
    }
    if (!ruleConfig && opts.preset) {
      ruleConfig = mergeConfig(null, opts.preset);
    }
  }

  // Load .inspectorepoignore if present
  let ignorePatterns: string[] | undefined;
  const ignorePath = join(rootDir, '.inspectorepoignore');
  if (existsSync(ignorePath)) {
    const ignoreContent = readFileSync(ignorePath, 'utf-8');
    ignorePatterns = parseIgnoreFile(ignoreContent);
  }

  console.log(`Analyzing ${files.length} files...\n`);
  const report = analyzeCodebase({
    files,
    selectedDirectories: selectedDirs,
    options: {
      ...(ruleConfig ? { ruleConfig } : {}),
      ...(ignorePatterns ? { ignorePatterns } : {}),
    },
  });

  const plan = buildFixPlan(report.issues);
  if (plan.fixable.length === 0) {
    console.log('No auto-fixable issues found.');
    return;
  }

  // Preview mode: show proposed fixes without modifying files
  if (opts.preview) {
    console.log(formatPreviewReport(plan.fixable));
    const previewResults: FixResult[] = plan.fixable.map(issue => ({
      filePath: issue.filePath,
      ruleId: issue.ruleId,
      line: issue.range.start.line,
      applied: false,
      skipped: false,
    }));
    const summary = computeFixSummary(previewResults);
    console.log(formatFixSummary(summary, 'preview'));
    return;
  }

  console.log(`Found ${plan.fixable.length} auto-fixable issue(s):\n`);

  const results: FixResult[] = [];

  for (const issue of plan.fixable) {
    console.log(formatFixPreview(issue));
    const answer = await ask('Apply fix? (y/N) ');

    if (answer === 'y' || answer === 'yes') {
      const result = applyFix(rootDir, issue);
      results.push(result);
      if (result.applied) {
        console.log(`  ✓ Fixed ${issue.filePath}:${issue.range.start.line}\n`);
      } else {
        const reason = formatSkipReason(result.skipReason);
        console.log(`  ✗ Skipped: ${reason}\n`);
      }
    } else {
      results.push({
        filePath: issue.filePath,
        ruleId: issue.ruleId,
        line: issue.range.start.line,
        applied: false,
        skipped: true,
        skipReason: undefined,
      });
      console.log('  Skipped.\n');
    }
  }

  const summary = computeFixSummary(results);
  console.log(formatFixSummary(summary, 'applied'));
}

export function run(args: string[]): void {
  if (args[0] === 'fix') {
    runFix(args).catch((err) => {
      console.error('Fix failed:', err);
      process.exitCode = 1;
    });
    return;
  }

  const opts = parseArgs(args);
  if (!opts) {
    process.exitCode = 1;
    return;
  }

  const rootDir = resolve(opts.path);
  if (!existsSync(rootDir)) {
    console.error(`Path does not exist: ${rootDir}`);
    process.exitCode = 1;
    return;
  }

  const allFiles = readFilesFromDisk(rootDir);
  const files = filterByDirs(allFiles, opts.dirs);

  if (files.length === 0) {
    console.error('No .ts/.tsx files found in the specified path/directories.');
    process.exitCode = 1;
    return;
  }

  const selectedDirs = opts.dirs.length > 0 ? opts.dirs : [];

  // Build rule config: CLI --rules flag overrides config file
  let ruleConfig: RuleConfig | undefined;
  if (opts.rules) {
    const allRuleIds = allRules.map((r) => r.id);
    ruleConfig = cliRulesToConfig(opts.rules, allRuleIds);
  } else {
    const configPath = join(rootDir, '.inspectorepo.json');
    if (existsSync(configPath)) {
      const configJson = readFileSync(configPath, 'utf-8');
      const parsed = parseConfig(configJson);
      if (parsed) {
        ruleConfig = mergeConfig(parsed.rules, opts.preset ?? parsed.preset);
      }
    }
    if (!ruleConfig && opts.preset) {
      ruleConfig = mergeConfig(null, opts.preset);
    }
  }

  // Load .inspectorepoignore if present
  let ignorePatterns: string[] | undefined;
  const ignorePath = join(rootDir, '.inspectorepoignore');
  if (existsSync(ignorePath)) {
    const ignoreContent = readFileSync(ignorePath, 'utf-8');
    ignorePatterns = parseIgnoreFile(ignoreContent);
  }

  const report = analyzeCodebase({
    files,
    selectedDirectories: selectedDirs,
    options: {
      ...(ruleConfig ? { ruleConfig } : {}),
      ...(ignorePatterns ? { ignorePatterns } : {}),
    },
  });

  if (opts.maxIssues !== undefined) {
    report.issues = report.issues.slice(0, opts.maxIssues);
    report.summary.totalIssues = report.issues.length;
  }

  let output: string;
  if (opts.format === 'json') {
    output = JSON.stringify(report, null, 2);
  } else {
    output = buildMarkdownReport(report);
  }

  if (opts.out) {
    writeFileSync(opts.out, output, 'utf-8');
    console.log(`Report written to ${opts.out}`);
  } else {
    console.log(output);
  }
}
