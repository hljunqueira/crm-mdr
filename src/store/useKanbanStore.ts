import { create } from 'zustand';

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  value: number;
  priority: 'Alta' | 'Media' | 'Baixa';
  customerName?: string;
  notes?: string;
}

interface KanbanState {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  fetchKanban: () => Promise<void>;
  addCard: (card: Omit<KanbanCard, 'id'>) => Promise<void>;
  moveCard: (cardId: string, columnId: string) => Promise<void>;
  updateCard: (id: string, card: Partial<KanbanCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
}

export const useKanbanStore = create<KanbanState>()((set) => ({
  columns: [],
  cards: [],
  fetchKanban: async () => {
    try {
      const colRes = await fetch('/api/kanban/columns');
      const cardRes = await fetch('/api/kanban/cards');
      const cols = await colRes.json();
      const cards = await cardRes.json();
      set({ columns: cols, cards });
    } catch (error) {
      console.error('Error fetching kanban data:', error);
    }
  },
  addCard: async (card) => {
    try {
      const response = await fetch('/api/kanban/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      const newCard = await response.json();
      set((state) => ({ cards: [...state.cards, newCard] }));
    } catch (error) {
      console.error('Error adding kanban card:', error);
    }
  },
  moveCard: async (cardId, columnId) => {
    try {
      const response = await fetch(`/api/kanban/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId }),
      });
      const updatedCard = await response.json();
      set((state) => ({
        cards: state.cards.map((c) => c.id === cardId ? updatedCard : c)
      }));
    } catch (error) {
      console.error('Error moving kanban card:', error);
    }
  },
  updateCard: async (id, updatedFields) => {
    try {
      const response = await fetch(`/api/kanban/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      const updatedCard = await response.json();
      set((state) => ({
        cards: state.cards.map((c) => c.id === id ? updatedCard : c)
      }));
    } catch (error) {
      console.error('Error updating kanban card:', error);
    }
  },
  deleteCard: async (id) => {
    try {
      await fetch(`/api/kanban/cards/${id}`, { method: 'DELETE' });
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting kanban card:', error);
    }
  },
}));
