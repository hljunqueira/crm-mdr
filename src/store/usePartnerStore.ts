import { create } from 'zustand';
import { api } from '../lib/api';

export interface Partner {
  id: string;
  name: string;
  technician_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  unit_id?: string;
  created_at?: string;
}

interface PartnerState {
  partners: Partner[];
  isLoading: boolean;
  fetchPartners: (unitId?: string, all?: boolean) => Promise<void>;
  addPartner: (partner: Omit<Partner, 'id' | 'active'>) => Promise<Partner>;
  updatePartner: (id: string, updates: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
}

export const usePartnerStore = create<PartnerState>()((set) => ({
  partners: [],
  isLoading: false,
  fetchPartners: async (unitId, all = false) => {
    set({ isLoading: true });
    try {
      let url = '/partners';
      const params = new URLSearchParams();
      if (unitId) params.append('unit_id', unitId);
      if (all) params.append('all', 'true');
      
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;
      
      const data = await api.get(url);
      set({ partners: data || [] });
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addPartner: async (partner) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/partners', partner);
      set((state) => ({ partners: [...state.partners, data] }));
      return data;
    } catch (error) {
      console.error('Error adding partner:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updatePartner: async (id, updates) => {
    try {
      const data = await api.patch(`/partners/${id}`, updates);
      set((state) => ({
        partners: state.partners.map((p) => (p.id === id ? data : p)),
      }));
    } catch (error) {
      console.error('Error updating partner:', error);
      throw error;
    }
  },
  deletePartner: async (id) => {
    try {
      await api.delete(`/partners/${id}`);
      set((state) => ({
        partners: state.partners.filter((p) => p.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting partner:', error);
      throw error;
    }
  },
}));
