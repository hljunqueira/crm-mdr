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
  stock_quantity: number;
  notes?: string;
  category?: 'smartphone' | 'accessory_mobile' | 'accessory_it' | 'part' | 'other';
  image_url?: string;
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
      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        unit_id: item.store_id,
        model: item.model,
        brand: item.brand,
        imei: item.imei || '',
        price: Number(item.sale_price) || 0,
        cost_price: Number(item.cost_price) || 0,
        condition: item.condition,
        status: item.status,
        stock_quantity: Number(item.stock_quantity) || 0,
        notes: item.notes || '',
        category: item.category || 'smartphone',
        image_url: item.image_url || '',
      }));
      set({ inventory: mapped });
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addItem: async (item) => {
    try {
      const dbItem = {
        store_id: item.unit_id,
        model: item.model,
        brand: item.brand,
        imei: item.imei || null,
        condition: item.condition,
        cost_price: item.cost_price,
        sale_price: item.price,
        status: item.status,
        stock_quantity: item.stock_quantity,
        notes: item.notes || null,
        category: item.category || 'smartphone',
        image_url: item.image_url || null,
      };
      const data = await api.post('/inventory', dbItem);
      const newFrontendItem = {
        ...item,
        id: data.id,
        imei: data.imei || '',
        notes: data.notes || '',
        image_url: data.image_url || '',
      };
      set((state) => ({ inventory: [...state.inventory, newFrontendItem] }));
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    }
  },
  updateItem: async (id, updatedFields) => {
    try {
      const dbFields: any = {};
      if (updatedFields.unit_id !== undefined) dbFields.store_id = updatedFields.unit_id;
      if (updatedFields.model !== undefined) dbFields.model = updatedFields.model;
      if (updatedFields.brand !== undefined) dbFields.brand = updatedFields.brand;
      if (updatedFields.imei !== undefined) dbFields.imei = updatedFields.imei || null;
      if (updatedFields.condition !== undefined) dbFields.condition = updatedFields.condition;
      if (updatedFields.cost_price !== undefined) dbFields.cost_price = updatedFields.cost_price;
      if (updatedFields.price !== undefined) dbFields.sale_price = updatedFields.price;
      if (updatedFields.status !== undefined) dbFields.status = updatedFields.status;
      if (updatedFields.stock_quantity !== undefined) dbFields.stock_quantity = updatedFields.stock_quantity;
      if (updatedFields.notes !== undefined) dbFields.notes = updatedFields.notes || null;
      if (updatedFields.category !== undefined) dbFields.category = updatedFields.category;
      if (updatedFields.image_url !== undefined) dbFields.image_url = updatedFields.image_url || null;

      const data = await api.patch(`/inventory/${id}`, dbFields);
      set((state) => ({
        inventory: state.inventory.map((i) => i.id === id ? {
          ...i,
          ...updatedFields,
          imei: data.imei || '',
          notes: data.notes || '',
          image_url: data.image_url || '',
        } : i)
      }));
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
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
