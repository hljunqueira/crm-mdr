import React, { useEffect } from 'react';
import { Search, Filter, Plus, MessageSquare, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useKanbanStore, KanbanCard } from '../store/useKanbanStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { useCustomerStore } from '../store/useCustomerStore';
import KanbanCardForm from '../components/kanban/KanbanCardForm';

export default function Kanban() {
  const { columns, cards, moveCard, deleteCard, fetchKanban, isLoading } = useKanbanStore();
  const { fetchCustomers } = useCustomerStore();
  const { profile } = useAuthStore();
  const { showModal, showNotification, hideModal } = useUI();

  useEffect(() => {
    fetchKanban(profile?.unit_id || undefined);
    fetchCustomers(profile?.unit_id || undefined);
  }, [profile?.unit_id, fetchKanban, fetchCustomers]);

  const handleAddCard = (columnId?: string) => {
    showModal({
      title: 'Nova Oportunidade',
      children: <KanbanCardForm columnId={columnId} onSuccess={hideModal} />,
    });
  };

  const handleEditCard = (card: KanbanCard) => {
    showModal({
      title: 'Editar Oportunidade',
      children: <KanbanCardForm initialData={card} onSuccess={hideModal} />,
    });
  };

  const handleDeleteCard = (id: string) => {
    showModal({
      title: 'Confirmar Exclusão',
      children: 'Deseja realmente remover esta oportunidade do funil?',
      confirmText: 'Excluir Card',
      type: 'danger',
      onConfirm: async () => {
        await deleteCard(id);
        showNotification('success', 'Negócio Removido');
      }
    });
  };

  const handleMoveCard = async (cardId: string, columnId: string) => {
    await moveCard(cardId, columnId);
    showNotification('success', 'Oportunidade Movida');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-display font-black text-on-surface uppercase tracking-tight">Funil de Vendas</h1>
          <p className="text-on-surface-variant font-display tracking-tight mt-1 opacity-70">Gestão de Oportunidades</p>
        </div>
        <button 
          onClick={() => handleAddCard(columns[0]?.id)}
          className="flex items-center gap-3 bg-primary text-on-primary px-6 py-3 rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Novo Negócio
        </button>
      </div>

      {isLoading ? (
        <div className="flex gap-8 overflow-x-auto pb-6 h-full">
           {[1, 2, 3].map(i => (
             <div key={i} className="w-[320px] flex flex-col gap-6 animate-pulse">
               <div className="h-14 bg-white/5 rounded-3xl w-full"></div>
               <div className="h-40 bg-white/5 rounded-[32px] w-full"></div>
             </div>
           ))}
        </div>
      ) : columns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20 gap-4 opacity-50 bg-white/[0.02] border border-outline-variant/30 rounded-[40px]">
          <MessageSquare size={48} className="text-on-surface-variant mb-2 opacity-20" />
          <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhuma etapa encontrada</p>
          <p className="text-[10px] font-display text-on-surface-variant opacity-70">O funil de vendas não possui colunas cadastradas.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar scroll-smooth">
          <div className="flex gap-8 h-full min-w-max p-1">
            {columns.map((column) => (
              <div key={column.id} className="w-[320px] flex flex-col gap-6">
                <div className="flex items-center justify-between p-5 border-b-4 bg-white/[0.02] rounded-3xl group shadow-inner transition-all border-white">
                  <div className="flex items-center gap-4">
                    <h3 className="font-black text-xs text-on-surface uppercase tracking-[0.2em]">{column.title}</h3>
                    <span className="bg-white/10 text-white text-[10px] px-3 py-1 rounded-full font-black border border-white/10">
                      {cards.filter(c => c.column_id === column.id).length}
                    </span>
                  </div>
                </div>

                <div 
                  className="flex-1 flex flex-col gap-6 min-h-[200px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const cardId = e.dataTransfer.getData('cardId');
                    handleMoveCard(cardId, column.id);
                  }}
                >
                  {cards.filter(c => c.column_id === column.id).map((card) => (
                    <div 
                      key={card.id} 
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('cardId', card.id)}
                      className="glass-card p-8 border border-outline-variant/30 rounded-[32px] hover:border-white/30 hover:shadow-2xl transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden bg-white/[0.02]"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button onClick={() => handleEditCard(card)} className="p-1 hover:text-white transition-colors">
                            <Edit2 size={16} />
                         </button>
                         <button onClick={() => handleDeleteCard(card.id)} className="p-1 hover:text-error transition-colors">
                            <Trash2 size={16} />
                         </button>
                      </div>

                      <div className="flex items-start justify-between mb-6">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                          card.priority === 'Alta' ? 'border-red-500/20 bg-red-500/10 text-red-500' : 
                          card.priority === 'Media' ? 'border-warning/20 bg-warning/10 text-warning' :
                          'border-white/5 text-on-surface-variant/40'
                        }`}>
                          {card.priority}
                        </span>
                      </div>
                      
                      <h4 className="font-black text-on-surface text-base mb-2 tracking-tight group-hover:text-white transition-colors">{card.title}</h4>
                      <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-6 opacity-60">{card.customer_name || 'Sem Cliente'}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-outline-variant/10">
                        <div className="flex items-center gap-2 text-on-surface-variant/40 group-hover:text-white transition-colors">
                           <MessageSquare size={14} />
                           <span className="text-[10px] font-black uppercase tracking-widest">0</span>
                        </div>
                        <span className="font-black text-white text-sm tracking-tight">R$ {card.value.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => handleAddCard(column.id)}
                    className="w-full py-6 border-2 border-dashed border-outline-variant/30 rounded-[32px] text-on-surface-variant/40 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/[0.02] hover:border-white/30 hover:text-white transition-all flex items-center justify-center gap-3 group"
                  >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                    <span>Novo Card</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

