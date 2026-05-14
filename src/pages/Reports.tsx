
import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, Users, Briefcase, Calendar, ChevronDown, Download, BarChart2 } from 'lucide-react';
import { exportToCSV } from '../lib/utils';
import { useUI } from '../context/UIContext';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSaleStore } from '../store/useSaleStore';
import { useFinanceStore } from '../store/useFinanceStore';

export default function Reports() {
  const { customers } = useCustomerStore();
  const { sales } = useSaleStore();
  const { installments } = useFinanceStore();
  const { showNotification } = useUI();
  
  const handleExport = () => {
    if (sales.length === 0) {
      showNotification('warning', 'Sem Dados', 'Não há vendas para exportar no momento.');
      return;
    }
    exportToCSV(sales, 'relatorio_vendas_mdr');
    showNotification('success', 'Exportação Concluída', 'O arquivo CSV foi gerado com sucesso.');
  };

  const handleAdvancedAnalysis = () => {
    showNotification('info', 'Análise Avançada', 'O motor de IA está processando as tendências do seu negócio...');
  };

  const totalSalesValue = sales.reduce((acc, s) => acc + s.total_value, 0);
  const totalPaid = installments.filter(i => i.status === 'paid').reduce((acc, current) => acc + current.value, 0);
  
  const reportStats = [
    { label: 'Receita Total', value: `R$ ${totalSalesValue.toLocaleString()}`, trend: '+12%', color: 'text-white' },
    { label: 'Recebido', value: `R$ ${totalPaid.toLocaleString()}`, trend: '+8%', color: 'text-white' },
    { label: 'Clientes Ativos', value: customers.length.toString(), trend: '+18%', color: 'text-white' },
    { label: 'Aparelhos Vendidos', value: sales.length.toString(), trend: '+5%', color: 'text-on-surface-variant' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Relatórios</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Inteligência de Negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-3 bg-surface-container border border-outline-variant/30 text-xs font-black uppercase tracking-widest text-on-surface rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2">
            <Calendar size={16} /> Últimos 30 dias <ChevronDown size={14} />
          </button>
          <button 
            onClick={handleExport}
            className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Download size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {reportStats.map((stat, i) => (
          <div key={i} className="glass-card p-8 border border-outline-variant/30 rounded-[32px] group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <TrendingUp size={40} />
             </div>
             <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest mb-1">{stat.label}</p>
             <div className="flex items-baseline gap-3">
               <p className="text-3xl font-black text-on-surface tracking-tight">{stat.value}</p>
               <span className={`text-[10px] font-black ${stat.trend.startsWith('+') ? 'text-primary' : 'text-on-surface-variant'}`}>
                 {stat.trend}
               </span>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Modelos Mais Vendidos</h3>
            <BarChart2 size={20} className="text-on-surface-variant" />
          </div>
          <div className="space-y-6">
            {sales.length === 0 ? (
               <p className="text-xs text-on-surface-variant font-display opacity-50">Nenhuma venda registrada ainda.</p>
            ) : (() => {
              const counts: Record<string, number> = {};
              sales.forEach(s => counts[s.device_model] = (counts[s.device_model] || 0) + 1);
              const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
              const colors = ['bg-primary', 'bg-white/40', 'bg-white/10'];
              return sorted.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-on-surface-variant">{item[0]}</span>
                    <span className="text-on-surface">{Math.round((item[1] / sales.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.round((item[1] / sales.length) * 100)}%` }}
                      className={`h-full ${colors[i]} rounded-full`} 
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] flex flex-col justify-center items-center text-center space-y-4 bg-primary/5">
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Briefcase size={32} className="text-primary" />
          </div>
          <h3 className="text-2xl font-black text-on-surface uppercase tracking-tight">Insights de Performance</h3>
          <p className="text-on-surface-variant font-display text-sm leading-relaxed max-w-xs">
            Acompanhe o crescimento da sua empresa através de dados reais e automatizações inteligentes.
          </p>
          <button 
            onClick={handleAdvancedAnalysis}
            className="mt-4 px-8 py-3 border border-outline-variant text-[11px] font-black uppercase tracking-widest text-on-surface rounded-xl hover:bg-white/5 transition-all"
          >
            Análise Avançada
          </button>
        </div>
      </div>
    </div>
  );
}
