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
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors relative group">
            <Bell size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-surface animate-pulse"></span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors group">
            <Grid size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant"></div>

        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="font-display text-sm font-bold text-on-surface">Admin MDR</p>
            <p className="font-display text-[10px] text-primary uppercase tracking-widest">Online</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-outline-variant p-0.5 group-hover:border-primary transition-all">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOYD0Cp84qN_AQ0MK62kv3kzcjZLTlEidY2kkZdcdg0wXlrD02VTCkZJWTvI-jAFSuh0Wl2IjqGyNFJ6pGqN5YaeHmjvIBuVIHqKh_9S8AJxKL7dqsd4Vz9gIIXzbzDB3t0BB1c5XPw1_4PhTmmcjvK8WtGieSb6LqOlYLxA0XDEUQ5CVxCZUYHgsA-0CYL2mK-GGsZWgqqi5Gscd64JRnzp1G1-OUmTbk-TMfsF-u8TRx47rVqQ6xwPuf7ZKkblr7FQw6X4f5L3YF" 
              alt="Avatar" 
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
