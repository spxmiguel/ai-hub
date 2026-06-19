import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './views/ChatView';
import CodeView from './views/CodeView';
import DesignView from './views/DesignView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';

export type View = 'chat' | 'code' | 'design' | 'history' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('chat');

  const views: Record<View, React.ReactNode> = {
    chat: <ChatView />,
    code: <CodeView />,
    design: <DesignView />,
    history: <HistoryView />,
    settings: <SettingsView />,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar active={view} onNavigate={setView} />
      <main className="flex-1 overflow-hidden">{views[view]}</main>
    </div>
  );
}
