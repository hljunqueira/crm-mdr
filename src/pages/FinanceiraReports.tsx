import React, { useState, useEffect } from 'react';
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
  Calculator
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function FinanceiraReports() {
  const { profile } = useAuthStore();
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
  }, []);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto print:p-0 print:space-y-2 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-[#121214] via-[#18181b] to-[#121214] p-6 rounded-3xl border border-zinc-800 shadow-2xl print:hidden">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
            <Landmark size={16} /> Módulo Financeira
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Relatórios Consolidados & Conciliação</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestão de recebimentos globais, conciliação de carteiras e controle de saques a investidores.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
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

        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
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

        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 space-y-3 shadow-xl">
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
      <div className="bg-[#18181b] border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
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
  );
}
