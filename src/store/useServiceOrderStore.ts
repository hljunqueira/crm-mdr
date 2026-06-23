import { create } from 'zustand';
import { api } from '../lib/api';

export interface ServiceOrderPart {
  id: string;
  os_id: string;
  inventory_item_id?: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface ServiceOrder {
  id: string;
  os_number: number;
  customer_id: string;
  unit_id?: string;
  device_category: string;
  device_brand: string;
  device_model: string;
  device_serial_number?: string;
  device_passcode?: string;
  device_pattern_lock?: string;
  cosmetic_condition?: string;
  accessories_left?: string[];
  reported_issue: string;
  technical_diagnosis?: string;
  status: 'budget_pending' | 'awaiting_approval' | 'in_progress' | 'ready' | 'delivered' | 'returned_no_fix' | 'canceled';
  estimated_delivery?: string;
  delivered_at?: string;
  labor_value: number;
  parts_value: number;
  total_value: number;
  payment_status: 'pending' | 'paid';
  payment_method?: string;
  warranty_period: number;
  warranty_notes?: string;
  responsible_technician_id?: string;
  signature_entry?: string;
  signature_exit?: string;
  device_photos?: string[];
  created_at?: string;
  updated_at?: string;
  
  created_by_id?: string;
  finalized_by_id?: string;
  delivered_by_id?: string;
  
  // Relations
  customers?: {
    name: string;
    phone: string;
    cpf: string;
    address?: string;
    email?: string;
  };
  profiles?: {
    full_name: string;
  };
  created_by?: {
    full_name: string;
  };
  finalized_by?: {
    full_name: string;
  };
  delivered_by?: {
    full_name: string;
  };
  parts?: ServiceOrderPart[];
  outsourced_orders?: {
    id: string;
    external_status: string;
  }[];
}

interface ServiceOrderState {
  serviceOrders: ServiceOrder[];
  currentServiceOrder: ServiceOrder | null;
  isLoading: boolean;
  fetchServiceOrders: (unitId?: string) => Promise<void>;
  fetchServiceOrderById: (id: string) => Promise<void>;
  createServiceOrder: (os: Omit<ServiceOrder, 'id' | 'os_number' | 'created_at' | 'updated_at' | 'total_value'>) => Promise<ServiceOrder>;
  updateServiceOrder: (id: string, os: Partial<ServiceOrder>) => Promise<void>;
  deleteServiceOrder: (id: string) => Promise<void>;
  addPartToOs: (id: string, part: Omit<ServiceOrderPart, 'id' | 'os_id' | 'total_price'>) => Promise<void>;
  deletePartFromOs: (id: string, partId: string) => Promise<void>;
  notifyOsStatus: (id: string, templateType: 'entry' | 'budget' | 'ready') => Promise<void>;
  fetchOutsourcedInfo: (osId: string) => Promise<any>;
  fetchGlobalOutsourced: (unitId?: string) => Promise<any[]>;
  outsourceOs: (osId: string, info: any) => Promise<any>;
  updateOutsourcedOs: (osId: string, outsourceId: string, info: any) => Promise<any>;
  removeOutsourceOs: (osId: string, outsourceId: string) => Promise<void>;
}

export const useServiceOrderStore = create<ServiceOrderState>()((set, get) => ({
  serviceOrders: [],
  currentServiceOrder: null,
  isLoading: false,

  fetchServiceOrders: async (unitId?: string) => {
    set({ isLoading: true });
    try {
      const url = unitId && unitId !== 'all' ? `/os?unit_id=${unitId}` : '/os';
      const data = await api.get(url);
      set({ serviceOrders: data || [] });
    } catch (error) {
      console.error('Error fetching service orders:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchServiceOrderById: async (id) => {
    set({ isLoading: true });
    try {
      const data = await api.get(`/os/${id}`);
      set({ currentServiceOrder: data || null });
    } catch (error) {
      console.error('Error fetching single service order:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createServiceOrder: async (os) => {
    try {
      const data = await api.post('/os', os);
      set((state) => ({ serviceOrders: [data, ...state.serviceOrders] }));
      return data;
    } catch (error) {
      console.error('Error creating service order:', error);
      throw error;
    }
  },

  updateServiceOrder: async (id, updatedFields) => {
    try {
      const data = await api.patch(`/os/${id}`, updatedFields);
      
      // Update in both general listing and detailed view if open
      set((state) => ({
        serviceOrders: state.serviceOrders.map((os) => os.id === id ? { ...os, ...data } : os),
        currentServiceOrder: state.currentServiceOrder?.id === id ? { ...state.currentServiceOrder, ...data } : state.currentServiceOrder
      }));
    } catch (error) {
      console.error('Error updating service order:', error);
      throw error;
    }
  },

  deleteServiceOrder: async (id) => {
    try {
      await api.delete(`/os/${id}`);
      set((state) => ({
        serviceOrders: state.serviceOrders.filter((os) => os.id !== id),
        currentServiceOrder: state.currentServiceOrder?.id === id ? null : state.currentServiceOrder
      }));
    } catch (error) {
      console.error('Error deleting service order:', error);
      throw error;
    }
  },

  addPartToOs: async (id, part) => {
    try {
      const data = await api.post(`/os/${id}/parts`, part);
      
      // Refresh detailed view which automatically updates OS total costs
      await get().fetchServiceOrderById(id);
      
      // Refresh general list to keep totals in sync
      await get().fetchServiceOrders();
    } catch (error) {
      console.error('Error adding part to OS:', error);
      throw error;
    }
  },

  deletePartFromOs: async (id, partId) => {
    try {
      await api.delete(`/os/${id}/parts/${partId}`);
      
      // Refresh detailed view which automatically updates OS total costs
      await get().fetchServiceOrderById(id);
      
      // Refresh general list to keep totals in sync
      await get().fetchServiceOrders();
    } catch (error) {
      console.error('Error deleting part from OS:', error);
      throw error;
    }
  },

  notifyOsStatus: async (id, templateType) => {
    try {
      await api.post(`/os/${id}/notify`, { templateType });
    } catch (error) {
      console.error('Error sending WhatsApp OS notification:', error);
      throw error;
    }
  },

  fetchOutsourcedInfo: async (osId) => {
    try {
      return await api.get(`/os/${osId}/outsource`);
    } catch (error) {
      console.error('Error fetching outsourced info:', error);
      return null;
    }
  },

  fetchGlobalOutsourced: async (unitId?: string) => {
    try {
      const url = unitId && unitId !== 'all' ? `/os/global/outsourced?unit_id=${unitId}` : '/os/global/outsourced';
      return await api.get(url);
    } catch (error) {
      console.error('Error fetching global outsourced list:', error);
      return [];
    }
  },

  outsourceOs: async (osId, info) => {
    try {
      const data = await api.post(`/os/${osId}/outsource`, info);
      await get().fetchServiceOrderById(osId);
      return data;
    } catch (error) {
      console.error('Error outsourcing OS:', error);
      throw error;
    }
  },

  updateOutsourcedOs: async (osId, outsourceId, info) => {
    try {
      const data = await api.patch(`/os/${osId}/outsource/${outsourceId}`, info);
      await get().fetchServiceOrderById(osId);
      return data;
    } catch (error) {
      console.error('Error updating outsourced OS:', error);
      throw error;
    }
  },

  removeOutsourceOs: async (osId, outsourceId) => {
    try {
      await api.delete(`/os/${osId}/outsource/${outsourceId}`);
      await get().fetchServiceOrderById(osId);
    } catch (error) {
      console.error('Error removing outsourced OS:', error);
      throw error;
    }
  }
}));
