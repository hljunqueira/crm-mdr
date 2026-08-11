import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  RefreshCw, 
  ShieldCheck,
  Calendar,
  Printer,
  Smartphone,
  Calculator,
  Search,
  Download,
  Filter,
  Store,
  HelpCircle,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSaleStore } from '../store/useSaleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useUnitStore } from '../store/useUnitStore';

export default function FinanceiraReports() {
  const { profile } = useAuthStore();
  const { sales, fetchSales } = useSaleStore();
  const { inventory, fetchInventory } = useInventoryStore();
  const { units, fetchAllUnits } = useUnitStore();

  const [activeTab, setActiveTab] = useState<'visao_consolidada' | 'lucro_financiamento'>('visao_consolidada');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    recebidos: 0,
    aReceber: 0,
    emContaSaqueInvestidor: 0,
    saqueEfetuado: 0,
    saquesPendentes: 0,
    repasseInvestidoresTotal: 0,
    rendimentoLiquidoFinanceira: 0
  });

  // Filtros para a aba de Lucro Presumido da Financeira
  const [filterMode, setFilterMode] = useState<'month_year' | 'all' | 'today' | 'week' | 'current_month' | 'custom'>('month_year');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPaybackModalOpen, setIsPaybackModalOpen] = useState(false);

  const fetchConsolidatedData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/financial-dashboard/reports-consolidated');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching consolidated financial report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsolidatedData();
    fetchSales();
    fetchInventory();
    fetchAllUnits();
  }, []);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = [2024, 2025, 2026, 2027];

  // Cálculo do Lucro Presumido da FINANCEIRA (Financiamento Celulares MDM)
  // Fórmula:
  // - Entrada (Loja) = s.down_payment (fica com a loja)
  // - Financiado (Parcelas) = s.total_value - s.down_payment
  // - Lucro Financeira = Financiado (Parcelas) - Custo Aparelho
  const monthlyFinancingProfitItems = useMemo(() => {
    const items: Array<{
      saleNumber: string;
      customerName: string;
      product: string;
      imei: string;
      downPayment: number;
      installmentsCount: number;
      cost: number;
      totalContract: number;
      financedAmount: number;
      profit: number;
      margin: number;
      isTradeIn: boolean;
      tradeInValuation: number;
      dateStr: string;
      unitId?: string;
    }> = [];

    const excludePrefixes = ['cabo', 'capa', 'pelicula', 'película', 'assistencia', 'assistência', 'carregador', 'fone', 'fonte', 'reparo', 'suporte', 'chip', 'tela', 'placa'];

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const currentMonthNum = new Date().getMonth() + 1;
    const currentYearNum = new Date().getFullYear();

    const filteredSales = sales.filter(s => {
      if (s.status === 'cancelled') return false;
      
      const isFinanc = s.origin_type === 'FINANCIAMENTO_CELULAR';
      if (!isFinanc) return false;

      // Ocultar vendas à vista / sem parcelamento ativo sob financiamento
      if (s.installments <= 1 || s.payment_type === 'vista' || s.payment_type === 'debit') return false;

      const model = (s.device_model || '').toLowerCase().trim();
      const isExcluded = excludePrefixes.some(p => model.startsWith(p));
      if (isExcluded) return false;

      // Filtro por Unidade / Loja
      if (selectedUnitId !== 'all' && s.unit_id !== selectedUnitId) {
        return false;
      }

      const cleanDateStr = (s.date || s.created_at || '').split('T')[0];
      if (!cleanDateStr) return false;
      const [sYear, sMonth, sDay] = cleanDateStr.split('-').map(Number);
      if (!sYear || !sMonth) return false;

      // Filtro por Período
      if (filterMode === 'month_year') {
        if (sMonth !== selectedMonth || sYear !== selectedYear) return false;
      } else if (filterMode === 'today') {
        if (cleanDateStr !== todayStr) return false;
      } else if (filterMode === 'week') {
        if (cleanDateStr < sevenDaysAgo) return false;
      } else if (filterMode === 'current_month') {
        if (sMonth !== currentMonthNum || sYear !== currentYearNum) return false;
      } else if (filterMode === 'custom') {
        if (customStartDate && cleanDateStr < customStartDate) return false;
        if (customEndDate && cleanDateStr > customEndDate) return false;
      }

      // Filtro de Pesquisa em Tempo Real
      if (searchQuery.trim() !== '') {
        const queryLower = searchQuery.toLowerCase().trim();
        const custLower = (s.customer_name || '').toLowerCase();
        const modelLower = (s.device_model || '').toLowerCase();
        const imeiLower = (s.imei || '').toLowerCase();
        const idLower = (s.id || '').toLowerCase();

        const matches = custLower.includes(queryLower) ||
                        modelLower.includes(queryLower) ||
                        imeiLower.includes(queryLower) ||
                        idLower.includes(queryLower);

        if (!matches) return false;
      }

      return true;
    });

    filteredSales.forEach(s => {
      const saleNum = s.id.split('-')[0].toUpperCase();
      const mainDevice = inventory.find(inv => inv.id === s.device_id || (inv.imei && s.imei && inv.imei === s.imei));
      
      // Valor de Venda do Aparelho pela loja (cobrado à vista / repassado)
      const costPrice = (s.original_price && s.original_price > 0)
        ? s.original_price
        : ((s.device_sale_price && s.device_sale_price > 0)
            ? s.device_sale_price
            : (mainDevice ? (mainDevice.sale_price || mainDevice.price) : (s.device_cost_price || 0)));
      
      // Financiado Total (Total do Financiamento cobrado pela Financeira ao cliente)
      const totalContract = Number(s.total_value || s.original_price || 0);
      const downPay = Number(s.down_payment || 0);
      const financedAmount = totalContract;
      
      // Lucro Real da Financeira = Total Financiamento - Valor do Aparelho da Loja
      // Ex Alex: R$ 5.762,56 (Total Financiado) - R$ 4.500,00 (Compra da Loja) = R$ 1.262,56
      const profit = financedAmount - costPrice;

      const margin = costPrice > 0 ? (profit / costPrice) * 100 : 0;
      const custName = s.customer_name || 'Cliente Sem Nome';

      items.push({
        saleNumber: saleNum,
        customerName: custName,
        product: s.device_model || 'Smartphone Financiado',
        imei: s.imei || 'N/A',
        downPayment: downPay,
        installmentsCount: s.installments || 1,
        cost: costPrice,
        totalContract: totalContract,
        financedAmount: financedAmount,
        profit: profit,
        margin: margin,
        isTradeIn: !!s.is_trade_in,
        tradeInValuation: s.trade_in_valuation || 0,
        dateStr: (s.date || s.created_at || '').split('T')[0],
        unitId: s.unit_id
      });
    });

    return items;
  }, [sales, inventory, filterMode, selectedMonth, selectedYear, customStartDate, customEndDate, selectedUnitId, searchQuery]);

  const financingTotals = useMemo(() => {
    let totalCost = 0;
    let totalFinanced = 0;
    let totalContract = 0;
    let totalProfit = 0;
    let totalDown = 0;

    let totalMonthlyInstallmentSum = 0;

    monthlyFinancingProfitItems.forEach(item => {
      totalCost += item.cost;
      totalFinanced += item.financedAmount;
      totalContract += item.totalContract;
      totalProfit += item.profit;
      totalDown += item.downPayment;

      const monthlyInst = item.installmentsCount > 0 ? (item.financedAmount / item.installmentsCount) : item.financedAmount;
      totalMonthlyInstallmentSum += monthlyInst;
    });

    const margin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    // Payback em número de parcelas = Valor Total dos Aparelhos / Soma das Parcelas Mensais da Carteira
    const avgPaybackInstallments = totalMonthlyInstallmentSum > 0 ? (totalCost / totalMonthlyInstallmentSum) : 0;
    const monthlyReturnRate = totalCost > 0 ? (totalMonthlyInstallmentSum / totalCost) * 100 : 0;

    return { 
      cost: totalCost, 
      financed: totalFinanced, 
      contract: totalContract, 
      profit: totalProfit, 
      down: totalDown, 
      margin,
      avgPaybackInstallments,
      monthlyReturnRate
    };
  }, [monthlyFinancingProfitItems]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (monthlyFinancingProfitItems.length === 0) return;

    const headers = ["Nº Venda", "Data", "Cliente", "Aparelho / Modelo", "IMEI", "Entrada (Loja)", "Parcelas", "Valor Aparelho", "Financiado (Parcelas)", "Lucro Financeira", "% Rentabilidade"];
    const rows = monthlyFinancingProfitItems.map(item => [
      item.saleNumber,
      item.dateStr,
      `"${item.customerName.replace(/"/g, '""')}"`,
      `"${item.product.replace(/"/g, '""')}"`,
      `"${item.imei}"`,
      item.downPayment.toFixed(2),
      `${item.installmentsCount}x`,
      item.cost.toFixed(2),
      item.financedAmount.toFixed(2),
      item.profit.toFixed(2),
      `${item.margin.toFixed(2)}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

    const cleanPeriodLabel = periodDisplayLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
    const filename = `lucro_presumido_financeira_${cleanPeriodLabel}_${new Date().toISOString().split('T')[0]}.csv`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedMonthLabel = months.find(m => m.value === selectedMonth)?.label || '';

  const periodDisplayLabel = useMemo(() => {
    if (filterMode === 'month_year') return `${selectedMonthLabel} / ${selectedYear}`;
    if (filterMode === 'all') return 'Todos os Períodos';
    if (filterMode === 'today') return 'Hoje';
    if (filterMode === 'week') return 'Últimos 7 Dias';
    if (filterMode === 'current_month') return 'Este Mês';
    if (filterMode === 'custom') return `${customStartDate ? new Date(customStartDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'} até ${customEndDate ? new Date(customEndDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}`;
    return '';
  }, [filterMode, selectedMonthLabel, selectedYear, customStartDate, customEndDate]);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto print:p-0 print:space-y-2">
      {/* HEADER SECTION (HIDDEN ON PRINT) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-[#121214] via-[#18181b] to-[#121214] p-6 rounded-3xl border border-zinc-800 shadow-2xl print:hidden">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
            <Landmark size={16} /> Módulo Financeira
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Relatórios Consolidados & Conciliação</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestão de recebimentos, conciliação de carteiras e Lucro Presumido de Financiamento de Celulares.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'lucro_financiamento' && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                title="Exportar para Excel / CSV"
              >
                <Download size={15} /> Exportar CSV
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <Printer size={15} /> Imprimir PDF
              </button>
            </>
          )}
          <button
            onClick={fetchConsolidatedData}
            disabled={loading}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* TABS SELECTOR (HIDDEN ON PRINT) */}
      <div className="flex p-1 bg-[#121214] rounded-3xl mb-4 gap-1 border border-white/5 max-w-2xl print:hidden">
        <button
          onClick={() => setActiveTab('visao_consolidada')}
          className={`grow py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'visao_consolidada'
              ? 'bg-emerald-500 text-black shadow-lg font-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Landmark size={15} /> Visão Consolidada
        </button>

        <button
          onClick={() => setActiveTab('lucro_financiamento')}
          className={`grow py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'lucro_financiamento'
              ? 'bg-emerald-500 text-black shadow-lg font-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smartphone size={15} /> Lucro Presumido (Financiamento Celular)
        </button>
      </div>

      {/* ─── ABA 1: VISÃO CONSOLIDADA ───────────────────────────────────────────────── */}
      {activeTab === 'visao_consolidada' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* PAINEL COMPARATIVO DE ORIGEM DOS CAIXAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/2 p-4 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">📱 Caixa Financiamento Celular</h4>
                <p className="text-[10px] text-emerald-400 font-mono font-medium">Contratos com Aparelhos / MDM / Investimentos SCP</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
                <DollarSign size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">🏬 Caixa Crediário Loja</h4>
                <p className="text-[10px] text-purple-300 font-mono font-medium">Vendas Balcão, Serviços e Crediário Próprio da Loja</p>
              </div>
            </div>
          </div>

          {/* 4 PILARES FINANCEIROS - METRICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. RECEBIDOS */}
            <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">1. Recebidos (Boletos/Parcelas)</span>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold tracking-tight text-emerald-400">
                  R$ {data.recebidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                  <ArrowUpRight size={14} className="text-emerald-400" />
                  Total pago pelos clientes na conta da financeira
                </p>
              </div>
            </div>

            {/* 2. A RECEBER */}
            <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">2. A Receber (Futuro)</span>
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Clock size={18} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold tracking-tight text-indigo-400">
                  R$ {data.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-indigo-400" />
                  Parcelas vincendas a serem cobradas
                </p>
              </div>
            </div>

            {/* 3. EM CONTA PARA SAQUE INVESTIDOR */}
            <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">3. Em Conta p/ Saque Investidor</span>
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Wallet size={18} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold tracking-tight text-amber-400">
                  R$ {data.emContaSaqueInvestidor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-400" />
                  Saldo acumulado em carteira disponível p/ Pix
                </p>
              </div>
            </div>

            {/* 4. SAQUE EFETUADO */}
            <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-purple-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">4. Saque Efetuado (Pagos)</span>
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ArrowDownLeft size={18} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold tracking-tight text-purple-400">
                  R$ {data.saqueEfetuado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-purple-400" />
                  Resgates Pix aprovados e quitados aos investidores
                </p>
              </div>
            </div>
          </div>

          {/* PAINEL COMPLEMENTAR DE CONCILIAÇÃO & RENDIMENTO DA FINANCEIRA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 space-y-3">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-amber-400">
                <span>Saques Pendentes (Reservados)</span>
                <Clock size={16} />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                R$ {data.saquesPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-zinc-500">
                Valor retido em análise aguardando autorização de resgate Pix.
              </p>
            </div>

            <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 space-y-3">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-indigo-400">
                <span>Repasse Histórico Investidores</span>
                <Calculator size={16} />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                R$ {data.repasseInvestidoresTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-zinc-500">
                Soma de todo o capital amortizado e lucros distribuídos.
              </p>
            </div>

            <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 space-y-3">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-emerald-400">
                <span>Rendimento Líquido Financeira</span>
                <DollarSign size={16} />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                R$ {data.rendimentoLiquidoFinanceira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-zinc-500">
                Margem retida pela plataforma financeira (spread & taxa adm).
              </p>
            </div>
          </div>

          {/* INFORMATIVO DE FLUXO */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <FileText size={16} className="text-emerald-400" /> Diretrizes Operacionais do Módulo Financeira
            </h3>
            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-5">
              <li>Os boletos gerados são cobrados sob titularidade da <strong>Plataforma Financeira</strong>.</li>
              <li>Ao confirmar o recebimento do boleto, o motor realiza o split entre o ressarcimento da loja parceira e o lucro do investidor.</li>
              <li>A gestão e ordem de <strong>Bloqueio de Celulares (MDM/Knox)</strong> permanece manual sob controle da plataforma financeira credora.</li>
              <li>Os saques solicitados pelos investidores reservam o saldo livre da carteira imediatamente até a aprovação definitiva do Pix.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ─── ABA 2: LUCRO PRESUMIDO DA FINANCEIRA - FINANCIAMENTO DE CELULARES ─────────── */}
      {activeTab === 'lucro_financiamento' && (
        <div className="space-y-6 print:space-y-2 animate-in fade-in duration-300">
          {/* FILTROS AVANÇADOS POR PERÍODO, UNIDADE E BUSCA (HIDDEN ON PRINT) */}
          <div className="bg-white/2 border border-white/5 rounded-3xl p-5 space-y-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Filter size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Filtros do Financiamento da Financeira</h3>
                  <p className="text-[10px] text-zinc-400">Selecione o período, unidade da loja e busque contratos</p>
                </div>
              </div>

              {/* Busca em Tempo Real */}
              <div className="relative min-w-65 grow sm:grow-0">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente, modelo, IMEI..."
                  className="w-full bg-[#18181b] border border-white/10 rounded-2xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Seletores de Tipo de Período */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'month_year', label: 'Por Mês/Ano' },
                  { id: 'today', label: 'Hoje' },
                  { id: 'week', label: '7 Dias' },
                  { id: 'current_month', label: 'Este Mês' },
                  { id: 'all', label: 'Todos' },
                  { id: 'custom', label: 'Personalizado' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setFilterMode(mode.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      filterMode === mode.id
                        ? 'bg-emerald-500 text-black border-emerald-500 font-black shadow-md'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Seletores de Mês/Ano ou Datas Customizadas */}
              <div className="flex flex-wrap items-center gap-3">
                {filterMode === 'month_year' && (
                  <>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-[#18181b] border border-white/10 rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-bold"
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>

                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-[#18181b] border border-white/10 rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-bold"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </>
                )}

                {filterMode === 'custom' && (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-[#18181b] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                    />
                    <span className="text-zinc-500">até</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-[#18181b] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                )}

                {/* Filtro por Loja / Unidade */}
                <div className="flex items-center gap-2">
                  <Store size={14} className="text-zinc-400" />
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="bg-[#18181b] border border-white/10 rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="all">Todas as Lojas</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* TÍTULO EXCLUSIVO PARA IMPRESSÃO */}
          <div className="hidden print:block border-b border-black pb-2 mb-2 text-black">
            <h1 className="text-xl font-black uppercase leading-tight">Relatório Consolidado — Lucro Presumido da Financeira</h1>
            <p className="text-[9px] text-gray-700 uppercase tracking-wider font-bold mt-0.5">
              Período: {periodDisplayLabel} | Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>

          {/* CARDS DE RESUMO DO LUCRO DA FINANCEIRA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-5 print:gap-1.5">
            {/* Financiado (Parcelas) */}
            <div className="bg-linear-to-br from-[#18181b] to-[#121214] border border-white/10 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg">
              <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest">Financiado (Parcelas)</span>
              <h3 className="text-xl print:text-xs font-black text-white print:text-black font-mono mt-1.5 print:mt-0">
                R$ {financingTotals.financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Valor Aparelho */}
            <div className="bg-linear-to-br from-[#18181b] to-[#121214] border border-white/10 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg">
              <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest">Valor Aparelho</span>
              <h3 className="text-xl print:text-xs font-black text-zinc-300 print:text-black font-mono mt-1.5 print:mt-0">
                R$ {financingTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Lucro Financeira Total */}
            <div className="bg-linear-to-br from-[#18181b] to-[#121214] border border-emerald-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] print:text-[8px] font-black text-emerald-400 print:text-black uppercase tracking-widest">Lucro Financeira Total</span>
                <span title="Lucro bruto acumulado (Total Financiado - Valor dos Aparelhos)">
                  <HelpCircle size={12} className="text-zinc-500 hover:text-emerald-400 cursor-help transition-colors" />
                </span>
              </div>
              <h3 className="text-xl print:text-xs font-black text-emerald-400 print:text-black font-mono mt-1.5 print:mt-0">
                R$ {financingTotals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Rentabilidade Financeira */}
            <div className="bg-linear-to-br from-[#18181b] to-[#121214] border border-indigo-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] print:text-[8px] font-black text-indigo-400 print:text-black uppercase tracking-widest">% Rent. Financeira</span>
                <span title="Margem percentual sobre o valor investido nos aparelhos">
                  <HelpCircle size={12} className="text-zinc-500 hover:text-indigo-400 cursor-help transition-colors" />
                </span>
              </div>
              <h3 className="text-xl print:text-xs font-black text-indigo-400 print:text-black font-mono mt-1.5 print:mt-0">
                {financingTotals.margin.toFixed(2)}%
              </h3>
            </div>

            {/* Previsibilidade de Retorno / Payback */}
            <div 
              onClick={() => setIsPaybackModalOpen(true)}
              className="bg-linear-to-br from-[#18181b] to-[#121214] border border-amber-500/30 hover:border-amber-500/60 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between cursor-pointer group transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-amber-500/5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] print:text-[8px] font-black text-amber-400 print:text-black uppercase tracking-widest flex items-center gap-1">
                    Retorno Valor Aparelho
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                      Ver detalhes
                    </span>
                  </span>
                  <span title="Clique para ver a projeção detalhada por mês e aparelhos">
                    <HelpCircle size={12} className="text-amber-500/70 group-hover:text-amber-400 cursor-help transition-colors" />
                  </span>
                </div>
                <h3 className="text-xl print:text-xs font-black text-amber-400 print:text-black font-mono mt-1.5 print:mt-0">
                  {financingTotals.avgPaybackInstallments > 0 ? `${financingTotals.avgPaybackInstallments.toFixed(1)}ª Parcela` : '-'}
                </h3>
              </div>
              <p className="text-[9px] print:text-[7px] text-zinc-400 print:text-black mt-1 flex justify-between items-center">
                <span>{financingTotals.monthlyReturnRate > 0 ? `${financingTotals.monthlyReturnRate.toFixed(1)}% amortizado / mês` : 'Sem contratos'}</span>
                <span className="text-amber-400/80 font-bold group-hover:translate-x-1 transition-transform">→</span>
              </p>
            </div>
          </div>

          {/* TABELA COM OS NOVOS NOMES DE COLUNAS */}
          <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 print:p-2 print:border-black print:text-black print:rounded-lg overflow-hidden">
            <div className="mb-4 print:hidden flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Smartphones Vendidos por Financiamento</h3>
                <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Detalhamento unitário de celulares financiado — {periodDisplayLabel}</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                {monthlyFinancingProfitItems.length} contrato(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print:text-[9px]">
                <thead>
                  <tr className="border-b border-zinc-800 print:border-black text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest pb-3">
                    <th className="pb-3 print:pb-1 pl-4 print:pl-1">Nº Venda</th>
                    <th className="pb-3 print:pb-1">Cliente</th>
                    <th className="pb-3 print:pb-1">Aparelho / Modelo</th>
                    <th className="pb-3 print:pb-1">IMEI</th>
                    <th className="pb-3 print:pb-1 text-right">Valor Aparelho</th>
                    <th className="pb-3 print:pb-1 text-right">Financiado (Parcelas)</th>
                    <th className="pb-3 print:pb-1 text-right">Lucro Financeira</th>
                    <th className="pb-3 print:pb-1 text-right pr-4 print:pr-1">% Rent. Financeira</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 print:divide-black">
                  {monthlyFinancingProfitItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 print:py-4 text-zinc-500 text-[10px] print:text-[9px] uppercase font-black tracking-widest print:text-black">
                        Nenhum financiamento de smartphone encontrado em {periodDisplayLabel}.
                      </td>
                    </tr>
                  ) : (
                    monthlyFinancingProfitItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/2 print:hover:bg-transparent">
                        <td className="py-3 print:py-1 pl-4 print:pl-1 font-mono font-bold text-white print:text-black">
                          {item.saleNumber}
                        </td>
                        <td className="py-3 print:py-1 font-bold text-white print:text-black uppercase text-[10px]">
                          {item.customerName}
                        </td>
                        <td className="py-3 print:py-1 font-bold text-emerald-400 print:text-black uppercase">
                          {item.product}
                        </td>
                        <td className="py-3 print:py-1 font-mono text-zinc-400 print:text-black">
                          {item.imei}
                        </td>
                        <td className="py-3 print:py-1 text-right font-mono text-zinc-400 print:text-black">
                          R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          {item.cost === 0 && (
                            <span className="block text-[7px] text-amber-400/70 uppercase">Custo zerado</span>
                          )}
                        </td>
                        <td className="py-3 print:py-1 text-right font-mono text-white print:text-black">
                          R$ {item.financedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 print:py-1 text-right font-mono font-bold text-emerald-400 print:text-black">
                          R$ {item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 print:py-1 text-right pr-4 print:pr-1 font-mono font-black text-indigo-400 print:text-black">
                          {item.cost > 0 ? `${item.margin.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Rodapé com Totais Consolidados */}
                {monthlyFinancingProfitItems.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-zinc-700 print:border-black font-black text-xs print:text-[9px] text-white print:text-black bg-white/2 print:bg-transparent">
                      <td colSpan={4} className="py-3 print:py-1.5 pl-4 print:pl-1 uppercase">
                        Totais Consolidados ({periodDisplayLabel})
                      </td>
                      <td className="py-3 print:py-1.5 text-right font-mono">
                        R$ {financingTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 print:py-1.5 text-right font-mono">
                        R$ {financingTotals.financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 print:py-1.5 text-right font-mono text-emerald-400 print:text-black">
                        R$ {financingTotals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 print:py-1.5 text-right pr-4 print:pr-1 font-mono text-indigo-400 print:text-black">
                        {financingTotals.margin.toFixed(2)}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHADO DE PROJEÇÃO DE PARCELAS E RETORNO POR APARELHO */}
      {isPaybackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header do Modal */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-linear-to-r from-[#18181b] to-[#121214]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Cronograma de Retorno e Amortização de Aparelhos
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    Previsão de pagamento por parcela mensal dos {monthlyFinancingProfitItems.length} contrato(s) ({periodDisplayLabel})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPaybackModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Modal Scrollável */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {/* Resumo de Metas de Retorno */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Custo Total dos Aparelhos</span>
                  <p className="text-lg font-black text-white font-mono">
                    R$ {financingTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-zinc-500">Capital investido na aquisição</span>
                </div>

                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Ponto de Equilíbrio (Payback)</span>
                  <p className="text-lg font-black text-amber-400 font-mono">
                    {financingTotals.avgPaybackInstallments > 0 ? `${financingTotals.avgPaybackInstallments.toFixed(1)}ª Parcela` : '-'}
                  </p>
                  <span className="text-[10px] text-amber-400/70">Custo 100% quitado nesta parcela</span>
                </div>

                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Lucro Fixo Estimado</span>
                  <p className="text-lg font-black text-emerald-400 font-mono">
                    R$ {financingTotals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-emerald-400/70">Liberado 100% após a {Math.ceil(financingTotals.avgPaybackInstallments)}ª parcela</span>
                </div>
              </div>

              {/* Tabela de Previsão Mês a Mês (Até 12 Parcelas) */}
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  Evolução do Saldo Acumulado (Amortização Mês a Mês)
                </h4>

                <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#18181b]/50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-zinc-400 font-black">
                        <th className="py-2.5 pl-4">Nº Parcela</th>
                        <th className="py-2.5 text-right">Entrada Prevista (Mês)</th>
                        <th className="py-2.5 text-right">Acumulado Recebido</th>
                        <th className="py-2.5 text-right">Status do Investimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {Array.from({ length: 12 }, (_, idx) => {
                        const parcelaNum = idx + 1;
                        // Soma da parcela mensal de todos os aparelhos
                        const recebimentoMensal = monthlyFinancingProfitItems.reduce((acc, item) => {
                          if (parcelaNum <= item.installmentsCount) {
                            return acc + (item.financedAmount / item.installmentsCount);
                          }
                          return acc;
                        }, 0);

                        // Acumulado até a parcela atual
                        const acumulado = monthlyFinancingProfitItems.reduce((acc, item) => {
                          const parcelasPagas = Math.min(parcelaNum, item.installmentsCount);
                          return acc + (item.financedAmount / item.installmentsCount) * parcelasPagas;
                        }, 0);

                        const totalCusto = financingTotals.cost;
                        const estaQuitado = acumulado >= totalCusto;
                        const faltaCobrir = totalCusto - acumulado;

                        return (
                          <tr key={parcelaNum} className={`hover:bg-white/5 transition-colors ${estaQuitado ? 'bg-emerald-500/5' : ''}`}>
                            <td className="py-2.5 pl-4 font-bold text-white font-mono">
                              {parcelaNum}ª Parcela
                            </td>
                            <td className="py-2.5 text-right font-mono text-zinc-300">
                              R$ {recebimentoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 text-right font-mono text-white font-bold">
                              R$ {acumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 text-right font-mono pr-4">
                              {estaQuitado ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                                  <CheckCircle2 size={10} /> 100% Custo Coberto + Lucro
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 font-bold">
                                  Falta R$ {faltaCobrir.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} p/ amortizar
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detalhamento Individual por Aparelho */}
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Smartphone size={14} className="text-indigo-400" />
                  Detalhamento de Parcelamento por Aparelho
                </h4>

                <div className="space-y-3">
                  {monthlyFinancingProfitItems.map((item, i) => {
                    const valorParcela = item.installmentsCount > 0 ? (item.financedAmount / item.installmentsCount) : item.financedAmount;
                    const parcelasParaPayback = item.cost > 0 && valorParcela > 0 ? (item.cost / valorParcela) : 0;

                    return (
                      <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-emerald-400">{item.saleNumber}</span>
                            <span className="text-xs font-black text-white">{item.customerName}</span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {item.product} <span className="text-zinc-600">| IMEI: {item.imei}</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
                          <div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase block">Custo Aparelho</span>
                            <span className="text-xs font-bold font-mono text-zinc-300">R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase block">Parcela ({item.installmentsCount}x)</span>
                            <span className="text-xs font-bold font-mono text-white">R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-amber-400 uppercase block">Retorno em</span>
                            <span className="text-xs font-black font-mono text-amber-400">
                              {parcelasParaPayback > 0 ? `${parcelasParaPayback.toFixed(1)}ª Parcela` : '-'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-emerald-400 uppercase block">Lucro Total</span>
                            <span className="text-xs font-black font-mono text-emerald-400">R$ {item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-white/10 bg-[#18181b] flex justify-end">
              <button
                onClick={() => setIsPaybackModalOpen(false)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
