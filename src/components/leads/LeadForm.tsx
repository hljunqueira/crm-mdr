import React, { useState } from 'react';
import { useLeadStore, Lead } from '../../store/useLeadStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUI } from '../../context/UIContext';

interface LeadFormProps {
  initialData?: Lead;
  onSuccess?: () => void;
}

export default function LeadForm({ initialData, onSuccess }: LeadFormProps) {
  const { addLead, updateLead } = useLeadStore();
  const { profile } = useAuthStore();
  const { showNotification } = useUI();
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    message: initialData?.message || '',
    status: initialData?.status || 'new',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (initialData) {
        await updateLead(initialData.id, formData);
        showNotification('success', 'Lead atualizado com sucesso');
      } else {
        await addLead({
          ...formData,
          unit_id: profile?.unit_id || undefined,
        });
        showNotification('success', 'Lead cadastrado com sucesso');
      }
      onSuccess?.();
    } catch (error) {
      showNotification('error', 'Erro ao salvar lead');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome Completo</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            placeholder="Ex: Carlos Mendes"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Telefone / WhatsApp</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">E-mail (Opcional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              placeholder="carlos@email.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Status do Lead</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none appearance-none"
          >
            <option value="new">Novo Lead</option>
            <option value="contacted">Em Contato</option>
            <option value="qualified">Qualificado</option>
            <option value="converted">Convertido (Venda)</option>
            <option value="lost">Perdido</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Mensagem / Interesse</label>
          <textarea
            required
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
            placeholder="Ex: Interesse em iPhone 15 Pro Max..."
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-5 bg-primary text-on-primary rounded-3xl font-display font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
      >
        {initialData ? 'Atualizar Lead' : 'Cadastrar Lead'}
      </button>
    </form>
  );
}
