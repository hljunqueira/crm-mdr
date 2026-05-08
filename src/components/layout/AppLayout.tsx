import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface selection:bg-primary selection:text-on-primary font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col relative h-full">
        <div className="absolute inset-0 pixel-grid pointer-events-none opacity-[0.03] z-0"></div>
        <TopBar />
        <main className="flex-1 overflow-y-auto z-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
