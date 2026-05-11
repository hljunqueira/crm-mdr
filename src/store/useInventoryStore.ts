import { create } from 'zustand';

export interface InventoryItem {
  id: string;
  model: string;
  brand: string;
  imei: string;
  price: number;
  condition: 'new' | 'used' | 'refurbished';
  status: 'available' | 'sold' | 'reserved' | 'in_repair';
}

interface InventoryState {
  inventory: InventoryItem[];
  fetchInventory: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>()((set) => ({
  inventory: [],
  fetchInventory: async () => {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();
      set({ inventory: data });
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  },
  addItem: async (item) => {
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const newItem = await response.json();
      set((state) => ({ inventory: [...state.inventory, newItem] }));
    } catch (error) {
      console.error('Error adding inventory item:', error);
    }
  },
  updateItem: async (id, updatedFields) => {
    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      const updatedItem = await response.json();
      set((state) => ({
        inventory: state.inventory.map((i) => i.id === id ? updatedItem : i)
      }));
    } catch (error) {
      console.error('Error updating inventory item:', error);
    }
  },
  deleteItem: async (id) => {
    try {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      set((state) => ({
        inventory: state.inventory.filter((i) => i.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
    }
  },
}));
