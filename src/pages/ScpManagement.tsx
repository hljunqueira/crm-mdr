import React, { useState, useEffect } from 'react';
import { 
  Building, Package, DollarSign, Users, PlusCircle, Check, Loader2,
  TrendingUp, BarChart3, ArrowDownLeft, ShieldCheck, Link2, X
} from 'lucide-react';
import { useScpStore } from '../store/useScpStore';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabase';

export default function ScpManagement() {
  const { 
    lots, fetchLots, createLot, addQuota, isLoading,
    withdrawals, fetchWithdrawals, approveWithdrawal, rejectWithdrawal,
    linkDevices, updateContractUrl 
  } = useScpStore();
  const { showNotification } = useUI();

  const [activePanelTab, setActivePanelTab] = useState<'lots' | 'withdrawals'>('lots');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLot, setNewLot] = useState({ title: '', target_amount: 0, status: 'OPEN' as any });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [newQuota, setNewQuota] = useState({ profile_id: '', amount_invested: 0, ownership_percentage: 0, interest_sharing_percentage: 20 });
  const [investors, setInvestors] = useState<any[]>([]);

  // Estado para estatísticas administrativas consolidada
  const [adminStats, setAdminStats] = useState({
    totalRepasses: 0,
    totalWithdrawals: 0,
    totalInadimplencia: 0
  });

  // Estados para vinculação de aparelhos
  const [isLinkDevicesOpen, setIsLinkDevicesOpen] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);

  // Estados para edição de contrato
  const [isContractUrlOpen, setIsContractUrlOpen] = useState(false);
  const [selectedQuotaId, setSelectedQuotaId] = useState('');
  const [contractUrl, setContractUrl] = useState('');

  // Load lots, investors and withdrawals
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

  useEffect(() => {
    if (activePanelTab === 'withdrawals') {
      fetchWithdrawals();
    }
  }, [activePanelTab, fetchWithdrawals]);

  // Carregar estatísticas administrativas para os KPIs do Admin
  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const { data: txs } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('type', 'CREDIT');
        
         const { data: wds } = await supabase
           .from('withdrawal_requests')
           .select('amount')
           .eq('status', 'APPROVED');

         const { data: insts } = await supabase
           .from('installments')
           .select('value')
           .in('status', ['overdue', 'blocked']);

         const totalRep = txs ? txs.reduce((acc, t) => acc + Number(t.amount), 0) : 0;
         const totalWithdraw = wds ? wds.reduce((acc, w) => acc + Number(w.amount), 0) : 0;
         const totalInad = insts ? insts.reduce((acc, i) => acc + Number(i.value), 0) : 0;

         setAdminStats({
           totalRepasses: totalRep,
           totalWithdrawals: totalWithdraw,
           totalInadimplencia: totalInad
         });
      } catch (err) {
        console.error('Error fetching admin SCP stats:', err);
      }
    };
    if (activePanelTab === 'lots') {
      fetchAdminStats();
    }
  }, [lots, activePanelTab]);

  const fetchAvailableDevices = async () => {
    try {
      const res = await fetch('/api/scp/available-devices');
      const data = await res.json();
      setAvailableDevices(data);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar aparelhos disponíveis.');
    }
  };

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
        ownership_percentage: newQuota.ownership_percentage / 100, // Convert percent to decimal (ex: 15 to 0.15)
        interest_sharing_percentage: newQuota.interest_sharing_percentage / 100 // Convert percent to decimal (ex: 20 to 0.20)
      });
      showNotification('success', 'Sucesso', 'Cota de investidor associada com sucesso!');
      setIsQuotaOpen(false);
      setNewQuota({ profile_id: '', amount_invested: 0, ownership_percentage: 0, interest_sharing_percentage: 20 });
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao associar a cota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkDevicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDeviceIds.length === 0) {
      showNotification('error', 'Erro', 'Selecione pelo menos um aparelho.');
      return;
    }

    setIsSubmitting(true);
    try {
      await linkDevices(selectedLotId, selectedDeviceIds);
      showNotification('success', 'Sucesso', 'Aparelhos vinculados com sucesso ao lote.');
      setIsLinkDevicesOpen(false);
      setSelectedDeviceIds([]);
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao vincular aparelhos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateContractUrl(selectedQuotaId, contractUrl);
      showNotification('success', 'Sucesso', 'Link do contrato atualizado com sucesso.');
      setIsContractUrlOpen(false);
      setContractUrl('');
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao atualizar o contrato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    if (!confirm('Deseja realmente aprovar este resgate Pix? Certifique-se de que a transferência já foi efetuada no banco.')) return;
    try {
      await approveWithdrawal(id);
      showNotification('success', 'Sucesso', 'Resgate aprovado e saldo debitado com sucesso.');
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao aprovar resgate.');
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    if (!confirm('Deseja realmente rejeitar este resgate Pix?')) return;
    try {
      await rejectWithdrawal(id);
      showNotification('success', 'Sucesso', 'Resgate rejeitado com sucesso.');
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao rejeitar resgate.');
    }
  };

  const toggleDeviceSelection = (id: string) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121214] p-6 rounded-3xl border border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Gestão de Investimentos SCP</h2>
          <p className="text-xs text-zinc-400 mt-1">Monitore e distribua dividendos baseados no custo e venda de smartphones</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Alternador de abas */}
          <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-0.5 mr-2">
            <button
              onClick={() => setActivePanelTab('lots')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePanelTab === 'lots' 
                  ? 'bg-emerald-500 text-black shadow-md' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Lotes SCP
            </button>
            <button
              onClick={() => setActivePanelTab('withdrawals')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                activePanelTab === 'withdrawals' 
                  ? 'bg-emerald-500 text-black shadow-md' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Resgates Pix
              {withdrawals.filter(w => w.status === 'PENDING').length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                  {withdrawals.filter(w => w.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-3 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={14} />
            Novo Lote
          </button>
        </div>
      </div>

      {activePanelTab === 'lots' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Capital Captado</span>
                <span className="text-xl font-extrabold text-white">
                  R$ {lots.reduce((sum, l) => sum + (l.investor_quotas || []).reduce((s, q) => s + Number(q.amount_invested), 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Repasses Efetuados</span>
                <span className="text-xl font-extrabold text-emerald-400">
                  R$ {adminStats.totalRepasses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Resgates Pagos</span>
                <span className="text-xl font-extrabold text-white">
                  R$ {adminStats.totalWithdrawals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Inadimplência</span>
                <span className="text-xl font-extrabold text-rose-400">
                  R$ {adminStats.totalInadimplencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
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
                              <div key={q.id} className="flex justify-between items-center text-xs py-1 border-b border-zinc-800/40 last:border-0">
                                <div>
                                  <span className="text-zinc-300 block">{q.profiles?.full_name || 'Investidor'}</span>
                                  {q.contract_url && (
                                    <a 
                                      href={q.contract_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-[9px] text-emerald-400 hover:underline block"
                                    >
                                      Ver Contrato PDF
                                    </a>
                                  )}
                                </div>
                                  <div className="flex items-center gap-2 text-right justify-end">
                                  <div className="text-right">
                                    <span className="font-semibold text-zinc-200 block">
                                      Cota: {Number(q.ownership_percentage * 100).toFixed(1)}% (R$ {Number(q.amount_invested).toLocaleString('pt-BR')})
                                    </span>
                                    <span className="text-[9px] text-zinc-500 block">
                                      Juros: {Number(q.interest_sharing_percentage ? q.interest_sharing_percentage * 100 : 20).toFixed(0)}%
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedQuotaId(q.id);
                                      setContractUrl(q.contract_url || '');
                                      setIsContractUrlOpen(true);
                                    }}
                                    className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded transition-all cursor-pointer border-0 bg-transparent"
                                    title="Editar Contrato"
                                  >
                                    <Link2 size={12} />
                                  </button>
                                </div>
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
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
                      >
                        <PlusCircle size={12} />
                        Adicionar Cotista
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLotId(lot.id);
                          fetchAvailableDevices();
                          setIsLinkDevicesOpen(true);
                        }}
                        className="flex-1 py-3 bg-[#121214] border border-zinc-800 hover:bg-zinc-800 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Package size={12} />
                        Vincular Celulares
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Aba de Resgates Pix */
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Solicitações de Resgate Pix</h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="animate-spin text-emerald-400" size={24} />
              <span className="text-xs text-zinc-500">Buscando solicitações...</span>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">Nenhuma solicitação de saque Pix registrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-4 px-4">Investidor</th>
                    <th className="py-4 px-4">Valor</th>
                    <th className="py-4 px-4">Tipo Chave</th>
                    <th className="py-4 px-4">Chave Pix</th>
                    <th className="py-4 px-4">Data Solicitação</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">{w.profiles?.full_name || 'Investidor'}</td>
                      <td className="py-4 px-4 font-extrabold text-emerald-400">R$ {Number(w.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 text-zinc-300">{w.pix_key_type}</td>
                      <td className="py-4 px-4 text-zinc-400 font-mono select-all">{w.pix_key}</td>
                      <td className="py-4 px-4 text-zinc-500">{new Date(w.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          w.status === 'PENDING' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : w.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {w.status === 'PENDING' ? 'Pendente' : w.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {w.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveWithdrawal(w.id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer border-0"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleRejectWithdrawal(w.id)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer"
                            >
                              Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-600">
                            Processado em {w.processed_at ? new Date(w.processed_at).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
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
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Participação nos Juros (%)</label>
              <input
                type="number"
                required
                min={1}
                max={100}
                step={1}
                placeholder="Ex: 20 para 20%"
                value={newQuota.interest_sharing_percentage || ''}
                onChange={(e) => setNewQuota(prev => ({ ...prev, interest_sharing_percentage: parseFloat(e.target.value) }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsQuotaOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Vincular Aparelhos do Estoque */}
      {isLinkDevicesOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleLinkDevicesSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button 
              type="button"
              onClick={() => setIsLinkDevicesOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vincular Celulares ao Lote</h3>
            <p className="text-xs text-zinc-400">
              Selecione os smartphones disponíveis em estoque (sem lote associado) que farão parte deste lote SCP:
            </p>

            <div className="flex-1 overflow-y-auto min-h-[250px] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/40 p-2">
              {availableDevices.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">Nenhum aparelho livre localizado no estoque.</div>
              ) : (
                availableDevices.map((d) => (
                  <label key={d.id} className="flex items-center gap-3 p-3 hover:bg-zinc-800/20 rounded-xl transition-colors cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedDeviceIds.includes(d.id)}
                      onChange={() => toggleDeviceSelection(d.id)}
                      className="accent-emerald-500"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-white block">{d.brand} {d.model}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">IMEI: {d.imei || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-400 block">Custo: R$ {Number(d.cost_price).toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-emerald-400 font-bold block">Venda: R$ {Number(d.sale_price).toLocaleString('pt-BR')}</span>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsLinkDevicesOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedDeviceIds.length === 0}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar Vinculação'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Editar Link do Contrato */}
      {isContractUrlOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateContractSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setIsContractUrlOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider pr-6">Vincular Contrato SCP</h3>
            <p className="text-xs text-zinc-400">
              Cole o link direto do arquivo PDF do contrato de participação (hospedado no Supabase Storage, Google Drive ou Dropbox) para que o investidor consiga baixá-lo no seu painel:
            </p>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">URL do Contrato PDF</label>
              <input
                type="url"
                required
                placeholder="https://example.com/contrato.pdf"
                value={contractUrl}
                onChange={(e) => setContractUrl(e.target.value)}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsContractUrlOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Salvar Contrato'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
