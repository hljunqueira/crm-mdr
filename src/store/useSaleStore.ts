import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Sale {
  id: string;
  unit_id?: string;
  customer_id: string;
  customer_name?: string;
  device_model: string;
  imei: string;
  total_value: number;
  down_payment: number;
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
  fetchSales: async (unitId) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('sales')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedSales = data.map(sale => ({
        ...sale,
        customer_name: sale.customers?.name
      }));

      set({ sales: formattedSales });
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addSale: async (sale) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert([sale])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ sales: [data, ...state.sales] }));
    } catch (error) {
      console.error('Error adding sale:', error);
    }
  },
  updateSale: async (id, updatedFields) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .update(updatedFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        sales: state.sales.map((s) => s.id === id ? { ...s, ...data } : s)
      }));
    } catch (error) {
      console.error('Error updating sale:', error);
    }
  },
  deleteSale: async (id) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        sales: state.sales.filter((s) => s.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  },
}));

