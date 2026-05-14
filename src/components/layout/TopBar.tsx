import { Search, Bell, Grid, User } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function TopBar() {
  return (
    <header className="h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-8 z-20 shrink-0">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar leads, serviços ou clientes..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 ml-8">
        <div className="h-8 w-px bg-outline-variant"></div>

        <div className="h-8 w-px bg-outline-variant"></div>

        <div className="flex items-center gap-3 pl-2 group cursor-default">
          <div className="text-right hidden sm:block">
            <p className="font-display text-sm font-bold text-on-surface">Admin MDR</p>
          </div>
        </div>
      </div>
    </header>
  );
}
