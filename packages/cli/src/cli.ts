import { resolve } from 'node:path';
import { writeFileSync, existsSync } from 'node:fs';
import { analyzeCodebase, buildMarkdownReport } from '@inspectorepo/core';
import { readFilesFromDisk, parseDirs, filterByDirs } from './fs-reader.js';

interface CliOptions {
  path: string;
  dirs: string[];
  format: 'md' | 'json';
  out?: string;
  maxIssues?: number;
}

function printUsage(): void {
  console.log(`Usage: inspectorepo analyze <path> [options]

Options:
  --dirs <dirs>        Comma-separated directories to analyze (e.g. src,lib)
  --format <md|json>   Output format (default: md)
  --out <file>         Write output to file instead of stdout
  --max-issues <n>     Limit number of issues reported
  --help               Show this help message
`);
}

function parseArgs(args: string[]): CliOptions | null {
  if (args.length === 0 || args[0] === '--help') {
    printUsage();
    return null;
  }

  if (args[0] !== 'analyze') {
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

export function run(args: string[]): void {
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
  const report = analyzeCodebase({ files, selectedDirectories: selectedDirs });

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
