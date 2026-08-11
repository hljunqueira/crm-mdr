import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';

interface PrivateRouteProps {
  children: ReactNode;
  pageName?: string;
  requireAdmin?: boolean;
}

const PAGE_ROUTES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Relatórios', path: '/reports' },
  { name: 'Leads', path: '/leads' },
  { name: 'Simulador de Parcelas', path: '/simulator' },
  { name: 'Clientes', path: '/customers' },
  { name: 'Vendas & Celulares', path: '/sales' },
  { name: 'Análise de Crédito', path: '/credit-analysis' },
  { name: 'Estoque', path: '/inventory' },
  { name: 'Fornecedores', path: '/suppliers' },
  { name: 'Parceiros', path: '/partners' },
  { name: 'Assistência Técnica (OS)', path: '/service-orders' },
  { name: 'OS Terceirizadas', path: '/outsourcing' },
  { name: 'WPP / Instagram', path: '/automation' },
  { name: 'Gerenciar WPP/IG', path: '/connections' },
  { name: 'Financeiro', path: '/finance' },
  { name: 'Caixa Financeira', path: '/finance' },
  { name: 'Recebíveis & Boletos', path: '/finance' },
  { name: 'Caixa Crediário Loja', path: '/finance' },
  { name: 'Controle de Caixa', path: '/cash-control' },
  { name: 'Controle de Bloqueio', path: '/device-locks' },
  { name: 'Fiscal (NFe/NFSe)', path: '/fiscal' },
  { name: 'Investimentos SCP', path: '/scp' },
  { name: 'Relatórios da Financeira', path: '/financeira-reports' },
  { name: 'Comissões & Vales', path: '/commissions' },
  { name: 'Configurações', path: '/settings' },
];

export default function PrivateRoute({ children, pageName, requireAdmin }: PrivateRouteProps) {
  const { session, profile, isLoading } = useAuthStore();
  const { userPermissions, fetchUserPermissions } = usePermissionStore();

  useEffect(() => {
    if (session) {
      fetchUserPermissions();
    }
  }, [session, fetchUserPermissions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Check strict admin lock
  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check RBAC custom page visibility
  if (pageName && profile?.role !== 'admin') {
    const perm = userPermissions.find(p => p.profile_id === profile?.id && p.page_name === pageName);

    // Bloqueio padrão para o cargo 'investor' (Apenas 'Parceiros' liberado por padrão)
    if (profile?.role === 'investor' && pageName !== 'Parceiros') {
      if (!perm || perm.visible !== true) {
        return <Navigate to="/partners" replace />;
      }
    }

    if (perm && perm.visible === false) {
      const firstAllowedPage = PAGE_ROUTES.find(route => {
        const routePerm = userPermissions.find(p => p.profile_id === profile?.id && p.page_name === route.name);
        return !routePerm || routePerm.visible !== false;
      });
      const targetPath = firstAllowedPage ? firstAllowedPage.path : '/login';
      return <Navigate to={targetPath} replace />;
    }
  }

  return <>{children}</>;
}
