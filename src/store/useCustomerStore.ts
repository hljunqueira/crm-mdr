import { create } from 'zustand';
import { api } from '../lib/api';

export interface Customer {
  id: string;
  unit_id?: string;
  name: string;
  cpf: string;
  phone: string;
  parent_contact_phone?: string;
  reference1_name?: string;
  reference1_phone?: string;
  reference2_name?: string;
  reference2_phone?: string;
  address: string; // Will store the street/logradouro
  notes?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  document_address_url?: string;
  document_id_url?: string;
  document_income_url?: string;
  desired_device?: string;
  needed_credit?: number;
  desired_installment_value?: number;
  classification?: 'BOM' | 'MEDIO' | 'RUIM' | 'A_VISTA';
  credit_limit?: number;
  suggested_down_payment?: number;
  credit_status?: 'EM_ANALISE' | 'REPROVADO' | 'APROVADO_COM_ENTRADA' | 'APROVADO';
  approved_for_purchase?: boolean;
  registration_status?: 'PRE_CADASTRO' | 'APROVADO' | 'REPROVADO';
  responsible_analyst_id?: string;
  status: 'active' | 'overdue' | 'blocked';
  last_payment?: string;
  created_at?: string;
}

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  fetchCustomers: (unitId?: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>()((set) => ({
  customers: [],
  isLoading: false,
  fetchCustomers: async (unitId) => {
    set({ isLoading: true });
    try {
      const url = unitId && unitId !== 'all' ? `/customers?unit_id=${unitId}` : '/customers';
      const data = await api.get(url);
      set({ customers: data || [] });
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addCustomer: async (customer) => {
    try {
      const data = await api.post('/customers', customer);
      if (data) {
        set((state) => ({ customers: [...state.customers, data] }));
        return data;
      }
      throw new Error('Nenhum dado retornado do servidor');
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  },
  updateCustomer: async (id, updatedFields) => {
    try {
      const data = await api.patch(`/customers/${id}`, updatedFields);
      set((state) => ({
        customers: state.customers.map((c) => c.id === id ? data : c)
      }));
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },
  deleteCustomer: async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },
}));
