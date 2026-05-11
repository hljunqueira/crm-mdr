import React, { useState } from 'react';
import { Search, Filter, Plus, UserPlus, MoreVertical, Mail, Phone, Calendar, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLeadStore, Lead } from '../store/useLeadStore';
import { useUI } from '../context/UIContext';

export default function Leads() {
  const { leads, deleteLead, updateLead, addLead } = useLeadStore();
  const { showModal, showNotification } = useUI();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  const handleAddLead = () => {
    // Lead Form would go here
    showNotification('info', 'Funcionalidade em Breve', 'O formulário de leads está sendo desenvolvido.');
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Deseja realmente excluir este lead?')) {
      await deleteLead(id);
      showNotification('success', 'Lead Removido', 'Lead excluído com sucesso.');
    }
  };

  const handleStatusChange = async (lead: Lead, status: Lead['status']) => {
    await updateLead(lead.id, { status });
    showNotification('success', 'Status Atualizado', `Lead ${lead.name} marcado como ${status}.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Gestão de Leads</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Aquisição de Clientes</p>
        </div>
        <button 
          onClick={handleAddLead}
          className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus size={18} /> Novo Lead
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 border border-outline-variant/30 rounded-[32px] flex flex-wrap items-center justify-between gap-6 bg-white/[0.02]">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl pl-14 pr-6 py-4 text-sm focus:border-white focus:ring-4 focus:ring-white/5 transition-all outline-none"
            />
          </div>
          <button className="p-4 bg-surface-container border border-outline-variant/50 text-on-surface rounded-2xl hover:bg-white/5 transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredLeads.map((lead) => (
          <div 
            key={lead.id} 
            className="glass-card p-10 border border-outline-variant/30 rounded-[40px] hover:border-white/30 transition-all group flex flex-col shadow-2xl relative overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 p-6 flex gap-2">
              <button 
                onClick={() => handleDeleteLead(lead.id)}
                className="p-2 text-on-surface-variant hover:text-error transition-colors"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-inner group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
                {lead.name.charAt(0)}
              </div>
              <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">{lead.name}</h3>
              <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest mt-2">{new Date(lead.date).toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="space-y-4 mb-10 pt-10 border-t border-outline-variant/10">
              <div className="flex items-center gap-4 text-xs text-on-surface-variant justify-center">
                <Mail size={16} className="text-white/20" />
                <span className="font-bold">{lead.email}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-on-surface-variant justify-center">
                <Phone size={16} className="text-white/20" />
                <span className="font-bold">{lead.phone}</span>
              </div>
              {lead.message && (
                <p className="text-[10px] text-on-surface-variant text-center opacity-70 line-clamp-2 px-4 italic">
                  "{lead.message}"
                </p>
              )}
            </div>

            <div className="mt-auto pt-8 border-t border-outline-variant/10 flex items-center justify-between">
              <select 
                value={lead.status}
                onChange={(e) => handleStatusChange(lead, e.target.value as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-transparent focus:outline-none transition-all",
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
              <button className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all flex items-center gap-2">
                Abrir <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination Placeholder */}
      <div className="flex items-center justify-between text-sm py-4 border-t border-outline-variant/20 font-display">
        <span className="text-on-surface-variant">Mostrando {filteredLeads.length} de {leads.length} leads</span>
      </div>
    </div>
  );
}

