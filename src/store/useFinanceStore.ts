
import { create } from 'zustand';

export interface Installment {
  id: string;
  customerName: string;
  saleId: string;
  number: number;
  total: number;
  value: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'blocked';
}

interface FinanceState {
  installments: Installment[];
  fetchInstallments: () => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;
  markAsBlocked: (id: string) => Promise<void>;
  addInstallments: (newInstallments: Installment[]) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()((set) => ({
  installments: [],
  fetchInstallments: async () => {
    try {
      const response = await fetch('/api/finance/installments');
      const data = await response.json();
      set({ installments: data });
    } catch (error) {
      console.error('Error fetching installments:', error);
    }
  },
  markAsPaid: async (id) => {
    try {
      const response = await fetch(`/api/finance/installments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      const updated = await response.json();
      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? updated : i)
      }));
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  },
  markAsBlocked: async (id) => {
    try {
      const response = await fetch(`/api/finance/installments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'blocked' }),
      });
      const updated = await response.json();
      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? updated : i)
      }));
    } catch (error) {
      console.error('Error marking as blocked:', error);
    }
  },
  addInstallments: async (newInstallments) => {
    try {
      const response = await fetch('/api/finance/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInstallments),
      });
      const added = await response.json();
      set((state) => ({
        installments: [...state.installments, ...added]
      }));
    } catch (error) {
      console.error('Error adding installments:', error);
    }
  },
}));

