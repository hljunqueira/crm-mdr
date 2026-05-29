import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UserSearch, 
  MessageCircle, 
  Settings, 
  Users,
  Smartphone,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  ShoppingBag,
  LogOut,
  QrCode,
  ChevronDown
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';

export default function Sidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuthStore();

  const menuGroups = [
    {
      title: 'Painel & Resultados',
      subtitle: 'Métricas e Analytics',
      icon: LayoutDashboard,
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Relatórios', icon: TrendingUp, path: '/reports' },
      ]
    },
    {
      title: 'Operação Comercial',
      subtitle: 'Celulares e Acessórios',
      icon: ShoppingBag,
      items: [
        { name: 'Vendas & Celulares', icon: ShoppingBag, path: '/sales' },
        { name: 'Análise de Crédito', icon: ShieldCheck, path: '/credit-analysis' },
        { name: 'Estoque', icon: Smartphone, path: '/inventory' },
        { name: 'Financeiro', icon: CreditCard, path: '/finance' },
      ]
    },
    {
      title: 'Relacionamento & Suporte',
      subtitle: 'Comunicação e Leads',
      icon: MessageCircle,
      items: [
        { name: 'Clientes', icon: Users, path: '/customers' },
        { name: 'Leads', icon: UserSearch, path: '/leads' },
        { name: 'WPP / Instagram', icon: MessageCircle, path: '/automation' },
      ]
    },
    {
      title: 'Configuração do Sistema',
      subtitle: 'Ajustes e Conexões',
      icon: Settings,
      items: [
        ...(profile?.role === 'admin' ? [
          { name: 'Gerenciar WPP/IG', icon: QrCode, path: '/connections' }
        ] : []),
        { name: 'Configurações', icon: Settings, path: '/settings' },
      ]
    }
  ];

  // State to track expanded groups, default expanding the one containing the active route
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      const hasActive = group.items.some(item => location.pathname === item.path);
      initial[group.title] = hasActive;
    });
    
    // Fallback: If no group has active items, expand the first one by default
    const hasAnyActive = Object.values(initial).some(Boolean);
    if (!hasAnyActive && menuGroups[0]) {
      initial[menuGroups[0].title] = true;
    }
    return initial;
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className="w-64 h-screen bg-surface-container-low border-r border-outline-variant flex flex-col py-6 shrink-0 z-30">
      <div className="px-6 mb-8 flex justify-center">
        <img src="/logo-mdr.png" alt="MDR" className="h-24 w-auto object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-4 custom-scrollbar">
        {menuGroups.map((group) => {
          const isExpanded = !!expandedGroups[group.title];
          const hasActiveItem = group.items.some(item => location.pathname === item.path);
          const GroupIcon = group.icon;

          return (
            <div key={group.title} className="space-y-1 rounded-2xl bg-white/[0.01] border border-white/5 p-1.5 transition-all">
              {/* Group Title Trigger Header */}
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left hover:bg-white/5 group",
                  hasActiveItem ? "text-primary font-semibold" : "text-on-surface-variant/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <GroupIcon size={18} className={cn(
                    "transition-colors",
                    hasActiveItem ? "text-primary" : "text-on-surface-variant/50 group-hover:text-primary"
                  )} />
                  <div className="min-w-0">
                    <span className="font-display text-xs font-black uppercase tracking-wider block leading-none">{group.title}</span>
                    <span className="text-[9px] text-on-surface-variant/40 block mt-0.5 leading-none truncate max-w-[150px] font-medium">{group.subtitle}</span>
                  </div>
                </div>
                <ChevronDown 
                  size={16} 
                  className={cn(
                    "text-on-surface-variant/40 group-hover:text-on-surface transition-transform duration-300",
                    isExpanded ? "transform rotate-180 text-primary" : ""
                  )} 
                />
              </button>

              {/* Group Sub-Items Collapsible Content */}
              <div 
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                )}
              >
                <div className="space-y-1 pt-1.5 pl-2 border-l border-outline-variant/30 ml-5">
                  {group.items.map((item: any) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group/item relative",
                          isActive 
                            ? "bg-primary-container text-on-primary-container font-semibold" 
                            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                        )}
                      >
                        <item.icon size={16} className={cn(isActive ? "text-on-primary-container" : "text-on-surface-variant group-hover/item:text-primary transition-colors")} />
                        <span className="font-display text-xs tracking-tight">{item.name}</span>
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
            </div>
          );
        })}
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
