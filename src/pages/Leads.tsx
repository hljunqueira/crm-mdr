import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  UserPlus, 
  Mail, 
  Phone, 
  Trash2, 
  Edit2, 
  Plus, 
  MessageSquare, 
  Loader2, 
  Inbox, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLeadStore, Lead } from '../store/useLeadStore';
import { useKanbanStore, KanbanCard } from '../store/useKanbanStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
import LeadForm from '../components/leads/LeadForm';
import KanbanCardForm from '../components/kanban/KanbanCardForm';
import { motion, AnimatePresence } from 'motion/react';

export default function Leads() {
  const [activeTab, setActiveTab] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { leads, deleteLead, updateLead, fetchLeads, isLoading: leadsLoading } = useLeadStore();
  const { columns, cards, moveCard, deleteCard, fetchKanban, isLoading: kanbanLoading } = useKanbanStore();
  const { fetchCustomers } = useCustomerStore();
  const { profile } = useAuthStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { hasPermission, fetchUserPermissions } = usePermissionStore();

  useEffect(() => {
    fetchLeads(profile?.unit_id || undefined);
    fetchKanban(profile?.unit_id || undefined);
    fetchCustomers(profile?.unit_id || undefined);
    fetchUserPermissions();
  }, [profile?.unit_id, fetchLeads, fetchKanban, fetchCustomers, fetchUserPermissions]);

  useEffect(() => {
    const searchParam = new URLSearchParams(window.location.search).get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Derived metrics
  const totalLeads = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'new').length;
  const inNegotiationCount = leads.filter(l => l.status === 'contacted' || l.status === 'qualified').length;
  const totalDeals = cards.length;

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    lead.phone.includes(searchTerm)
  );

  // ─── Lead Actions ────────────────────────────────────────────────────────
  const handleAddLead = () => {
    showModal({
      title: 'Cadastrar Novo Lead',
      children: <LeadForm onSuccess={hideModal} />,
    });
  };

  const handleEditLead = (lead: Lead) => {
    showModal({
      title: 'Editar Lead',
      children: <LeadForm initialData={lead} onSuccess={hideModal} />,
    });
  };

  const handleDeleteLead = (id: string) => {
    showModal({
      title: 'Confirmar Exclusão',
      children: 'Você tem certeza que deseja remover este lead permanentemente?',
      confirmText: 'Sim, Excluir',
      type: 'danger',
      onConfirm: async () => {
        await deleteLead(id);
        showNotification('success', 'Lead Removido');
      }
    });
  };

  const handleStatusChange = async (lead: Lead, status: Lead['status']) => {
    await updateLead(lead.id, { status });
    showNotification('success', 'Status Atualizado');
  };

  // ─── Kanban Actions ──────────────────────────────────────────────────────
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

  const isGlobalLoading = leadsLoading || kanbanLoading;

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Prospecção de Leads</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Aquisição e Funil de Vendas</p>
        </div>
        {hasPermission(profile, 'Leads - Criar Lead') && (
          <button 
            onClick={activeTab === 'list' ? handleAddLead : () => handleAddCard(columns[0]?.id)}
            className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            {activeTab === 'list' ? (
              <>
                <UserPlus size={18} /> Novo Lead
              </>
            ) : (
              <>
                <Plus size={18} /> Novo Negócio
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total de Leads', value: totalLeads.toString(), icon: Inbox, color: 'text-primary' },
          { label: 'Novos Leads', value: newLeadsCount.toString(), icon: UserPlus, color: 'text-success' },
          { label: 'Em Negociação', value: inNegotiationCount.toString(), icon: TrendingUp, color: 'text-warning' },
          { label: 'Negócios no Funil', value: totalDeals.toString(), icon: MessageSquare, color: 'text-primary' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color} mb-4 border border-white/10`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
            <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Tabs Switcher */}
      <div className="flex p-1 bg-white/[0.02] rounded-[24px] mb-8 gap-1 border border-white/5 max-w-sm">
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-on-surface-variant hover:text-white'}`}
        >
          Lista de Leads
        </button>
        <button 
          onClick={() => setActiveTab('kanban')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'kanban' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-on-surface-variant hover:text-white'}`}
        >
          Funil (Kanban)
        </button>
      </div>

      {/* Render Dynamic Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Search Input Container */}
            <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 overflow-hidden">
              <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1 group">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome, e-mail ou telefone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-12 pr-6 py-4 text-sm focus:border-white outline-none transition-all font-display"
                  />
                </div>
              </div>

              {/* Leads Content Area */}
              <div className="p-6">
                {isGlobalLoading ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Leads...</span>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
                    <UserPlus size={48} className="text-on-surface-variant mb-2 opacity-20" />
                    <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhum lead encontrado</p>
                    <p className="text-[10px] font-display text-on-surface-variant opacity-70">A lista de leads está vazia ou a busca não retornou resultados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredLeads.map((lead) => (
                      <div 
                        key={lead.id} 
                        className="glass-card p-8 border border-outline-variant/30 rounded-[32px] hover:border-white/30 transition-all group flex flex-col shadow-2xl relative overflow-hidden bg-white/[0.01] hover:bg-white/[0.02]"
                      >
                        {/* Action buttons top-right */}
                        <div className="absolute top-0 right-0 p-6 flex gap-2">
                          <button 
                            onClick={() => handleEditLead(lead)}
                            className="p-2 text-on-surface-variant hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          {hasPermission(profile, 'Leads - Excluir Lead') && (
                            <button 
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-2 text-on-surface-variant hover:text-error transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {/* Avatar / Initials */}
                        <div className="flex flex-col items-center text-center mb-8">
                          <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-xl mb-4 shadow-inner group-hover:scale-105 group-hover:bg-white group-hover:text-black transition-all uppercase">
                            {lead.name.charAt(0)}
                          </div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">{lead.name}</h3>
                          <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mt-1 opacity-60">
                            Cadastrado em: {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : 'Sem data'}
                          </p>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-3 mb-8 pt-6 border-t border-white/5">
                          {lead.email && (
                            <div className="flex items-center gap-3 text-xs text-on-surface-variant justify-center font-display">
                              <Mail size={14} className="text-white/20" />
                              <span className="font-bold opacity-80">{lead.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-on-surface-variant justify-center font-display">
                            <Phone size={14} className="text-white/20" />
                            <span className="font-bold opacity-80">{lead.phone}</span>
                          </div>
                          {lead.message && (
                            <p className="text-[10px] text-on-surface-variant text-center opacity-60 line-clamp-2 px-4 italic mt-3 font-display">
                              "{lead.message}"
                            </p>
                          )}
                        </div>

                        {/* Selector status */}
                        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                          <select 
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead, e.target.value as any)}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-transparent focus:outline-none transition-all appearance-none cursor-pointer text-center",
                              lead.status === 'new' ? 'border-primary/50 text-primary' :
                              lead.status === 'contacted' ? 'border-warning/50 text-warning' :
                              lead.status === 'qualified' ? 'border-success/50 text-success' :
                              'border-white/5 text-on-surface-variant/40'
                            )}
                          >
                            <option value="new" className="bg-surface-container-high">Novo</option>
                            <option value="contacted" className="bg-surface-container-high">Contato</option>
                            <option value="qualified" className="bg-surface-container-high">Qualificado</option>
                            <option value="converted" className="bg-surface-container-high">Convertido</option>
                            <option value="lost" className="bg-surface-container-high">Perdido</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="kanban"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {isGlobalLoading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40 bg-white/[0.02] border border-outline-variant/30 rounded-[40px]">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Funil...</span>
              </div>
            ) : columns.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 gap-4 opacity-50 bg-white/[0.02] border border-outline-variant/30 rounded-[40px]">
                <AlertCircle size={48} className="text-on-surface-variant mb-2 opacity-20" />
                <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhuma etapa encontrada</p>
                <p className="text-[10px] font-display text-on-surface-variant opacity-70">O funil de vendas não possui colunas/etapas cadastradas.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar scroll-smooth">
                <div className="flex gap-4 sm:gap-6 h-full p-1 snap-x scrollbar-none md:scrollbar-default">
                  {columns.map((column) => (
                    <div key={column.id} className="w-[85vw] sm:w-[320px] flex flex-col gap-6 shrink-0 snap-align-start">
                      {/* Column Header */}
                      <div className="flex items-center justify-between p-5 border-b-4 bg-white/[0.02] rounded-3xl group shadow-inner transition-all border-white">
                        <div className="flex items-center gap-4">
                          <h3 className="font-black text-xs text-on-surface uppercase tracking-[0.2em]">{column.title}</h3>
                          <span className="bg-white/10 text-white text-[9px] px-3 py-1 rounded-full font-black border border-white/10">
                            {cards.filter(c => c.column_id === column.id).length}
                          </span>
                        </div>
                      </div>

                      {/* Column Body / Drop area */}
                      <div 
                        className="flex-1 flex flex-col gap-6 min-h-[300px] p-2 bg-white/[0.005] rounded-3xl border border-white/5 border-dashed"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          if (hasPermission(profile, 'Leads - Mover Kanban')) {
                            const cardId = e.dataTransfer.getData('cardId');
                            handleMoveCard(cardId, column.id);
                          } else {
                            showNotification('error', 'Sem Permissão', 'Você não tem permissão para mover cards no Kanban.');
                          }
                        }}
                      >
                        {cards.filter(c => c.column_id === column.id).map((card) => {
                          const canDrag = hasPermission(profile, 'Leads - Mover Kanban');
                          return (
                            <div 
                              key={card.id} 
                              draggable={canDrag}
                              onDragStart={(e) => {
                                if (canDrag) {
                                  e.dataTransfer.setData('cardId', card.id);
                                }
                              }}
                              className={cn(
                                "glass-card p-6 border border-outline-variant/30 rounded-[28px] hover:border-white/30 hover:shadow-2xl transition-all group relative overflow-hidden bg-white/[0.01] hover:bg-white/[0.02]",
                                canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                              )}
                            >
                              {/* Action buttons */}
                              <div className="absolute top-0 right-0 p-4 flex gap-2">
                                <button onClick={() => handleEditCard(card)} className="p-1 hover:text-white text-on-surface-variant transition-colors">
                                  <Edit2 size={14} />
                                </button>
                                {hasPermission(profile, 'Leads - Excluir Lead') && (
                                  <button onClick={() => handleDeleteCard(card.id)} className="p-1 hover:text-error text-on-surface-variant transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Card priority tag */}
                              <div className="flex items-start justify-between mb-4">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                  card.priority === 'Alta' ? 'border-red-500/20 bg-red-500/10 text-red-500' : 
                                  card.priority === 'Media' ? 'border-warning/20 bg-warning/10 text-warning' :
                                  'border-white/5 text-on-surface-variant/40 bg-white/5'
                                }`}>
                                  {card.priority}
                                </span>
                              </div>
                              
                              <h4 className="font-black text-on-surface text-sm mb-1 tracking-tight group-hover:text-white transition-colors">{card.title}</h4>
                              <p className="text-on-surface-variant text-[9px] uppercase font-bold tracking-widest mb-4 opacity-60">{card.customer_name || 'Sem Cliente'}</p>
                              
                              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-on-surface-variant/40 group-hover:text-white transition-colors">
                                  <MessageSquare size={12} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">0</span>
                                </div>
                                <span className="font-black text-white text-xs tracking-tight font-mono">R$ {card.value.toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Add business card button inside column */}
                        {hasPermission(profile, 'Leads - Criar Lead') && (
                          <button 
                            onClick={() => handleAddCard(column.id)}
                            className="w-full py-5 border-2 border-dashed border-outline-variant/30 rounded-[28px] text-on-surface-variant/40 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/[0.02] hover:border-white/30 hover:text-white transition-all flex items-center justify-center gap-3 group"
                          >
                            <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                            <span>Novo Card</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
