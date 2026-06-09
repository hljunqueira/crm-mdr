import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';

interface PrivateRouteProps {
  children: ReactNode;
  pageName?: string;
}

export default function PrivateRoute({ children, pageName }: PrivateRouteProps) {
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

  // Check RBAC custom page visibility
  if (pageName && profile?.role !== 'admin') {
    const perm = userPermissions.find(p => p.profile_id === profile?.id && p.page_name === pageName);
    if (perm && perm.visible === false) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
