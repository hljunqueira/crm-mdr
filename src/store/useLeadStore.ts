import { create } from 'zustand';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  date: string;
}

interface LeadState {
  leads: Lead[];
  fetchLeads: () => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'date'>) => Promise<void>;
  updateLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
}

export const useLeadStore = create<LeadState>()((set) => ({
  leads: [],
  fetchLeads: async () => {
    try {
      const response = await fetch('/api/leads');
      const data = await response.json();
      set({ leads: data });
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  },
  addLead: async (lead) => {
    try {
      const leadData = { ...lead, date: new Date().toISOString().split('T')[0] };
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });
      const newLead = await response.json();
      set((state) => ({ leads: [...state.leads, newLead] }));
    } catch (error) {
      console.error('Error adding lead:', error);
    }
  },
  updateLead: async (id, updatedFields) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      const updatedLead = await response.json();
      set((state) => ({
        leads: state.leads.map((l) => l.id === id ? updatedLead : l)
      }));
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  },
  deleteLead: async (id) => {
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      set((state) => ({
        leads: state.leads.filter((l) => l.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  },
}));
