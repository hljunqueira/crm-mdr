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

export interface WithdrawalRequest {
  id: string;
  profile_id: string;
  amount: number;
  pix_key_type: string;
  pix_key: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  processed_at?: string;
  receipt_url?: string;
  profiles?: {
    full_name: string;
  };
}

interface ScpState {
  lots: Lot[];
  withdrawals: WithdrawalRequest[];
  isLoading: boolean;
  fetchLots: () => Promise<void>;
  createLot: (lot: Omit<Lot, 'id' | 'created_at'>) => Promise<Lot>;
  addQuota: (quota: {
    profile_id: string;
    lot_id: string;
    amount_invested: number;
    ownership_percentage: number;
    interest_sharing_percentage?: number;
  }) => Promise<void>;
  fetchWithdrawals: (profileId?: string) => Promise<void>;
  requestWithdrawal: (payload: {
    profile_id: string;
    amount: number;
    pix_key_type: string;
    pix_key: string;
  }) => Promise<void>;
  approveWithdrawal: (id: string, payload?: { paymentDate?: string; receiptUrl?: string }) => Promise<void>;
  rejectWithdrawal: (id: string) => Promise<void>;
  linkDevices: (lotId: string, deviceIds: string[]) => Promise<void>;
  updateContractUrl: (quotaId: string, contractUrl: string) => Promise<void>;
  deleteLot: (id: string) => Promise<void>;
  deleteQuota: (id: string) => Promise<void>;
}

export const useScpStore = create<ScpState>()((set, get) => ({
  lots: [],
  withdrawals: [],
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
  },
  fetchWithdrawals: async (profileId) => {
    set({ isLoading: true });
    try {
      const url = profileId ? `/scp/withdrawals?profile_id=${profileId}` : '/scp/withdrawals';
      const data = await api.get(url);
      set({ withdrawals: data || [] });
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    } finally {
      set({ isLoading: false });
    }
  },
  requestWithdrawal: async (payload) => {
    try {
      await api.post('/scp/withdraw', payload);
      get().fetchWithdrawals(payload.profile_id);
    } catch (err) {
      console.error('Error requesting withdrawal:', err);
      throw err;
    }
  },
  approveWithdrawal: async (id, payload) => {
    try {
      await api.post(`/scp/withdrawals/${id}/approve`, payload || {});
      get().fetchWithdrawals();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      throw err;
    }
  },
  rejectWithdrawal: async (id) => {
    try {
      await api.post(`/scp/withdrawals/${id}/reject`, {});
      get().fetchWithdrawals();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
      throw err;
    }
  },
  linkDevices: async (lotId, deviceIds) => {
    try {
      await api.post(`/scp/lots/${lotId}/link-devices`, { device_ids: deviceIds });
      get().fetchLots();
    } catch (err) {
      console.error('Error linking devices:', err);
      throw err;
    }
  },
  updateContractUrl: async (quotaId, contractUrl) => {
    try {
      await api.post(`/scp/quotas/${quotaId}/contract`, { contract_url: contractUrl });
      get().fetchLots();
    } catch (err) {
      console.error('Error updating contract URL:', err);
      throw err;
    }
  },
  deleteLot: async (id) => {
    try {
      await api.delete(`/scp/lots/${id}`);
      get().fetchLots();
    } catch (err) {
      console.error('Error deleting lot:', err);
      throw err;
    }
  },
  deleteQuota: async (id) => {
    try {
      await api.delete(`/scp/quotas/${id}`);
      get().fetchLots();
    } catch (err) {
      console.error('Error deleting quota:', err);
      throw err;
    }
  }
}));
