import { 
  LayoutDashboard, 
  UserSearch, 
  MessageSquare, 
  Filter, 
  Settings, 
  HelpCircle,
  Users,
  ClipboardList,
  Package,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils'; // Fixed path

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Leads', icon: UserSearch, path: '/leads' },
    { name: 'Conversas', icon: MessageSquare, path: '/chat', badge: 3 },
    { name: 'Funil', icon: Filter, path: '/kanban' },
    { name: 'Relatórios', icon: TrendingUp, path: '/reports' },
    { name: 'Configurações', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="w-64 h-screen bg-surface-container-low border-r border-outline-variant flex flex-col py-6 shrink-0 z-30">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
          <img src="/logo.png" alt="MDR Informática & Celulares" className="w-full h-full object-contain" />
        </div>
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
        <Link 
          to="/support" 
          className="flex items-center gap-3 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <HelpCircle size={20} />
          <span className="font-display text-sm tracking-tight">Suporte</span>
        </Link>
        <div className="mt-6 flex items-center gap-3 p-3 bg-surface-container-highest/50 rounded-2xl border border-outline-variant/30">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWBfrEY7gxDFsWWO-RUZRmzc4_V7Rqg-QZYTwRS3aWuOkD_08m35KvUx8vxUJh81o2uVw2PYzl0Oa-CNbPlPu3Ap8CyIBn078n55t_4Ycm_qSfqRWn_rDXzlSjjafjNbQzqXwr84KfS7t_z_bXIhIEBQRk6lsWhq-RcPkQTz0oN7Az26O_QUHqvsA35lkaNIN8TkI7sD-6f7YRarcu-tW91Y_nc00DYVHEwtGrSgs25zMZj5jtwmWcSogRDIUeOtMqrE07fcatjR1j" 
            alt="Usuário" 
            className="w-8 h-8 rounded-full border border-primary/20"
          />
          <div className="min-w-0">
            <p className="font-display text-xs font-bold text-on-surface truncate">Usuário Admin</p>
            <p className="text-[9px] text-on-surface-variant truncate uppercase tracking-tighter">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
