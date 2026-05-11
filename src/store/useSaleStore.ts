
import { create } from 'zustand';

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  deviceModel: string;
  imei: string;
  totalValue: number;
  downPayment: number;
  installments: number;
  date: string;
  status: 'completed' | 'processing' | 'overdue';
}

interface SaleState {
  sales: Sale[];
  fetchSales: () => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
}

export const useSaleStore = create<SaleState>()((set) => ({
  sales: [],
  fetchSales: async () => {
    try {
      const response = await fetch('/api/sales');
      const data = await response.json();
      set({ sales: data });
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  },
  addSale: async (sale) => {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale),
      });
      const newSale = await response.json();
      set((state) => ({ sales: [...state.sales, newSale] }));
    } catch (error) {
      console.error('Error adding sale:', error);
    }
  },
  updateSale: async (id, updatedFields) => {
    // API logic for updateSale if needed, but the server routes don't have it yet.
    // Let's just update locally for now or add the route if needed.
    set((state) => ({
      sales: state.sales.map((s) => s.id === id ? { ...s, ...updatedFields } : s)
    }));
  },
}));

