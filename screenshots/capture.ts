/**
 * Capture screenshots of the InspectoRepo UI using Playwright.
 *
 * Prerequisites:
 *   npm run dev          (Vite dev server on http://localhost:5173)
 *   npx playwright install chromium
 *
 * Usage:
 *   npx tsx screenshots/capture.ts
 *
 * Outputs:
 *   screenshots/ui-layout.png
 */
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VirtualFile } from '@inspectorepo/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_DIR = join(__dirname, '..', 'examples', 'fixture-repo');
const SCREENSHOT_PATH = join(__dirname, 'ui-layout.png');

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

async function capture() {
  const files = collectFiles(FIXTURE_DIR, FIXTURE_DIR);
  console.log(`Loaded ${files.length} fixture files`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  console.log('Page loaded');

  // Inject fixture files via dev-only global
  await page.evaluate((fixtureFiles) => {
    const loader = (window as never as Record<string, unknown>).__inspectorepo_loadFolder;
    if (typeof loader === 'function') {
      (loader as (name: string, files: Array<{ path: string; content: string }>) => void)(
        'fixture-repo',
        fixtureFiles,
      );
    } else {
      throw new Error('Dev loader not available — is the dev server running?');
    }
  }, files);

  // Wait for sidebar to populate
  await page.waitForSelector('.dir-item', { timeout: 5000 });
  console.log('Fixture loaded, sidebar visible');

  // Click Analyze
  await page.click('button.btn-accent');
  await page.waitForSelector('.issue-row', { timeout: 5000 });
  console.log('Analysis complete, issues visible');

  // Click the first issue to show details panel
  await page.click('.issue-row:first-child');
  await page.waitForSelector('.detail-content', { timeout: 3000 });
  console.log('Issue selected, details visible');

  // Take screenshot
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  console.log(`Screenshot saved: ${SCREENSHOT_PATH}`);

  await browser.close();
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
