import { create } from 'zustand';
import { api } from '../lib/api';
import { useAuthStore } from './useAuthStore';

export interface Installment {
  id: string;
  unit_id?: string;
  sale_id: string;
  customer_id: string;
  customer_name?: string;
  customer_cpf?: string;
  customer_phone?: string;
  customer_address?: string;
  number: number;
  total: number;
  value: number;
  due_date: string;
  paid_at?: string;
  status: 'paid' | 'pending' | 'overdue' | 'blocked';
  payment_method?: 'pix' | 'money' | 'card' | 'transfer';
  asaas_payment_id?: string;
  asaas_invoice_url?: string;
  asaas_sync_status?: string;
}

interface FinanceState {
  installments: Installment[];
  isLoading: boolean;
  fetchInstallments: (unitId?: string) => Promise<void>;
  markAsPaid: (id: string, finalValue?: number, paymentMethod?: 'pix' | 'money' | 'card') => Promise<void>;
  markAsBlocked: (id: string) => Promise<void>;
  revertPayment: (id: string) => Promise<void>;
  addInstallments: (newInstallments: Omit<Installment, 'id'>[]) => Promise<any>;
  syncAsaas: (id: string) => Promise<void>;
  fetchAsaasDetails: (id: string) => Promise<{ barcode: string | null; barCodeNumber: string | null; pixPayload: string | null; pixImage: string | null; invoiceUrl: string | null }>;
}

export const useFinanceStore = create<FinanceState>()((set) => ({
  installments: [],
  isLoading: false,
  fetchInstallments: async (unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get('/finance/installments');
      const mapped = (data || []).map((i: any) => ({
        id: i.id,
        unit_id: i.sales?.store_id || i.unit_id || undefined,
        sale_id: i.sale_id,
        customer_id: i.sales?.customer_id || i.customer_id,
        customer_name: i.sales?.customers?.name || 'Cliente Sem Nome',
        customer_cpf: i.sales?.customers?.cpf,
        customer_phone: i.sales?.customers?.phone,
        customer_address: i.sales?.customers?.address,
        number: i.installment_number,
        total: i.total_installments,
        value: Number(i.value),
        due_date: i.due_date,
        paid_at: i.payment_date,
        status: i.status,
        payment_method: i.payment_method,
        asaas_payment_id: i.asaas_payment_id,
        asaas_invoice_url: i.asaas_invoice_url,
        asaas_sync_status: i.asaas_sync_status
      }));

      // Filter by unitId on the frontend if provided and user is not an admin
      const role = useAuthStore.getState().profile?.role;
      const filtered = (unitId && role !== 'admin')
        ? mapped.filter((i: any) => i.unit_id === unitId)
        : mapped;

      set({ installments: filtered });
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  markAsPaid: async (id, finalValue, paymentMethod) => {
    try {
      const payload: Record<string, any> = {
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0]
      };
      // If a final value is given (e.g., includes late fees), persist the real amount received
      if (finalValue !== undefined) {
        payload.value = finalValue;
      }
      if (paymentMethod !== undefined) {
        payload.payment_method = paymentMethod;
      }
      const data = await api.patch(`/finance/installments/${id}`, payload);
      
      const mapped = {
        id: data.id,
        sale_id: data.sale_id,
        number: data.installment_number,
        total: data.total_installments,
        value: Number(data.value),
        due_date: data.due_date,
        paid_at: data.payment_date,
        status: data.status,
        payment_method: data.payment_method,
        asaas_payment_id: data.asaas_payment_id,
        asaas_invoice_url: data.asaas_invoice_url,
        asaas_sync_status: data.asaas_sync_status
      };

      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? { ...i, ...mapped } : i)
      }));
    } catch (error) {
      console.error('Error marking as paid:', error);
      throw error;
    }
  },
  revertPayment: async (id) => {
    try {
      const data = await api.patch(`/finance/installments/${id}`, {
        status: 'pending',
        payment_date: null,
        payment_method: null
      });
      
      const mapped = {
        id: data.id,
        sale_id: data.sale_id,
        number: data.installment_number,
        total: data.total_installments,
        value: Number(data.value),
        due_date: data.due_date,
        paid_at: undefined,
        status: data.status,
        payment_method: undefined,
        asaas_payment_id: data.asaas_payment_id,
        asaas_invoice_url: data.asaas_invoice_url,
        asaas_sync_status: data.asaas_sync_status
      };

      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? { ...i, ...mapped, paid_at: undefined, payment_method: undefined } : i)
      }));
    } catch (error) {
      console.error('Error reverting payment:', error);
      throw error;
    }
  },
  markAsBlocked: async (id) => {
    try {
      const data = await api.patch(`/finance/installments/${id}`, { status: 'blocked' });
      
      const mapped = {
        id: data.id,
        sale_id: data.sale_id,
        number: data.installment_number,
        total: data.total_installments,
        value: Number(data.value),
        due_date: data.due_date,
        paid_at: data.payment_date,
        status: data.status,
        asaas_payment_id: data.asaas_payment_id,
        asaas_invoice_url: data.asaas_invoice_url,
        asaas_sync_status: data.asaas_sync_status
      };

      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? { ...i, ...mapped } : i)
      }));
    } catch (error) {
      console.error('Error marking as blocked:', error);
      throw error;
    }
  },
  addInstallments: async (newInstallments) => {
    try {
      const dbInstallments = newInstallments.map(i => ({
        sale_id: i.sale_id,
        installment_number: i.number,
        total_installments: i.total,
        value: i.value,
        due_date: i.due_date,
        status: i.status || 'pending'
      }));
      
      const data = await api.post('/finance/installments', dbInstallments);
      
      // Fetch latest to resolve the joins (like customers)
      const currentUnitId = useAuthStore.getState().profile?.unit_id;
      await useFinanceStore.getState().fetchInstallments(currentUnitId || undefined);
      return data;
    } catch (error) {
      console.error('Error adding installments:', error);
      throw error;
    }
  },
  syncAsaas: async (id) => {
    try {
      const data = await api.post(`/finance/installments/${id}/sync-asaas`, {});
      const mapped = {
        id: data.id,
        sale_id: data.sale_id,
        number: data.installment_number,
        total: data.total_installments,
        value: Number(data.value),
        due_date: data.due_date,
        paid_at: data.payment_date,
        status: data.status,
        payment_method: data.payment_method,
        asaas_payment_id: data.asaas_payment_id,
        asaas_invoice_url: data.asaas_invoice_url,
        asaas_sync_status: data.asaas_sync_status
      };

      set((state) => ({
        installments: state.installments.map((i) => i.id === id ? { ...i, ...mapped } : i)
      }));
    } catch (error) {
      console.error('Error syncing with Asaas:', error);
      throw error;
    }
  },
  fetchAsaasDetails: async (id) => {
    try {
      const response = await api.get(`/finance/installments/${id}/asaas-details`);
      return response;
    } catch (error) {
      console.error('Error fetching Asaas details:', error);
      throw error;
    }
  },
}));

