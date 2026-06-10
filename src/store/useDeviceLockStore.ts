import { create } from 'zustand';
import { api } from '../lib/api';

export interface DeviceLock {
  id: string;
  device_id: string;
  sale_id: string;
  lock_type: 'icloud' | 'android';
  
  // iCloud fields (iOS)
  icloud_email?: string;
  icloud_locked: boolean;
  icloud_lock_confirmed_by?: string;
  icloud_lock_confirmed_at?: string;
  
  // MDM fields (Android)
  mdm_device_id?: string;
  mdm_locked: boolean;
  mdm_kiosk_message?: string;
  mdm_last_sync_at?: string;
  
  created_at?: string;
  updated_at?: string;
  
  // Joined/Populated fields
  device?: {
    id: string;
    model: string;
    brand: string;
    imei: string;
    serial_number?: string;
    condition: string;
    sale_price: number;
  };
  sale?: {
    id: string;
    total_value: number;
    down_payment: number;
    installments_count: number;
    sale_date: string;
    customer?: {
      id: string;
      name: string;
      cpf: string;
      phone: string;
    };
    installments?: Array<{
      id: string;
      installment_number: number;
      value: number;
      due_date: string;
      status: 'paid' | 'pending' | 'overdue' | 'blocked' | 'cancelled';
    }>;
  };
}

interface DeviceLockState {
  deviceLocks: DeviceLock[];
  isLoading: boolean;
  fetchDeviceLocks: () => Promise<void>;
  registerDeviceLock: (lock: Omit<DeviceLock, 'id' | 'created_at' | 'updated_at'>) => Promise<DeviceLock>;
  updateDeviceLock: (id: string, fields: Partial<DeviceLock>) => Promise<DeviceLock>;
  lockDevice: (id: string, kioskMessage?: string, customerId?: string, operatorId?: string) => Promise<{ success: boolean; message: string }>;
  unlockDevice: (id: string, customerId?: string) => Promise<{ success: boolean; message: string }>;
}

export const useDeviceLockStore = create<DeviceLockState>()((set) => ({
  deviceLocks: [],
  isLoading: false,

  fetchDeviceLocks: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get('/device-locks');
      set({ deviceLocks: data || [] });
    } catch (error) {
      console.error('Error fetching device locks:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  registerDeviceLock: async (lock) => {
    try {
      const data = await api.post('/device-locks', lock);
      set((state) => ({ deviceLocks: [data, ...state.deviceLocks] }));
      return data;
    } catch (error) {
      console.error('Error registering device lock:', error);
      throw error;
    }
  },

  updateDeviceLock: async (id, fields) => {
    try {
      const data = await api.patch(`/device-locks/${id}`, fields);
      set((state) => ({
        deviceLocks: state.deviceLocks.map((item) => (item.id === id ? { ...item, ...data } : item))
      }));
      return data;
    } catch (error) {
      console.error('Error updating device lock:', error);
      throw error;
    }
  },

  lockDevice: async (id, kioskMessage, customerId, operatorId) => {
    try {
      const response = await api.post(`/device-locks/${id}/lock`, {
        kioskMessage,
        customerId,
        operatorId
      });
      
      if (response.success) {
        set((state) => ({
          deviceLocks: state.deviceLocks.map((item) => {
            if (item.id === id) {
              if (item.lock_type === 'android') {
                return {
                  ...item,
                  mdm_locked: true,
                  mdm_last_sync_at: new Date().toISOString(),
                  mdm_kiosk_message: kioskMessage
                };
              }
              return {
                ...item,
                icloud_locked: true,
                icloud_lock_confirmed_at: new Date().toISOString(),
                icloud_lock_confirmed_by: operatorId
              };
            }
            return item;
          })
        }));
      }
      
      return response;
    } catch (error) {
      console.error('Error locking device:', error);
      throw error;
    }
  },

  unlockDevice: async (id, customerId) => {
    try {
      const response = await api.post(`/device-locks/${id}/unlock`, {
        customerId
      });
      
      if (response.success) {
        set((state) => ({
          deviceLocks: state.deviceLocks.map((item) => {
            if (item.id === id) {
              if (item.lock_type === 'android') {
                return {
                  ...item,
                  mdm_locked: false,
                  mdm_last_sync_at: new Date().toISOString()
                };
              }
              return {
                ...item,
                icloud_locked: false,
                icloud_lock_confirmed_at: undefined,
                icloud_lock_confirmed_by: undefined
              };
            }
            return item;
          })
        }));
      }
      
      return response;
    } catch (error) {
      console.error('Error unlocking device:', error);
      throw error;
    }
  }
}));
