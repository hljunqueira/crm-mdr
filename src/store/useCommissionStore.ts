import { create } from 'zustand';
import { api } from '../lib/api';

export interface CommissionSetting {
  id: string;
  profile_id: string;
  sales_commission_pct: number;
  services_commission_pct: number;
  base_salary: number;
  sales_goal_bonus_pct: number;
  sales_goal_bonus_fixed: number;
  os_goal_bonus_fixed: number;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  };
}

export interface EmployeeVoucher {
  id: string;
  profile_id: string;
  unit_id: string;
  amount: number;
  payment_method: 'pix' | 'money' | 'bank';
  type: 'vale' | 'pro_labore' | 'profit_distribution';
  description?: string;
  voucher_date: string;
  shift_id?: string;
  created_by?: string;
  profiles?: { full_name: string };
  creator?: { full_name: string };
}

interface CommissionState {
  settings: CommissionSetting[];
  vouchers: EmployeeVoucher[];
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  saveSetting: (payload: Omit<CommissionSetting, 'id'>) => Promise<void>;
  fetchVouchers: (filters: { unit_id?: string; profile_id?: string; start_date?: string; end_date?: string }) => Promise<void>;
  addVoucher: (voucher: Omit<EmployeeVoucher, 'id' | 'voucher_date'> & { voucher_date?: string }) => Promise<void>;
  deleteVoucher: (id: string) => Promise<void>;
}

export const useCommissionStore = create<CommissionState>()((set) => ({
  settings: [],
  vouchers: [],
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get('/commissions/settings');
      set({ settings: data || [] });
    } catch (error) {
      console.error('Error fetching commission settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveSetting: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/commissions/settings', payload);
      set((state) => {
        const exists = state.settings.some((s) => s.profile_id === payload.profile_id);
        if (exists) {
          return {
            settings: state.settings.map((s) => (s.profile_id === payload.profile_id ? { ...s, ...data } : s))
          };
        }
        return { settings: [...state.settings, data] };
      });
    } catch (error) {
      console.error('Error saving commission setting:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchVouchers: async (filters) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters.unit_id) params.append('unit_id', filters.unit_id);
      if (filters.profile_id) params.append('profile_id', filters.profile_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const url = `/commissions/vouchers?${params.toString()}`;
      const data = await api.get(url);
      set({ vouchers: data || [] });
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addVoucher: async (voucher) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/commissions/vouchers', voucher);
      set((state) => ({ vouchers: [data, ...state.vouchers] }));
    } catch (error) {
      console.error('Error adding voucher:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteVoucher: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`/commissions/vouchers/${id}`);
      set((state) => ({ vouchers: state.vouchers.filter((v) => v.id !== id) }));
    } catch (error) {
      console.error('Error deleting voucher:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));
