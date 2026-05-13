import { create } from 'zustand';
import { api } from '../lib/api';

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
  fetchInstallments: async (_unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get('/finance/installments');
      set({ installments: data || [] });
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  markAsPaid: async (id) => {
    try {
      const data = await api.patch(`/finance/installments/${id}`, { 
        status: 'paid', 
        paid_at: new Date().toISOString().split('T')[0] 
      });
      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? { ...i, ...data } : i)
      }));
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  },
  markAsBlocked: async (id) => {
    try {
      const data = await api.patch(`/finance/installments/${id}`, { status: 'blocked' });
      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? { ...i, ...data } : i)
      }));
    } catch (error) {
      console.error('Error marking as blocked:', error);
    }
  },
  addInstallments: async (newInstallments) => {
    try {
      const data = await api.post('/finance/installments', newInstallments);
      set((state) => ({
        installments: [...state.installments, ...(Array.isArray(data) ? data : [data])]
      }));
    } catch (error) {
      console.error('Error adding installments:', error);
    }
  },
}));

