import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ArrowUpRight,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  FileText,
  CreditCard,
  Building2,
  Store,
  Loader2,
  Download,
  X,
  Wallet,
  TrendingUp,
  ArrowDownLeft
} from 'lucide-react';
import { useUnitStore } from '../../store/useUnitStore';
import { useAuthStore } from '../../store/useAuthStore';
import AsaasCashierReport from '../../components/finance/AsaasCashierReport';

interface FinanceiraCashierProps {
  cashierSummary: any;
  cashierTransfers: any[];
  relevantInstallments: any[];
  isLoadingCashier: boolean;
  fetchCashierData: () => void;
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  selectedUnitId: string;
  initialSubTab?: 'saldo' | 'asaas' | 'repasses' | 'despesas';
}

interface FinanceiraTx {
  id: string;
  unit_id?: string | null;
  type: string;
  amount: number;
  description: string;
  payment_method: string;
  cashier_type: string;
  created_at: string;
}

export default function FinanceiraCashier({
  cashierSummary,
  cashierTransfers,
  relevantInstallments,
  isLoadingCashier,
  fetchCashierData,
  showNotification,
  selectedUnitId,
  initialSubTab = 'saldo'
}: FinanceiraCashierProps) {
  const { units } = useUnitStore();
  const { profile } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<'saldo' | 'asaas' | 'repasses' | 'despesas'>(initialSubTab);

  // Repasse Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [transferNotesInput, setTransferNotesInput] = useState('');
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<Set<string>>(new Set());
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [targetStoreId, setTargetStoreId] = useState<string>('');

  // Despesas / Lançamentos State
  const [financeiraTxs, setFinanceiraTxs] = useState<FinanceiraTx[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState(false);
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isSavingTx, setIsSavingTx] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceiraTx | null>(null);
  const [txFormData, setTxFormData] = useState({
    type: 'out' as 'in' | 'out',
    amount: '',
    description: '',
    paymentMethod: 'pix'
  });

  const fetchFinanceiraTransactions = async () => {
    try {
      setIsLoadingTxs(true);
      const url = selectedUnitId && selectedUnitId !== 'all' 
        ? `/api/cashier/transactions?cashierType=FINANCEIRA&storeId=${selectedUnitId}`
        : `/api/cashier/transactions?cashierType=FINANCEIRA`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setFinanceiraTxs(data.transactions || []);
      }
    } catch (err) {
      console.warn('Erro ao carregar lançamentos da financeira:', err);
    } finally {
      setIsLoadingTxs(false);
    }
  };

  useEffect(() => {
    fetchFinanceiraTransactions();
  }, [selectedUnitId]);

  useEffect(() => {
    if (selectedUnitId && selectedUnitId !== 'all') {
      setTargetStoreId(selectedUnitId);
    } else if (units.length > 0 && !targetStoreId) {
      setTargetStoreId(units[0].id);
    }
  }, [selectedUnitId, units]);

  // Contratos de financiamento de celular liquidados (Asaas)
  const totalPaid = (relevantInstallments || [])
    .filter(i => {
      const isPaid = i.status === 'paid' || (i as any).status === 'pago';
      const effectiveOrigin = i.origin_type || i.sales?.origin_type || 'FINANCIAMENTO_CELULAR';
      const isFinanc = effectiveOrigin === 'FINANCIAMENTO_CELULAR';
      const devModel = (i.sales?.device_model || (i.sales as any)?.device_model_manual || '').toLowerCase();
      const isExcluded = ['diverso', 'diversos', 'cabo', 'capa', 'pelicula', 'película', 'assistencia', 'assistência', 'carregador', 'fone', 'fonte', 'reparo', 'suporte', 'chip', 'tela', 'placa', 'acessorio', 'acessório', 'servico', 'serviço'].some(w => devModel.includes(w));
      return isPaid && isFinanc && !isExcluded;
    })
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  const totalTransferred = (cashierTransfers || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalExpenses = (financeiraTxs || [])
    .filter(tx => {
      const isOutflow = tx.type === 'out' || tx.type === 'outflow' || tx.type === 'sangria' || tx.type === 'despesa' || tx.type === 'saida';
      return isOutflow;
    })
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalInflows = (financeiraTxs || [])
    .filter(tx => {
      const isInflow = tx.type === 'in' || tx.type === 'inflow' || tx.type === 'suprimento' || tx.type === 'entrada';
      return isInflow;
    })
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const modalItems = cashierSummary?.pendingRepasseItems || [];
  const totalArrecadadoCalculado = modalItems.reduce((acc: number, item: any) => acc + Number(item.value || 0), 0);
  const displayArrecadado = cashierSummary?.financeira?.totalArrecadado || totalPaid || totalArrecadadoCalculado;

  // Saldo real em caixa da financeira = Total Arrecadado + Entradas Manuais - Repasses às Lojas - Despesas
  const saldoCalculado = Math.max(0, displayArrecadado + totalInflows - totalTransferred - totalExpenses);
  const availableAmt = cashierSummary?.financeira?.saldoDisponivelReal || saldoCalculado;

  const displayLiberadoD0 = cashierSummary?.financeira?.disponivelD0 || availableAmt;
  const displayLiquidandoD2 = cashierSummary?.financeira?.liquidandoD2 || 0;

  const handleOpenModal = () => {
    setTransferAmountInput('0');
    setSelectedInstallmentIds(new Set());
    setIsTransferModalOpen(true);
  };

  const handleToggleSelectAll = () => {
    if (selectedInstallmentIds.size === modalItems.length) {
      setSelectedInstallmentIds(new Set());
      setTransferAmountInput('0');
    } else {
      const allIds = new Set<string>(modalItems.map((item: any) => String(item.id)));
      setSelectedInstallmentIds(allIds);
      const totalSum = modalItems.reduce((acc: number, curr: any) => acc + Number(curr.value || 0), 0);
      setTransferAmountInput(Number(totalSum.toFixed(2)).toString());
    }
  };

  const handleToggleItem = (id: string, value: number) => {
    const nextSet = new Set(selectedInstallmentIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setSelectedInstallmentIds(nextSet);

    const newSum = modalItems
      .filter((item: any) => nextSet.has(String(item.id)))
      .reduce((acc: number, curr: any) => acc + Number(curr.value || 0), 0);
    setTransferAmountInput(Number(newSum.toFixed(2)).toString());
  };

  const handleConfirmTransfer = async () => {
    try {
      setIsSubmittingTransfer(true);
      const amt = Number(transferAmountInput);
      if (isNaN(amt) || amt <= 0) {
        showNotification('error', 'Valor Inválido', 'Informe um valor maior que zero.');
        return;
      }

      const destStoreId = targetStoreId || (selectedUnitId !== 'all' ? selectedUnitId : null);
      if (!destStoreId) {
        showNotification('error', 'Loja de Destino Necessária', 'Selecione para qual caixa/loja o repasse será enviado.');
        return;
      }

      const selectedIdsArray = Array.from(selectedInstallmentIds);

      const res = await fetch('/api/cashier/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          description: transferNotesInput || `Repasse integral de contratos de financiamento celular para caixa da loja física (${selectedIdsArray.length} contratos)`,
          storeId: destStoreId,
          selectedContractIds: selectedIdsArray
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar repasse.');

      const storeObj = units.find((u: any) => u.id === destStoreId);
      const storeName = storeObj ? storeObj.name : 'Caixa Loja';

      showNotification('success', 'Repasse Concluído!', `R$ ${amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} repassados para o caixa da loja ${storeName}.`);
      setIsTransferModalOpen(false);
      setTransferNotesInput('');
      fetchCashierData();
    } catch (err: any) {
      showNotification('error', 'Falha no Repasse', err.message);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleRevertTransfer = async (transferId: string) => {
    if (window.confirm('Tem certeza que deseja estornar este repasse? As parcelas vinculadas retornarão ao Saldo Liberado da Financeira.')) {
      try {
        const res = await fetch('/api/cashier/revert-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferId })
        });
        if (res.ok) {
          showNotification('success', 'Estorno Realizado!', 'O repasse foi cancelado e o saldo retornou à financeira.');
          fetchCashierData();
        } else {
          showNotification('error', 'Falha no Estorno', 'Não foi possível estornar o repasse.');
        }
      } catch (err: any) {
        showNotification('error', 'Erro', err.message);
      }
    }
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingTx(true);
      const amt = parseFloat(txFormData.amount.replace(',', '.'));
      if (isNaN(amt) || amt <= 0) {
        showNotification('error', 'Valor Inválido', 'Insira um valor numérico válido maior que zero.');
        return;
      }
      if (!txFormData.description.trim()) {
        showNotification('error', 'Descrição Necessária', 'Insira uma descrição para o lançamento.');
        return;
      }

      if (editingTx) {
        const res = await fetch(`/api/cashier/transactions/${editingTx.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amt,
            description: txFormData.description.trim(),
            paymentMethod: txFormData.paymentMethod,
            type: txFormData.type,
            userId: profile?.id
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar lançamento.');
        showNotification('success', 'Lançamento Atualizado', 'A alteração foi gravada com sucesso.');
      } else {
        const fallbackUnitId = units.length > 0 ? units[0].id : null;
        const targetUnit = (selectedUnitId && selectedUnitId !== 'all') ? selectedUnitId : fallbackUnitId;
        const res = await fetch('/api/cashier/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: txFormData.type,
            amount: amt,
            description: txFormData.description.trim(),
            paymentMethod: txFormData.paymentMethod,
            cashierType: 'FINANCEIRA',
            unitId: targetUnit,
            userId: profile?.id
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Erro ao registrar lançamento.');
        showNotification('success', 'Lançamento Registrado', `${txFormData.type === 'in' ? 'Entrada' : 'Despesa'} lançada com sucesso.`);
      }

      setIsTxModalOpen(false);
      setEditingTx(null);
      setTxFormData({ type: 'out', amount: '', description: '', paymentMethod: 'pix' });
      fetchFinanceiraTransactions();
      fetchCashierData();
    } catch (err: any) {
      showNotification('error', 'Erro ao Salvar', err?.message || 'Não foi possível salvar o lançamento.');
    } finally {
      setIsSavingTx(false);
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
      const res = await fetch(`/api/cashier/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir registro.');
      showNotification('success', 'Lançamento Removido', 'O registro foi excluído.');
      fetchFinanceiraTransactions();
      fetchCashierData();
    } catch (err: any) {
      showNotification('error', 'Erro ao Excluir', err?.message || 'Falha ao remover lançamento.');
    }
  };

  const filteredTxs = (financeiraTxs || []).filter(tx => {
    const matchSearch = (tx.description || '').toLowerCase().includes(txSearchTerm.toLowerCase());
    const isInflow = tx.type === 'in' || tx.type === 'inflow' || tx.type === 'suprimento' || tx.type === 'entrada';
    const isOutflow = tx.type === 'out' || tx.type === 'outflow' || tx.type === 'sangria' || tx.type === 'despesa' || tx.type === 'saida';
    const matchType = txTypeFilter === 'all' || (txTypeFilter === 'in' && isInflow) || (txTypeFilter === 'out' && isOutflow);
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 4 CARDS PRINCIPAIS INTERATIVOS (ATUAM COMO SELETORES DIRETOS DE VISÃO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Saldo Disponível (Clique para abrir Painel Geral de Saldo) */}
        <div 
          onClick={() => setActiveSubTab('saldo')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
            activeSubTab === 'saldo'
              ? 'bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.02] ring-2 ring-emerald-500/20'
              : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">🟢 Saldo em Caixa Financeira</span>
            <div className="p-2.5 bg-emerald-500/20 rounded-2xl text-emerald-400">
              <DollarSign size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-white font-mono tracking-tight">
            R$ {Number(availableAmt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-emerald-300/80 mt-2 font-mono flex items-center justify-between">
            <span>Saldo líquido disponível</span>
            <span className="font-bold underline text-[9px] uppercase tracking-wider">{activeSubTab === 'saldo' ? '● Selecionado' : 'Visão Geral →'}</span>
          </p>
        </div>

        {/* Card 2: Total Arrecadado Asaas (Clique para abrir Extrato Asaas) */}
        <div 
          onClick={() => setActiveSubTab('asaas')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
            activeSubTab === 'asaas'
              ? 'bg-blue-500/15 border-blue-500 shadow-lg shadow-blue-500/10 scale-[1.02] ring-2 ring-blue-500/20'
              : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">📥 Total Recebido (Asaas)</span>
            <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-400">
              <CreditCard size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-white font-mono tracking-tight">
            R$ {Number(displayArrecadado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-blue-300/80 mt-2 font-mono flex items-center justify-between">
            <span>Parcelas liquidadas Asaas</span>
            <span className="font-bold underline text-[9px] uppercase tracking-wider">{activeSubTab === 'asaas' ? '● Selecionado' : 'Ver Extrato →'}</span>
          </p>
        </div>

        {/* Card 3: Repasses para as Lojas (Clique para abrir Repasses) */}
        <div 
          onClick={() => setActiveSubTab('repasses')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
            activeSubTab === 'repasses'
              ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/10 scale-[1.02] ring-2 ring-amber-500/20'
              : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">🔄 Repasses Realizados</span>
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400">
              <Store size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-white font-mono tracking-tight">
            R$ {Number(totalTransferred).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-amber-300/80 mt-2 font-mono flex items-center justify-between">
            <span>{cashierTransfers.length} repasses executados</span>
            <span className="font-bold underline text-[9px] uppercase tracking-wider">{activeSubTab === 'repasses' ? '● Selecionado' : 'Gerenciar →'}</span>
          </p>
        </div>

        {/* Card 4: Despesas da Financeira (Clique para abrir Despesas) */}
        <div 
          onClick={() => setActiveSubTab('despesas')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
            activeSubTab === 'despesas'
              ? 'bg-red-500/15 border-red-500 shadow-lg shadow-red-500/10 scale-[1.02] ring-2 ring-red-500/20'
              : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">💸 Despesas Operacionais</span>
            <div className="p-2.5 bg-red-500/10 rounded-2xl text-red-400">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-white font-mono tracking-tight">
            R$ {Number(totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-red-300/80 mt-2 font-mono flex items-center justify-between">
            <span>Custos MDM e saídas</span>
            <span className="font-bold underline text-[9px] uppercase tracking-wider">{activeSubTab === 'despesas' ? '● Selecionado' : 'Lançar/Ver →'}</span>
          </p>
        </div>
      </div>

      {/* CONTEÚDO DINÂMICO CONFORME CARD SELECIONADO */}

      {/* 1. VISÃO GERAL DE SALDO & FLUXO CONSOLIDADO */}
      {activeSubTab === 'saldo' && (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-3xl border border-white/10 p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="text-emerald-400" size={22} />
                  Fluxo Consolidado de Caixa da Financeira
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  Balanço geral de arrecadações Asaas, compensações bancárias, transferências de custos e despesas operacionais
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenModal}
                  disabled={availableAmt <= 0}
                  className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 font-display"
                >
                  <DollarSign size={16} />
                  Novo Repasse p/ Loja
                </button>
                <button
                  onClick={fetchCashierData}
                  className="p-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl border border-white/10 transition-all cursor-pointer"
                  title="Atualizar dados"
                >
                  <RefreshCw size={16} className={isLoadingCashier ? 'animate-spin text-emerald-400' : ''} />
                </button>
              </div>
            </div>

            {/* Demonstrativo Financeiro em Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                  (+) Entradas & Arrecadações
                </span>
                <div className="text-2xl font-black text-white font-mono">
                  R$ {Number(displayArrecadado + totalInflows).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-zinc-400 font-mono">
                  R$ {Number(displayArrecadado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} via Asaas + R$ {Number(totalInflows).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} manuais
                </p>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                  (-) Repasses de Custo para Lojas
                </span>
                <div className="text-2xl font-black text-white font-mono">
                  R$ {Number(totalTransferred).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {cashierTransfers.length} repasses executados para lojas físicas
                </p>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block">
                  (-) Despesas Operacionais & MDM
                </span>
                <div className="text-2xl font-black text-white font-mono">
                  R$ {Number(totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Custos de plataformas, licenças e saídas
                </p>
              </div>
            </div>

            {/* Compensação Bancária D+0 e D+2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
                    🟢 Saldo Liberado (D+0)
                  </span>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    R$ {Number(displayLiberadoD0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Disponível para repasse imediato
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                    ⏳ Em Liquidação (D+2)
                  </span>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    R$ {Number(displayLiquidandoD2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Compensação bancária de 2 dias úteis
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                  <History size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXTRATO & CONCILIAÇÃO ASAAS */}
      {activeSubTab === 'asaas' && (
        <AsaasCashierReport selectedUnitId={selectedUnitId} />
      )}

      {/* 3. REPASSES PARA AS LOJAS */}
      {activeSubTab === 'repasses' && (
        <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">Histórico de Repasses para Caixas Físicos</h3>
              <p className="text-xs text-zinc-400 font-mono">Transferências de saldo da financeira para a reposição de aparelhos nas lojas</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleOpenModal}
                disabled={availableAmt <= 0}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 font-display"
              >
                <DollarSign size={16} />
                Novo Repasse p/ Loja
              </button>
              <span className="text-xs font-mono text-zinc-400 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                {cashierTransfers.length} repasses
              </span>
            </div>
          </div>

          {cashierTransfers.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 text-xs font-mono uppercase tracking-wider border border-white/5 rounded-2xl">
              Nenhum repasse executado até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                    <th className="py-3.5 px-4">Data / Hora</th>
                    <th className="py-3.5 px-4">Origem</th>
                    <th className="py-3.5 px-4">Destino (Loja)</th>
                    <th className="py-3.5 px-4">Valor Repassado</th>
                    <th className="py-3.5 px-4">Observações / Detalhes</th>
                    <th className="py-3.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono">
                  {cashierTransfers.map((t: any) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 text-zinc-300">
                        {new Date(t.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        Financeira MDR
                      </td>
                      <td className="py-3.5 px-4 text-white font-bold">
                        {t.units?.name || 'Caixa Loja Física'}
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                        R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 max-w-xs truncate">
                        {t.notes || 'Repasse de Saldo Liberado'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRevertTransfer(t.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                          title="Estornar Repasse"
                        >
                          Estornar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. LANÇAMENTOS & DESPESAS */}
      {activeSubTab === 'despesas' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-3xl">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Histórico de Lançamentos & Despesas da Financeira</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Registro de retiradas, custos operacionais, licenças MDM e tarifas da financeira</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  setEditingTx(null);
                  setTxFormData({ type: 'out', amount: '', description: '', paymentMethod: 'pix' });
                  setIsTxModalOpen(true);
                }}
                className="px-5 py-2.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 font-display"
              >
                <Plus size={16} />
                Nova Despesa / Lançamento
              </button>

              {/* Filtro de Tipo */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'in', label: 'Entradas' },
                  { id: 'out', label: 'Saídas/Despesas' }
                ].map(ft => (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => setTxTypeFilter(ft.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      txTypeFilter === ft.id
                        ? 'bg-primary text-black font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>

              {/* Busca por Descrição */}
              <div className="relative flex-1 md:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={txSearchTerm}
                  onChange={(e) => setTxSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <span className="text-xs font-mono font-bold text-zinc-300 shrink-0">
                Total: {filteredTxs.length}
              </span>
            </div>
          </div>

          <div className="bg-white/2 border border-white/10 rounded-3xl overflow-hidden">
            {isLoadingTxs ? (
              <div className="p-12 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={18} /> Carregando lançamentos...
              </div>
            ) : filteredTxs.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs font-mono uppercase">
                Nenhum lançamento ou despesa localizado com os filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase text-zinc-400 tracking-wider bg-white/5">
                      <th className="py-3 px-4">Data/Hora</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono">
                    {filteredTxs.map((tx: FinanceiraTx) => {
                      const isInflow = tx.type === 'in' || tx.type === 'inflow' || tx.type === 'suprimento' || tx.type === 'entrada';
                      return (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-zinc-400">
                            {new Date(tx.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                              isInflow
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {isInflow ? 'Entrada / Aporte' : 'Despesa / Saída'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white font-bold max-w-xs truncate">
                            {tx.description || 'Lançamento sem descrição'}
                          </td>
                          <td className="py-3 px-4 text-zinc-300 uppercase">
                            {tx.payment_method === 'money' ? 'Dinheiro' : (tx.payment_method || 'PIX')}
                          </td>
                          <td className="py-3 px-4 font-black">
                            <span className={isInflow ? 'text-emerald-400' : 'text-red-400'}>
                              {isInflow ? '+ ' : '- '}R$ {Number(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingTx(tx);
                                  setTxFormData({
                                    type: isInflow ? 'in' : 'out',
                                    amount: tx.amount?.toString() || '',
                                    description: tx.description || '',
                                    paymentMethod: tx.payment_method || 'pix'
                                  });
                                  setIsTxModalOpen(true);
                                }}
                                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(tx.id)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 transition-all cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE NOVA DESPESA / LANÇAMENTO */}
      {isTxModalOpen && (
        <div
          onClick={() => setIsTxModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f0f1a] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider">
                  {editingTx ? 'Editar Lançamento' : 'Novo Lançamento / Despesa'}
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  Registro no Caixa da Financeira
                </p>
              </div>
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="p-2 text-zinc-500 hover:text-white rounded-xl bg-white/5 border border-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                  Tipo de Operação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'out' })}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      txFormData.type === 'out'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    🔴 Despesa / Saída
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'in' })}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      txFormData.type === 'in'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    🟢 Entrada / Aporte
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={txFormData.amount}
                  onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                  className="w-full bg-[#161625] border border-white/10 rounded-2xl px-4 py-3 text-lg font-black text-white font-mono outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Licença MDM PayJoy / Taxa Bancária"
                  value={txFormData.description}
                  onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
                  className="w-full bg-[#161625] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                  Método de Movimentação
                </label>
                <select
                  value={txFormData.paymentMethod}
                  onChange={(e) => setTxFormData({ ...txFormData, paymentMethod: e.target.value })}
                  className="w-full bg-[#161625] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-primary font-mono uppercase"
                >
                  <option value="pix">PIX</option>
                  <option value="money">Dinheiro</option>
                  <option value="bank">Boleto / Transferência Bancária</option>
                  <option value="card">Cartão</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-zinc-400 font-bold uppercase tracking-wider text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingTx}
                  className="flex-1 py-3.5 bg-primary text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingTx ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REPASSE SELETIVO PARA CAIXA LOJA */}
      {isTransferModalOpen && (
        <div
          onClick={() => setIsTransferModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f0f1a] border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative space-y-6 max-h-[90vh] flex flex-col"
          >
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">
                Realizar Repasse para Caixa Loja
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                Transfira o valor das parcelas recebidas na financeira para a reposição de estoque no caixa da loja física
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                  Saldo Disponível p/ Repasse
                </span>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  R$ {Number(availableAmt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                  Loja de Destino (Caixa Físico)
                </label>
                <select
                  value={targetStoreId}
                  onChange={(e) => setTargetStoreId(e.target.value)}
                  className="w-full bg-[#161625] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono uppercase"
                >
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seleção de Parcelas Específicas para Repasse */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-40 bg-white/2 rounded-2xl border border-white/10 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-zinc-300 uppercase tracking-wider">
                  Contratos Liquidados Pendentes de Repasse ({modalItems.length})
                </span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-[10px] font-black text-emerald-400 uppercase tracking-wider hover:underline cursor-pointer"
                >
                  {selectedInstallmentIds.size === modalItems.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-48">
                {modalItems.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                    Nenhum contrato pendente de repasse.
                  </div>
                ) : (
                  modalItems.map((item: any) => {
                    const isSelected = selectedInstallmentIds.has(String(item.id));
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItem(String(item.id), Number(item.value || 0))}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                            : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-white/20 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-white font-mono">
                              {item.customerName || 'Cliente MDR'}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              Parcela {item.installmentNumber}/{item.totalInstallments} • Venda #{item.saleId ? String(item.saleId).slice(0, 8).toUpperCase() : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-emerald-400 font-mono">
                            R$ {Number(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input Manual de Valor e Observações */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                  Valor Total do Repasse (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transferAmountInput}
                  onChange={(e) => setTransferAmountInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-[#161625] border border-white/10 rounded-2xl px-4 py-3 text-lg font-black text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                  Observações / Justificativa (Opcional)
                </label>
                <input
                  type="text"
                  value={transferNotesInput}
                  onChange={(e) => setTransferNotesInput(e.target.value)}
                  placeholder="Ex: Repasse semanal das parcelas de iPhones"
                  className="w-full bg-[#161625] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-zinc-400 font-bold uppercase tracking-wider text-xs rounded-2xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={isSubmittingTransfer || Number(transferAmountInput) <= 0}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingTransfer ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirmar Repasse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
