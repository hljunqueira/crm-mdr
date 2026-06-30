import { create } from 'zustand';
import { api } from '../lib/api';
import { useAuthStore } from './useAuthStore';

export interface InventoryItem {
  id: string;
  unit_id?: string;
  store_name?: string;
  model: string;
  brand: string;
  imei: string;
  price: number;
  trade_in_price?: number;
  cost_price: number;
  condition: 'new' | 'used' | 'refurbished' | 'vitrine';
  status: 'available' | 'sold' | 'reserved' | 'in_repair' | 'pending_valuation';
  stock_quantity: number;
  notes?: string;
  category?: 'smartphone' | 'accessory_mobile' | 'accessory_it' | 'part' | 'service' | 'other';
  image_url?: string;
  show_on_landing?: boolean;
  only_cash_sale?: boolean;
  barcode?: string;
  supplier?: string;
  purchase_date?: string;
  description?: string;
  short_name?: string;
}

interface InventoryState {
  inventory: InventoryItem[];
  isLoading: boolean;
  fetchInventory: (unitId?: string) => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<InventoryItem>;
  updateItem: (id: string, item: Partial<InventoryItem> & { is_manual?: boolean; admin_password?: string }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>()((set) => ({
  inventory: [],
  isLoading: false,
  fetchInventory: async (unitId) => {
    set({ isLoading: true });
    try {
      const url = unitId ? `/inventory?unit_id=${unitId}` : '/inventory';
      const data = await api.get(url);
      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        unit_id: item.store_id,
        store_name: item.stores?.name || undefined,
        model: item.model,
        brand: item.brand,
        imei: item.imei || '',
        price: Number(item.sale_price) || 0,
        trade_in_price: Number(item.trade_in_price) || 0,
        cost_price: Number(item.cost_price) || 0,
        condition: item.condition,
        status: item.status,
        stock_quantity: Number(item.stock_quantity) || 0,
        notes: item.notes || '',
        category: item.category || 'smartphone',
        image_url: item.image_url || '',
        show_on_landing: !!item.show_on_landing,
        barcode: item.barcode || '',
        supplier: item.supplier || '',
        purchase_date: item.purchase_date || '',
        description: item.description || '',
        short_name: item.short_name || '',
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
        trade_in_price: item.trade_in_price || null,
        status: item.status,
        stock_quantity: item.stock_quantity,
        notes: item.notes || null,
        category: item.category || 'smartphone',
        image_url: item.image_url || null,
        show_on_landing: item.show_on_landing || false,
        barcode: item.barcode || null,
        supplier: item.supplier || null,
        purchase_date: item.purchase_date || null,
        description: item.description || null,
        short_name: item.short_name || null,
      };
      const data = await api.post('/inventory', dbItem);
      const newFrontendItem = {
        ...item,
        id: data.id,
        imei: data.imei || '',
        notes: data.notes || '',
        image_url: data.image_url || '',
        show_on_landing: !!data.show_on_landing,
        barcode: data.barcode || '',
        supplier: data.supplier || '',
        purchase_date: data.purchase_date || '',
        description: data.description || '',
        short_name: data.short_name || '',
      };
      set((state) => ({ inventory: [...state.inventory, newFrontendItem] }));
      return newFrontendItem;
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
      if (updatedFields.trade_in_price !== undefined) dbFields.trade_in_price = updatedFields.trade_in_price;
      if (updatedFields.status !== undefined) dbFields.status = updatedFields.status;
      if (updatedFields.stock_quantity !== undefined) dbFields.stock_quantity = updatedFields.stock_quantity;
      if (updatedFields.notes !== undefined) dbFields.notes = updatedFields.notes || null;
      if (updatedFields.category !== undefined) dbFields.category = updatedFields.category;
      if (updatedFields.image_url !== undefined) dbFields.image_url = updatedFields.image_url || null;
      if (updatedFields.show_on_landing !== undefined) dbFields.show_on_landing = updatedFields.show_on_landing;
      if (updatedFields.barcode !== undefined) dbFields.barcode = updatedFields.barcode || null;
      if (updatedFields.supplier !== undefined) dbFields.supplier = updatedFields.supplier || null;
      if (updatedFields.purchase_date !== undefined) dbFields.purchase_date = updatedFields.purchase_date || null;
      if (updatedFields.description !== undefined) dbFields.description = updatedFields.description || null;
      if (updatedFields.short_name !== undefined) dbFields.short_name = updatedFields.short_name || null;
      
      // Pass-through validation parameters
      if ((updatedFields as any).is_manual !== undefined) dbFields.is_manual = (updatedFields as any).is_manual;
      if ((updatedFields as any).admin_password !== undefined) dbFields.admin_password = (updatedFields as any).admin_password;

      const userId = useAuthStore.getState().profile?.id;
      if (userId) {
        dbFields.user_id = userId;
      }

      const data = await api.patch(`/inventory/${id}`, dbFields);
      set((state) => ({
        inventory: state.inventory.map((i) => i.id === id ? {
          ...i,
          ...updatedFields,
          imei: data.imei || '',
          notes: data.notes || '',
          image_url: data.image_url || '',
          show_on_landing: !!data.show_on_landing,
          barcode: data.barcode || '',
          supplier: data.supplier || '',
          purchase_date: data.purchase_date || '',
          description: data.description || '',
          short_name: data.short_name || '',
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
      throw error;
    }
  },
}));
