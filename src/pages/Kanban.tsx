import React from 'react';
import { Search, Filter, Plus, MoreHorizontal, User, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useKanbanStore, KanbanCard } from '../store/useKanbanStore';
import { useUI } from '../context/UIContext';

export default function Kanban() {
  const { columns, cards, moveCard, deleteCard, addCard } = useKanbanStore();
  const { showModal, showNotification } = useUI();

  const handleAddCard = (columnId: string) => {
    // Card Form would go here
    showNotification('info', 'Funcionalidade em Breve', 'O formulário de cards está sendo desenvolvido.');
  };

  const handleDeleteCard = async (id: string) => {
    if (confirm('Deseja excluir este negócio?')) {
      await deleteCard(id);
      showNotification('success', 'Negócio Removido', 'Card excluído com sucesso.');
    }
  };

  const handleMoveCard = async (cardId: string, columnId: string) => {
    await moveCard(cardId, columnId);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Funil de Vendas</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gestão de Oportunidades</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleAddCard(columns[0]?.id)}
            className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} /> Novo Negócio
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar scroll-smooth">
        <div className="flex gap-8 h-full min-w-max p-1">
          {columns.sort((a, b) => a.order - b.order).map((column) => (
            <div key={column.id} className="w-[320px] flex flex-col gap-6">
              <div className="flex items-center justify-between p-5 border-b-4 bg-white/[0.02] rounded-3xl group shadow-inner transition-all border-white">
                <div className="flex items-center gap-4">
                  <h3 className="font-black text-xs text-on-surface uppercase tracking-[0.2em]">{column.title}</h3>
                  <span className="bg-white/10 text-white text-[10px] px-3 py-1 rounded-full font-black border border-white/10">
                    {cards.filter(c => c.columnId === column.id).length}
                  </span>
                </div>
                <MoreHorizontal size={18} className="text-on-surface-variant opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer" />
              </div>

              <div 
                className="flex-1 flex flex-col gap-6 min-h-[200px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const cardId = e.dataTransfer.getData('cardId');
                  handleMoveCard(cardId, column.id);
                }}
              >
                {cards.filter(c => c.columnId === column.id).map((card) => (
                  <div 
                    key={card.id} 
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('cardId', card.id)}
                    className="glass-card p-8 border border-outline-variant/30 rounded-[32px] hover:border-white/30 hover:shadow-2xl transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden bg-white/[0.02]"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                       <button onClick={() => handleDeleteCard(card.id)} className="p-1 hover:text-error transition-colors">
                          <Trash2 size={16} />
                       </button>
                    </div>

                    <div className="flex items-start justify-between mb-6">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                        card.priority === 'Alta' ? 'border-success/20 bg-success/10 text-success' : 
                        card.priority === 'Media' ? 'border-warning/20 bg-warning/10 text-warning' :
                        'border-white/5 text-on-surface-variant/40'
                      }`}>
                        {card.priority}
                      </span>
                    </div>
                    
                    <h4 className="font-black text-on-surface text-base mb-2 tracking-tight group-hover:text-white transition-colors">{card.title}</h4>
                    <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-6 opacity-60">{card.customerName || 'Sem Cliente'}</p>
                    
                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-outline-variant/10">
                      <div className="flex items-center gap-2 text-on-surface-variant/40 group-hover:text-white transition-colors">
                        <MessageSquare size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">0</span>
                      </div>
                      <span className="font-black text-white text-sm tracking-tight">R$ {card.value.toLocaleString()}</span>
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
    </div>
  );
}

