import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Unit {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  evolution_api_url?: string;
  evolution_api_key?: string;
  evolution_instance?: string;
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
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      set({ unit: data });
    } catch (error) {
      console.error('Error fetching unit:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  updateUnit: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      set({ unit: data });
    } catch (error) {
      console.error('Error updating unit:', error);
    }
  },
}));
