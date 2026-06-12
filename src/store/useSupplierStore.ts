import { create } from 'zustand';
import { api } from '../lib/api';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  address?: string;
  active: boolean;
  unit_id?: string;
  created_at?: string;
}

interface SupplierState {
  suppliers: Supplier[];
  isLoading: boolean;
  fetchSuppliers: (unitId?: string, all?: boolean) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'active'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
}

export const useSupplierStore = create<SupplierState>()((set) => ({
  suppliers: [],
  isLoading: false,
  fetchSuppliers: async (unitId, all = false) => {
    set({ isLoading: true });
    try {
      let url = '/suppliers';
      const params = new URLSearchParams();
      if (unitId) params.append('unit_id', unitId);
      if (all) params.append('all', 'true');
      
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;
      
      const data = await api.get(url);
      set({ suppliers: data || [] });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addSupplier: async (supplier) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/suppliers', supplier);
      set((state) => ({ suppliers: [...state.suppliers, data] }));
      return data;
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateSupplier: async (id, updates) => {
    try {
      const data = await api.patch(`/suppliers/${id}`, updates);
      set((state) => ({
        suppliers: state.suppliers.map((s) => (s.id === id ? data : s)),
      }));
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },
  deleteSupplier: async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
      set((state) => ({
        suppliers: state.suppliers.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  },
}));
