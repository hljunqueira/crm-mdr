import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useSaleStore } from '../../store/useSaleStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useLeadStore } from '../../store/useLeadStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useKanbanStore } from '../../store/useKanbanStore';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const fetchCustomers = useCustomerStore(state => state.fetchCustomers);
  const fetchSales = useSaleStore(state => state.fetchSales);
  const fetchInstallments = useFinanceStore(state => state.fetchInstallments);
  const fetchLeads = useLeadStore(state => state.fetchLeads);
  const fetchInventory = useInventoryStore(state => state.fetchInventory);
  const fetchKanban = useKanbanStore(state => state.fetchKanban);

  useEffect(() => {
    fetchCustomers();
    fetchSales();
    fetchInstallments();
    fetchLeads();
    fetchInventory();
    fetchKanban();
  }, []);

  const location = useLocation();
  const isChat = location.pathname === '/chat';
  const isAutomation = location.pathname === '/automation';
  const isConnections = location.pathname === '/connections';

  return (

    <div className="flex h-screen w-full overflow-hidden bg-surface selection:bg-primary selection:text-on-primary font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col relative h-full">
        <div className="absolute inset-0 pixel-grid pointer-events-none opacity-[0.03] z-0"></div>
        {!(isChat || isAutomation || isConnections) && <TopBar />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden z-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
