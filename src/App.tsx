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
import Automation from './pages/Automation';
import Inventory from './pages/Inventory';
import Connections from './pages/Connections'; // Conexões multicanais

import PrivateRoute from './components/layout/PrivateRoute';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const initializeAuth = useAuthStore(state => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Router>
      <UIProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/atendimento" element={<Atendimento />} />
          <Route path="/login" element={<Login />} />
          
          {/* App protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><AppLayout><Customers /></AppLayout></PrivateRoute>} />
          <Route path="/sales" element={<PrivateRoute><AppLayout><Sales /></AppLayout></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><AppLayout><Inventory /></AppLayout></PrivateRoute>} />
          <Route path="/finance" element={<PrivateRoute><AppLayout><Finance /></AppLayout></PrivateRoute>} />
          <Route path="/automation" element={<PrivateRoute><AppLayout><Automation /></AppLayout></PrivateRoute>} />
          <Route path="/connections" element={<PrivateRoute><AppLayout><Connections /></AppLayout></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><AppLayout><Reports /></AppLayout></PrivateRoute>} />
          <Route path="/leads" element={<PrivateRoute><AppLayout><Leads /></AppLayout></PrivateRoute>} />
          <Route path="/kanban" element={<Navigate to="/leads" replace />} />
          <Route path="/chat" element={<PrivateRoute><AppLayout><Chat /></AppLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><AppLayout><Settings /></AppLayout></PrivateRoute>} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UIProvider>
    </Router>
  );
}
