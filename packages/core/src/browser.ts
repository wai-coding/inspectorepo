/**
 * Browser-safe entry point for @inspectorepo/core.
 * Re-exports only utilities that do NOT depend on ts-morph,
 * keeping the browser bundle lightweight when analysis is lazy-loaded.
 */

export {
  isExcludedDir,
  buildDirectoryTree,
  filterExcludedPaths,
  pickDefaultDirs,
  filterBySelectedDirs,
  normalizeRelativePath,
} from './file-filter.js';
export type { DirEntry, FileEntry } from './file-filter.js';
export { filterAnalyzableFiles, isAnalyzableFile } from './scanner.js';
export { computeScore } from './scoring.js';
export { buildMarkdownReport, buildHtmlReport } from './report.js';
export { parseReportSummary } from './report-parser.js';
export type { ReportSummary } from './report-parser.js';
export { resolvePreset, isValidPreset, getPresetNames } from './presets.js';
export type { PresetName } from './presets.js';
export type { RuleConfig, RuleSeverityConfig, InspectorepoConfig } from './config.js';
