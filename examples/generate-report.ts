/**
 * Generate a sample Markdown report from the fixture repo.
 *
 * Usage:
 *   npx tsx examples/generate-report.ts
 *
 * Outputs: examples/sample-report.md
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeCodebase, buildMarkdownReport } from '@inspectorepo/core';
import type { VirtualFile } from '@inspectorepo/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_DIR = join(__dirname, 'fixture-repo');
const OUTPUT_PATH = join(__dirname, 'sample-report.md');

function collectFiles(dir: string, base: string): VirtualFile[] {
  const files: VirtualFile[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relPath = posix.normalize(relative(base, fullPath).replace(/\\/g, '/'));
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectFiles(fullPath, base));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push({ path: relPath, content: readFileSync(fullPath, 'utf-8') });
    }
  }
  return files;
}

const files = collectFiles(FIXTURE_DIR, FIXTURE_DIR);
console.log(`Collected ${files.length} files from fixture repo`);

const report = analyzeCodebase({
  files,
  selectedDirectories: ['src'],
});

console.log(`Analysis complete: ${report.issues.length} issues, score ${report.summary.score}/100`);

const markdown = buildMarkdownReport(report);
writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
console.log(`Report written to ${OUTPUT_PATH}`);
