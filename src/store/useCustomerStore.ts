import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  fetchCustomers: async (unitId) => {
    set({ isLoading: true });
    try {
      let query = supabase.from('customers').select('*').order('name');
      
      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      set({ customers: data || [] });
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addCustomer: async (customer) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ customers: [...state.customers, data] }));
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  },
  updateCustomer: async (id, updatedFields) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updatedFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        customers: state.customers.map((c) => c.id === id ? data : c)
      }));
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  },
  deleteCustomer: async (id) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  },
}));

