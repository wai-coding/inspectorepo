import { EventEmitter } from 'events';

// This function has high complexity — triggers complexity-hotspot rule
export function processRecords(
  records: Array<{ type: string; value: number; tags: string[]; nested?: { level: number } }>,
  options: { strict: boolean; threshold: number; allowEmpty: boolean },
): { passed: number; failed: number; skipped: number } {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of records) {
    if (record.type === 'A') {
      if (record.value > options.threshold) {
        if (record.tags.includes('priority')) {
          passed += 1;
        } else if (record.tags.includes('review')) {
          if (options.strict) {
            failed += 1;
          } else {
            skipped += 1;
          }
        } else {
          if (record.nested) {
            if (record.nested.level > 3) {
              failed += 1;
            } else {
              passed += 1;
            }
          } else if (options.allowEmpty) {
            skipped += 1;
          } else {
            failed += 1;
          }
        }
      } else {
        skipped += 1;
      }
    } else if (record.type === 'B') {
      if (record.value < 0) {
        failed += 1;
      } else if (record.value === 0 && !options.allowEmpty) {
        skipped += 1;
      } else {
        for (const tag of record.tags) {
          if (tag.startsWith('x-')) {
            failed += 1;
            break;
          }
        }
        passed += 1;
      }
    } else {
      try {
        if (record.tags.length > 5) {
          throw new Error('Too many tags');
        }
        passed += 1;
      } catch {
        failed += 1;
      }
    }
  }

  return { passed, failed, skipped };
}

// EventEmitter is unused — triggers unused-imports
const _emitter = new Set<string>();
