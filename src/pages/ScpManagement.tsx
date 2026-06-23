import React, { useState, useEffect } from 'react';
import { 
  Building, Package, DollarSign, Users, PlusCircle, Check, Loader2,
  TrendingUp, BarChart3, ArrowDownLeft, ShieldCheck, Link2
} from 'lucide-react';
import { useScpStore } from '../store/useScpStore';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabase';

export default function ScpManagement() {
  const { lots, fetchLots, createLot, addQuota, isLoading } = useScpStore();
  const { showNotification } = useUI();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLot, setNewLot] = useState({ title: '', target_amount: 0, status: 'OPEN' as any });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [newQuota, setNewQuota] = useState({ profile_id: '', amount_invested: 0, ownership_percentage: 0 });
  const [investors, setInvestors] = useState<any[]>([]);

  // Load lots and investors
  useEffect(() => {
    fetchLots();
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('active', true);
      if (data) {
        setInvestors(data.filter(u => u.role === 'investor' || u.role === 'admin'));
      }
    };
    fetchProfiles();
  }, [fetchLots]);

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLot.title || newLot.target_amount <= 0) {
      showNotification('error', 'Erro', 'Preencha todos os campos do lote.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createLot(newLot);
      showNotification('success', 'Sucesso', 'Lote de investimento criado com sucesso!');
      setIsCreateOpen(false);
      setNewLot({ title: '', target_amount: 0, status: 'OPEN' });
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao criar o lote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotId || !newQuota.profile_id || newQuota.amount_invested <= 0 || newQuota.ownership_percentage <= 0) {
      showNotification('error', 'Erro', 'Preencha todos os campos da cota.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addQuota({
        lot_id: selectedLotId,
        profile_id: newQuota.profile_id,
        amount_invested: newQuota.amount_invested,
        ownership_percentage: newQuota.ownership_percentage / 100 // Convert percent to decimal (ex: 15 to 0.15)
      });
      showNotification('success', 'Sucesso', 'Cota de investidor associada com sucesso!');
      setIsQuotaOpen(false);
      setNewQuota({ profile_id: '', amount_invested: 0, ownership_percentage: 0 });
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao associar a cota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121214] p-6 rounded-3xl border border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Gestão de Investimentos SCP</h2>
          <p className="text-xs text-zinc-400 mt-1">Monitore e distribua dividendos baseados no custo e venda de smartphones</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-3 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={14} />
            Novo Lote
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Lotes Ativos</span>
            <span className="text-xl font-extrabold text-white">{lots.length}</span>
          </div>
        </div>

        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Captação Total</span>
            <span className="text-xl font-extrabold text-white">
              R$ {lots.reduce((sum, l) => sum + Number(l.target_amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Parceiros Investidores</span>
            <span className="text-xl font-extrabold text-white">{investors.length}</span>
          </div>
        </div>
      </div>

      {/* Lots list */}
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Lotes Cadastrados</h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="animate-spin text-primary" size={24} />
            <span className="text-xs text-zinc-500">Carregando lotes...</span>
          </div>
        ) : lots.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">Nenhum lote de captação cadastrado ainda.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {lots.map((lot) => (
              <div key={lot.id} className="bg-[#18181b] border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-white text-sm">{lot.title}</h4>
                      <span className="text-[10px] text-zinc-500">Criado em {new Date(lot.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">
                      {lot.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-6">
                    <div className="bg-[#121214] p-3 rounded-2xl border border-zinc-800/80">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Meta do Lote</span>
                      <span className="text-xs font-bold text-white">
                        R$ {Number(lot.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-[#121214] p-3 rounded-2xl border border-zinc-800/80">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Aparelhos</span>
                      <span className="text-xs font-bold text-white">{(lot.devices || []).length} un</span>
                    </div>
                  </div>

                  {/* Quotas list */}
                  <div className="space-y-3 mb-6">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Participantes</span>
                    {(lot.investor_quotas || []).length === 0 ? (
                      <span className="text-[10px] text-zinc-600 italic pl-1">Nenhuma cota alocada ainda.</span>
                    ) : (
                      <div className="space-y-1 bg-[#121214]/50 border border-zinc-800/60 rounded-2xl p-3">
                        {(lot.investor_quotas || []).map((q: any) => (
                          <div key={q.id} className="flex justify-between text-xs py-1 border-b border-zinc-800/40 last:border-0">
                            <span className="text-zinc-300">{q.profiles?.full_name || 'Investidor'}</span>
                            <span className="font-semibold text-zinc-200">
                              {Number(q.ownership_percentage * 100).toFixed(1)}% (R$ {Number(q.amount_invested).toLocaleString('pt-BR')})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-zinc-800/60 pt-4 mt-2">
                  <button
                    onClick={() => {
                      setSelectedLotId(lot.id);
                      setIsQuotaOpen(true);
                    }}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle size={12} />
                    Adicionar Cotista
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Novo Lote */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateLot} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Novo Lote de Investimento</h3>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Título do Lote</label>
              <input
                type="text"
                required
                placeholder="Ex: Lote Premium iPhone 10x"
                value={newLot.title}
                onChange={(e) => setNewLot(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Meta de Captação (R$)</label>
              <input
                type="number"
                required
                min={1}
                placeholder="Valor total do lote"
                value={newLot.target_amount || ''}
                onChange={(e) => setNewLot(prev => ({ ...prev, target_amount: parseFloat(e.target.value) }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Criar Lote
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Adicionar Cota */}
      {isQuotaOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddQuota} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Adicionar Cotista no Lote</h3>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Selecione o Investidor</label>
              <select
                required
                value={newQuota.profile_id}
                onChange={(e) => setNewQuota(prev => ({ ...prev, profile_id: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              >
                <option value="" disabled className="bg-[#121214]">-- Escolha o Investidor --</option>
                {investors.map((inv) => (
                  <option key={inv.id} value={inv.id} className="bg-[#121214]">{inv.full_name} ({inv.role})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Aporte Financeiro (R$)</label>
              <input
                type="number"
                required
                min={1}
                placeholder="Valor investido pelo parceiro"
                value={newQuota.amount_invested || ''}
                onChange={(e) => setNewQuota(prev => ({ ...prev, amount_invested: parseFloat(e.target.value) }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Cota Porcentual (%)</label>
              <input
                type="number"
                required
                min={0.1}
                max={100}
                step={0.1}
                placeholder="Ex: 15.5 para 15.5%"
                value={newQuota.ownership_percentage || ''}
                onChange={(e) => setNewQuota(prev => ({ ...prev, ownership_percentage: parseFloat(e.target.value) }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsQuotaOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
