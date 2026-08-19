import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  QrCode,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Landmark,
  FileText
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useCashStore } from '../../store/useCashStore';
import { useUnitStore } from '../../store/useUnitStore';

interface AsaasCashierReportProps {
  selectedUnitId?: string;
}

export default function AsaasCashierReport({ selectedUnitId: parentUnitId }: AsaasCashierReportProps) {
  const { installments, fetchInstallments } = useFinanceStore();
  const { transactions, fetchTransactions } = useCashStore();
  const { units, fetchAllUnits } = useUnitStore();

  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'month_year' | 'all' | 'today' | 'week' | 'current_month' | 'custom'>('month_year');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(parentUnitId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'pix' | 'boleto'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInstallments(),
        fetchAllUnits(),
        selectedUnitId && selectedUnitId !== 'all' ? fetchTransactions(selectedUnitId) : fetchTransactions()
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedUnitId]);

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

  // Função auxiliar para formatar métodos de pagamento em PT-BR
  function formatPaymentMethodPtBr(pm?: string): string {
    const method = (pm || '').toLowerCase().trim();
    if (method === 'money') return 'Dinheiro';
    if (method === 'pix') return 'PIX';
    if (method === 'boleto' || method === 'bank' || method === 'transfer') return 'Boleto Bancário';
    if (method === 'card') return 'Cartão';
    if (method === 'credit_card' || method === 'credit') return 'Cartão de Crédito';
    if (method === 'debit_card' || method === 'debit') return 'Cartão de Débito';
    return (pm || 'PIX').toUpperCase();
  }

  // Filtrar parcelas pagas via Asaas (com asaas_payment_id ou transação de webhook)
  const asaasItems = useMemo(() => {
    const items: Array<{
      id: string;
      customerName: string;
      customerCpf: string;
      installmentNumber: number;
      totalInstallments: number;
      amount: number;
      paidValue: number;
      paymentDate: string;
      dueDate: string;
      paymentMethod: string;
      asaasId: string;
      originType: string;
      unitName: string;
    }> = [];

    // 1. Parcelas PAGAS / LIQUIDADAS pelo Asaas (Exclusivo FINANCEIRA / Financiamento Celular)
    (installments || []).forEach(inst => {
      // APENAS parcelas liquidadas/pagas
      const isPaid = inst.status === 'paid' || (inst as any).status === 'pago';
      if (!isPaid) return;

      const hasAsaas = !!(inst.asaas_payment_id || (inst as any).asaas_id);
      if (!hasAsaas) return;

      const effectiveOrigin = inst.origin_type || inst.sales?.origin_type || 'FINANCIAMENTO_CELULAR';
      const isFinanc = effectiveOrigin === 'FINANCIAMENTO_CELULAR';

      // Caixa Pagamentos Asaas
      if (!isFinanc) return;

      const deviceModel = (inst.sales?.device_model || (inst.sales as any)?.device_model_manual || '').toLowerCase();
      if (['diverso', 'diversos', 'cabo', 'capa', 'pelicula', 'película', 'assistencia', 'assistência', 'carregador', 'fone', 'fonte', 'reparo', 'suporte', 'chip', 'tela', 'placa', 'acessorio', 'acessório', 'servico', 'serviço'].some(w => deviceModel.includes(w))) {
        return;
      }

      if (!filterItemByDate(inst.paid_at || (inst as any).payment_date || inst.due_date)) return;
      if (selectedUnitId !== 'all' && inst.unit_id !== selectedUnitId && inst.sales?.store_id !== selectedUnitId) return;

      const pm = (inst.payment_method || '').toLowerCase();
      const isPix = pm.includes('pix');
      const isBoleto = pm.includes('boleto') || pm === 'transfer' || pm === 'bank';
      if (paymentTypeFilter === 'pix' && !isPix) return;
      if (paymentTypeFilter === 'boleto' && !isBoleto) return;

      const custName = inst.sales?.customers?.name || inst.customer_name || 'Cliente MDR';
      const custCpf = inst.sales?.customers?.cpf || inst.customer_cpf || '';

      items.push({
        id: inst.id,
        customerName: custName,
        customerCpf: custCpf,
        installmentNumber: inst.number || (inst as any).installment_number || 1,
        totalInstallments: inst.total || (inst as any).total_installments || 1,
        amount: Number(inst.value || 0),
        paidValue: Number(inst.paid_value || inst.value || 0),
        paymentDate: inst.paid_at || (inst as any).payment_date || '',
        dueDate: inst.due_date || '',
        paymentMethod: inst.payment_method || 'pix',
        asaasId: inst.asaas_payment_id || (inst as any).asaas_id || 'Webhook',
        originType: 'FINANCEIRA',
        unitName: units.find(u => u.id === (inst.unit_id || inst.sales?.store_id))?.name || 'MDR Central'
      });
    });

    items.sort((a, b) => {
      const dateA = a.paymentDate || a.dueDate || '';
      const dateB = b.paymentDate || b.dueDate || '';
      return dateB.localeCompare(dateA);
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return items.filter(item =>
        item.customerName.toLowerCase().includes(q) ||
        item.customerCpf.toLowerCase().includes(q) ||
        item.asaasId.toLowerCase().includes(q)
      );
    }

    return items;
  }, [installments, filterMode, selectedMonth, selectedYear, customStartDate, customEndDate, selectedUnitId, paymentTypeFilter, searchQuery, units]);

  const totals = useMemo(() => {
    let totalGross = 0;
    let totalPaid = 0;
    let totalPixCount = 0;
    let totalBoletoCount = 0;

    asaasItems.forEach(item => {
      totalGross += item.amount;
      totalPaid += item.paidValue;
      if (item.paymentMethod.toLowerCase().includes('pix')) totalPixCount++;
      else totalBoletoCount++;
    });

    return {
      gross: totalGross,
      paid: totalPaid,
      count: asaasItems.length,
      pixCount: totalPixCount,
      boletoCount: totalBoletoCount
    };
  }, [asaasItems]);

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
    if (asaasItems.length === 0) return;
    const headers = ["ID Asaas", "Data Pagamento", "Cliente", "CPF", "Parcela", "Origem", "Unidade", "Valor (R$)", "Valor Pago (R$)", "Forma"];
    const rows = asaasItems.map(item => [
      `"${item.asaasId}"`,
      item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('pt-BR') : '-',
      `"${item.customerName.replace(/"/g, '""')}"`,
      `"${item.customerCpf}"`,
      `${item.installmentNumber}/${item.totalInstallments}`,
      item.originType,
      `"${item.unitName}"`,
      item.amount.toFixed(2),
      item.paidValue.toFixed(2),
      item.paymentMethod.toUpperCase()
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

    const cleanPeriodLabel = periodDisplayLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
    const filename = `caixa_asaas_${cleanPeriodLabel}_${new Date().toISOString().split('T')[0]}.csv`;

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
      {/* HEADER DE FILTROS E BUSCA */}
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 print:hidden shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Caixa Pagamentos Asaas (Gateway Virtual)</h3>
              <p className="text-[10px] text-zinc-400 font-medium">Conciliação de recebimentos automáticos via PIX e Boletos liquidados no Asaas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar cliente, CPF, ID Asaas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
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
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
            >
              <Printer size={15} /> Imprimir
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl border border-white/10 transition-all cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : ''} />
            </button>
          </div>
        </div>

        {/* BOTOES DE PERIODO E FORMA */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'month_year', label: 'Por Mês/Ano' },
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: '7 Dias' },
              { id: 'current_month', label: 'Este Mês' },
              { id: 'all', label: 'Todos' },
              { id: 'custom', label: 'Personalizado' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setFilterMode(m.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${filterMode === m.id
                    ? 'bg-blue-500 text-white shadow-md font-black'
                    : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {filterMode === 'month_year' && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold uppercase outline-none focus:border-blue-500 cursor-pointer"
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
                  className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
                >
                  {years.map(y => (
                    <option key={y} value={y} className="bg-[#18181b] text-white">
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}

            {filterMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                />
                <span className="text-zinc-500 text-xs font-bold">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#18181b] border border-zinc-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-xl border border-zinc-800">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'pix', label: 'PIX' },
                { id: 'boleto', label: 'Boleto' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPaymentTypeFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${paymentTypeFilter === f.id ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CABEÇALHO PARA IMPRESSÃO */}
      <div className="hidden print:block border-b border-black pb-2 mb-2 text-black">
        <h1 className="text-xl font-black uppercase leading-tight">Relatório de Recebimentos Asaas (Gateway Virtual)</h1>
        <p className="text-[9px] text-gray-700 uppercase tracking-wider font-bold mt-0.5">
          Referência: {periodDisplayLabel} | Unidade: {units.find(u => u.id === selectedUnitId)?.name || 'Todas as Lojas'} | Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* 4 CARDS DE MÉTRICAS ASAAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {/* 1. TOTAL LIQUIDADO */}
        <div className="bg-[#121214] border border-blue-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg bg-linear-to-br from-blue-500/5 to-transparent">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-blue-400 print:text-black uppercase tracking-widest block">
              Total Liquidado (Asaas)
            </span>
            <h3 className="text-2xl print:text-xs font-black text-blue-400 print:text-black font-mono mt-2 print:mt-0">
              R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-blue-400/70 print:text-black mt-2">
            Valor total creditado na conta digital Asaas
          </p>
        </div>

        {/* 2. VOLUME DE COBRANÇAS */}
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest block">
              Cobranças Recebidas
            </span>
            <h3 className="text-2xl print:text-xs font-black text-white print:text-black font-mono mt-2 print:mt-0">
              {totals.count}
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-zinc-500 print:text-black mt-2">
            Parcelas quitadas via gateway no período
          </p>
        </div>

        {/* 3. RECEBIDO VIA PIX */}
        <div className="bg-[#121214] border border-emerald-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg bg-linear-to-br from-emerald-500/5 to-transparent">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-emerald-400 print:text-black uppercase tracking-widest block">
              Liquidações PIX QR Code
            </span>
            <h3 className="text-2xl print:text-xs font-black text-emerald-400 print:text-black font-mono mt-2 print:mt-0">
              {totals.pixCount} transações
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-emerald-500/70 print:text-black mt-2">
            Baixa instantânea via Webhook
          </p>
        </div>

        {/* 4. RECEBIDO VIA BOLETO */}
        <div className="bg-[#121214] border border-amber-500/30 rounded-3xl p-5 print:p-2 print:border-black print:text-black print:rounded-lg flex flex-col justify-between shadow-lg bg-linear-to-br from-amber-500/5 to-transparent">
          <div>
            <span className="text-[9px] print:text-[8px] font-black text-amber-400 print:text-black uppercase tracking-widest block">
              Liquidações Boleto Bancário
            </span>
            <h3 className="text-2xl print:text-xs font-black text-amber-400 print:text-black font-mono mt-2 print:mt-0">
              {totals.boletoCount} transações
            </h3>
          </div>
          <p className="text-[9px] print:text-[7px] text-amber-500/70 print:text-black mt-2">
            Compensação bancária D+1
          </p>
        </div>
      </div>

      {/* TABELA DE RECEBIMENTOS DETALHADA */}
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 print:p-2 print:border-black print:text-black print:rounded-lg overflow-hidden shadow-xl">
        <div className="mb-4 print:hidden flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Histórico de Cobranças Liquidadas no Asaas</h3>
            <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Extrato detalhado de transações digitais — {periodDisplayLabel}</p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
            {asaasItems.length} transação(ões)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs print:text-[9px]">
            <thead>
              <tr className="border-b border-zinc-800 print:border-black text-[9px] print:text-[8px] font-black text-zinc-400 print:text-black uppercase tracking-widest pb-3">
                <th className="pb-3 print:pb-1 pl-4 print:pl-1">Data Baixa</th>
                <th className="pb-3 print:pb-1">Cliente</th>
                <th className="pb-3 print:pb-1">Parcela</th>
                <th className="pb-3 print:pb-1">Origem</th>
                <th className="pb-3 print:pb-1">ID Pagamento Asaas</th>
                <th className="pb-3 print:pb-1 text-right">Valor Parcela</th>
                <th className="pb-3 print:pb-1 text-right">Valor Creditado</th>
                <th className="pb-3 print:pb-1 text-right pr-4 print:pr-1">Forma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 print:divide-black">
              {asaasItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 print:py-4 text-zinc-500 text-[10px] print:text-[9px] uppercase font-black tracking-widest print:text-black">
                    Nenhum recebimento do Asaas registrado em {periodDisplayLabel}.
                  </td>
                </tr>
              ) : (
                asaasItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/2 print:hover:bg-transparent">
                    <td className="py-3 print:py-1 pl-4 print:pl-1 font-mono text-zinc-400 print:text-black">
                      {item.paymentDate ? new Date(item.paymentDate).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 print:py-1 font-bold text-white print:text-black uppercase">
                      {item.customerName}
                      {item.customerCpf && <span className="block text-[8px] font-mono text-zinc-500">{item.customerCpf}</span>}
                    </td>
                    <td className="py-3 print:py-1 font-mono font-bold text-blue-400 print:text-black">
                      #{item.installmentNumber}/{item.totalInstallments}
                    </td>
                    <td className="py-3 print:py-1 text-[9px] font-bold uppercase">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                        📱 Financeira
                      </span>
                    </td>
                    <td className="py-3 print:py-1 font-mono text-[9px] text-zinc-400">
                      {item.asaasId}
                    </td>
                    <td className="py-3 print:py-1 text-right font-mono text-zinc-400 print:text-black">
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 print:py-1 text-right font-mono font-bold text-emerald-400 print:text-black">
                      R$ {item.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 print:py-1 text-right pr-4 print:pr-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider border ${item.paymentMethod.toLowerCase().includes('pix')
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : item.paymentMethod.toLowerCase().includes('boleto') || item.paymentMethod.toLowerCase() === 'transfer' || item.paymentMethod.toLowerCase() === 'bank'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : item.paymentMethod.toLowerCase() === 'money'
                              ? 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                        {formatPaymentMethodPtBr(item.paymentMethod)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {asaasItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-zinc-700 print:border-black font-black text-xs print:text-[9px] text-white print:text-black bg-white/2 print:bg-transparent">
                  <td colSpan={5} className="py-3 print:py-1.5 pl-4 print:pl-1 uppercase">
                    Totais Consolidados Asaas ({periodDisplayLabel})
                  </td>
                  <td className="py-3 print:py-1.5 text-right font-mono">
                    R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 print:py-1.5 text-right font-mono text-emerald-400 print:text-black">
                    R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 print:py-1.5 text-right pr-4 print:pr-1 font-mono text-blue-400">
                    {totals.count} pagto(s)
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
