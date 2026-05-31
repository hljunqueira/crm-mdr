import { create } from 'zustand';
import { api } from '../lib/api';

export interface Invoice {
  id: string;
  number: string;
  type: string;
  client_name: string;
  value: number;
  tax: number;
  status: 'authorized' | 'processing' | 'cancelled';
  key?: string;
  store_id?: string;
  created_at?: string;
}

export interface FiscalConfig {
  cnpj: string;
  fiscal_api_token: string;
  fiscal_environment: 'sandbox' | 'production';
  fiscal_gateway: 'focusnfe' | 'enotas' | 'plugnotas' | 'other';
}

interface FiscalState {
  invoices: Invoice[];
  config: FiscalConfig | null;
  isLoading: boolean;
  fetchInvoices: (storeId?: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'created_at'>) => Promise<Invoice>;
  updateInvoiceStatus: (id: string, status: 'authorized' | 'processing' | 'cancelled') => Promise<void>;
  fetchStoreConfig: (storeId: string) => Promise<void>;
  saveStoreConfig: (storeId: string, config: Partial<FiscalConfig>) => Promise<void>;
}

export const useFiscalStore = create<FiscalState>()((set) => ({
  invoices: [],
  config: null,
  isLoading: false,

  fetchInvoices: async (storeId) => {
    set({ isLoading: true });
    try {
      const url = storeId ? `/fiscal?store_id=${storeId}` : '/fiscal';
      const data = await api.get(url);
      
      const mappedInvoices = (data || []).map((inv: any) => ({
        id: inv.id,
        number: inv.number,
        type: inv.type,
        client_name: inv.client_name,
        value: Number(inv.value),
        tax: Number(inv.tax),
        status: inv.status,
        key: inv.key,
        store_id: inv.store_id,
        created_at: inv.created_at
      }));

      set({ invoices: mappedInvoices });
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addInvoice: async (invoice) => {
    try {
      const dbInvoice = {
        number: invoice.number,
        type: invoice.type,
        client_name: invoice.client_name,
        value: invoice.value,
        tax: invoice.tax,
        status: invoice.status,
        key: invoice.key,
        store_id: invoice.store_id
      };
      
      const data = await api.post('/fiscal', dbInvoice);
      
      const newInvoice: Invoice = {
        id: data.id,
        number: data.number,
        type: data.type,
        client_name: data.client_name,
        value: Number(data.value),
        tax: Number(data.tax),
        status: data.status,
        key: data.key,
        store_id: data.store_id,
        created_at: data.created_at
      };

      set((state) => ({ invoices: [newInvoice, ...state.invoices] }));
      return newInvoice;
    } catch (error) {
      console.error('Error adding invoice:', error);
      throw error;
    }
  },

  updateInvoiceStatus: async (id, status) => {
    try {
      await api.patch(`/fiscal/${id}`, { status });
      set((state) => ({
        invoices: state.invoices.map((inv) => inv.id === id ? { ...inv, status } : inv)
      }));
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  },

  fetchStoreConfig: async (storeId) => {
    try {
      const data = await api.get(`/fiscal/config/${storeId}`);
      set({
        config: {
          cnpj: data.cnpj || '',
          fiscal_api_token: data.fiscal_api_token || '',
          fiscal_environment: data.fiscal_environment || 'sandbox',
          fiscal_gateway: data.fiscal_gateway || 'focusnfe'
        }
      });
    } catch (error) {
      console.error('Error fetching store config:', error);
    }
  },

  saveStoreConfig: async (storeId, newConfig) => {
    try {
      const data = await api.post(`/fiscal/config/${storeId}`, newConfig);
      set({
        config: {
          cnpj: data.cnpj || '',
          fiscal_api_token: data.fiscal_api_token || '',
          fiscal_environment: data.fiscal_environment || 'sandbox',
          fiscal_gateway: data.fiscal_gateway || 'focusnfe'
        }
      });
    } catch (error) {
      console.error('Error saving store config:', error);
      throw error;
    }
  }
}));
