import React, { useState } from 'react';
import { useKanbanStore, KanbanCard } from '../../store/useKanbanStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUI } from '../../context/UIContext';

interface KanbanCardFormProps {
  initialData?: KanbanCard;
  columnId?: string;
  onSuccess?: () => void;
}

export default function KanbanCardForm({ initialData, columnId, onSuccess }: KanbanCardFormProps) {
  const { addCard, updateCard, cards } = useKanbanStore();
  const { customers } = useCustomerStore();
  const { profile } = useAuthStore();
  const { showNotification } = useUI();
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    value: initialData?.value || 0,
    priority: initialData?.priority || 'Media',
    customer_id: initialData?.customer_id || '',
    notes: initialData?.notes || '',
    column_id: initialData?.column_id || columnId || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (initialData) {
        await updateCard(initialData.id, formData);
        showNotification('success', 'Oportunidade atualizada');
      } else {
        // Calculate order for new card
        const columnCards = cards.filter(c => c.column_id === formData.column_id);
        const nextOrder = columnCards.length > 0 
          ? Math.max(...columnCards.map(c => c.card_order)) + 1 
          : 0;

        await addCard({
          ...formData,
          unit_id: profile?.unit_id || undefined,
          card_order: nextOrder,
        });
        showNotification('success', 'Oportunidade criada');
      }
      onSuccess?.();
    } catch (error) {
      showNotification('error', 'Erro ao salvar oportunidade');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Título da Oportunidade</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            placeholder="Ex: Venda iPhone 15 Pro"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Valor Estimado</label>
          <input
            type="number"
            required
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Prioridade</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none appearance-none"
          >
            <option value="Alta">Alta</option>
            <option value="Media">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Vincular Cliente (Opcional)</label>
          <select
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none appearance-none"
          >
            <option value="">Nenhum cliente selecionado</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Observações / Notas</label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
            placeholder="Detalhes adicionais sobre a negociação..."
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-5 bg-primary text-on-primary rounded-3xl font-display font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
      >
        {initialData ? 'Atualizar Card' : 'Criar Card'}
      </button>
    </form>
  );
}
