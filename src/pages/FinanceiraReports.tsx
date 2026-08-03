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
  Store
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

    monthlyFinancingProfitItems.forEach(item => {
      totalCost += item.cost;
      totalFinanced += item.financedAmount;
      totalContract += item.totalContract;
      totalProfit += item.profit;
      totalDown += item.downPayment;
    });

    const margin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    return { 
      cost: totalCost, 
      financed: totalFinanced, 
      contract: totalContract, 
      profit: totalProfit, 
      down: totalDown, 
      margin 
    };
  }, [monthlyFinancingProfitItems]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (monthlyFinancingProfitItems.length === 0) return;

    const headers = ["Nº Venda", "Data", "Cliente", "Aparelho / Modelo", "IMEI", "Entrada (Loja)", "Parcelas", "Custo Aparelho", "Financiado (Parcelas)", "Lucro Financeira", "% Rentabilidade"];
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

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lucro_presumido_financeira_${new Date().toISOString().split('T')[0]}.csv`);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
            {/* Financiado (Parcelas) */}
            <div className="bg-linear-to-br from-[#18181b] to-[#121214] border border-white/10 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg">
              <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest">Financiado (Parcelas)</span>
              <h3 className="text-xl print:text-xs font-black text-white print:text-black font-mono mt-1.5 print:mt-0">
                R$ {financingTotals.financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Custo Aparelho */}
            <div className="bg-linear-to-br from-[#18181b] to-[#121214] border border-white/10 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg">
              <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest">Custo Aparelho</span>
              <h3 className="text-xl print:text-xs font-black text-zinc-300 print:text-black font-mono mt-1.5 print:mt-0">
                R$ {financingTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Lucro Financeira Total */}
            <div className="bg-linear-to-br from-[#18181b] to-[#121214] border border-emerald-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg">
              <span className="text-[9px] print:text-[8px] font-black text-emerald-400 print:text-black uppercase tracking-widest">Lucro Financeira Total</span>
              <h3 className="text-xl print:text-xs font-black text-emerald-400 print:text-black font-mono mt-1.5 print:mt-0">
                R$ {financingTotals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Rentabilidade Financeira */}
            <div className="bg-linear-to-br from-[#18181b] to-[#121214] border border-indigo-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg">
              <span className="text-[9px] print:text-[8px] font-black text-indigo-400 print:text-black uppercase tracking-widest">% Rent. Financeira</span>
              <h3 className="text-xl print:text-xs font-black text-indigo-400 print:text-black font-mono mt-1.5 print:mt-0">
                {financingTotals.margin.toFixed(2)}%
              </h3>
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
                    <th className="pb-3 print:pb-1 text-right">Custo Aparelho</th>
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
    </div>
  );
}
