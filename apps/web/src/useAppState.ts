import { useState, useCallback } from 'react';
import type { AnalysisReport } from '@inspectorepo/shared';
import { buildDirectoryTree, pickDefaultDirs, filterBySelectedDirs } from '@inspectorepo/core';
import type { DirEntry } from '@inspectorepo/core';
import { selectFolderViaAPI, readUploadedFiles, processFiles } from './folder-reader';
import type { VirtualFile } from './folder-reader';

export interface AppState {
  folderName: string | null;
  allFiles: VirtualFile[];
  dirs: DirEntry[];
  selectedDirs: string[];
  report: AnalysisReport | null;
  loading: boolean;
}

const initialState: AppState = {
  folderName: null,
  allFiles: [],
  dirs: [],
  selectedDirs: [],
  report: null,
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
      loading: false,
    });
  }, []);

  const handleSelectFolder = useCallback(async () => {
    const result = await selectFolderViaAPI();
    if (result) loadFolder(result.name, result.files);
  }, [loadFolder]);

  const handleUploadFolder = useCallback(
    (fileList: FileList) => {
      const result = readUploadedFiles(fileList);
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
      return { ...prev, selectedDirs: next, report: null };
    });
  }, []);

  const handleAnalyze = useCallback(() => {
    setState((prev) => {
      const selected = filterBySelectedDirs(
        prev.allFiles.map((f) => f.path),
        prev.selectedDirs,
      );
      // Stub: return empty report for now
      const report: AnalysisReport = {
        results: selected.map((filePath) => ({
          filePath,
          issues: [],
          scannedAt: new Date().toISOString(),
        })),
        totalIssues: 0,
        scannedFiles: selected.length,
        createdAt: new Date().toISOString(),
      };
      return { ...prev, report };
    });
  }, []);

  const canAnalyze = state.folderName !== null && state.selectedDirs.length > 0;

  return {
    state,
    canAnalyze,
    handleSelectFolder,
    handleUploadFolder,
    toggleDir,
    handleAnalyze,
  };
}
