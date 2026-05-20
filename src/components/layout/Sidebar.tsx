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

  const menuGroups = [
    {
      title: 'Visão Geral',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Relatórios', icon: TrendingUp, path: '/reports' },
      ]
    },
    {
      title: 'Gestão Comercial',
      items: [
        { name: 'Vendas & Celulares', icon: ShoppingBag, path: '/sales' },
        { name: 'Clientes', icon: Users, path: '/customers' },
        { name: 'Estoque', icon: Smartphone, path: '/inventory' },
        { name: 'Financeiro', icon: CreditCard, path: '/finance' },
      ]
    },
    {
      title: 'Atendimento',
      items: [
        { name: 'Chat Multi-canal', icon: MessageSquare, path: '/chat' },
        { name: 'Conexão de contas WPP/IG', icon: Bot, path: '/automation' },
      ]
    },
    {
      title: 'Prospecção',
      items: [
        { name: 'Leads', icon: UserSearch, path: '/leads' },
        { name: 'Funil', icon: Filter, path: '/kanban' },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { name: 'Configurações', icon: Settings, path: '/settings' },
      ]
    }
  ];

  return (
    <aside className="w-64 h-screen bg-surface-container-low border-r border-outline-variant flex flex-col py-6 shrink-0 z-30">
      <div className="px-6 mb-8 flex justify-center">
        <img src="/logo-mdr.png" alt="MDR" className="h-24 w-auto object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 px-4 block select-none">
              {group.title}
            </span>
            <div className="space-y-1">
              {group.items.map((item: any) => {
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
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto px-3 py-4 border-t border-outline-variant/10">
        <button 
          onClick={() => signOut()} 
          className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all duration-200 w-full group"
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="font-display text-sm font-bold tracking-tight uppercase">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
