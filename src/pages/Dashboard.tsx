import { TrendingUp, Users, Wrench, DollarSign, Activity } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { cn } from '@/src/lib/utils';

const data = [
  { name: 'Seg', leads: 400, servicos: 240 },
  { name: 'Ter', leads: 300, servicos: 139 },
  { name: 'Qua', leads: 200, servicos: 980 },
  { name: 'Qui', leads: 278, servicos: 390 },
  { name: 'Sex', leads: 189, servicos: 480 },
  { name: 'Sab', leads: 239, servicos: 380 },
  { name: 'Dom', leads: 349, servicos: 430 },
];

const revenueData = [
  { month: 'Jan', value: 4000 },
  { month: 'Fev', value: 3000 },
  { month: 'Mar', value: 5000 },
  { month: 'Abr', value: 4500 },
  { month: 'Mai', value: 6000 },
  { month: 'Jun', value: 5500 },
];

const pieData = [
  { name: 'Manutenção', value: 400 },
  { name: 'Venda', value: 300 },
  { name: 'Software', value: 300 },
  { name: 'Infra', value: 200 },
];

const COLORS = ['#ffffff', '#a3a3a3', '#525252', '#262626'];

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Painel de Controle</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Visão Geral do Ecossistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-3 bg-surface-container border border-outline-variant/30 text-[10px] font-black uppercase tracking-widest text-on-surface rounded-xl hover:bg-white/5 transition-colors">
            Gerar Relatório
          </button>
          <button className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all">
            <Wrench size={18} /> Novo Serviço
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Leads Hoje', value: '42', trend: '+12%', icon: Users, color: 'text-white' },
          { label: 'Serviços Ativos', value: '18', trend: '+5%', icon: Wrench, color: 'text-white' },
          { label: 'Faturamento Mes', value: 'R$ 24.500', trend: '+24%', icon: DollarSign, color: 'text-white' },
          { label: 'SLA Médio', value: '1.2h', trend: '-10%', icon: Activity, color: 'text-white' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-8 border border-outline-variant/30 rounded-[32px] group hover:border-white/20 transition-all cursor-default">
            <div className="flex items-start justify-between mb-6">
              <div className={`bg-white/5 ${stat.color} p-4 rounded-2xl border border-white/10 group-hover:bg-white group-hover:text-black transition-all shadow-inner`}>
                <stat.icon size={24} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${stat.trend.startsWith('+') ? 'border-white/10 text-white' : 'border-white/5 text-on-surface-variant/40'}`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest opacity-60">{stat.label}</h3>
            <p className="text-3xl font-black text-on-surface tracking-tight mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] h-[450px] flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Atividade Semanal</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Serviços</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 800 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '16px' }}
                />
                <Bar dataKey="leads" fill="#ffffff" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="servicos" fill="rgba(255,255,255,0.2)" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] h-[450px] flex flex-col">
          <h3 className="text-xl font-black text-on-surface uppercase tracking-tight mb-10">Receita Estimada</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 800 }} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card border border-outline-variant/30 rounded-[40px] overflow-hidden flex flex-col">
          <div className="p-8 border-b border-outline-variant/30 flex items-center justify-between bg-white/[0.02]">
            <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Serviços Com Prioridade</h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-colors">Visualizar todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-outline-variant/20">
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Equipamento</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Nível</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-right">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {[
                  { name: 'João Silva', device: 'iPhone 13 - Troca Tela', status: 'Em Análise', priority: 'Média', value: 'R$ 850' },
                  { name: 'Maria Souza', device: 'Notebook Dell - Limpeza', status: 'Finalizado', priority: 'Alta', value: 'R$ 220' },
                  { name: 'Tech Solutions', device: 'Instalação Rede', status: 'Aguardando Peça', priority: 'Alta', value: 'R$ 1.500' },
                  { name: 'Pedro Lima', device: 'Formatação PC', status: 'Em Execução', priority: 'Baixa', value: 'R$ 150' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-on-surface">{row.device}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{row.name}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        row.status === 'Finalizado' ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-on-surface-variant'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${row.priority === 'Alta' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-white/20'}`}></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{row.priority}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-on-surface text-sm">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] flex flex-col h-full bg-white/[0.02]">
          <h3 className="text-xl font-black text-on-surface uppercase tracking-tight mb-10">Categorias</h3>
          <div className="flex-1 flex flex-col items-center justify-center gap-12">
            <div className="w-full h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-2xl font-black text-on-surface">1.2k</span>
                 <span className="text-[8px] uppercase font-black tracking-widest text-on-surface-variant">Total</span>
              </div>
            </div>
            <div className="w-full space-y-4">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full transition-transform group-hover:scale-150" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-on-surface">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
