import { create } from 'zustand';
import { api } from '../lib/api';

export interface AuditSession {
  id: string;
  store_id: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  completed_at: string | null;
  total_cost_discrepancy: number;
  stores?: { name: string };
  profiles?: { full_name: string };
}

export interface AuditItem {
  device_id: string;
  model: string;
  brand: string;
  imei: string;
  barcode: string;
  category: string;
  system_quantity: number;
  physical_quantity: number | null;
  cost_price: number;
  sale_price: number;
  reason: string;
  adjusted: boolean;
  audit_item_id: string | null;
}

interface InventoryAuditState {
  audits: AuditSession[];
  activeAudit: AuditSession | null;
  auditItems: AuditItem[];
  isLoading: boolean;
  fetchAudits: (storeId?: string) => Promise<void>;
  fetchActiveAudit: (storeId: string) => Promise<AuditSession | null>;
  startAudit: (storeId: string, userId: string) => Promise<AuditSession>;
  fetchAuditItems: (auditId: string) => Promise<void>;
  saveAuditItem: (auditId: string, deviceId: string, physicalQty: number, reason?: string) => Promise<void>;
  finalizeAudit: (auditId: string, userId: string) => Promise<void>;
  cancelAudit: (auditId: string) => Promise<void>;
}

export const useInventoryAuditStore = create<InventoryAuditState>()((set, get) => ({
  audits: [],
  activeAudit: null,
  auditItems: [],
  isLoading: false,

  fetchAudits: async (storeId) => {
    set({ isLoading: true });
    try {
      const url = storeId && storeId !== 'all' ? `/inventory-audits?store_id=${storeId}` : '/inventory-audits';
      const data = await api.get(url);
      set({ audits: data || [] });
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchActiveAudit: async (storeId) => {
    try {
      const data = await api.get(`/inventory-audits/active?store_id=${storeId}`);
      set({ activeAudit: data || null });
      return data || null;
    } catch (error) {
      console.error('Error fetching active audit:', error);
      set({ activeAudit: null });
      return null;
    }
  },

  startAudit: async (storeId, userId) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/inventory-audits', { store_id: storeId, created_by: userId });
      set({ activeAudit: data });
      return data;
    } catch (error) {
      console.error('Error starting audit:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAuditItems: async (auditId) => {
    set({ isLoading: true });
    try {
      const data = await api.get(`/inventory-audits/${auditId}/items`);
      set({ auditItems: data || [] });
    } catch (error) {
      console.error('Error fetching audit items:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveAuditItem: async (auditId, deviceId, physicalQty, reason) => {
    try {
      const savedItem = await api.post(`/inventory-audits/${auditId}/items`, {
        device_id: deviceId,
        physical_quantity: physicalQty,
        reason
      });

      // Atualizar o item no array local do store
      const updatedItems = get().auditItems.map((item) => {
        if (item.device_id === deviceId) {
          return {
            ...item,
            physical_quantity: physicalQty,
            reason: reason || '',
            audit_item_id: savedItem.id
          };
        }
        return item;
      });

      set({ auditItems: updatedItems });
    } catch (error) {
      console.error('Error saving audit item:', error);
      throw error;
    }
  },

  finalizeAudit: async (auditId, userId) => {
    set({ isLoading: true });
    try {
      const data = await api.post(`/inventory-audits/${auditId}/finalize`, { user_id: userId });
      set({ activeAudit: null, auditItems: [] });
      return data;
    } catch (error) {
      console.error('Error finalizing audit:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelAudit: async (auditId) => {
    set({ isLoading: true });
    try {
      await api.post(`/inventory-audits/${auditId}/cancel`, {});
      set({ activeAudit: null, auditItems: [] });
    } catch (error) {
      console.error('Error cancelling audit:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));
