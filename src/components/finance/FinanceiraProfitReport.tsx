import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  Search,
  Download,
  Printer,
  HelpCircle,
  Calculator,
  X,
  Smartphone,
  Store,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useSaleStore } from '../../store/useSaleStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useUnitStore } from '../../store/useUnitStore';
import { useFinanceStore } from '../../store/useFinanceStore';

interface FinanceiraProfitReportProps {
  selectedUnitId?: string;
}

export default function FinanceiraProfitReport({ selectedUnitId: parentUnitId }: FinanceiraProfitReportProps) {
  const { sales, fetchSales } = useSaleStore();
  const { inventory, fetchInventory } = useInventoryStore();
  const { units, fetchAllUnits } = useUnitStore();
  const { installments, fetchInstallments } = useFinanceStore();

  const [filterMode, setFilterMode] = useState<'month_year' | 'all' | 'today' | 'week' | 'current_month' | 'custom'>('month_year');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(parentUnitId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPaybackModalOpen, setIsPaybackModalOpen] = useState(false);

  useEffect(() => {
    fetchSales();
    fetchInventory();
    fetchAllUnits();
    fetchInstallments();
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

  const monthlyFinancingProfitItems = useMemo(() => {
    const items: Array<{
      saleNumber: string;
      customerName: string;
      product: string;
      imei: string;
      downPayment: number;
      installmentsCount: number;
      paidInstallmentsCount: number;
      cost: number;
      totalContract: number;
      financedAmount: number;
      paidAmount: number;
      pendingAmount: number;
      realizedProfit: number;
      realizedMargin: number;
      expectedProfit: number;
      isTradeIn: boolean;
      tradeInValuation: number;
      dateStr: string;
      unitId?: string;
    }> = [];

    const excludeKeywords = [
      'cabo', 'capa', 'pelicula', 'película', 'assistencia', 'assistência', 
      'carregador', 'fone', 'fonte', 'reparo', 'suporte', 'chip', 'tela', 'placa',
      'diverso', 'diversos', 'acessorio', 'acessório', 'servico', 'serviço', 'manutencao', 'manutenção', 'produto', 'taxa'
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const currentMonthNum = new Date().getMonth() + 1;
    const currentYearNum = new Date().getFullYear();

    const filteredSales = sales.filter(s => {
      if (s.status === 'cancelled') return false;

      const isFinanc = s.origin_type === 'FINANCIAMENTO_CELULAR';
      if (!isFinanc) return false;

      if (s.installments <= 1 || s.payment_type === 'vista' || s.payment_type === 'debit') return false;

      const model = (s.device_model || '').toLowerCase().trim();
      if (!model || model === 'modelo não informado' || model === 'smartphone' || model === 'diversos (x1)' || model === 'diversos') return false;

      const isExcluded = excludeKeywords.some(w => model.includes(w));
      if (isExcluded) return false;

      if (selectedUnitId !== 'all' && s.unit_id !== selectedUnitId) {
        return false;
      }

      const cleanDateStr = (s.date || s.created_at || '').split('T')[0];
      if (!cleanDateStr) return false;
      const [sYear, sMonth] = cleanDateStr.split('-').map(Number);
      if (!sYear || !sMonth) return false;

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

      return true;
    });

    filteredSales.forEach(s => {
      const saleNum = (s.id || '').split('-')[0].toUpperCase();
      const matchedDevice = inventory.find(inv => inv.id === s.device_id);
      const cost = matchedDevice ? Number(matchedDevice.cost_price || 0) : Number(s.device_cost_price || 0);

      const downPayment = Number(s.down_payment || 0);
      const totalContract = Number(s.total_value || 0);
      const financedAmount = Math.max(0, totalContract - downPayment);

      // Calcular o total e parcelas pagas pelo cliente
      const saleInsts = (installments || []).filter(inst => inst.sale_id === s.id);
      const paidInsts = saleInsts.filter(inst => inst.status === 'paid' || (inst as any).status === 'pago');
      const paidAmount = paidInsts.reduce((sum, inst) => sum + Number(inst.paid_value || inst.value || 0), 0);
      const paidInstallmentsCount = paidInsts.length;
      const totalInstCount = saleInsts.length > 0 ? saleInsts.length : Number(s.installments || 1);
      const pendingAmount = Math.max(0, financedAmount - paidAmount);

      // O Lucro Realizado da Financeira é calculado EXCLUSIVAMENTE sobre as parcelas pagas!
      const realizedProfit = paidAmount - cost;
      const realizedMargin = cost > 0 ? (realizedProfit / cost) * 100 : 0;
      const expectedProfit = financedAmount - cost;

      items.push({
        saleNumber: saleNum,
        customerName: s.customer_name || 'Cliente MDR',
        product: s.device_model || (s as any).device_model_manual || 'Smartphone',
        imei: s.imei || matchedDevice?.imei || 'N/A',
        downPayment,
        installmentsCount: totalInstCount,
        paidInstallmentsCount,
        cost,
        totalContract,
        financedAmount,
        paidAmount,
        pendingAmount,
        realizedProfit,
        realizedMargin,
        expectedProfit,
        isTradeIn: !!s.is_trade_in,
        tradeInValuation: Number(s.trade_in_valuation || 0),
        dateStr: (s.date || s.created_at || '').split('T')[0],
        unitId: s.unit_id
      });
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return items.filter(item =>
        item.saleNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.product.toLowerCase().includes(q) ||
        item.imei.toLowerCase().includes(q)
      );
    }

    return items;
  }, [sales, inventory, installments, filterMode, selectedMonth, selectedYear, customStartDate, customEndDate, selectedUnitId, searchQuery]);

  const financingTotals = useMemo(() => {
    let totalCost = 0;
    let totalFinanced = 0;
    let totalContract = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalRealizedProfit = 0;
    let totalExpectedProfit = 0;
    let totalDown = 0;
    let totalMonthlyInstallmentSum = 0;

    monthlyFinancingProfitItems.forEach(item => {
      totalCost += item.cost;
      totalFinanced += item.financedAmount;
      totalContract += item.totalContract;
      totalPaid += item.paidAmount;
      totalPending += item.pendingAmount;
      totalRealizedProfit += item.realizedProfit;
      totalExpectedProfit += item.expectedProfit;
      totalDown += item.downPayment;

      const monthlyInst = item.installmentsCount > 0 ? (item.financedAmount / item.installmentsCount) : item.financedAmount;
      totalMonthlyInstallmentSum += monthlyInst;
    });

    const realizedMargin = totalCost > 0 ? (totalRealizedProfit / totalCost) * 100 : 0;
    const avgPaybackInstallments = totalMonthlyInstallmentSum > 0 ? (totalCost / totalMonthlyInstallmentSum) : 0;
    const monthlyReturnRate = totalCost > 0 ? (totalMonthlyInstallmentSum / totalCost) * 100 : 0;

    return {
      cost: totalCost,
      financed: totalFinanced,
      contract: totalContract,
      paid: totalPaid,
      pending: totalPending,
      realizedProfit: totalRealizedProfit,
      expectedProfit: totalExpectedProfit,
      down: totalDown,
      realizedMargin,
      avgPaybackInstallments,
      monthlyReturnRate
    };
  }, [monthlyFinancingProfitItems]);

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

  const handleExportCSV = () => {
    if (monthlyFinancingProfitItems.length === 0) return;

    const headers = ["Nº Venda", "Data", "Cliente", "Aparelho / Modelo", "IMEI", "Entrada (Loja)", "Parcelas Pagas", "Valor Aparelho (Custo)", "Financiado (Contrato)", "Parcelas Pagas (R$)", "Lucro Realizado", "% Rentabilidade Realizada"];
    const rows = monthlyFinancingProfitItems.map(item => [
      item.saleNumber,
      item.dateStr,
      `"${item.customerName.replace(/"/g, '""')}"`,
      `"${item.product.replace(/"/g, '""')}"`,
      `"${item.imei}"`,
      item.downPayment.toFixed(2),
      `${item.paidInstallmentsCount}/${item.installmentsCount}`,
      item.cost.toFixed(2),
      item.financedAmount.toFixed(2),
      item.paidAmount.toFixed(2),
      item.realizedProfit.toFixed(2),
      `${item.realizedMargin.toFixed(2)}%`
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER BAR COM FILTROS E EXPORTAÇÃO */}
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 print:hidden shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Lucro Presumido — Financiamento Celular</h3>
              <p className="text-[10px] text-zinc-400 font-medium">Contratos de smartphones parcelados, rentabilidade da carteira e payback</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar cliente, modelo, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              title="Exportar para Excel / CSV"
            >
              <Download size={15} /> CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Printer size={15} /> Imprimir
            </button>
          </div>
        </div>

        {/* BOTOES DE PERIODO RAPIDO */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
          <button
            onClick={() => setFilterMode('month_year')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterMode === 'month_year'
                ? 'bg-emerald-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
          >
            Por Mês/Ano
          </button>

          <button
            onClick={() => setFilterMode('today')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterMode === 'today'
                ? 'bg-emerald-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
          >
            Hoje
          </button>

          <button
            onClick={() => setFilterMode('week')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterMode === 'week'
                ? 'bg-emerald-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
          >
            7 Dias
          </button>

          <button
            onClick={() => setFilterMode('current_month')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterMode === 'current_month'
                ? 'bg-emerald-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
          >
            Este Mês
          </button>

          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterMode === 'all'
                ? 'bg-emerald-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
          >
            Todos
          </button>

          <button
            onClick={() => setFilterMode('custom')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterMode === 'custom'
                ? 'bg-emerald-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
          >
            Personalizado
          </button>

          {/* SELECTORES DE MES E ANO */}
          {filterMode === 'month_year' && (
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold uppercase outline-none focus:border-emerald-500 cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value} className="bg-[#18181b] text-white">
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y} className="bg-[#18181b] text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* DATAS PERSONALIZADAS */}
          {filterMode === 'custom' && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
              />
              <span className="text-zinc-500 text-xs font-bold">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* SELETOR DE UNIDADE/LOJA */}
          <div className="flex items-center gap-2">
            <Store size={14} className="text-zinc-500 ml-2" />
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold uppercase outline-none focus:border-emerald-500 cursor-pointer max-w-44 truncate"
            >
              <option value="all" className="bg-[#18181b] text-white">Todas as Lojas</option>
              {units.map((u: any) => (
                <option key={u.id} value={u.id} className="bg-[#18181b] text-white">
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CABEÇALHO PARA IMPRESSÃO */}
      <div className="hidden print:block border-b border-black pb-2 mb-2 text-black">
        <h1 className="text-xl font-black uppercase leading-tight">Relatório — Lucro Presumido Financiamento Celular</h1>
        <p className="text-[9px] text-gray-700 uppercase tracking-wider font-bold mt-0.5">
          Referência: {periodDisplayLabel} | Unidade: {units.find((u: any) => u.id === selectedUnitId)?.name || 'Todas as Lojas'} | Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* 5 CARDS DE MÉTRICAS DA FINANCEIRA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-5 print:gap-2">
        {/* 1. Financiado (Parcelas) */}
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest block">
              Financiado (Contratos)
            </span>
            <h3 className="text-xl print:text-xs font-black text-white print:text-black font-mono mt-1.5 print:mt-0">
              R$ {financingTotals.financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-zinc-500 print:text-black mt-1">
            Total contratado a receber
          </p>
        </div>

        {/* 2. Valor dos Aparelhos */}
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest block">
              Valor Aparelhos (Custo)
            </span>
            <h3 className="text-xl print:text-xs font-black text-zinc-300 print:text-black font-mono mt-1.5 print:mt-0">
              R$ {financingTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-zinc-500 print:text-black mt-1">
            Capital alocado na compra dos smartphones
          </p>
        </div>

        {/* 3. Parcelas Pagas (Recebido) */}
        <div className="bg-[#121214] border border-blue-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg bg-linear-to-br from-blue-500/5 to-transparent">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-blue-400 print:text-black uppercase tracking-widest block">
              Parcelas Pagas (Recebido)
            </span>
            <h3 className="text-xl print:text-xs font-black text-blue-400 print:text-black font-mono mt-1.5 print:mt-0">
              R$ {financingTotals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-blue-400/70 print:text-black mt-1">
            Total liquidado pelos clientes
          </p>
        </div>

        {/* 4. Lucro Realizado da Financeira */}
        <div className="bg-[#121214] border border-emerald-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg bg-linear-to-br from-emerald-500/5 to-transparent">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-emerald-400 print:text-black uppercase tracking-widest block">
              Lucro Realizado (Pagas)
            </span>
            <h3 className={`text-xl print:text-xs font-black font-mono mt-1.5 print:mt-0 ${financingTotals.realizedProfit >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              R$ {financingTotals.realizedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-emerald-500/70 print:text-black mt-1">
            Parcelas Pagas - Custo dos Aparelhos
          </p>
        </div>

        {/* 5. % Rentabilidade Realizada */}
        <div className="bg-[#121214] border border-indigo-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg bg-linear-to-br from-indigo-500/5 to-transparent">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-indigo-400 print:text-black uppercase tracking-widest block">
              % Rent. Realizada
            </span>
            <h3 className={`text-xl print:text-xs font-black font-mono mt-1.5 print:mt-0 ${financingTotals.realizedMargin >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
              {financingTotals.cost > 0 ? `${financingTotals.realizedMargin.toFixed(2)}%` : '-'}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-indigo-400/70 print:text-black mt-1">
            Retorno sobre o capital já liquidado
          </p>
        </div>
      </div>

      {/* TABELA DETALHADA DE SMARTPHONES FINANCIADOS */}
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 print:p-2 print:border-black print:text-black print:rounded-lg overflow-hidden shadow-xl">
        <div className="mb-4 print:hidden flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Smartphones Vendidos por Financiamento</h3>
            <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Detalhamento unitário de celulares financiados — {periodDisplayLabel}</p>
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
                <th className="pb-3 print:pb-1 text-right">Financiado (Contrato)</th>
                <th className="pb-3 print:pb-1 text-right">Parcelas Pagas</th>
                <th className="pb-3 print:pb-1 text-center">Progresso</th>
                <th className="pb-3 print:pb-1 text-right">Lucro Realizado</th>
                <th className="pb-3 print:pb-1 text-right pr-4 print:pr-1">% Rent. Realizada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 print:divide-black">
              {monthlyFinancingProfitItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 print:py-4 text-zinc-500 text-[10px] print:text-[9px] uppercase font-black tracking-widest print:text-black">
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
                    <td className="py-3 print:py-1 text-right font-mono text-blue-400 font-bold print:text-black">
                      R$ {item.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 print:py-1 text-center font-mono text-[10px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${item.paidInstallmentsCount === item.installmentsCount ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-zinc-300'}`}>
                        {item.paidInstallmentsCount}/{item.installmentsCount}
                      </span>
                    </td>
                    <td className={`py-3 print:py-1 text-right font-mono font-bold print:text-black ${item.realizedProfit >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      R$ {item.realizedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 print:py-1 text-right pr-4 print:pr-1 font-mono font-black print:text-black ${item.realizedMargin >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
                      {item.cost > 0 ? `${item.realizedMargin.toFixed(2)}%` : '-'}
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
                  <td className="py-3 print:py-1.5 text-right font-mono text-zinc-400">
                    R$ {financingTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 print:py-1.5 text-right font-mono text-white">
                    R$ {financingTotals.financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 print:py-1.5 text-right font-mono text-blue-400">
                    R$ {financingTotals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 print:py-1.5 text-center font-mono text-zinc-400">
                    {monthlyFinancingProfitItems.reduce((acc, i) => acc + i.paidInstallmentsCount, 0)}/{monthlyFinancingProfitItems.reduce((acc, i) => acc + i.installmentsCount, 0)}
                  </td>
                  <td className={`py-3 print:py-1.5 text-right font-mono ${financingTotals.realizedProfit >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    R$ {financingTotals.realizedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`py-3 print:py-1.5 text-right pr-4 print:pr-1 font-mono ${financingTotals.realizedMargin >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
                    {financingTotals.cost > 0 ? `${financingTotals.realizedMargin.toFixed(2)}%` : '-'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODAL DETALHADO DE PROJEÇÃO DE PARCELAS E RETORNO POR APARELHO */}
      {isPaybackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
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
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/2 border border-white/5 rounded-2xl p-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Total Investido em Aparelhos</span>
                  <span className="text-xl font-mono font-black text-white block mt-1">
                    R$ {financingTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-zinc-500">Custo de aquisição total dos smartphones</span>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Total Financiado (Parcelas)</span>
                  <span className="text-xl font-mono font-black text-emerald-400 block mt-1">
                    R$ {financingTotals.financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-emerald-500/70">Soma das parcelas a receber dos clientes</span>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Média de Quitação de Custo</span>
                  <span className="text-xl font-mono font-black text-amber-400 block mt-1">
                    {financingTotals.avgPaybackInstallments > 0 ? `${financingTotals.avgPaybackInstallments.toFixed(1)}ª Parcela` : '-'}
                  </span>
                  <span className="text-[10px] text-amber-500/70">Mês em que o custo do aparelho é pago</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={15} className="text-emerald-400" /> Projeção Consolidada Parcela a Parcela
                </h4>

                <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/2 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        <th className="py-3 px-4">Parcela Mensal</th>
                        <th className="py-3 px-4 text-right">Recebimento Estimado</th>
                        <th className="py-3 px-4 text-right">Amortização Acumulada</th>
                        <th className="py-3 px-4 text-right">% Recuperação Custo</th>
                        <th className="py-3 px-4 text-center">Status do Investimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-xs">
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const installmentNum = idx + 1;
                        let monthlyExpected = 0;
                        let cumulativeTotal = 0;

                        monthlyFinancingProfitItems.forEach(item => {
                          if (installmentNum <= item.installmentsCount) {
                            const valPerInst = item.installmentsCount > 0 ? (item.financedAmount / item.installmentsCount) : 0;
                            monthlyExpected += valPerInst;
                          }
                          const activeInst = Math.min(installmentNum, item.installmentsCount);
                          const valPerInst = item.installmentsCount > 0 ? (item.financedAmount / item.installmentsCount) : 0;
                          cumulativeTotal += valPerInst * activeInst;
                        });

                        const recoveryPercent = financingTotals.cost > 0 ? (cumulativeTotal / financingTotals.cost) * 100 : 0;
                        const isCostCovered = cumulativeTotal >= financingTotals.cost && financingTotals.cost > 0;

                        return (
                          <tr key={idx} className={isCostCovered ? "bg-emerald-500/5 font-bold" : "hover:bg-white/2"}>
                            <td className="py-3 px-4 text-white font-black">
                              {installmentNum}ª Parcela (Mês {installmentNum})
                            </td>
                            <td className="py-3 px-4 text-right text-zinc-300">
                              R$ {monthlyExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-white font-bold">
                              R$ {cumulativeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-indigo-400 font-black">
                              {recoveryPercent.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isCostCovered ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                                  Lucro Líquido 🚀
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                                  Amortizando Aparelho
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
            </div>

            <div className="p-4 border-t border-white/10 bg-[#18181b] flex justify-end">
              <button
                onClick={() => setIsPaybackModalOpen(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
