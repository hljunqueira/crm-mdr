import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UserSearch, 
  MessageCircle, 
  Settings, 
  Users,
  Smartphone,
  CreditCard,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ShoppingBag,
  LogOut,
  QrCode,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wrench,
  FileText,
  Menu,
  X,
  ExternalLink,
  Truck,
  Building
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';

export default function Sidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuthStore();
  const { userPermissions, fetchUserPermissions } = usePermissionStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

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
      title: 'Comercial & CRM',
      subtitle: 'Leads, Clientes e Vendas',
      icon: Users,
      items: [
        { name: 'Vendas & Celulares', icon: ShoppingBag, path: '/sales' },
        { name: 'Análise de Crédito', icon: ShieldCheck, path: '/credit-analysis' },
        { name: 'Clientes', icon: Users, path: '/customers' },
        { name: 'Leads', icon: UserSearch, path: '/leads' },
      ]
    },

    {
      title: 'Serviços & Estoque',
      subtitle: 'OS e Controle Físico',
      icon: Wrench,
      items: [
        { name: 'Assistência Técnica (OS)', icon: Wrench, path: '/service-orders' },
        { name: 'OS Terceirizadas', icon: ExternalLink, path: '/outsourcing' },
        { name: 'Estoque', icon: Smartphone, path: '/inventory' },
        ...(profile?.role === 'admin' ? [
          { name: 'Avaliação de Celulares', displayName: 'Avaliação de Celulares', icon: ShieldCheck, path: '/device-valuations' }
        ] : []),
        { name: 'Fornecedores', icon: Truck, path: '/suppliers' },
        { name: 'Parceiros', icon: Building, path: '/partners' },
      ]
    },

    {
      title: 'Canais & WhatsApp',
      subtitle: 'Conversas e Conexão',
      icon: MessageCircle,
      items: [
        { name: 'WPP / Instagram', icon: MessageCircle, path: '/automation' },
        ...(profile?.role === 'admin' ? [
          { name: 'Gerenciar WPP/IG', icon: QrCode, path: '/connections' }
        ] : []),
      ]
    },
    {
      title: 'Financeiro & Fiscal',
      subtitle: 'Controle e Emissão',
      icon: CreditCard,
      items: [
        { name: 'Financeiro', displayName: 'Recebíveis', icon: CreditCard, path: '/finance' },
        { name: 'Controle de Caixa', icon: DollarSign, path: '/cash-control' },
        { name: 'Controle de Bloqueio', displayName: 'Bloqueio de Celulares', icon: ShieldCheck, path: '/device-locks' },
        { name: 'Fiscal (NFe/NFSe)', icon: FileText, path: '/fiscal' },
      ]
    },
    {
      title: 'Configurações',
      subtitle: 'Ajustes Gerais',
      icon: Settings,
      items: [
        { name: 'Configurações', icon: Settings, path: '/settings' },
      ]
    }
  ];

  // Filter groups and items dynamically on permissions
  const filteredMenuGroups = menuGroups.map(group => {
    // Admin has implicit complete access
    if (profile?.role === 'admin') return group;

    // Filter each individual sub-item (page)
    const filteredItems = group.items.filter(item => {
      // Find if permission visibility is explicitly marked as false for this specific user profile ID and page name
      const perm = userPermissions.find(p => p.profile_id === profile?.id && p.page_name === item.name);
      if (perm && perm.visible === false) {
        return false;
      }
      return true;
    });

    return {
      ...group,
      items: filteredItems
    };
  }).filter(group => group.items.length > 0);

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

  const renderNavContent = () => (
    <nav className="flex-1 overflow-y-auto px-3 space-y-4 custom-scrollbar">
      {filteredMenuGroups.map((group) => {
        const isExpanded = !!expandedGroups[group.title];
        const hasActiveItem = group.items.some(item => location.pathname === item.path);
        const GroupIcon = group.icon;

        return (
          <div key={group.title} className="space-y-1 rounded-2xl bg-white/[0.01] border border-white/5 p-1.5 transition-all">
            {/* Group Title Trigger Header */}
            <button
              onClick={() => {
                toggleGroup(group.title);
                if (isCollapsed) {
                  setIsCollapsed(false);
                  localStorage.setItem('sidebar-collapsed', 'false');
                  // Expand the group that was clicked
                  setExpandedGroups(prev => ({ ...prev, [group.title]: true }));
                }
              }}
              title={group.title}
              className={cn(
                "w-full flex items-center transition-all duration-200 text-left hover:bg-white/5 group",
                isCollapsed ? "justify-center py-3 px-0" : "justify-between px-3 py-2.5 rounded-xl",
                hasActiveItem ? "text-primary font-semibold" : "text-on-surface-variant/80"
              )}
            >
              <div className="flex items-center gap-3">
                <GroupIcon size={18} className={cn(
                  "transition-colors",
                  hasActiveItem ? "text-primary" : "text-on-surface-variant/50 group-hover:text-primary",
                  isCollapsed && "mx-auto"
                )} />
                {!isCollapsed && (
                  <div className="min-w-0">
                    <span className="font-display text-xs font-black uppercase tracking-wider block leading-none">{group.title}</span>
                    <span className="text-[9px] text-on-surface-variant/40 block mt-0.5 leading-none truncate max-w-[150px] font-medium">{group.subtitle}</span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown 
                  size={16} 
                  className={cn(
                    "text-on-surface-variant/40 group-hover:text-on-surface transition-transform duration-300",
                    isExpanded ? "transform rotate-180 text-primary" : ""
                  )} 
                />
              )}
            </button>

            {/* Group Sub-Items Collapsible Content */}
            <div 
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isExpanded && !isCollapsed ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
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
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group/item relative border-l-2",
                        isActive 
                          ? "bg-primary-container text-on-primary-container font-semibold border-primary pl-[14px]" 
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest border-transparent"
                      )}
                    >
                      <item.icon size={16} className={cn(isActive ? "text-on-primary-container" : "text-on-surface-variant group-hover/item:text-primary transition-colors")} />
                      <span className="font-display text-xs tracking-tight">{item.displayName || item.name}</span>
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
  );

  return (
    <>
      {/* Floating Hamburger Button for Mobile View */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-3 left-3 z-40 p-2.5 bg-[#121214]/80 backdrop-blur border border-white/10 rounded-2xl text-white md:hidden hover:bg-[#121214] active:scale-95 transition-all shadow-lg cursor-pointer"
        title="Abrir Menu"
      >
        <Menu size={18} />
      </button>

      {/* Desktop Persistent Sidebar */}
      <aside translate="no" className={cn("notranslate hidden md:flex md:flex-col h-screen bg-surface-container-low border-r border-outline-variant py-6 shrink-0 z-30 transition-all duration-300 relative", isCollapsed ? "w-20" : "w-64")}>
        {/* Toggle Collapse Button */}
        <button
          onClick={handleToggleCollapse}
          className="absolute -right-3.5 top-12 z-50 bg-[#121214] border border-white/10 hover:border-primary/50 text-white rounded-full p-1.5 shadow-md hover:scale-105 active:scale-95 transition-all hidden md:flex items-center justify-center cursor-pointer"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronLeft size={12} strokeWidth={3} />}
        </button>

        <div className={cn("px-6 mb-8 flex justify-center transition-all duration-300 relative", isCollapsed ? "px-2 mb-6" : "px-6 mb-8")}>
          {isCollapsed ? (
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-lg font-display shadow-lg shadow-primary/5 animate-pulse">
              M
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-0 bg-logo-blue/10 blur-2xl rounded-full group-hover:bg-logo-blue/20 transition-all duration-1000" />
              <img src="/logo-mdr.png" alt="MDR" className="h-24 w-auto object-contain relative z-10" />
            </div>
          )}
        </div>

        {renderNavContent()}

        <div className={cn("mt-auto py-4 border-t border-outline-variant/10 transition-all duration-300", isCollapsed ? "px-1 text-center" : "px-3")}>
          <button 
            onClick={() => signOut()} 
            title="Sair do Sistema"
            className={cn(
              "flex items-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all duration-200 group w-full",
              isCollapsed ? "justify-center p-3.5" : "gap-3 px-4 py-3"
            )}
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            {!isCollapsed && <span className="font-display text-sm font-bold tracking-tight uppercase">Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[70] md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Panel */}
          <aside translate="no" className="notranslate relative w-64 max-w-[80vw] h-full bg-[#121214] border-r border-outline-variant/30 flex flex-col py-6 z-[80] animate-in slide-in-from-left duration-300">
            <div className="flex justify-between items-center px-6 mb-8">
              <img src="/logo-mdr.png" alt="MDR" className="h-16 w-auto object-contain" />
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="text-on-surface-variant hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {renderNavContent()}

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
        </div>
      )}
    </>
  );
}
