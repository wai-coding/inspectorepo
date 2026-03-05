export { analyzeCodebase } from './analyzer.js';
export type { AnalyzeInput } from './analyzer.js';
export type { Rule, RuleContext } from './rule.js';
export { filterAnalyzableFiles, isAnalyzableFile } from './scanner.js';
export {
  allRules,
  unusedImportsRule,
  complexityHotspotRule,
  optionalChainingRule,
  booleanSimplificationRule,
  earlyReturnRule,
} from './rules/index.js';
export {
  isExcludedDir,
  buildDirectoryTree,
  filterExcludedPaths,
  pickDefaultDirs,
  filterBySelectedDirs,
  normalizeRelativePath,
} from './file-filter.js';
export type { DirEntry, FileEntry } from './file-filter.js';
export { computeScore } from './scoring.js';
export { buildMarkdownReport } from './report.js';
