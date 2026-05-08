import React from 'react';
import { TrendingUp, DollarSign, Users, Briefcase, Calendar, ChevronDown, Download, BarChart2 } from 'lucide-react';

const reportStats = [
  { label: 'Receita Mensal', value: 'R$ 84.500', trend: '+12%', color: 'text-white' },
  { label: 'Margem Média', value: '64%', trend: '+5%', color: 'text-white' },
  { label: 'Novos Clientes', value: '124', trend: '+18%', color: 'text-white' },
  { label: 'Ticket Médio', value: 'R$ 680', trend: '-2%', color: 'text-on-surface-variant' },
];

export default function Reports() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Relatórios</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Inteligência de Negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-3 bg-surface-container border border-outline-variant/50 text-xs font-black uppercase tracking-widest text-on-surface rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2">
            <Calendar size={16} /> Últimos 30 dias <ChevronDown size={14} />
          </button>
          <button className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all">
            <Download size={18} /> Exportar
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
               <span className={`text-[10px] font-black ${stat.trend.startsWith('+') ? 'text-white' : 'text-on-surface-variant'}`}>
                 {stat.trend}
               </span>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Performance por Unidade</h3>
            <BarChart2 size={20} className="text-on-surface-variant" />
          </div>
          <div className="space-y-6">
            {[
              { name: 'Arroio do Silva', value: 85, color: 'bg-white' },
              { name: 'Gaivota', value: 58, color: 'bg-white/40' },
              { name: 'On-site / Remoto', value: 32, color: 'bg-white/10' },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                  <span className="text-on-surface-variant">{item.name}</span>
                  <span className="text-on-surface">{item.value}%</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Briefcase size={32} className="text-white" />
          </div>
          <h3 className="text-2xl font-black text-on-surface uppercase tracking-tight">Insights de Crescimento</h3>
          <p className="text-on-surface-variant font-display text-sm leading-relaxed max-w-xs">
            Sua conversão de leads aumentou 15% após a implementação do novo chat em tempo real.
          </p>
          <button className="mt-4 px-8 py-3 border border-outline-variant text-[11px] font-black uppercase tracking-widest text-on-surface rounded-xl hover:bg-white/5 transition-all">
            Ver Analítico Completo
          </button>
        </div>
      </div>
    </div>
  );
}
