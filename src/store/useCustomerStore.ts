
import { create } from 'zustand';

export interface Customer {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  address: string;
  status: 'active' | 'overdue' | 'blocked';
  lastPayment?: string;
  avatar?: string;
  photo?: string;
}

interface CustomerState {
  customers: Customer[];
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>()((set) => ({
  customers: [],
  fetchCustomers: async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      set({ customers: data });
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  },
  addCustomer: async (customer) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      const newCustomer = await response.json();
      set((state) => ({ customers: [...state.customers, newCustomer] }));
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  },
  updateCustomer: async (id, updatedFields) => {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      const updatedCustomer = await response.json();
      set((state) => ({
        customers: state.customers.map((c) => c.id === id ? updatedCustomer : c)
      }));
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  },
  deleteCustomer: async (id) => {
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  },
}));

