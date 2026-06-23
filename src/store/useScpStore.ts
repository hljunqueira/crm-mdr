import { create } from 'zustand';
import { api } from '../lib/api';

export interface Lot {
  id: string;
  title: string;
  target_amount: number;
  status: 'OPEN' | 'IN_STOCK' | 'IN_SALES' | 'CLOSED';
  created_at: string;
  devices?: any[];
  investor_quotas?: any[];
}

interface ScpState {
  lots: Lot[];
  isLoading: boolean;
  fetchLots: () => Promise<void>;
  createLot: (lot: Omit<Lot, 'id' | 'created_at'>) => Promise<Lot>;
  addQuota: (quota: {
    profile_id: string;
    lot_id: string;
    amount_invested: number;
    ownership_percentage: number;
  }) => Promise<void>;
}

export const useScpStore = create<ScpState>()((set, get) => ({
  lots: [],
  isLoading: false,
  fetchLots: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get('/scp/lots');
      set({ lots: data || [] });
    } catch (err) {
      console.error('Error fetching lots:', err);
    } finally {
      set({ isLoading: false });
    }
  },
  createLot: async (lotData) => {
    try {
      const data = await api.post('/scp/lots', lotData);
      get().fetchLots();
      return data;
    } catch (err) {
      console.error('Error creating lot:', err);
      throw err;
    }
  },
  addQuota: async (quotaData) => {
    try {
      await api.post('/scp/quotas', quotaData);
      get().fetchLots();
    } catch (err) {
      console.error('Error adding quota:', err);
      throw err;
    }
  }
}));
