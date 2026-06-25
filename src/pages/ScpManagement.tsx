import React, { useState, useEffect } from 'react';
import { 
  Building, Package, DollarSign, Users, PlusCircle, Check, Loader2,
  TrendingUp, BarChart3, ArrowDownLeft, ShieldCheck, Link2, X, Trash2
} from 'lucide-react';
import { useScpStore } from '../store/useScpStore';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabase';

export default function ScpManagement() {
  const { 
    lots, fetchLots, createLot, addQuota, isLoading,
    withdrawals, fetchWithdrawals, approveWithdrawal, rejectWithdrawal,
    linkDevices, updateContractUrl, deleteLot, deleteQuota
  } = useScpStore();
  const { showNotification, showModal, hideModal } = useUI();

  const [activePanelTab, setActivePanelTab] = useState<'prime' | 'renda' | 'withdrawals'>('prime');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLot, setNewLot] = useState({ title: '', target_amount: 0, status: 'OPEN' as any });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [newQuota, setNewQuota] = useState({ profile_id: '', amount_invested: 0, ownership_percentage: 0, interest_sharing_percentage: 20 });
  const [investors, setInvestors] = useState<any[]>([]);

  // Cadastro de novo investidor
  const [isCreateInvestorOpen, setIsCreateInvestorOpen] = useState(false);
  const [investorFormData, setInvestorFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [isSavingInvestor, setIsSavingInvestor] = useState(false);

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

  // States para Prime
  const [primeDevices, setPrimeDevices] = useState<any[]>([]);
  const [isLinkPrimeOpen, setIsLinkPrimeOpen] = useState(false);
  const [selectedPrimeDeviceId, setSelectedPrimeDeviceId] = useState('');
  const [primeInvestorId, setPrimeInvestorId] = useState('');
  const [primeProfitShare, setPrimeProfitShare] = useState(60);
  const [primeAdminFee, setPrimeAdminFee] = useState(10);
  const [primeImeisInput, setPrimeImeisInput] = useState('');

  // States para Renda
  const [rendaPurchases, setRendaPurchases] = useState<any[]>([]);
  const [isSellReceivableOpen, setIsSellReceivableOpen] = useState(false);
  const [availableSales, setAvailableSales] = useState<any[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [rendaInvestorId, setRendaInvestorId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [totalReceivableVal, setTotalReceivableVal] = useState<number | ''>('');
  const [ownershipPercentage, setOwnershipPercentage] = useState(100);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('active', true);
    if (data) {
      setInvestors(data.filter(u => u.role === 'investor' || u.role === 'admin'));
    }
  };

  const fetchPrimeDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*, profiles:investor_id(full_name)')
        .not('investor_id', 'is', null);
      if (error) throw error;
      setPrimeDevices(data || []);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar aparelhos Prime.');
    }
  };

  const fetchRendaPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('receivable_purchases')
        .select('*, profiles(full_name), sales(customer:customers(name), total_value)');
      if (error) throw error;
      setRendaPurchases(data || []);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar recebíveis comprados.');
    }
  };

  const fetchAvailableSales = async () => {
    try {
      const res = await fetch('/api/scp/available-sales');
      const data = await res.json();
      setAvailableSales(data || []);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar contratos de venda.');
    }
  };

  // Load lots, investors and withdrawals
  useEffect(() => {
    fetchLots();
    fetchProfiles();
  }, [fetchLots]);

  useEffect(() => {
    if (activePanelTab === 'withdrawals') {
      fetchWithdrawals();
    } else if (activePanelTab === 'prime') {
      fetchPrimeDevices();
    } else if (activePanelTab === 'renda') {
      fetchRendaPurchases();
    }
  }, [activePanelTab, fetchWithdrawals]);

  // Carregar estatísticas administrativas para os KPIs do Admin
  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const { data: txs } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .in('type', ['AMORTIZATION', 'PROFIT']);
        
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
    if (activePanelTab === 'prime' || activePanelTab === 'renda') {
      fetchAdminStats();
    }
  }, [lots, activePanelTab, primeDevices, rendaPurchases]);

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

  const handleLinkPrimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const imeis = primeImeisInput.split('\n').map(i => i.trim()).filter(Boolean);
    if (!selectedPrimeDeviceId || !primeInvestorId || imeis.length === 0) {
      showNotification('error', 'Erro', 'Selecione o aparelho, o investidor e insira pelo menos 1 IMEI.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/scp/devices/link-prime-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: primeInvestorId,
          device_template_id: selectedPrimeDeviceId,
          imeis: imeis,
          prime_profit_share: primeProfitShare,
          prime_admin_fee: primeAdminFee
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao vincular aparelhos Prime.');
      showNotification('success', 'Sucesso', data.message || 'Investidor Prime vinculado com sucesso!');
      setIsLinkPrimeOpen(false);
      setSelectedPrimeDeviceId('');
      setPrimeInvestorId('');
      setPrimeImeisInput('');
      fetchPrimeDevices();
    } catch (err: any) {
      showNotification('error', 'Erro', err.message || 'Falha ao vincular investidor Prime.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkPrime = async (deviceId: string) => {
    showModal({
      title: 'Desvincular Investidor Prime',
      children: 'Deseja realmente desvincular o investidor deste aparelho? Ele não receberá repasses das próximas parcelas.',
      type: 'danger',
      confirmText: 'Desvincular',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/scp/devices/${deviceId}/link-investor`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ investor_id: null })
          });
          if (!res.ok) throw new Error();
          showNotification('success', 'Sucesso', 'Investidor desvinculado com sucesso.');
          fetchPrimeDevices();
          hideModal();
        } catch (err) {
          showNotification('error', 'Erro', 'Falha ao desvincular investidor.');
        }
      }
    });
  };

  const handleSellReceivableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId || !rendaInvestorId || !purchasePrice || !totalReceivableVal) {
      showNotification('error', 'Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/scp/receivables/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: rendaInvestorId,
          sale_id: selectedSaleId,
          purchase_price: purchasePrice,
          total_receivable: totalReceivableVal,
          ownership_percentage: ownershipPercentage / 100
        })
      });
      if (!res.ok) throw new Error();
      showNotification('success', 'Sucesso', 'Recebível vendido com sucesso!');
      setIsSellReceivableOpen(false);
      setSelectedSaleId('');
      setRendaInvestorId('');
      setPurchasePrice('');
      setTotalReceivableVal('');
      fetchRendaPurchases();
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao vender recebível.');
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

  const handleApproveWithdrawal = (id: string) => {
    showModal({
      title: 'Aprovar Solicitação de Resgate',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm">Deseja realmente aprovar este resgate Pix?</p>
          <p className="text-[10px] text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 font-black uppercase tracking-widest leading-normal">
            Certifique-se de que a transferência Pix já foi efetuada manualmente na sua conta bancária antes de confirmar.
          </p>
        </div>
      ),
      type: 'primary',
      confirmText: 'Aprovar e Liquidar',
      onConfirm: async () => {
        try {
          await approveWithdrawal(id);
          showNotification('success', 'Sucesso', 'Resgate aprovado e saldo debitado com sucesso.');
          hideModal();
        } catch (err) {
          showNotification('error', 'Erro', 'Falha ao aprovar resgate.');
        }
      }
    });
  };

  const handleRejectWithdrawal = (id: string) => {
    showModal({
      title: 'Rejeitar Solicitação de Resgate',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm">Deseja realmente rejeitar este resgate Pix?</p>
          <p className="text-[10px] text-zinc-400 leading-normal uppercase tracking-wider">
            O valor solicitado retornará ao saldo disponível na carteira do parceiro investidor.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Rejeitar Resgate',
      onConfirm: async () => {
        try {
          await rejectWithdrawal(id);
          showNotification('success', 'Sucesso', 'Resgate rejeitado com sucesso.');
          hideModal();
        } catch (err) {
          showNotification('error', 'Erro', 'Falha ao rejeitar resgate.');
        }
      }
    });
  };

  const toggleDeviceSelection = (id: string) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCreateInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorFormData.full_name || !investorFormData.email || !investorFormData.password) {
      showNotification('error', 'Erro', 'Nome, e-mail e senha são obrigatórios.');
      return;
    }
    setIsSavingInvestor(true);
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: investorFormData.full_name,
          email: investorFormData.email,
          password: investorFormData.password,
          phone: investorFormData.phone || null,
          role: 'investor',
          store_id: null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao criar investidor');
      }
      showNotification('success', 'Sucesso', 'Parceiro Investidor cadastrado com sucesso!');
      setIsCreateInvestorOpen(false);
      setInvestorFormData({ full_name: '', email: '', password: '', phone: '' });
      fetchProfiles();
    } catch (err: any) {
      showNotification('error', 'Erro', err.message || 'Falha ao cadastrar investidor.');
    } finally {
      setIsSavingInvestor(false);
    }
  };

  const handleDeleteLot = (id: string, title: string) => {
    showModal({
      title: 'Confirmar Exclusão de Lote',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm">Deseja realmente excluir o lote <span className="text-white font-black">{title}</span>?</p>
          <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-wider">
            Esta ação desvinculará todos os aparelhos vinculados a este lote, devolvendo-os ao estoque geral.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Excluir Lote',
      onConfirm: async () => {
        try {
          await deleteLot(id);
          showNotification('success', 'Sucesso', 'Lote excluído com sucesso.');
          hideModal();
        } catch (err: any) {
          showNotification('error', 'Erro', err.response?.data?.error || err.message || 'Falha ao excluir lote.');
        }
      }
    });
  };

  const handleDeleteQuota = (id: string, investorName: string) => {
    showModal({
      title: 'Confirmar Remoção de Cotista',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm">Deseja realmente remover o cotista <span className="text-white font-black">{investorName}</span> deste lote?</p>
          <p className="text-[10px] text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-black uppercase tracking-widest leading-normal">
            Atenção: O valor investido será abatido do saldo de recebíveis futuros na carteira deste investidor.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Confirmar Remoção',
      onConfirm: async () => {
        try {
          await deleteQuota(id);
          showNotification('success', 'Sucesso', 'Cotista removido com sucesso.');
          hideModal();
        } catch (err: any) {
          showNotification('error', 'Erro', err.response?.data?.error || err.message || 'Falha ao remover cotista.');
        }
      }
    });
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
          <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-0.5 mr-2 flex-wrap gap-1">
            <button
              onClick={() => setActivePanelTab('prime')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePanelTab === 'prime' 
                  ? 'bg-emerald-500 text-black shadow-md' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Prime (Estoque)
            </button>
            <button
              onClick={() => setActivePanelTab('renda')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePanelTab === 'renda' 
                  ? 'bg-emerald-500 text-black shadow-md' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Renda (Recebíveis)
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
            onClick={() => setIsCreateInvestorOpen(true)}
            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-700"
          >
            <PlusCircle size={14} />
            Novo Investidor
          </button>

          {activePanelTab === 'prime' && (
            <button
              onClick={() => {
                fetchAvailableDevices();
                setIsLinkPrimeOpen(true);
              }}
              className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} />
              Vincular Prime
            </button>
          )}

          {activePanelTab === 'renda' && (
            <button
              onClick={() => {
                fetchAvailableSales();
                setIsSellReceivableOpen(true);
              }}
              className="px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} />
              Vender Recebível
            </button>
          )}
        </div>
      </div>

      {activePanelTab === 'prime' ? (
        /* Aba Prime (Estoque) */
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Celulares Vinculados (Prime)</h3>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="animate-spin text-emerald-400" size={24} />
              <span className="text-xs text-zinc-500">Buscando celulares...</span>
            </div>
          ) : primeDevices.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">Nenhum aparelho associado a investidores Prime no momento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-4 px-4">Aparelho</th>
                    <th className="py-4 px-4">IMEI</th>
                    <th className="py-4 px-4">Investidor Prime</th>
                    <th className="py-4 px-4 text-center">Part. Lucro</th>
                    <th className="py-4 px-4 text-center">Taxa Adm</th>
                    <th className="py-4 px-4">Preço Venda</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {primeDevices.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">{d.brand} {d.model}</td>
                      <td className="py-4 px-4 font-mono text-zinc-400 select-all">{d.imei || '-'}</td>
                      <td className="py-4 px-4 text-zinc-300 font-semibold">{d.profiles?.full_name || 'Investidor'}</td>
                      <td className="py-4 px-4 text-center font-bold text-indigo-400">{(Number(d.prime_profit_share || 0.60) * 100).toFixed(0)}%</td>
                      <td className="py-4 px-4 text-center text-zinc-400">{(Number(d.prime_admin_fee || 0.10) * 100).toFixed(0)}%</td>
                      <td className="py-4 px-4 font-bold text-emerald-400">R$ {Number(d.sale_price || d.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          d.status === 'sold' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {d.status === 'sold' ? 'Vendido' : 'Disponível'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleUnlinkPrime(d.id)}
                          className="p-1 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                          title="Desvincular Investidor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activePanelTab === 'renda' ? (
        /* Aba Renda (Recebíveis) */
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Recebíveis Vendidos (Renda)</h3>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="animate-spin text-emerald-400" size={24} />
              <span className="text-xs text-zinc-500">Buscando recebíveis...</span>
            </div>
          ) : rendaPurchases.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">Nenhum recebível vendido a investidores Renda até o momento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-4 px-4">Cliente / Contrato</th>
                    <th className="py-4 px-4">Investidor Renda</th>
                    <th className="py-4 px-4">Preço Pago (À Vista)</th>
                    <th className="py-4 px-4">Recebível Nominal</th>
                    <th className="py-4 px-4 text-center">Fração Comprada</th>
                    <th className="py-4 px-4">Data Aquisição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {rendaPurchases.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-white block">{r.sales?.customer?.name || 'Contrato'}</span>
                        <span className="text-[10px] text-zinc-500">ID Venda: #{r.sale_id.slice(0, 8)}</span>
                      </td>
                      <td className="py-4 px-4 text-zinc-300 font-semibold">{r.profiles?.full_name || 'Investidor'}</td>
                      <td className="py-4 px-4 font-bold text-indigo-400">R$ {Number(r.purchase_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 font-bold text-emerald-400">R$ {Number(r.total_receivable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 text-center font-black text-white">{(Number(r.ownership_percentage || 1) * 100).toFixed(0)}%</td>
                      <td className="py-4 px-4 text-zinc-500">{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

      {/* Modal: Cadastrar Novo Investidor */}
      {isCreateInvestorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateInvestorSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cadastrar Novo Investidor</h3>
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva"
                value={investorFormData.full_name}
                onChange={(e) => setInvestorFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">E-mail</label>
              <input
                type="email"
                required
                placeholder="Ex: joao@investidor.com"
                value={investorFormData.email}
                onChange={(e) => setInvestorFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Senha de Acesso</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={investorFormData.password}
                onChange={(e) => setInvestorFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Telefone / WhatsApp</label>
              <input
                type="text"
                placeholder="Ex: 48991234567"
                value={investorFormData.phone}
                onChange={(e) => setInvestorFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateInvestorOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingInvestor}
                className="flex-1 py-3.5 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {isSavingInvestor ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Cadastrar
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

      {/* Modal: Vincular Celular a Investidor Prime */}
      {isLinkPrimeOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleLinkPrimeSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setIsLinkPrimeOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vincular Celulares Prime (Em Lote)</h3>
            <p className="text-xs text-zinc-400">
              Associe múltiplos celulares a um Investidor Prime informando o aparelho de referência e a lista de IMEIs.
            </p>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Aparelho de Referência (Custo/Venda)</label>
              <select
                required
                value={selectedPrimeDeviceId}
                onChange={(e) => setSelectedPrimeDeviceId(e.target.value)}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              >
                <option value="" disabled className="bg-[#121214]">-- Escolha o Modelo Base --</option>
                {availableDevices.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#121214]">
                    {d.brand} {d.model} {d.imei ? `(IMEI: ${d.imei})` : '(Modelo Geral/Sem IMEI)'} - Custo: R$ {Number(d.cost_price).toLocaleString('pt-BR')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Investidor Prime</label>
              <select
                required
                value={primeInvestorId}
                onChange={(e) => setPrimeInvestorId(e.target.value)}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              >
                <option value="" disabled className="bg-[#121214]">-- Escolha o Investidor --</option>
                {investors.map((inv) => (
                  <option key={inv.id} value={inv.id} className="bg-[#121214]">{inv.full_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Part. Lucro (%)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={primeProfitShare}
                  onChange={(e) => setPrimeProfitShare(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Taxa Adm (%)</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={primeAdminFee}
                  onChange={(e) => setPrimeAdminFee(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">IMEIs dos Aparelhos (Um por linha)</label>
              <textarea
                required
                rows={4}
                placeholder="Cole os IMEIs aqui&#10;Ex:&#10;358901234567890&#10;358901234567891"
                value={primeImeisInput}
                onChange={(e) => setPrimeImeisInput(e.target.value)}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all font-mono custom-scrollbar resize-none"
              />
              <p className="text-[10px] text-zinc-500 font-medium">Quantidade identificada: {primeImeisInput.split('\n').map(i => i.trim()).filter(Boolean).length} aparelho(s)</p>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsLinkPrimeOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar Vínculo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Vender Recebíveis de Contrato (Renda) */}
      {isSellReceivableOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSellReceivableSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setIsSellReceivableOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vender Recebíveis</h3>
            <p className="text-xs text-zinc-400">
              Venda os recebíveis de um contrato de venda ativo para um Investidor Renda.
            </p>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Selecione o Contrato</label>
              <select
                required
                value={selectedSaleId}
                onChange={(e) => {
                  const saleId = e.target.value;
                  setSelectedSaleId(saleId);
                  const selectedSale = availableSales.find(s => s.id === saleId);
                  if (selectedSale) {
                    setTotalReceivableVal(Number(selectedSale.total_value));
                  }
                }}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
              >
                <option value="" disabled className="bg-[#121214]">-- Escolha o Contrato --</option>
                {availableSales.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#121214]">
                    {s.customer_name} - {s.device ? `${s.device.brand} ${s.device.model}` : 'Celular'} (Valor: R$ {Number(s.total_value).toLocaleString('pt-BR')})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Selecione o Investidor Renda</label>
              <select
                required
                value={rendaInvestorId}
                onChange={(e) => setRendaInvestorId(e.target.value)}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
              >
                <option value="" disabled className="bg-[#121214]">-- Escolha o Investidor --</option>
                {investors.map((inv) => (
                  <option key={inv.id} value={inv.id} className="bg-[#121214]">{inv.full_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Preço Compra (À Vista)</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Preço pago"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Valor Nominal Receber</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Valor total"
                  value={totalReceivableVal}
                  onChange={(e) => setTotalReceivableVal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Porcentagem Adquirida (%)</label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={ownershipPercentage}
                onChange={(e) => setOwnershipPercentage(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsSellReceivableOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar Venda'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
