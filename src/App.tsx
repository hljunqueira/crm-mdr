/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UIProvider } from './context/UIContext';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Kanban from './pages/Kanban';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Finance from './pages/Finance';
import Automation from './pages/Automation';
import Inventory from './pages/Inventory';

export default function App() {
  return (
    <Router>
      <UIProvider>
        <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        {/* App protected routes */}
        <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/customers" element={<AppLayout><Customers /></AppLayout>} />
        <Route path="/sales" element={<AppLayout><Sales /></AppLayout>} />
        <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
        <Route path="/finance" element={<AppLayout><Finance /></AppLayout>} />
        <Route path="/automation" element={<AppLayout><Automation /></AppLayout>} />
        <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
        <Route path="/leads" element={<AppLayout><Leads /></AppLayout>} />
        <Route path="/kanban" element={<AppLayout><Kanban /></AppLayout>} />
        <Route path="/chat" element={<AppLayout><Chat /></AppLayout>} />
        <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
        
        {/* Catch all - Redirect to landing if not authenticated, for now we redirect back home or dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </UIProvider>
    </Router>
  );
}
