import { useState, useCallback, useEffect } from 'react';
import type { AnalysisReport, Issue, VirtualFile } from '@inspectorepo/shared';
import { buildDirectoryTree, pickDefaultDirs, analyzeCodebase, buildMarkdownReport } from '@inspectorepo/core';
import type { DirEntry } from '@inspectorepo/core';
import { selectFolderViaAPI, readUploadedFiles, processFiles } from './folder-reader';

// Small inline sample for "Try with sample project"
const SAMPLE_FILES: VirtualFile[] = [
  {
    path: 'src/utils.ts',
    content: [
      'import { Logger } from "./logger";',
      '',
      'export function getUser(data: any) {',
      '  if (data && data.user && data.user.name) {',
      '    return data.user.name;',
      '  }',
      '  return null;',
      '}',
      '',
      'export function isActive(flag: boolean) {',
      '  if (flag === true) {',
      '    return true;',
      '  }',
      '  return false;',
      '}',
    ].join('\n'),
  },
  {
    path: 'src/process.ts',
    content: [
      'export function processItems(items: number[]) {',
      '  if (items.length > 0) {',
      '    for (let i = 0; i < items.length; i++) {',
      '      if (items[i] > 0) {',
      '        if (items[i] > 10) {',
      '          for (let j = 0; j < items[i]; j++) {',
      '            if (j % 2 === 0) {',
      '              const val = j > 5 ? j * 2 : j;',
      '              if (val > 3 && val < 100 || val === 0) {',
      '                console.log(val);',
      '              }',
      '            }',
      '          }',
      '        }',
      '      }',
      '    }',
      '  }',
      '  debugger;',
      '  return;',
      '}',
    ].join('\n'),
  },
];

export interface AppState {
  folderName: string | null;
  allFiles: VirtualFile[];
  dirs: DirEntry[];
  selectedDirs: string[];
  report: AnalysisReport | null;
  selectedIssue: Issue | null;
  loading: boolean;
}

const initialState: AppState = {
  folderName: null,
  allFiles: [],
  dirs: [],
  selectedDirs: [],
  report: null,
  selectedIssue: null,
  loading: false,
};

function loadSavedDirs(folderName: string, available: DirEntry[]): string[] | null {
  try {
    const raw = localStorage.getItem(`inspectorepo:dirs:${folderName}`);
    if (!raw) return null;
    const saved: string[] = JSON.parse(raw);
    const availableNames = new Set(available.map((d) => d.name));
    const valid = saved.filter((d) => availableNames.has(d));
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

function saveDirs(folderName: string, dirs: string[]) {
  try {
    localStorage.setItem(`inspectorepo:dirs:${folderName}`, JSON.stringify(dirs));
  } catch {
    // localStorage full or unavailable
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState);

  const loadFolder = useCallback((name: string, files: VirtualFile[]) => {
    const processed = processFiles(files);
    const dirs = buildDirectoryTree(processed.map((f) => f.path));
    const saved = loadSavedDirs(name, dirs);
    const selectedDirs = saved ?? pickDefaultDirs(dirs);

    setState({
      folderName: name,
      allFiles: processed,
      dirs,
      selectedDirs,
      report: null,
      selectedIssue: null,
      loading: false,
    });
  }, []);

  const handleSelectFolder = useCallback(async () => {
    const result = await selectFolderViaAPI();
    if (result) loadFolder(result.name, result.files);
  }, [loadFolder]);

  const handleUploadFolder = useCallback(
    async (fileList: FileList) => {
      const result = await readUploadedFiles(fileList);
      loadFolder(result.name, result.files);
    },
    [loadFolder],
  );

  const toggleDir = useCallback((dirName: string) => {
    setState((prev) => {
      const next = prev.selectedDirs.includes(dirName)
        ? prev.selectedDirs.filter((d) => d !== dirName)
        : [...prev.selectedDirs, dirName];
      if (prev.folderName) saveDirs(prev.folderName, next);
      return { ...prev, selectedDirs: next, report: null, selectedIssue: null };
    });
  }, []);

  const handleAnalyze = useCallback(() => {
    setState((prev) => {
      const report = analyzeCodebase({
        files: prev.allFiles,
        selectedDirectories: prev.selectedDirs,
      });
      return { ...prev, report, selectedIssue: null };
    });
  }, []);

  const selectIssue = useCallback((issue: Issue | null) => {
    setState((prev) => ({ ...prev, selectedIssue: issue }));
  }, []);

  const exportMarkdown = useCallback(() => {
    if (!state.report) return;
    const md = buildMarkdownReport(state.report);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inspectorepo-report.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [state.report]);

  const canAnalyze = state.folderName !== null && state.selectedDirs.length > 0;

  const loadSampleProject = useCallback(() => {
    loadFolder('sample-project', SAMPLE_FILES);
  }, [loadFolder]);

  // Dev-only: expose loader for E2E / screenshot automation
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as never as Record<string, unknown>).__inspectorepo_loadFolder = loadFolder;
    }
  }, [loadFolder]);

  return {
    state,
    canAnalyze,
    handleSelectFolder,
    handleUploadFolder,
    toggleDir,
    handleAnalyze,
    selectIssue,
    exportMarkdown,
    loadSampleProject,
  };
}
