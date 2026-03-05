import type { DirEntry } from '@inspectorepo/core';

interface SidebarProps {
  dirs: DirEntry[];
  selectedDirs: string[];
  onToggleDir: (name: string) => void;
  folderName: string | null;
}

export function Sidebar({ dirs, selectedDirs, onToggleDir, folderName }: SidebarProps) {
  if (!folderName) {
    return (
      <aside className="sidebar">
        <h2>Files</h2>
        <div className="placeholder">
          <p>Open a folder to see files</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <h2>{folderName}</h2>
      <ul className="dir-list">
        {dirs.map((dir) => (
          <li key={dir.name} className="dir-item">
            <label className="dir-label">
              <input
                type="checkbox"
                checked={selectedDirs.includes(dir.name)}
                onChange={() => onToggleDir(dir.name)}
              />
              <span className="dir-name">{dir.name}</span>
              <span className="dir-count">{dir.fileCount}</span>
            </label>
          </li>
        ))}
      </ul>
    </aside>
  );
}
