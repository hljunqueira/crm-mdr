import { create } from 'zustand';
import { api } from '../lib/api';

export interface InventoryItem {
  id: string;
  unit_id?: string;
  model: string;
  brand: string;
  imei: string;
  price: number;
  cost_price: number;
  condition: 'new' | 'used' | 'refurbished' | 'vitrine';
  status: 'available' | 'sold' | 'reserved' | 'in_repair';
  notes?: string;
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
  fetchInventory: async (_unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get('/inventory');
      set({ inventory: data || [] });
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addItem: async (item) => {
    try {
      const data = await api.post('/inventory', item);
      set((state) => ({ inventory: [...state.inventory, data] }));
    } catch (error) {
      console.error('Error adding inventory item:', error);
    }
  },
  updateItem: async (id, updatedFields) => {
    try {
      const data = await api.patch(`/inventory/${id}`, updatedFields);
      set((state) => ({
        inventory: state.inventory.map((i) => i.id === id ? data : i)
      }));
    } catch (error) {
      console.error('Error updating inventory item:', error);
    }
  },
  deleteItem: async (id) => {
    try {
      await api.delete(`/inventory/${id}`);
      set((state) => ({
        inventory: state.inventory.filter((i) => i.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
    }
  },
}));
