import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Installment {
  id: string;
  unit_id?: string;
  sale_id: string;
  customer_id: string;
  customer_name?: string;
  number: number;
  total: number;
  value: number;
  due_date: string;
  paid_at?: string;
  status: 'paid' | 'pending' | 'overdue' | 'blocked';
}

interface FinanceState {
  installments: Installment[];
  isLoading: boolean;
  fetchInstallments: (unitId?: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  markAsBlocked: (id: string) => Promise<void>;
  addInstallments: (newInstallments: Omit<Installment, 'id'>[]) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()((set) => ({
  installments: [],
  isLoading: false,
  fetchInstallments: async (unitId) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('installments')
        .select('*, customers(name)')
        .order('due_date', { ascending: true });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted = data.map(i => ({
        ...i,
        customer_name: i.customers?.name
      }));

      set({ installments: formatted });
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  markAsPaid: async (id) => {
    try {
      const { data, error } = await supabase
        .from('installments')
        .update({ status: 'paid', paid_at: new Date().toISOString().split('T')[0] })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? { ...i, ...data } : i)
      }));
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  },
  markAsBlocked: async (id) => {
    try {
      const { data, error } = await supabase
        .from('installments')
        .update({ status: 'blocked' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? { ...i, ...data } : i)
      }));
    } catch (error) {
      console.error('Error marking as blocked:', error);
    }
  },
  addInstallments: async (newInstallments) => {
    try {
      const { data, error } = await supabase
        .from('installments')
        .insert(newInstallments)
        .select();

      if (error) throw error;
      set((state) => ({
        installments: [...state.installments, ...data]
      }));
    } catch (error) {
      console.error('Error adding installments:', error);
    }
  },
}));

