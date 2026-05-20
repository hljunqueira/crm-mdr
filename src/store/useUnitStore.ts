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
  pix_key?: string;
  pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
}

interface UnitState {
  unit: Unit | null;
  units: Unit[];
  isLoading: boolean;
  fetchUnit: (id: string) => Promise<void>;
  fetchAllUnits: () => Promise<void>;
  updateUnit: (id: string, updates: Partial<Unit>) => Promise<void>;
}

export const useUnitStore = create<UnitState>()((set) => ({
  unit: null,
  units: [],
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
  fetchAllUnits: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get('/units');
      set({ units: data });
    } catch (error) {
      console.error('Error fetching all units:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  updateUnit: async (id, updates) => {
    try {
      const data = await api.patch(`/units/${id}`, updates);
      set({ unit: data });
      // Atualiza a lista também
      set(state => ({
        units: state.units.map(u => u.id === id ? data : u)
      }));
    } catch (error) {
      console.error('Error updating unit:', error);
    }
  },
}));
