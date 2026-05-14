import { 
  LayoutDashboard, 
  UserSearch, 
  MessageSquare, 
  Filter, 
  Settings, 
  HelpCircle,
  Users,
  Smartphone,
  CreditCard,
  Bot,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  ShoppingBag,
  LogOut
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils'; // Fixed path
import { useAuthStore } from '../../store/useAuthStore';

export default function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuthStore();

  const navItems: { name: string; icon: any; path: string; badge?: number }[] = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Clientes', icon: Users, path: '/customers' },
    { name: 'Estoque', icon: Smartphone, path: '/inventory' },
    { name: 'Vendas & Celulares', icon: ShoppingBag, path: '/sales' },
    { name: 'Financeiro', icon: CreditCard, path: '/finance' },
    { name: 'WhatsApp', icon: Bot, path: '/automation' },
    { name: 'Leads', icon: UserSearch, path: '/leads' },
    { name: 'Funil', icon: Filter, path: '/kanban' },
    { name: 'Relatórios', icon: TrendingUp, path: '/reports' },
    { name: 'Configurações', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="w-64 h-screen bg-surface-container-low border-r border-outline-variant flex flex-col py-6 shrink-0 z-30">
      <div className="px-6 mb-8 flex items-center gap-3">
        <img src="/logo-mdr.png" alt="MDR Informática & Celulares" className="h-14 w-auto object-contain" />
        <div>
          <h1 className="font-display font-bold text-primary text-xl leading-none">MDR</h1>
          <p className="font-display text-[10px] text-on-surface-variant uppercase tracking-widest mt-1 opacity-70">Informática & Celulares</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary-container text-on-primary-container font-semibold" 
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
              )}
            >
              <item.icon size={20} className={cn(isActive ? "text-on-primary-container" : "text-on-surface-variant group-hover:text-primary transition-colors")} />
              <span className="font-display text-sm tracking-tight">{item.name}</span>
              {item.badge && (
                <span className="ml-auto bg-error text-on-surface text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-6 pt-6 border-t border-outline-variant/30">
        <button 
          onClick={() => signOut()} 
          className="flex items-center gap-3 py-2 text-on-surface-variant hover:text-error transition-colors w-full text-left"
        >
          <LogOut size={20} />
          <span className="font-display text-sm tracking-tight">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
