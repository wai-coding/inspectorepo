export { analyzeFiles } from './analyzer.js';
export type { FileInput } from './analyzer.js';
export type { Rule } from './rule.js';
export { filterAnalyzableFiles, isAnalyzableFile } from './scanner.js';
export { placeholderRule } from './rules/index.js';
export {
  isExcludedDir,
  buildDirectoryTree,
  filterExcludedPaths,
  pickDefaultDirs,
  filterBySelectedDirs,
} from './file-filter.js';
export type { DirEntry, FileEntry } from './file-filter.js';
