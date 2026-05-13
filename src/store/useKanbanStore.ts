import { create } from 'zustand';
import { api } from '../lib/api';

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
  fetchKanban: async (_unitId) => {
    set({ isLoading: true });
    try {
      const [cols, cards] = await Promise.all([
        api.get('/kanban/columns'),
        api.get('/kanban/cards')
      ]);
      set({ columns: cols, cards: cards || [] });
    } catch (error) {
      console.error('Error fetching kanban data:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addCard: async (card) => {
    try {
      const data = await api.post('/kanban/cards', card);
      set((state) => ({ cards: [...state.cards, data] }));
    } catch (error) {
      console.error('Error adding kanban card:', error);
    }
  },
  moveCard: async (cardId, columnId, order = 0) => {
    try {
      const data = await api.patch(`/kanban/cards/${cardId}`, { 
        column_id: columnId, 
        card_order: order 
      });
      set((state) => ({
        cards: state.cards.map((c) => c.id === cardId ? { ...c, ...data } : c)
      }));
    } catch (error) {
      console.error('Error moving kanban card:', error);
    }
  },
  updateCard: async (id, updatedFields) => {
    try {
      const data = await api.patch(`/kanban/cards/${id}`, updatedFields);
      set((state) => ({
        cards: state.cards.map((c) => c.id === id ? { ...c, ...data } : c)
      }));
    } catch (error) {
      console.error('Error updating kanban card:', error);
    }
  },
  deleteCard: async (id) => {
    try {
      await api.delete(`/kanban/cards/${id}`);
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting kanban card:', error);
    }
  },
}));
