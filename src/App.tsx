import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UIProvider } from './context/UIContext';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Atendimento from './pages/Atendimento';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Finance from './pages/Finance';
import CashControl from './pages/CashControl';
import Automation from './pages/Automation';
import Inventory from './pages/Inventory';
import DeviceValuations from './pages/DeviceValuations';
import Suppliers from './pages/Suppliers';
import Partners from './pages/Partners';
import Connections from './pages/Connections'; // Conexões multicanais
import CreditAnalysis from './pages/CreditAnalysis';
import Simulator from './pages/Simulator';
import ServiceOrders from './pages/ServiceOrders';
import OutsourcedOrders from './pages/OutsourcedOrders';
import Fiscal from './pages/Fiscal';
import CustomerOSPortal from './pages/CustomerOSPortal';
import DeviceLockPanel from './pages/DeviceLockPanel';
import PublicCustomerRegistration from './pages/PublicCustomerRegistration';
import PartnersLogin from './pages/PartnersLogin';
import InvestorDashboard from './pages/InvestorDashboard';
import ScpManagement from './pages/ScpManagement';
import Commissions from './pages/Commissions';

import PrivateRoute from './components/layout/PrivateRoute';
import { useAuthStore } from './store/useAuthStore';
import AdminSessionTimeout from './components/layout/AdminSessionTimeout';
import { useNetworkStore } from './store/useNetworkStore';

export default function App() {
  const initializeAuth = useAuthStore(state => state.initialize);
  const setOnlineStatus = useNetworkStore(state => state.setOnlineStatus);
  const setOfflineMode = useNetworkStore(state => state.setOfflineMode);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      setOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, setOfflineMode]);

  const isPartnersSubdomain = window.location.hostname.startsWith('parceiros');

  const isElectronApp = typeof window !== 'undefined' && 
                        window.navigator && 
                        window.navigator.userAgent && 
                        window.navigator.userAgent.toLowerCase().includes('electron');

  if (isPartnersSubdomain) {
    return (
      <Router>
        <UIProvider>
          <Routes>
            <Route path="/login" element={<PartnersLogin />} />
            <Route path="/dashboard" element={<InvestorDashboard />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </UIProvider>
      </Router>
    );
  }

  return (
    <Router>
      <UIProvider>
        <AdminSessionTimeout />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={isElectronApp ? <Navigate to="/login" replace /> : <Landing />} />
          <Route path="/atendimento" element={<Atendimento />} />
          <Route path="/login" element={<Login />} />
          <Route path="/consulta-os" element={<CustomerOSPortal />} />
          <Route path="/cadastro" element={<PublicCustomerRegistration />} />
          
          {/* App protected routes */}
          <Route path="/dashboard" element={<PrivateRoute pageName="Dashboard"><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute pageName="Clientes"><AppLayout><Customers /></AppLayout></PrivateRoute>} />
          <Route path="/simulator" element={<PrivateRoute pageName="Simulador de Parcelas"><AppLayout><Simulator /></AppLayout></PrivateRoute>} />
          <Route path="/credit-analysis" element={<PrivateRoute pageName="Análise de Crédito"><AppLayout><CreditAnalysis /></AppLayout></PrivateRoute>} />
          <Route path="/sales" element={<PrivateRoute pageName="Vendas & Celulares"><AppLayout><Sales /></AppLayout></PrivateRoute>} />
          <Route path="/service-orders" element={<PrivateRoute pageName="Assistência Técnica (OS)"><AppLayout><ServiceOrders /></AppLayout></PrivateRoute>} />
          <Route path="/outsourcing" element={<PrivateRoute pageName="OS Terceirizadas"><AppLayout><OutsourcedOrders /></AppLayout></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute pageName="Estoque"><AppLayout><Inventory /></AppLayout></PrivateRoute>} />
          <Route path="/device-valuations" element={<PrivateRoute requireAdmin={true}><AppLayout><DeviceValuations /></AppLayout></PrivateRoute>} />
          <Route path="/suppliers" element={<PrivateRoute pageName="Fornecedores"><AppLayout><Suppliers /></AppLayout></PrivateRoute>} />
          <Route path="/partners" element={<PrivateRoute pageName="Parceiros"><AppLayout><Partners /></AppLayout></PrivateRoute>} />
          <Route path="/scp" element={<PrivateRoute requireAdmin={true}><AppLayout><ScpManagement /></AppLayout></PrivateRoute>} />
          <Route path="/finance" element={<PrivateRoute pageName="Financeiro"><AppLayout><Finance /></AppLayout></PrivateRoute>} />
          <Route path="/commissions" element={<PrivateRoute requireAdmin={true}><AppLayout><Commissions /></AppLayout></PrivateRoute>} />
          <Route path="/cash-control" element={<PrivateRoute pageName="Controle de Caixa"><AppLayout><CashControl /></AppLayout></PrivateRoute>} />
          <Route path="/device-locks" element={<PrivateRoute pageName="Controle de Bloqueio"><AppLayout><DeviceLockPanel /></AppLayout></PrivateRoute>} />
          <Route path="/fiscal" element={<PrivateRoute pageName="Fiscal (NFe/NFSe)"><AppLayout><Fiscal /></AppLayout></PrivateRoute>} />
          <Route path="/automation" element={<PrivateRoute pageName="WPP / Instagram"><AppLayout><Automation /></AppLayout></PrivateRoute>} />
          <Route path="/connections" element={<PrivateRoute pageName="Gerenciar WPP/IG"><AppLayout><Connections /></AppLayout></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute pageName="Relatórios"><AppLayout><Reports /></AppLayout></PrivateRoute>} />
          <Route path="/leads" element={<PrivateRoute pageName="Leads"><AppLayout><Leads /></AppLayout></PrivateRoute>} />
          <Route path="/kanban" element={<Navigate to="/leads" replace />} />
          <Route path="/chat" element={<PrivateRoute pageName="WPP / Instagram"><AppLayout><Chat /></AppLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute pageName="Configurações"><AppLayout><Settings /></AppLayout></PrivateRoute>} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UIProvider>
    </Router>
  );
}
