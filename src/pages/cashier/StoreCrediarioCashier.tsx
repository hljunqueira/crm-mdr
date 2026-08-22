import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Store,
  CheckCircle2,
  Printer,
  Search,
  AlertCircle,
  QrCode,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  RotateCcw,
  Plus,
  Loader2,
  Trash2,
  Eye,
  Calendar,
  Pencil,
  Save
} from 'lucide-react';
import SimpleStoreCrediarioPrint from '../../components/finance/SimpleStoreCrediarioPrint';
import PixBoletoPrint from '../../components/finance/PixBoletoPrint';
import { printElement } from '../../lib/utils';
import { useFinanceStore, Installment } from '../../store/useFinanceStore';
import { useCashStore, CashTransaction } from '../../store/useCashStore';
import { PixBoletoModal } from '../Finance';
import { useUnitStore } from '../../store/useUnitStore';
import { useAuthStore } from '../../store/useAuthStore';
import StoreProfitReport from '../../components/finance/StoreProfitReport';

interface StoreCrediarioCashierProps {
  cashierSummary: any;
  cashierTransfers: any[];
  relevantInstallments: any[];
  isLoadingCashier: boolean;
  fetchCashierData: () => void;
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  selectedUnitId: string;
}

export default function StoreCrediarioCashier({
  cashierSummary,
  cashierTransfers,
  relevantInstallments,
  isLoadingCashier,
  fetchCashierData,
  showNotification,
  selectedUnitId
}: StoreCrediarioCashierProps) {
  const { markAsPaid, revertPayment, updateDueDate } = useFinanceStore();

  const [dueDateModalItem, setDueDateModalItem] = useState<any>(null);
  const [newDueDateInput, setNewDueDateInput] = useState<string>('');
  const [isUpdatingDueDate, setIsUpdatingDueDate] = useState<boolean>(false);

  const handleSaveDueDate = async () => {
    if (!dueDateModalItem || !newDueDateInput) return;
    setIsUpdatingDueDate(true);
    try {
      await updateDueDate(dueDateModalItem.id, newDueDateInput);
      showNotification('success', 'Vencimento Atualizado', 'Data de vencimento alterada com sucesso!');
      setDueDateModalItem(null);
      fetchCashierData();
    } catch (err: any) {
      showNotification('error', 'Erro ao Atualizar Vencimento', err.message || 'Tente novamente');
    } finally {
      setIsUpdatingDueDate(false);
    }
  };
  const { activeShift, fetchActiveShift, fetchTransactions, transactions, addTransaction, deleteTransaction } = useCashStore();
  const { units, unit } = useUnitStore();
  const { profile } = useAuthStore();

  // Sub-aba do Caixa Crediário Loja: gestao | recebiveis | despesas | lucro_presumido
  const [activeSubTab, setActiveSubTab] = useState<'gestao' | 'recebiveis' | 'despesas' | 'lucro_presumido'>('gestao');

  // Filtros de Recebíveis do Crediário Loja
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Modais de Recebimento / QR Code / Impressão
  const [payModalItem, setPayModalItem] = useState<any>(null);
  const [payMethod, setPayMethod] = useState<'money' | 'pix' | 'card'>('pix');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const [pixModalItem, setPixModalItem] = useState<any>(null);
  const [sendingWa, setSendingWa] = useState<string | null>(null);

  const [printModalSale, setPrintModalSale] = useState<any>(null);
  const [printFormatMode, setPrintFormatMode] = useState<'cupom' | 'a4'>('cupom');

  // Modais Detalhados de Entradas (Financiamento vs Outras Vendas)
  const [isFinancModalOpen, setIsFinancModalOpen] = useState(false);
  const [financSearchTerm, setFinancSearchTerm] = useState('');

  const [isOutrasModalOpen, setIsOutrasModalOpen] = useState(false);
  const [outrasSearchTerm, setOutrasSearchTerm] = useState('');

  // Modais e Filtros da aba de Despesas da Loja
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('all');
  const [txPaymentMethodFilter, setTxPaymentMethodFilter] = useState<string>('all');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  const formatBRL = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    const sanitized = Math.abs(num) < 0.001 ? 0 : num;
    return sanitized.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Drag & Drop State para as Sub-Abas do Caixa Loja
  const [tabsOrder, setTabsOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_caixa_loja_tabs_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch (_) {}
    return ['gestao', 'recebiveis', 'despesas', 'lucro_presumido'];
  });

  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTabDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) return;

    const newOrder = [...tabsOrder];
    const sourceIndex = newOrder.indexOf(draggedTabId);
    const targetIndex = newOrder.indexOf(targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, draggedTabId);
      setTabsOrder(newOrder);
      try {
        localStorage.setItem('crm_caixa_loja_tabs_order', JSON.stringify(newOrder));
      } catch (_) {}
    }
    setDraggedTabId(null);
  };

  const [txFormData, setTxFormData] = useState({
    type: 'outflow' as 'inflow' | 'outflow',
    category: 'despesa_luz' as CashTransaction['category'],
    amount: '',
    payment_method: 'money' as CashTransaction['payment_method'],
    description: ''
  });

  useEffect(() => {
    if (selectedUnitId && selectedUnitId !== 'all') {
      fetchTransactions(selectedUnitId);
    }
  }, [selectedUnitId, fetchTransactions]);

  // Filtro Global de Período (Mês/Ano)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');

  const matchesPeriodFilter = (dateStr: string | null | undefined, period: string) => {
    if (!dateStr || period === 'all') return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (period === 'current_month') {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }

    if (period === 'last_month') {
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
    }

    if (period === 'last_3_months') {
      const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
      return d >= threeMonthsAgo && d <= now;
    }

    if (period === 'current_year') {
      return d.getFullYear() === currentYear;
    }

    if (/^\d{4}-\d{2}$/.test(period)) {
      const [year, month] = period.split('-').map(Number);
      return d.getFullYear() === year && d.getMonth() === (month - 1);
    }

    return true;
  };

  // Listas filtradas por Período e por Loja/Unidade
  const filteredFinancList = useMemo(() => {
    const rawList = cashierSummary?.loja?.financDownPaymentsList || [];
    return rawList.filter((item: any) => {
      if (selectedUnitId && selectedUnitId !== 'all' && item.storeId && String(item.storeId) !== String(selectedUnitId)) return false;
      return matchesPeriodFilter(item.date, selectedPeriod);
    });
  }, [cashierSummary, selectedPeriod, selectedUnitId]);

  const totalFinancPeriod = useMemo(() => {
    return filteredFinancList.reduce((acc: number, item: any) => acc + Number(item.downPayment || 0), 0);
  }, [filteredFinancList]);

  const filteredOutrasList = useMemo(() => {
    const rawList = cashierSummary?.loja?.outrasDownPaymentsList || [];
    return rawList.filter((item: any) => {
      if (selectedUnitId && selectedUnitId !== 'all' && item.storeId && String(item.storeId) !== String(selectedUnitId)) return false;
      return matchesPeriodFilter(item.date, selectedPeriod);
    });
  }, [cashierSummary, selectedPeriod, selectedUnitId]);

  const totalOutrasPeriod = useMemo(() => {
    return filteredOutrasList.reduce((acc: number, item: any) => acc + Number(item.downPayment || 0), 0);
  }, [filteredOutrasList]);

  const filteredTransfersList = useMemo(() => {
    const rawList = cashierTransfers || [];
    return rawList.filter((item: any) => {
      if (selectedUnitId && selectedUnitId !== 'all' && item.store_id && String(item.store_id) !== String(selectedUnitId)) return false;
      return matchesPeriodFilter(item.created_at, selectedPeriod);
    });
  }, [cashierTransfers, selectedPeriod, selectedUnitId]);

  const totalRepassesPeriod = useMemo(() => {
    return filteredTransfersList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  }, [filteredTransfersList]);

  // Totais do Dashboard Principal
  const totalDownPayments = totalFinancPeriod + totalOutrasPeriod;
  const totalRepassesRecebidos = totalRepassesPeriod;

  // REGRA ESTRITA: Exclusivamente parcelas do Crediário Próprio da Loja (exclui celulares MDM, exclui à vista, exclui cliente balcão)
  const storeCrediarioInstallments = useMemo(() => {
    return (relevantInstallments || []).filter(i => {
      const sale = (i as any).sales;
      const storeId = sale?.store_id || i.unit_id;
      if (selectedUnitId && selectedUnitId !== 'all' && storeId && String(storeId) !== String(selectedUnitId)) return false;

      const effectiveOrigin = sale?.origin_type || i.origin_type || 'CREDIARIO_LOJA';
      if (effectiveOrigin === 'FINANCIAMENTO_CELULAR') return false;

      const custName = (i.customer_name || sale?.customers?.name || '').toLowerCase();
      if (custName.includes('balcao') || custName.includes('cliente balcao')) return false;

      const isDownPayment = i.number === 0 || (i as any).is_down_payment === true || (i.number === 1 && (sale?.down_payment > 0 || (i as any).down_payment > 0) && Number(i.value) === Number(sale?.down_payment || (i as any).down_payment));
      if (isDownPayment) return false;

      return true;
    });
  }, [relevantInstallments, selectedUnitId]);

  // Métricas do Crediário Loja (Filtradas por Período e Loja)
  const totalCrediarioReceber = useMemo(() => {
    return storeCrediarioInstallments
      .filter(i => i.status !== 'paid' && i.status !== 'pago')
      .reduce((acc, curr) => acc + Number(curr.value || 0), 0);
  }, [storeCrediarioInstallments]);

  const totalCrediarioPago = useMemo(() => {
    return storeCrediarioInstallments
      .filter(i => (i.status === 'paid' || i.status === 'pago') && matchesPeriodFilter((i as any).paid_at || i.payment_date || i.due_date, selectedPeriod))
      .reduce((acc, curr) => acc + Number(curr.value || 0), 0);
  }, [storeCrediarioInstallments, selectedPeriod]);

  const totalCrediarioEmAtraso = useMemo(() => {
    return storeCrediarioInstallments
      .filter(i => i.status === 'overdue')
      .reduce((acc, curr) => acc + Number(curr.value || 0), 0);
  }, [storeCrediarioInstallments]);

  // Lançamentos e Saldo Atual em Caixa da Loja Física (Filtrados por Loja e Período)
  // Suprimentos manuais de reforço de caixa (excluindo vendas e parcelas que já são computadas separadamente)
  const manualSuprimentosTotal = useMemo(() => {
    return (transactions || [])
      .filter((t: any) => {
        if (t.cashier_type === 'FINANCEIRA' || (t.description || '').toLowerCase().includes('financeira') || (t.description || '').toLowerCase().includes('asaas') || (t.description || '').toLowerCase().includes('[repasse')) return false;
        if (selectedUnitId && selectedUnitId !== 'all' && t.unit_id && String(t.unit_id) !== String(selectedUnitId)) return false;
        const isInflow = (t.type as string) === 'inflow' || (t.type as string) === 'suprimento' || (t.type as string) === 'entrada';
        const isManual = !t.sale_id && !t.installment_id && t.category !== 'sale' && t.category !== 'installment';
        return isInflow && isManual && matchesPeriodFilter(t.created_at || t.date, selectedPeriod);
      })
      .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
  }, [transactions, selectedPeriod, selectedUnitId]);

  const despesasOutflowTotal = useMemo(() => {
    return (transactions || [])
      .filter((t: any) => {
        if (t.cashier_type === 'FINANCEIRA' || (t.description || '').toLowerCase().includes('financeira') || (t.description || '').toLowerCase().includes('asaas') || (t.description || '').toLowerCase().includes('[repasse')) return false;
        if (selectedUnitId && selectedUnitId !== 'all' && t.unit_id && String(t.unit_id) !== String(selectedUnitId)) return false;
        return ((t.type as string) === 'outflow' || (t.type as string) === 'sangria' || (t.type as string) === 'despesa' || (t.type as string) === 'saida') && matchesPeriodFilter(t.created_at || t.date, selectedPeriod);
      })
      .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
  }, [transactions, selectedPeriod, selectedUnitId]);

  // Total Geral de Entradas da Loja no Período (Financiamentos + Vendas Balcão + Crediário Loja + Repasses + Suprimentos Manuais)
  const totalEntradasCaixaLoja = useMemo(() => {
    return totalFinancPeriod + totalOutrasPeriod + totalCrediarioPago + totalRepassesPeriod + manualSuprimentosTotal;
  }, [totalFinancPeriod, totalOutrasPeriod, totalCrediarioPago, totalRepassesPeriod, manualSuprimentosTotal]);

  const saldoCaixaAtual = useMemo(() => {
    const saldo = totalEntradasCaixaLoja - despesasOutflowTotal;
    // O saldo físico em caixa/gaveta nunca pode ser negativo (gaveta física não possui cédulas negativas; se zerou em sangria/acerto, o saldo restante é 0)
    if (saldo <= 0 || Math.abs(saldo) < 0.001) return 0;
    return saldo;
  }, [totalEntradasCaixaLoja, despesasOutflowTotal]);

  // Parcelas filtradas por busca e status
  const filteredInstallments = useMemo(() => {
    return storeCrediarioInstallments.filter(i => {
      const custName = (i.customer_name || i.sales?.customers?.name || '').toLowerCase();
      const devModel = (i.device_model || i.sales?.device_model || '').toLowerCase();
      const matchSearch = custName.includes(searchTerm.toLowerCase()) || devModel.includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'paid') return i.status === 'paid' || i.status === 'pago';
      if (statusFilter === 'pending') return i.status !== 'paid' && i.status !== 'pago' && i.status !== 'overdue';
      if (statusFilter === 'overdue') return i.status === 'overdue';

      return true;
    });
  }, [storeCrediarioInstallments, searchTerm, statusFilter]);

  // Agrupamento por Venda/Cliente para a visualização sanfona de crediário
  const saleGroups = useMemo(() => {
    const groups: { [saleId: string]: any } = {};

    filteredInstallments.forEach(inst => {
      const saleId = inst.sale_id || inst.customer_id || inst.id;
      if (!groups[saleId]) {
        groups[saleId] = {
          saleId,
          customerId: inst.customer_id,
          customerName: inst.customer_name || inst.sales?.customers?.name || 'Cliente Balcão',
          customerCpf: inst.customer_cpf || inst.sales?.customers?.cpf || '',
          customerPhone: inst.customer_phone || inst.sales?.customers?.phone || '',
          deviceModel: inst.device_model || inst.sales?.device_model || 'Acessórios / Serviços de Balcão',
          date: inst.created_at || inst.due_date,
          installments: []
        };
      }
      groups[saleId].installments.push(inst);
    });

    return Object.values(groups);
  }, [filteredInstallments]);

  // Executar Baixa
  const handleConfirmPay = async () => {
    if (!payModalItem) return;
    try {
      setIsSubmittingPay(true);
      await markAsPaid(payModalItem.id, Number(payModalItem.value), payMethod);
      showNotification('success', 'Baixa Efetuada!', `Parcela de R$ ${Number(payModalItem.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrada como paga.`);
      setPayModalItem(null);
      fetchCashierData();
      if (selectedUnitId && selectedUnitId !== 'all') {
        await fetchActiveShift(selectedUnitId);
        await fetchTransactions(selectedUnitId);
      }
    } catch (err: any) {
      showNotification('error', 'Falha ao dar baixa', err.message || 'Erro ao registrar pagamento.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleTriggerPrint = () => {
    printElement('simple-crediario-print');
  };

  // Executar Estorno
  const handleRevertPay = async (instId: string) => {
    if (window.confirm('Tem certeza de que deseja estornar este pagamento? A parcela retornará ao estado pendente.')) {
      try {
        await revertPayment(instId);
        showNotification('success', 'Pagamento Estornado', 'A parcela retornou ao status pendente.');
        fetchCashierData();
        if (selectedUnitId && selectedUnitId !== 'all') {
          await fetchActiveShift(selectedUnitId);
          await fetchTransactions(selectedUnitId);
        }
      } catch (err: any) {
        showNotification('error', 'Erro ao estornar', err.message);
      }
    }
  };

  // Enviar Cobrança por WhatsApp
  const handleWhatsAppWarning = async (inst: any) => {
    setSendingWa(inst.id);
    try {
      const res = await fetch('/api/billing/send-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId: inst.id })
      });
      if (res.ok) {
        showNotification('success', 'Cobrança Enviada!', `Lembrete enviado via WhatsApp para ${inst.customer_name || 'o cliente'}.`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        showNotification('error', 'Falha no Envio', errJson.error || 'Erro ao comunicar com n8n.');
      }
    } catch (err: any) {
      showNotification('error', 'Erro de Conexão', err.message);
    } finally {
      setSendingWa(null);
    }
  };

  // Criar nova despesa/lançamento no Caixa Loja
  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || selectedUnitId === 'all') {
      showNotification('error', 'Selecione uma unidade específica para realizar o lançamento.');
      return;
    }
    const numAmount = Number(txFormData.amount);
    if (!numAmount || numAmount <= 0) {
      showNotification('error', 'Informe um valor válido maior que zero.');
      return;
    }

    try {
      setIsSubmittingTx(true);
      await addTransaction({
        unit_id: selectedUnitId,
        type: txFormData.type,
        category: txFormData.category,
        amount: numAmount,
        payment_method: txFormData.payment_method,
        description: txFormData.description || 'Lançamento manual no Caixa Loja',
        created_by: profile?.id || 'admin'
      });
      showNotification('success', 'Lançamento Registrado!', 'O registro foi adicionado ao caixa da loja.');
      setIsTxModalOpen(false);
      setTxFormData({ type: 'outflow', category: 'despesa_luz', amount: '', payment_method: 'money', description: '' });
      await fetchTransactions(selectedUnitId);
    } catch (err: any) {
      showNotification('error', 'Erro ao salvar lançamento', err.message);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento do caixa?')) {
      try {
        await deleteTransaction(txId, selectedUnitId);
        showNotification('success', 'Lançamento Excluído com Sucesso');
        await fetchTransactions(selectedUnitId);
      } catch (err: any) {
        showNotification('error', 'Falha ao excluir lançamento');
      }
    }
  };

  const tabsConfig: Record<string, { id: string; label: string; desc: string }> = {
    gestao: { id: 'gestao', label: '🏬 Gestão & Saldos do Caixa', desc: 'Resumo de Entradas e Repasses' },
    recebiveis: { id: 'recebiveis', label: '🛍️ Recebíveis Crediário Loja', desc: 'Carteira Exclusiva do Crediário Próprio' },
    despesas: { id: 'despesas', label: '💸 Lançamentos & Despesas Loja', desc: 'Custos e Saídas da Loja Física' },
    lucro_presumido: { id: 'lucro_presumido', label: '📊 Lucro Presumido Loja', desc: 'Vendas Balcão, Estoque & Serviços' }
  };

  const filteredStoreTxs = useMemo(() => {
    return (transactions || []).filter(tx => {
      if (tx.cashier_type === 'FINANCEIRA' || (tx.description || '').toLowerCase().includes('financeira') || (tx.description || '').toLowerCase().includes('asaas')) return false;
      if (selectedUnitId && selectedUnitId !== 'all' && tx.unit_id && String(tx.unit_id) !== String(selectedUnitId)) return false;

      const matchPeriod = matchesPeriodFilter(tx.created_at || (tx as any).date, selectedPeriod);
      if (!matchPeriod) return false;

      const isInflow = (tx.type as string) === 'inflow' || (tx.type as string) === 'suprimento' || (tx.type as string) === 'entrada';
      const isOutflow = (tx.type as string) === 'outflow' || (tx.type as string) === 'sangria' || (tx.type as string) === 'despesa' || (tx.type as string) === 'saida';
      const matchType = txTypeFilter === 'all' || (txTypeFilter === 'inflow' && isInflow) || (txTypeFilter === 'outflow' && isOutflow);
      if (!matchType) return false;

      const matchCat = txCategoryFilter === 'all' || tx.category === txCategoryFilter;
      if (!matchCat) return false;

      const matchMethod = txPaymentMethodFilter === 'all' || tx.payment_method === txPaymentMethodFilter;
      if (!matchMethod) return false;

      const matchSearch = (tx.description || '').toLowerCase().includes(txSearchTerm.toLowerCase());
      return matchSearch;
    });
  }, [transactions, selectedPeriod, txTypeFilter, txCategoryFilter, txPaymentMethodFilter, txSearchTerm, selectedUnitId]);

  const renderPeriodFilter = () => (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 shadow-lg">
      <div className="flex items-center gap-2">
        <Calendar size={18} className="text-primary" />
        <span className="text-xs font-black uppercase text-white tracking-wider">Período do Caixa:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'current_month', label: 'Mês Atual' },
          { id: 'last_month', label: 'Mês Passado' },
          { id: 'last_3_months', label: 'Últimos 3 Meses' },
          { id: 'current_year', label: 'Ano Atual' },
          { id: 'all', label: 'Todos (Geral)' }
        ].map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPeriod(p.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border ${
              selectedPeriod === p.id
                ? 'bg-primary text-black border-primary font-black shadow-md'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}

        <select
          value={selectedPeriod.includes('-') ? selectedPeriod : ''}
          onChange={(e) => e.target.value && setSelectedPeriod(e.target.value)}
          className="px-3 py-1.5 bg-[#181824] text-white text-xs font-bold rounded-xl border border-white/20 outline-none focus:border-primary cursor-pointer"
        >
          <option value="" disabled>Selecionar Mês...</option>
          <option value="2026-08">Agosto / 2026</option>
          <option value="2026-07">Julho / 2026</option>
          <option value="2026-06">Junho / 2026</option>
          <option value="2026-05">Maio / 2026</option>
          <option value="2026-04">Abril / 2026</option>
          <option value="2026-03">Março / 2026</option>
          <option value="2026-02">Fevereiro / 2026</option>
          <option value="2026-01">Janeiro / 2026</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ABAS INTERNAS DO CAIXA LOJA COM DRAG & DROP */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {tabsOrder.map(tabKey => {
            const st = tabsConfig[tabKey];
            if (!st) return null;
            return (
              <button
                key={st.id}
                type="button"
                draggable
                onDragStart={(e) => handleTabDragStart(e, st.id)}
                onDragOver={handleTabDragOver}
                onDrop={(e) => handleTabDrop(e, st.id)}
                onDragEnd={() => setDraggedTabId(null)}
                onClick={() => setActiveSubTab(st.id as any)}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex flex-col items-start gap-0.5 border cursor-grab active:cursor-grabbing select-none ${
                  draggedTabId === st.id ? 'opacity-40 scale-95 border-dashed border-primary' : ''
                } ${
                  activeSubTab === st.id
                    ? 'bg-[#161625] text-white border-primary shadow-lg shadow-primary/20 scale-[1.02] border-2 font-bold'
                    : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{st.label}</span>
                <span className="text-[8px] font-mono tracking-normal opacity-70">{st.desc}</span>
              </button>
            );
          })}
        </div>

        {activeSubTab === 'despesas' && (
          <button
            type="button"
            onClick={() => setIsTxModalOpen(true)}
            className="px-5 py-3.5 bg-primary text-black font-black uppercase text-xs rounded-2xl hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Nova Despesa / Lançamento
          </button>
        )}
      </div>

      {/* CONTEÚDO DA SUB-ABA 1: GESTÃO & SALDOS DO CAIXA LOJA */}
      {activeSubTab === 'gestao' && (
        <div className="space-y-8">
          {/* BARRA DE FILTRO DE PERÍODO (MÊS / ANO) */}
          {renderPeriodFilter()}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-linear-to-br from-blue-500/10 to-blue-900/10 p-6 rounded-3xl border border-blue-500/30">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">📱 Entradas de Financiamento</span>
                <button
                  type="button"
                  onClick={() => setIsFinancModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/40 rounded-xl text-blue-300 text-[10px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer border border-blue-500/30"
                >
                  <Eye size={12} /> Detalhes ({filteredFinancList.length})
                </button>
              </div>
              <h3 className="text-2xl font-black text-white font-mono">
                R$ {formatBRL(totalFinancPeriod)}
              </h3>
              <p className="text-[10px] text-blue-400/80 mt-2 font-mono">
                Entradas de celulares financiados recebidas no período
              </p>
            </div>

            <div className="bg-linear-to-br from-purple-500/10 to-purple-900/10 p-6 rounded-3xl border border-purple-500/30">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">📦 Vendas à Vista & Balcão</span>
                <button
                  type="button"
                  onClick={() => setIsOutrasModalOpen(true)}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 rounded-xl text-purple-300 text-[10px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer border border-purple-500/30"
                >
                  <Eye size={12} /> Detalhes ({filteredOutrasList.length})
                </button>
              </div>
              <h3 className="text-2xl font-black text-white font-mono">
                R$ {formatBRL(totalOutrasPeriod)}
              </h3>
              <p className="text-[10px] text-purple-400/80 mt-2 font-mono">
                Recebimentos de acessórios, peças e balcão no período
              </p>
            </div>

            <div className="bg-linear-to-br from-emerald-500/10 to-emerald-900/10 p-6 rounded-3xl border border-emerald-500/30">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">🏦 Repasses da Financeira</span>
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white font-mono">
                R$ {formatBRL(totalRepassesPeriod)}
              </h3>
              <p className="text-[10px] text-emerald-400/80 mt-2 font-mono">
                Saldo repassado da Financeira p/ Loja no período
              </p>
            </div>

            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">🛍️ Crediário Loja Pago</span>
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Store size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white font-mono">
                R$ {formatBRL(totalCrediarioPago)}
              </h3>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono">
                Parcelas pagas no carnê do crediário no período
              </p>
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Histórico de Repasses Recebidos da Financeira</h3>
                <p className="text-xs text-zinc-400">Transferências de saldo da financeira para o caixa físico das lojas</p>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {filteredTransfersList.length} repasses registrados no período
              </span>
            </div>

            {filteredTransfersList.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm font-mono uppercase tracking-wider">
                Nenhum repasse registrado para este período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                      <th className="py-3 px-4">Data do Recebimento</th>
                      <th className="py-3 px-4">Origem</th>
                      <th className="py-3 px-4">Loja Beneficiada</th>
                      <th className="py-3 px-4">Valor Creditado</th>
                      <th className="py-3 px-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono">
                    {filteredTransfersList.map((t: any) => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-zinc-300">
                          {new Date(t.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          Financeira MDR
                        </td>
                        <td className="py-3 px-4 text-white font-bold">
                          {t.units?.name || unit?.name || 'Caixa Loja Física'}
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-400 text-sm">
                          R$ {formatBRL(t.amount)}
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          {t.notes || 'Repasse de Contratos Financiamento Celular'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 2: RECEBÍVEIS CREDIÁRIO LOJA */}
      {activeSubTab === 'recebiveis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-2">⏳ Total a Receber (Geral)</span>
              <h3 className="text-2xl font-black font-mono text-white">
                R$ {formatBRL(totalCrediarioReceber)}
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">Parcelas futuras em aberto</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">🟢 Total Recebido (No Período)</span>
              <h3 className="text-2xl font-black font-mono text-emerald-400">
                R$ {formatBRL(totalCrediarioPago)}
              </h3>
              <p className="text-[10px] text-emerald-400/80 font-mono mt-1">Parcelas liquidadas no caixa da loja</p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-3xl">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-2">🔴 Em Atraso (Inadimplência)</span>
              <h3 className="text-2xl font-black font-mono text-rose-400">
                R$ {formatBRL(totalCrediarioEmAtraso)}
              </h3>
              <p className="text-[10px] text-rose-400/80 font-mono mt-1">Parcelas vencidas do crediário próprio</p>
            </div>
          </div>

          {/* Lista Sanfona de Vendas do Crediário */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Carteira de Clientes do Crediário Loja</h3>
                <p className="text-[10px] text-zinc-400 font-mono">Agrupado por Venda com Controle Individual de Parcelas</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'pending', label: 'Em Aberto' },
                    { id: 'paid', label: 'Pagos' },
                    { id: 'overdue', label: 'Vencidos' }
                  ].map(ft => (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => setStatusFilter(ft.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                        statusFilter === ft.id
                          ? 'bg-primary text-black font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente ou aparelho..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>
            </div>

            {saleGroups.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs font-mono uppercase">
                Nenhum contrato de crediário localizado com os filtros aplicados.
              </div>
            ) : (
              <div className="space-y-3">
                {saleGroups.map(group => {
                  const isExpanded = expandedGroupId === group.saleId;
                  const totalGroup = group.installments.reduce((a: number, b: any) => a + Number(b.value || 0), 0);
                  const paidGroup = group.installments.filter((i: any) => i.status === 'paid' || i.status === 'pago').reduce((a: number, b: any) => a + Number(b.value || 0), 0);
                  const progressPct = totalGroup > 0 ? (paidGroup / totalGroup) * 100 : 0;

                  return (
                    <div key={group.saleId} className="border border-white/10 rounded-2xl bg-white/2 overflow-hidden">
                      <div
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.saleId)}
                        className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-primary">
                            <Store size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                              {group.customerName}
                              <span className="text-[9px] font-mono text-zinc-400 font-normal">CPF: {group.customerCpf || 'N/I'}</span>
                            </h4>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {group.deviceModel} • {group.installments.length} Parcelas
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">Quitado / Total</span>
                            <span className="text-xs font-black text-white font-mono">
                              R$ {formatBRL(paidGroup)} / R$ {formatBRL(totalGroup)}
                            </span>
                          </div>

                          <div className="w-20 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                          </div>

                          <button
                            type="button"
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-zinc-400"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-white/10 bg-black/20 p-4">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-[9px] font-black uppercase text-zinc-400 tracking-wider border-b border-white/10">
                                <th className="pb-2">Nº Parcela</th>
                                <th className="pb-2">Vencimento</th>
                                <th className="pb-2">Valor</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs font-mono">
                              {group.installments.map((inst: any) => {
                                const isPaid = inst.status === 'paid' || inst.status === 'pago';
                                return (
                                  <tr key={inst.id} className="hover:bg-white/5">
                                    <td className="py-2.5 text-zinc-300 font-bold">
                                      Parcela {inst.number || inst.installment_number}
                                    </td>
                                    <td className="py-2.5 text-zinc-400">
                                      {inst.due_date ? new Date(inst.due_date).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    <td className="py-2.5 font-black text-white">
                                      R$ {formatBRL(inst.value)}
                                    </td>
                                    <td className="py-2.5">
                                      {isPaid ? (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase">
                                          Pago
                                        </span>
                                      ) : inst.status === 'overdue' ? (
                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase">
                                          Vencido
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase">
                                          A Vencer
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {!isPaid ? (
                                          <button
                                            type="button"
                                            onClick={() => setPayModalItem(inst)}
                                            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <CheckCircle2 size={12} /> Baixar
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleRevertPay(inst)}
                                            className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <RotateCcw size={12} /> Estornar
                                          </button>
                                        )}
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 3: LANÇAMENTOS & DESPESAS DA LOJA */}
      {activeSubTab === 'despesas' && (
        <div className="space-y-6">
          {/* BARRA DE FILTRO DE PERÍODO (MÊS / ANO) */}
          {renderPeriodFilter()}

          {/* Dashboard de Lançamentos e Saldo em Caixa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">🟢 VALOR EM CAIXA ATUALMENTE</span>
                <DollarSign size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black font-mono text-emerald-400">
                R$ {formatBRL(saldoCaixaAtual)}
              </h3>
              <p className="text-[10px] text-emerald-400/80 font-mono mt-1">Saldo físico estimado do caixa da loja</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">📥 TOTAL ENTRADAS / SUPRIMENTOS</span>
                <ArrowUpRight size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black font-mono text-white">
                R$ {formatBRL(totalEntradasCaixaLoja)}
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">Entradas, vendas e reforços no período</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">💸 TOTAL SAÍDAS / DESPESAS</span>
                <ArrowDownRight size={18} className="text-rose-400" />
              </div>
              <h3 className="text-2xl font-black font-mono text-rose-400">
                R$ {formatBRL(despesasOutflowTotal)}
              </h3>
              <p className="text-[10px] text-rose-400/80 font-mono mt-1">Sangrias e despesas pagas no período</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-3xl">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Lançamentos & Despesas do Caixa da Loja Física</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Registro de sangrias, suprimentos e custos operacionais da loja</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Filtro Tipo */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'inflow', label: 'Entradas' },
                  { id: 'outflow', label: 'Saídas' }
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

              {/* Filtro Categoria */}
              <select
                value={txCategoryFilter}
                onChange={(e) => setTxCategoryFilter(e.target.value)}
                className="bg-[#181824] text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/10 outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                <option value="despesa_luz">Conta de Luz</option>
                <option value="despesa_aluguel">Aluguel</option>
                <option value="despesa_internet">Internet / Telefone</option>
                <option value="despesa_funcionarios">Salários / Vales</option>
                <option value="despesa_limpeza">Limpeza / Materiais</option>
                <option value="despesa_marketing">Marketing / Anúncios</option>
                <option value="sangria">Sangria de Caixa</option>
                <option value="suprimento">Suprimento de Caixa</option>
                <option value="despesa_outros">Outras Despesas</option>
              </select>

              {/* Filtro Método */}
              <select
                value={txPaymentMethodFilter}
                onChange={(e) => setTxPaymentMethodFilter(e.target.value)}
                className="bg-[#181824] text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/10 outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Todos os Métodos</option>
                <option value="money">Dinheiro</option>
                <option value="pix">PIX</option>
                <option value="card">Cartão</option>
              </select>

              {/* Busca */}
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
                Total: {filteredStoreTxs.length}
              </span>
            </div>
          </div>

          <div className="bg-white/2 border border-white/10 rounded-3xl overflow-hidden">
            {filteredStoreTxs.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs font-mono uppercase">
                Nenhum lançamento ou despesa registrado no caixa da loja para os filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      <th className="p-4">Data/Hora</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Método</th>
                      <th className="p-4 text-right">Valor (R$)</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono">
                    {filteredStoreTxs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-zinc-400">
                          {new Date(tx.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4">
                          {tx.type === 'inflow' ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                              🟢 Entrada
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                              🔴 Saída / Despesa
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-zinc-300 uppercase font-bold text-[10px]">
                          {tx.category || 'Geral'}
                        </td>
                        <td className="p-4 font-bold text-white">
                          {tx.description || '-'}
                        </td>
                        <td className="p-4 text-zinc-300 font-bold uppercase text-[10px]">
                          {(tx.payment_method as string) === 'money' ? 'DINHEIRO' :
                           (tx.payment_method as string) === 'bank' || (tx.payment_method as string) === 'transfer' || (tx.payment_method as string) === 'boleto' ? 'BOLETO / TRANSF.' :
                           (tx.payment_method as string) === 'card' ? 'CARTÃO' :
                           String(tx.payment_method || 'PIX').toUpperCase()}
                        </td>
                        <td className="p-4 text-right font-black text-white text-sm">
                          R$ {formatBRL(tx.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 transition-all cursor-pointer"
                            title="Excluir Lançamento"
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
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA 4: LUCRO PRESUMIDO DA LOJA (VENDAS, ESTOQUE & SERVIÇOS) */}
      {activeSubTab === 'lucro_presumido' && (
        <StoreProfitReport selectedUnitId={selectedUnitId} />
      )}

      {/* MODAL DE NOVA DESPESA / LANÇAMENTO LOJA */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12121e] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Novo Lançamento no Caixa Loja</h3>
              <button onClick={() => setIsTxModalOpen(false)} className="text-zinc-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleCreateTx} className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block mb-1">Tipo de Movimentação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxFormData(prev => ({ ...prev, type: 'inflow', category: 'suprimento' }))}
                    className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                      txFormData.type === 'inflow'
                        ? 'bg-emerald-500 text-black border-emerald-400 font-black'
                        : 'bg-white/5 text-zinc-400 border-white/10'
                    }`}
                  >
                    🟢 Entrada / Suprimento
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxFormData(prev => ({ ...prev, type: 'outflow', category: 'sangria' }))}
                    className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                      txFormData.type === 'outflow'
                        ? 'bg-red-500 text-white border-red-400 font-black'
                        : 'bg-white/5 text-zinc-400 border-white/10'
                    }`}
                  >
                    🔴 Saída / Sangria
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={txFormData.amount}
                  onChange={(e) => setTxFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-lg font-bold outline-none focus:border-primary"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block mb-1">Forma de Pagamento</label>
                <select
                  value={txFormData.payment_method}
                  onChange={(e) => setTxFormData(prev => ({ ...prev, payment_method: e.target.value as any }))}
                  className="w-full bg-[#161625] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary font-mono uppercase"
                >
                  <option value="money">Dinheiro Espécie</option>
                  <option value="pix">PIX</option>
                  <option value="card">Cartão</option>
                  <option value="bank">Transferência Bancária</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  value={txFormData.description}
                  onChange={(e) => setTxFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-primary"
                  placeholder="Ex: Sangria para depósito, Conta de Luz..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingTx}
                className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all hover:scale-[1.02] shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-40"
              >
                {isSubmittingTx ? 'Salvando...' : 'Confirmar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHADO 1: ENTRADAS DE FINANCIAMENTOS DE CELULARES */}
      {isFinancModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setIsFinancModalOpen(false)}>
          <div className="bg-[#12121e] border border-white/10 rounded-3xl p-6 max-w-3xl w-full space-y-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Entradas de Financiamento de Celulares</h3>
                <p className="text-xs text-zinc-400">Valores de entrada recebidos no balcão exclusivamente para contratos de aparelhos no período</p>
              </div>
              <button onClick={() => setIsFinancModalOpen(false)} className="text-zinc-400 hover:text-white p-2 cursor-pointer">✕</button>
            </div>

            <div className="flex items-center justify-between gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl shrink-0">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Total Entradas (No Período)</span>
                <span className="text-2xl font-black text-white font-mono">
                  R$ {Number(totalFinancPeriod).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente ou aparelho..."
                  value={financSearchTerm}
                  onChange={(e) => setFinancSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-blue-400 font-mono"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-white/10 rounded-2xl">
              {filteredFinancList.filter((item: any) => {
                const matchCust = (item.customerName || '').toLowerCase().includes(financSearchTerm.toLowerCase());
                const matchDev = (item.deviceModel || '').toLowerCase().includes(financSearchTerm.toLowerCase());
                return matchCust || matchDev;
              }).length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-mono uppercase">
                  Nenhuma entrada de financiamento localizada neste período.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Aparelho / Contrato</th>
                      <th className="p-3 text-right">Valor da Entrada (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono">
                    {filteredFinancList.filter((item: any) => {
                      const matchCust = (item.customerName || '').toLowerCase().includes(financSearchTerm.toLowerCase());
                      const matchDev = (item.deviceModel || '').toLowerCase().includes(financSearchTerm.toLowerCase());
                      return matchCust || matchDev;
                    }).map((item: any) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-zinc-400">
                          {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="p-3 font-bold text-white uppercase">
                          {item.customerName || 'Cliente Balcão'}
                        </td>
                        <td className="p-3 text-zinc-300">
                          {item.deviceModel || 'Aparelho'}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-400 text-sm">
                          + R$ {Number(item.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFinancModalOpen(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs uppercase cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHADO 2: VENDAS À VISTA & DIVERSOS */}
      {isOutrasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setIsOutrasModalOpen(false)}>
          <div className="bg-[#12121e] border border-white/10 rounded-3xl p-6 max-w-3xl w-full space-y-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Vendas à Vista & Diversos do Balcão</h3>
                <p className="text-xs text-zinc-400">Recebimentos de acessórios, peças, assistência e vendas à vista na loja física no período</p>
              </div>
              <button onClick={() => setIsOutrasModalOpen(false)} className="text-zinc-400 hover:text-white p-2 cursor-pointer">✕</button>
            </div>

            <div className="flex items-center justify-between gap-4 bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl shrink-0">
              <div>
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">Total Vendas à Vista (No Período)</span>
                <span className="text-2xl font-black text-white font-mono">
                  R$ {Number(totalOutrasPeriod).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar produto ou cliente..."
                  value={outrasSearchTerm}
                  onChange={(e) => setOutrasSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-purple-400 font-mono"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-white/10 rounded-2xl">
              {filteredOutrasList.filter((item: any) => {
                const matchCust = (item.customerName || '').toLowerCase().includes(outrasSearchTerm.toLowerCase());
                const matchDev = (item.deviceModel || '').toLowerCase().includes(outrasSearchTerm.toLowerCase());
                return matchCust || matchDev;
              }).length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-mono uppercase">
                  Nenhuma venda à vista localizada neste período.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Item / Serviço</th>
                      <th className="p-3 text-right">Valor Recebido (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono">
                    {filteredOutrasList.filter((item: any) => {
                      const matchCust = (item.customerName || '').toLowerCase().includes(outrasSearchTerm.toLowerCase());
                      const matchDev = (item.deviceModel || '').toLowerCase().includes(outrasSearchTerm.toLowerCase());
                      return matchCust || matchDev;
                    }).map((item: any) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-zinc-400">
                          {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="p-3 font-bold text-white uppercase">
                          {item.customerName || 'Cliente Balcão'}
                        </td>
                        <td className="p-3 text-zinc-300">
                          {item.deviceModel || 'Produto'}
                        </td>
                        <td className="p-3 text-right font-black text-purple-400 text-sm">
                          + R$ {Number(item.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsOutrasModalOpen(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs uppercase cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BAIXA DE PARCELA DO CREDIÁRIO LOJA */}
      {payModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12121e] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Registrar Pagamento de Parcela</h3>
              <button onClick={() => setPayModalItem(null)} className="text-zinc-400 hover:text-white p-1">✕</button>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
              <p><span className="text-zinc-400 font-bold uppercase block text-[10px]">Cliente</span> <span className="text-white font-bold uppercase">{payModalItem.customer_name || payModalItem.sales?.customers?.name || 'Cliente Balcão'}</span></p>
              <p><span className="text-zinc-400 font-bold uppercase block text-[10px]">Item / Serviço</span> <span className="text-white">{payModalItem.device_model || payModalItem.sales?.device_model || 'Balcão'}</span></p>
              <p><span className="text-zinc-400 font-bold uppercase block text-[10px]">Valor da Parcela</span> <span className="text-emerald-400 font-black text-base font-mono">R$ {Number(payModalItem.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
            </div>

            <div>
              <label className="text-xs font-black text-white uppercase tracking-wider block mb-2">Forma de Recebimento</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pix', label: 'PIX' },
                  { id: 'money', label: 'Dinheiro' },
                  { id: 'card', label: 'Cartão' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id as any)}
                    className={`py-3 rounded-xl text-xs font-bold uppercase transition-all border ${
                      payMethod === m.id
                        ? 'bg-emerald-500 text-black border-emerald-400 font-black'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmPay}
              disabled={isSubmittingPay}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 cursor-pointer"
            >
              {isSubmittingPay ? 'Registrando...' : 'Confirmar Baixa de Parcela'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL PIX / BOLETO DINÂMICO DO CREDIÁRIO */}
      {pixModalItem && (
        <PixBoletoModal
          item={pixModalItem}
          onClose={() => setPixModalItem(null)}
          pixKey={unit?.pix_key || '023.528.650-85'}
          pixName={unit?.name || 'MDR INFORMÁTICA E CELULARES'}
          pixPhone={unit?.phone || '(48) 99903-5854'}
        />
      )}

      {/* MODAL DE PREVIEW E IMPRESSÃO DE COMPROVANTE SIMPLIFICADO */}
      {printModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12121e] border border-white/10 rounded-3xl p-6 max-w-3xl w-full space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Imprimir Carnê / Comprovante Simplificado</h3>
                <p className="text-xs text-zinc-400">Escolha o formato de saída para impressora de recibo ou A4</p>
              </div>
              <button onClick={() => setPrintModalSale(null)} className="text-zinc-400 hover:text-white p-2">✕</button>
            </div>

            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10 shrink-0">
              <span className="text-xs font-black text-white uppercase">Formato de Impressão:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintFormatMode('cupom')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    printFormatMode === 'cupom'
                      ? 'bg-amber-500 text-black font-black'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  🧾 Cupom Térmico (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormatMode('a4')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    printFormatMode === 'a4'
                      ? 'bg-amber-500 text-black font-black'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  📄 A4 Simples
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-900/80 p-6 rounded-2xl border border-white/10 flex justify-center">
              <SimpleStoreCrediarioPrint
                customerName={printModalSale.customerName}
                customerCpf={printModalSale.customerCpf}
                customerPhone={printModalSale.customerPhone}
                productOrService={printModalSale.deviceModel}
                saleDate={printModalSale.date}
                installments={printModalSale.installments.map((i: any) => ({
                  number: i.number || i.installment_number || 1,
                  total: i.total || i.total_installments || 1,
                  dueDate: i.due_date,
                  value: i.value,
                  status: i.status,
                  paymentDate: i.payment_date
                }))}
                formatMode={printFormatMode}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 shrink-0 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPrintModalSale(null)}
                className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs uppercase cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-xs uppercase flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Printer size={16} />
                Imprimir {printFormatMode === 'cupom' ? 'Cupom 80mm' : 'Documento A4'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="print-mount-point" className="hidden">
        {pixModalItem && (
          <PixBoletoPrint
            installments={[pixModalItem]}
            customer={{
              name: pixModalItem.customer_name || 'Cliente Sem Nome',
              cpf: pixModalItem.customer_cpf || '',
              phone: pixModalItem.customer_phone || '',
              address: pixModalItem.customer_address || ''
            }}
            unit={unit || { name: 'MDR INFORMÁTICA E CELULARES', cnpj: '023.528.650-85', phone: '(48) 99903-5854' }}
          />
        )}
      </div>
    </div>
  );
}
