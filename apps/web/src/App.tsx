import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { MainPanel } from './components/MainPanel';
import { DetailsPanel } from './components/DetailsPanel';

export function App() {
  return (
    <div className="app-layout">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        <MainPanel />
        <DetailsPanel />
      </div>
    </div>
  );
}
