import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface KanbanColumn {
  id: string;
  title: string;
  col_order: number;
}

export interface KanbanCard {
  id: string;
  unit_id?: string;
  column_id: string;
  title: string;
  value: number;
  priority: 'Alta' | 'Media' | 'Baixa';
  customer_id?: string;
  customer_name?: string;
  notes?: string;
  card_order: number;
}

interface KanbanState {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  isLoading: boolean;
  fetchKanban: (unitId?: string) => Promise<void>;
  addCard: (card: Omit<KanbanCard, 'id'>) => Promise<void>;
  moveCard: (cardId: string, columnId: string, order?: number) => Promise<void>;
  updateCard: (id: string, card: Partial<KanbanCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
}

export const useKanbanStore = create<KanbanState>()((set) => ({
  columns: [],
  cards: [],
  isLoading: false,
  fetchKanban: async (unitId) => {
    set({ isLoading: true });
    try {
      const { data: cols, error: colErr } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('col_order', { ascending: true });

      if (colErr) throw colErr;

      let cardQuery = supabase
        .from('kanban_cards')
        .select('*, customers(name)')
        .order('card_order', { ascending: true });

      if (unitId) {
        cardQuery = cardQuery.eq('unit_id', unitId);
      }

      const { data: cards, error: cardErr } = await cardQuery;
      if (cardErr) throw cardErr;

      const formattedCards = cards.map(c => ({
        ...c,
        customer_name: c.customers?.name
      }));

      set({ columns: cols, cards: formattedCards });
    } catch (error) {
      console.error('Error fetching kanban data:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addCard: async (card) => {
    try {
      const { data, error } = await supabase
        .from('kanban_cards')
        .insert([card])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ cards: [...state.cards, data] }));
    } catch (error) {
      console.error('Error adding kanban card:', error);
    }
  },
  moveCard: async (cardId, columnId, order = 0) => {
    try {
      const { data, error } = await supabase
        .from('kanban_cards')
        .update({ column_id: columnId, card_order: order })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        cards: state.cards.map((c) => c.id === cardId ? { ...c, ...data } : c)
      }));
    } catch (error) {
      console.error('Error moving kanban card:', error);
    }
  },
  updateCard: async (id, updatedFields) => {
    try {
      const { data, error } = await supabase
        .from('kanban_cards')
        .update(updatedFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        cards: state.cards.map((c) => c.id === id ? { ...c, ...data } : c)
      }));
    } catch (error) {
      console.error('Error updating kanban card:', error);
    }
  },
  deleteCard: async (id) => {
    try {
      const { error } = await supabase
        .from('kanban_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting kanban card:', error);
    }
  },
}));
