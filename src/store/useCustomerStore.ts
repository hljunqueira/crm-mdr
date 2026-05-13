import { create } from 'zustand';
import { api } from '../lib/api';

export interface Customer {
  id: string;
  unit_id?: string;
  name: string;
  cpf: string;
  phone: string;
  address: string;
  status: 'active' | 'overdue' | 'blocked';
  last_payment?: string;
  created_at?: string;
}

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  fetchCustomers: (unitId?: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<void>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>()((set) => ({
  customers: [],
  isLoading: false,
  fetchCustomers: async (_unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get('/customers');
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
      set((state) => ({ customers: [...state.customers, data] }));
    } catch (error) {
      console.error('Error adding customer:', error);
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
    }
  },
}));

