import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { MainPanel } from './components/MainPanel';
import { DetailsPanel } from './components/DetailsPanel';
import { useAppState } from './useAppState';

export function App() {
  const {
    state,
    canAnalyze,
    handleSelectFolder,
    handleUploadFolder,
    toggleDir,
    handleAnalyze,
    selectIssue,
    exportMarkdown,
  } = useAppState();

  return (
    <div className="app-layout">
      <TopBar
        folderName={state.folderName}
        selectedDirs={state.selectedDirs}
        canAnalyze={canAnalyze}
        report={state.report}
        onSelectFolder={handleSelectFolder}
        onUploadFolder={handleUploadFolder}
        onAnalyze={handleAnalyze}
        onExport={exportMarkdown}
      />
      <div className="app-body">
        <Sidebar
          dirs={state.dirs}
          selectedDirs={state.selectedDirs}
          onToggleDir={toggleDir}
          folderName={state.folderName}
        />
        <MainPanel
          report={state.report}
          selectedIssue={state.selectedIssue}
          onSelectIssue={selectIssue}
        />
        <DetailsPanel issue={state.selectedIssue} />
      </div>
    </div>
  );
}
