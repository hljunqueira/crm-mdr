import { create } from 'zustand';
import { api } from '../lib/api';

export interface Sale {
  id: string;
  unit_id?: string;
  customer_id: string;
  customer_name?: string;
  device_model: string;
  imei: string;
  total_value: number;
  down_payment: number;
  service_fee?: number;
  original_price?: number;
  installments: number;
  date: string;
  status: 'completed' | 'processing' | 'overdue' | 'cancelled';
}

interface SaleState {
  sales: Sale[];
  isLoading: boolean;
  fetchSales: (unitId?: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
}

export const useSaleStore = create<SaleState>()((set) => ({
  sales: [],
  isLoading: false,
  fetchSales: async (_unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get('/sales');
      set({ sales: data || [] });
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addSale: async (sale) => {
    try {
      const data = await api.post('/sales', sale);
      set((state) => ({ sales: [data, ...state.sales] }));
    } catch (error) {
      console.error('Error adding sale:', error);
    }
  },
  updateSale: async (id, updatedFields) => {
    try {
      const data = await api.patch(`/sales/${id}`, updatedFields);
      set((state) => ({
        sales: state.sales.map((s) => s.id === id ? { ...s, ...data } : s)
      }));
    } catch (error) {
      console.error('Error updating sale:', error);
    }
  },
  deleteSale: async (id) => {
    try {
      await api.delete(`/sales/${id}`);
      set((state) => ({
        sales: state.sales.filter((s) => s.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  },
}));

