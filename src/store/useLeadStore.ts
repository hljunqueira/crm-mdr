import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Lead {
  id: string;
  unit_id?: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at?: string;
}

interface LeadState {
  leads: Lead[];
  isLoading: boolean;
  fetchLeads: (unitId?: string) => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'created_at'>) => Promise<void>;
  updateLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
}

export const useLeadStore = create<LeadState>()((set) => ({
  leads: [],
  isLoading: false,
  fetchLeads: async (unitId) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ leads: data || [] });
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addLead: async (lead) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([lead])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ leads: [data, ...state.leads] }));
    } catch (error) {
      console.error('Error adding lead:', error);
    }
  },
  updateLead: async (id, updatedFields) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(updatedFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        leads: state.leads.map((l) => l.id === id ? data : l)
      }));
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  },
  deleteLead: async (id) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        leads: state.leads.filter((l) => l.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  },
}));
