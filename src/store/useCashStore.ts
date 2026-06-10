import { create } from 'zustand';
import { api } from '../lib/api';

export interface CashShift {
  id: string;
  unit_id: string;
  opened_by: string;
  closed_by?: string;
  opened_at: string;
  closed_at?: string;
  opening_balance: number;
  expected_cash: number;
  expected_digital: number;
  closing_cash?: number;
  difference?: number;
  status: 'open' | 'closed';
  notes?: string;
  opened_by_profile?: { full_name: string };
  closed_by_profile?: { full_name: string };
}

export interface CashTransaction {
  id: string;
  unit_id: string;
  shift_id?: string;
  type: 'inflow' | 'outflow';
  category: 'installment' | 'sale' | 'suprimento' | 'sangria' | 'despesa_luz' | 'despesa_aluguel' | 'outros';
  amount: number;
  payment_method: 'pix' | 'money' | 'card' | 'bank';
  description?: string;
  installment_id?: string;
  created_at: string;
  created_by: string;
  created_by_profile?: { full_name: string };
}

interface CashState {
  activeShift: CashShift | null;
  transactions: CashTransaction[];
  shiftHistory: CashShift[];
  isLoading: boolean;
  fetchActiveShift: (unitId: string) => Promise<void>;
  openShift: (unitId: string, openedBy: string, openingBalance: number) => Promise<void>;
  closeShift: (shiftId: string, closedBy: string, closingCash: number, notes?: string) => Promise<void>;
  fetchTransactions: (unitId: string) => Promise<void>;
  addTransaction: (payload: {
    unit_id: string;
    type: 'inflow' | 'outflow';
    category: CashTransaction['category'];
    amount: number;
    payment_method: CashTransaction['payment_method'];
    description: string;
    created_by: string;
  }) => Promise<void>;
  fetchShiftHistory: (unitId: string) => Promise<void>;
  updateShift: (id: string, payload: { opening_balance?: number; closing_cash?: number; notes?: string }) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
}

export const useCashStore = create<CashState>()((set, get) => ({
  activeShift: null,
  transactions: [],
  shiftHistory: [],
  isLoading: false,

  fetchActiveShift: async (unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get(`/finance/shifts/active?unit_id=${unitId}`);
      set({ activeShift: data || null });
    } catch (error) {
      console.error('Error fetching active shift:', error);
      set({ activeShift: null });
    } finally {
      set({ isLoading: false });
    }
  },

  openShift: async (unitId, openedBy, openingBalance) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/finance/shifts/open', {
        unit_id: unitId,
        opened_by: openedBy,
        opening_balance: openingBalance
      });
      set({ activeShift: data });
    } catch (error) {
      console.error('Error opening shift:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  closeShift: async (shiftId, closedBy, closingCash, notes) => {
    set({ isLoading: true });
    try {
      await api.post('/finance/shifts/close', {
        shift_id: shiftId,
        closed_by: closedBy,
        closing_cash: closingCash,
        notes
      });
      set({ activeShift: null });
    } catch (error) {
      console.error('Error closing shift:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTransactions: async (unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get(`/finance/transactions?unit_id=${unitId}`);
      set({ transactions: data || [] });
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: async (payload) => {
    set({ isLoading: true });
    try {
      await api.post('/finance/transactions', payload);
      // Refresh active shift and transaction history
      await get().fetchTransactions(payload.unit_id);
      await get().fetchActiveShift(payload.unit_id);
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchShiftHistory: async (unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get(`/finance/shifts/history?unit_id=${unitId}`);
      set({ shiftHistory: data || [] });
    } catch (error) {
      console.error('Error fetching shift history:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateShift: async (id, payload) => {
    set({ isLoading: true });
    try {
      const data = await api.patch(`/finance/shifts/${id}`, payload);
      set((state) => ({
        shiftHistory: state.shiftHistory.map((s) => (s.id === id ? data : s)),
        activeShift: state.activeShift?.id === id ? data : state.activeShift
      }));
    } catch (error) {
      console.error('Error updating shift:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteShift: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`/finance/shifts/${id}`);
      set((state) => ({
        shiftHistory: state.shiftHistory.filter((s) => s.id !== id),
        activeShift: state.activeShift?.id === id ? null : state.activeShift
      }));
    } catch (error) {
      console.error('Error deleting shift:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));

