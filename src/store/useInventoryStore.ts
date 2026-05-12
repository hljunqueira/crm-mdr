import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  unit_id?: string;
  model: string;
  brand: string;
  imei: string;
  price: number;
  condition: 'new' | 'used' | 'refurbished';
  status: 'available' | 'sold' | 'reserved' | 'in_repair';
}

interface InventoryState {
  inventory: InventoryItem[];
  isLoading: boolean;
  fetchInventory: (unitId?: string) => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>()((set) => ({
  inventory: [],
  isLoading: false,
  fetchInventory: async (unitId) => {
    set({ isLoading: true });
    try {
      let query = supabase.from('inventory').select('*').order('model');
      
      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ inventory: data || [] });
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addItem: async (item) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ inventory: [...state.inventory, data] }));
    } catch (error) {
      console.error('Error adding inventory item:', error);
    }
  },
  updateItem: async (id, updatedFields) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update(updatedFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        inventory: state.inventory.map((i) => i.id === id ? data : i)
      }));
    } catch (error) {
      console.error('Error updating inventory item:', error);
    }
  },
  deleteItem: async (id) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        inventory: state.inventory.filter((i) => i.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
    }
  },
}));
