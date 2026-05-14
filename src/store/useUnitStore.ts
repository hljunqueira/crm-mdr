import { create } from 'zustand';
import { api } from '../lib/api';

export interface Unit {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  evolution_api_url?: string;
  evolution_api_key?: string;
  evolution_instance?: string;
  contract_terms?: string;
  warranty_terms?: string;
}

interface UnitState {
  unit: Unit | null;
  isLoading: boolean;
  fetchUnit: (id: string) => Promise<void>;
  updateUnit: (id: string, updates: Partial<Unit>) => Promise<void>;
}

export const useUnitStore = create<UnitState>()((set) => ({
  unit: null,
  isLoading: false,
  fetchUnit: async (id) => {
    set({ isLoading: true });
    try {
      const data = await api.get(`/units/${id}`);
      set({ unit: data });
    } catch (error) {
      console.error('Error fetching unit:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  updateUnit: async (id, updates) => {
    try {
      const data = await api.patch(`/units/${id}`, updates);
      set({ unit: data });
    } catch (error) {
      console.error('Error updating unit:', error);
    }
  },
}));
