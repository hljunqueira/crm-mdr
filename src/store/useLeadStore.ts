import { create } from 'zustand';
import { api } from '../lib/api';

export interface Lead {
  id: string;
  unit_id?: string;
  name: string;
  phone: string;
  email?: string;
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
  fetchLeads: async (_unitId) => {
    set({ isLoading: true });
    try {
      const data = await api.get('/leads');
      set({ leads: data || [] });
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addLead: async (lead) => {
    try {
      const data = await api.post('/leads', lead);
      set((state) => ({ leads: [data, ...state.leads] }));
    } catch (error) {
      console.error('Error adding lead:', error);
    }
  },
  updateLead: async (id, updatedFields) => {
    try {
      const data = await api.patch(`/leads/${id}`, updatedFields);
      set((state) => ({
        leads: state.leads.map((l) => l.id === id ? data : l)
      }));
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  },
  deleteLead: async (id) => {
    try {
      await api.delete(`/leads/${id}`);
      set((state) => ({
        leads: state.leads.filter((l) => l.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  },
}));
