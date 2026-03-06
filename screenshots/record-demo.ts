/**
 * Record a demo video of InspectoRepo and convert to GIF.
 *
 * Prerequisites:
 *   npm run dev          (Vite dev server on http://localhost:5173)
 *   npx playwright install chromium
 *
 * Usage:
 *   npx tsx screenshots/record-demo.ts
 *
 * Outputs:
 *   screenshots/demo.webm (raw video)
 */
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VirtualFile } from '@inspectorepo/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_DIR = join(__dirname, '..', 'examples', 'fixture-repo');
const VIDEO_DIR = __dirname;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function record() {
  const files = collectFiles(FIXTURE_DIR, FIXTURE_DIR);
  console.log(`Loaded ${files.length} fixture files`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await sleep(1000);

  // Load fixture files
  await page.evaluate((fixtureFiles) => {
    const loader = (window as never as Record<string, unknown>).__inspectorepo_loadFolder;
    if (typeof loader === 'function') {
      (loader as (name: string, files: Array<{ path: string; content: string }>) => void)(
        'fixture-repo',
        fixtureFiles,
      );
    }
  }, files);

  await sleep(1000);

  // Click Analyze
  await page.click('button.btn-accent');
  await page.waitForSelector('.issue-row', { timeout: 5000 });
  await sleep(1000);

  // Click through a few issues
  const issueRows = page.locator('.issue-row');
  const count = await issueRows.count();
  for (let i = 0; i < Math.min(count, 3); i++) {
    await issueRows.nth(i).click();
    await sleep(800);
  }

  // Click a filter
  await page.click('.filter-btn.filter-info');
  await sleep(800);

  // Back to all
  await page.click('.filter-btn:first-child');
  await sleep(800);

  // Click first issue one more time for a clean ending frame
  await issueRows.first().click();
  await sleep(1000);

  await context.close();
  await browser.close();

  console.log('Demo video recorded. Check screenshots/ for the .webm file.');
  console.log('To convert to GIF, use: ffmpeg -i demo.webm -vf "fps=10,scale=800:-1" -loop 0 demo.gif');
}

record().catch((err) => {
  console.error('Recording failed:', err);
  process.exit(1);
});
