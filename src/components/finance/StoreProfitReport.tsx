import React, { useState, useMemo, useEffect } from 'react';
import { 
  Filter, 
  Search, 
  Download, 
  Printer, 
  Store,
  DollarSign,
  TrendingUp,
  Package,
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import { useSaleStore } from '../../store/useSaleStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useUnitStore } from '../../store/useUnitStore';
import { useServiceOrderStore } from '../../store/useServiceOrderStore';

interface StoreProfitReportProps {
  selectedUnitId?: string;
}

export default function StoreProfitReport({ selectedUnitId: parentUnitId }: StoreProfitReportProps) {
  const { sales, fetchSales } = useSaleStore();
  const { inventory, fetchInventory } = useInventoryStore();
  const { units, fetchAllUnits } = useUnitStore();
  const { serviceOrders, fetchServiceOrders } = useServiceOrderStore();

  const [filterMode, setFilterMode] = useState<'month_year' | 'all' | 'today' | 'week' | 'current_month' | 'custom'>('month_year');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(parentUnitId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchSales();
    fetchInventory();
    fetchAllUnits();
    fetchServiceOrders();
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

  const parseAccessories = (accStr: string) => {
    if (!accStr) return [];
    const cleanPart = accStr.split('|')[0] || '';
    const items = cleanPart.split(',').map(s => s.trim()).filter(s => s && !s.startsWith('['));
    return items.map(itemStr => {
      const isVenda = itemStr.includes('Venda R$');
      const isBrinde = itemStr.includes('Brinde');
      const name = itemStr.replace(/\s*\([^)]*\)\s*/g, '').trim();

      let salePrice = 0;
      if (isVenda) {
        const match = itemStr.match(/Venda R\$\s*([0-9.,]+)/i);
        if (match) {
          salePrice = parseFloat(match[1].replace(',', '.'));
        }
      }

      const matchedInv = inventory.find(i => i.model.toLowerCase() === name.toLowerCase());
      const costPrice = matchedInv ? Number(matchedInv.cost_price || 0) : 0;
      const barcode = matchedInv ? (matchedInv.barcode || '') : '';

      return {
        name,
        isVenda,
        isBrinde,
        salePrice,
        costPrice,
        barcode
      };
    });
  };

  const filterItemByDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const cleanDateStr = (dateStr || '').split('T')[0];
    if (!cleanDateStr) return false;
    const [sYear, sMonth] = cleanDateStr.split('-').map(Number);
    if (!sYear || !sMonth) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const currentMonthNum = new Date().getMonth() + 1;
    const currentYearNum = new Date().getFullYear();

    if (filterMode === 'month_year') {
      return sMonth === selectedMonth && sYear === selectedYear;
    } else if (filterMode === 'today') {
      return cleanDateStr === todayStr;
    } else if (filterMode === 'week') {
      return cleanDateStr >= sevenDaysAgo;
    } else if (filterMode === 'current_month') {
      return sMonth === currentMonthNum && sYear === currentYearNum;
    } else if (filterMode === 'custom') {
      if (customStartDate && cleanDateStr < customStartDate) return false;
      if (customEndDate && cleanDateStr > customEndDate) return false;
      return true;
    }
    return true;
  };

  const filterItemByUnit = (unitId?: string) => {
    if (selectedUnitId === 'all') return true;
    return unitId === selectedUnitId;
  };

  const monthlyStoreProfitItems = useMemo(() => {
    const items: Array<{
      saleNumber: string;
      code: string;
      product: string;
      qtd: number;
      cost: number;
      sale: number;
      profit: number;
      margin: number;
      unitId?: string;
      dateStr: string;
    }> = [];

    // 1. Vendas da Loja
    const filteredStoreSales = sales.filter(s => s.status !== 'cancelled' && filterItemByDate(s.date || s.created_at) && filterItemByUnit(s.unit_id || (s as any).store_id));

    filteredStoreSales.forEach(s => {
      const saleNum = (s.id || '').split('-')[0].toUpperCase();
      const mainDevice = inventory.find(inv => inv.id === s.device_id);
      const mainCost = mainDevice ? Number(mainDevice.cost_price || 0) : Number(s.device_cost_price || 0);
      const tradeInVal = s.is_trade_in ? Number(s.trade_in_valuation || 0) : 0;
      
      const parsedAcc = parseAccessories(s.accessories || '');
      const accessoriesTotal = parsedAcc.reduce((sum, a) => sum + (a.isVenda ? a.salePrice : 0), 0);
      const expectedTotal = (s.original_price ?? s.total_value) + accessoriesTotal + (s.service_fee || 0) - tradeInVal;
      const discount = Math.max(0, expectedTotal - s.total_value);
      
      const mainSale = Math.max(0, (s.original_price ?? s.total_value) - discount - tradeInVal);
      const mainProfit = mainSale - mainCost;
      const mainMargin = mainCost > 0 ? (mainProfit / mainCost) * 100 : 0;

      items.push({
        saleNumber: saleNum,
        code: s.imei || (mainDevice?.barcode || mainDevice?.imei || 'N/A'),
        product: s.is_trade_in ? `${s.device_model || (s as any).device_model_manual || 'Aparelho'} (Com Troca - Abatimento R$ ${tradeInVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : (s.device_model || (s as any).device_model_manual || 'Aparelho / Produto'),
        qtd: 1,
        cost: mainCost,
        sale: mainSale,
        profit: mainProfit,
        margin: mainMargin,
        unitId: s.unit_id || (s as any).store_id,
        dateStr: (s.date || s.created_at || '').split('T')[0]
      });

      parsedAcc.forEach(acc => {
        const accSale = acc.isVenda ? acc.salePrice : 0;
        const accCost = acc.costPrice;
        const accProfit = accSale - accCost;
        const accMargin = accCost > 0 ? (accProfit / accCost) * 100 : 0;

        items.push({
          saleNumber: saleNum,
          code: acc.barcode || 'P-Avulso',
          product: acc.name + (acc.isBrinde ? ' (Brinde)' : ''),
          qtd: 1,
          cost: accCost,
          sale: accSale,
          profit: accProfit,
          margin: accMargin,
          unitId: s.unit_id || (s as any).store_id,
          dateStr: (s.date || s.created_at || '').split('T')[0]
        });
      });
    });

    // 2. Ordens de Serviço (Assistência Técnica Entregue)
    const filteredOrders = (serviceOrders || []).filter(o => o.status === 'delivered' && filterItemByDate(o.delivered_at || o.created_at) && filterItemByUnit(o.unit_id || (o as any).store_id));

    filteredOrders.forEach(o => {
      const saleNum = `OS ${o.os_number}`;
      const code = `S-${o.os_number}`;
      const product = `ASSISTENCIA TECNICA - ${o.device_brand || ''} ${o.device_model || ''}`.trim();
      const cost = Number(o.parts_value || 0);
      const sale = Number(o.total_value || 0);
      const profit = sale - cost;
      const margin = cost > 0 ? (profit / cost) * 100 : 0;

      items.push({
        saleNumber: saleNum,
        code: code,
        product: product,
        qtd: 1,
        cost: cost,
        sale: sale,
        profit: profit,
        margin: margin,
        unitId: o.unit_id || (o as any).store_id,
        dateStr: (o.delivered_at || o.created_at || '').split('T')[0]
      });
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return items.filter(item => 
        item.saleNumber.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.product.toLowerCase().includes(q)
      );
    }

    return items;
  }, [sales, serviceOrders, inventory, filterMode, selectedMonth, selectedYear, customStartDate, customEndDate, selectedUnitId, searchQuery]);

  const storeTotals = useMemo(() => {
    let totalCost = 0;
    let totalSale = 0;
    let totalProfit = 0;

    monthlyStoreProfitItems.forEach(item => {
      totalCost += item.cost;
      totalSale += item.sale;
      totalProfit += item.profit;
    });

    const totalMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
      cost: totalCost,
      sale: totalSale,
      profit: totalProfit,
      margin: totalMargin
    };
  }, [monthlyStoreProfitItems]);

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
    if (monthlyStoreProfitItems.length === 0) return;
    const headers = ["Nº Venda", "Data", "Código / IMEI", "Produto / Serviço", "QTD", "Valor Custo", "Valor Venda", "Lucro Loja", "% Margem"];
    const rows = monthlyStoreProfitItems.map(item => [
      item.saleNumber,
      item.dateStr,
      `"${item.code.replace(/"/g, '""')}"`,
      `"${item.product.replace(/"/g, '""')}"`,
      item.qtd,
      item.cost.toFixed(2),
      item.sale.toFixed(2),
      item.profit.toFixed(2),
      `${item.margin.toFixed(2)}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

    const cleanPeriodLabel = periodDisplayLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
    const filename = `lucro_presumido_loja_${cleanPeriodLabel}_${new Date().toISOString().split('T')[0]}.csv`;

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
      {/* PAINEL DE FILTROS DA LOJA */}
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 print:hidden shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Store size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Lucro Presumido — Caixa Loja (Vendas & Estoque)</h3>
              <p className="text-[10px] text-zinc-400 font-medium">Margem real das vendas de balcão, acessórios, trocas e assistência técnica</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar venda, produto, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
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
              className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-black font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Printer size={15} /> Imprimir
            </button>
          </div>
        </div>

        {/* BOTOES DE PERIODO RAPIDO */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
          <button
            onClick={() => setFilterMode('month_year')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === 'month_year'
                ? 'bg-purple-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Por Mês/Ano
          </button>

          <button
            onClick={() => setFilterMode('today')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === 'today'
                ? 'bg-purple-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Hoje
          </button>

          <button
            onClick={() => setFilterMode('week')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === 'week'
                ? 'bg-purple-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            7 Dias
          </button>

          <button
            onClick={() => setFilterMode('current_month')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === 'current_month'
                ? 'bg-purple-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Este Mês
          </button>

          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-purple-500 text-black shadow-md font-black'
                : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todos
          </button>

          <button
            onClick={() => setFilterMode('custom')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === 'custom'
                ? 'bg-purple-500 text-black shadow-md font-black'
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
                className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold uppercase outline-none focus:border-purple-500 cursor-pointer"
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
                className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-purple-500 cursor-pointer"
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
                className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-purple-500"
              />
              <span className="text-zinc-500 text-xs font-bold">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-purple-500"
              />
            </div>
          )}

          {/* SELETOR DE UNIDADE/LOJA */}
          <div className="flex items-center gap-2">
            <Store size={14} className="text-zinc-500 ml-2" />
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold uppercase outline-none focus:border-purple-500 cursor-pointer max-w-44 truncate"
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
        <h1 className="text-xl font-black uppercase leading-tight">Relatório Consolidado — Lucro Presumido Caixa Loja (Vendas & Estoque)</h1>
        <p className="text-[9px] text-gray-700 uppercase tracking-wider font-bold mt-0.5">
          Referência: {periodDisplayLabel} | Unidade: {units.find((u: any) => u.id === selectedUnitId)?.name || 'Todas as Lojas'} | Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* 4 CARDS DE MÉTRICAS PRINCIPAIS DA LOJA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {/* 1. FATURAMENTO DO PERÍODO */}
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest block">
              Faturamento do Período (Venda)
            </span>
            <h3 className="text-2xl print:text-xs font-black text-white print:text-black font-mono mt-2 print:mt-0">
              R$ {storeTotals.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-zinc-500 print:text-black mt-2">
            Total bruto de vendas e OS entregues
          </p>
        </div>

        {/* 2. VALOR DE CUSTO GERAL */}
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest block">
              Valor de Custo Geral
            </span>
            <h3 className="text-2xl print:text-xs font-black text-white print:text-black font-mono mt-2 print:mt-0">
              R$ {storeTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-zinc-500 print:text-black mt-2">
            Custo de aquisição de aparelhos e peças
          </p>
        </div>

        {/* 3. LUCRO DO PERÍODO */}
        <div className="bg-[#121214] border border-emerald-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg bg-linear-to-br from-emerald-500/5 to-transparent">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-emerald-400 print:text-black uppercase tracking-widest block">
              Lucro do Período (Loja)
            </span>
            <h3 className="text-2xl print:text-xs font-black text-emerald-400 print:text-black font-mono mt-2 print:mt-0">
              R$ {storeTotals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-emerald-500/70 print:text-black mt-2">
            Margem bruta direta das operações
          </p>
        </div>

        {/* 4. RENTABILIDADE MÉDIA */}
        <div className="bg-[#121214] border border-purple-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg bg-linear-to-br from-purple-500/5 to-transparent">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-purple-400 print:text-black uppercase tracking-widest block">
              Rentabilidade Média
            </span>
            <h3 className="text-2xl print:text-xs font-black text-purple-400 print:text-black font-mono mt-2 print:mt-0">
              {storeTotals.margin.toFixed(2)}%
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-purple-400/70 print:text-black mt-2">
            Retorno médio sobre o custo dos itens
          </p>
        </div>
      </div>

      {/* TABELA DETALHADA DE ITENS E SERVIÇOS VENDIDOS */}
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 print:p-2 print:border-black print:text-black print:rounded-lg overflow-hidden shadow-xl">
        <div className="mb-4 print:hidden flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Itens e Serviços Vendidos (Caixa Loja)</h3>
            <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Detalhamento unitário com custos, vendas e margens — {periodDisplayLabel}</p>
          </div>
          <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
            {monthlyStoreProfitItems.length} item(ns)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs print:text-[9px]">
            <thead>
              <tr className="border-b border-zinc-800 print:border-black text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest pb-3">
                <th className="pb-3 print:pb-1 pl-4 print:pl-1">Nº Venda</th>
                <th className="pb-3 print:pb-1">Código / IMEI</th>
                <th className="pb-3 print:pb-1">Produto / Serviço</th>
                <th className="pb-3 print:pb-1 text-center">QTD</th>
                <th className="pb-3 print:pb-1 text-right">Valor Custo</th>
                <th className="pb-3 print:pb-1 text-right">Valor Venda</th>
                <th className="pb-3 print:pb-1 text-right">Lucro Loja</th>
                <th className="pb-3 print:pb-1 text-right pr-4 print:pr-1">% Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 print:divide-black">
              {monthlyStoreProfitItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 print:py-4 text-zinc-500 text-[10px] print:text-[9px] uppercase font-black tracking-widest print:text-black">
                    Nenhuma movimentação da loja encontrada em {periodDisplayLabel}.
                  </td>
                </tr>
              ) : (
                monthlyStoreProfitItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/2 print:hover:bg-transparent">
                    <td className="py-3 print:py-1 pl-4 print:pl-1 font-mono font-bold text-white print:text-black">
                      {item.saleNumber}
                    </td>
                    <td className="py-3 print:py-1 font-mono text-zinc-400 print:text-black">
                      {item.code}
                    </td>
                    <td className="py-3 print:py-1 font-bold text-white print:text-black uppercase">
                      {item.product}
                    </td>
                    <td className="py-3 print:py-1 text-center font-bold text-white print:text-black">
                      {item.qtd}
                    </td>
                    <td className="py-3 print:py-1 text-right font-mono text-zinc-400 print:text-black">
                      R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 print:py-1 text-right font-mono text-white print:text-black font-bold">
                      R$ {item.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 print:py-1 text-right font-mono font-bold text-emerald-400 print:text-black">
                      R$ {item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 print:py-1 text-right pr-4 print:pr-1 font-mono font-black text-purple-400 print:text-black">
                      {item.cost > 0 ? `${item.margin.toFixed(2)}%` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Rodapé com Totais Consolidados da Loja */}
            {monthlyStoreProfitItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-zinc-700 print:border-black font-black text-xs print:text-[9px] text-white print:text-black bg-white/2 print:bg-transparent">
                  <td colSpan={3} className="py-3 print:py-1.5 pl-4 print:pl-1 uppercase">
                    Totais Consolidados ({periodDisplayLabel})
                  </td>
                  <td className="py-3 print:py-1.5 text-center font-mono">
                    {monthlyStoreProfitItems.reduce((acc, item) => acc + item.qtd, 0)}
                  </td>
                  <td className="py-3 print:py-1.5 text-right font-mono">
                    R$ {storeTotals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 print:py-1.5 text-right font-mono">
                    R$ {storeTotals.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 print:py-1.5 text-right font-mono text-emerald-400 print:text-black">
                    R$ {storeTotals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 print:py-1.5 text-right pr-4 print:pr-1 font-mono text-purple-400 print:text-black">
                    {storeTotals.margin.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
