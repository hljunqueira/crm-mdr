import React, { useMemo, useEffect } from 'react';
import { Users, ShoppingBag, CreditCard, Wrench, Loader2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSaleStore } from '../store/useSaleStore';
import { useServiceOrderStore } from '../store/useServiceOrderStore';
import { useAuthStore } from '../store/useAuthStore';

export default function Dashboard() {
  const { customers, fetchCustomers } = useCustomerStore();
  const { sales, fetchSales, isLoading: isSalesLoading } = useSaleStore();
  const { serviceOrders, fetchServiceOrders } = useServiceOrderStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    const unitId = profile?.unit_id || undefined;
    fetchCustomers(unitId);
    fetchSales(unitId);
    fetchServiceOrders(unitId);
  }, [profile?.unit_id, fetchCustomers, fetchSales, fetchServiceOrders]);

  // Filtrar apenas vendas ativas da loja (não canceladas)
  const activeStoreSales = useMemo(() => {
    return sales.filter(s => s.status !== 'cancelled');
  }, [sales]);

  const totalSalesValue = useMemo(() => {
    return activeStoreSales.reduce((acc, s) => acc + (Number(s.total_value) || 0), 0);
  }, [activeStoreSales]);

  // Dynamic Weekly Flow Data
  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const result = days.map(day => ({ name: day, vendas: 0, quantidade: 0 }));
    
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    activeStoreSales.forEach(s => {
      const saleDate = new Date(s.date || s.created_at);
      if (saleDate >= lastWeek) {
        const dayIndex = saleDate.getDay();
        result[dayIndex].vendas += Number(s.total_value) || 0;
        result[dayIndex].quantidade += 1;
      }
    });

    return [...result.slice(1), result[0]];
  }, [activeStoreSales]);

  // Dynamic Revenue Data (Last 6 Months)
  const revenueData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[d.getMonth()];
      const value = activeStoreSales
        .filter(s => {
          const sd = new Date(s.date || s.created_at);
          return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        })
        .reduce((acc, current) => acc + (Number(current.total_value) || 0), 0);
      
      result.push({ month: monthName, value });
    }
    return result;
  }, [activeStoreSales]);

  const dynamicPieData = useMemo(() => {
    const brands = ['iPhone', 'Samsung', 'Motorola', 'Xiaomi', 'Outros'];
    return brands.map(brand => {
      const count = brand === 'Outros' 
        ? activeStoreSales.filter(s => !brands.slice(0, 4).some(b => (s.device_model || s.device_model_manual || '').toLowerCase().includes(b.toLowerCase()))).length
        : activeStoreSales.filter(s => (s.device_model || s.device_model_manual || '').toLowerCase().includes(brand.toLowerCase())).length;
      return { name: brand, value: count };
    }).filter(b => b.value > 0);
  }, [activeStoreSales]);

  const currentMonthName = useMemo(() => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[new Date().getMonth()];
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const clean = dateStr.split('T')[0];
    const [year, month, day] = clean.split('-');
    return `${day}/${month}/${year}`;
  };

  // Últimas vendas da loja ordenadas
  const recentStoreSales = useMemo(() => {
    return [...activeStoreSales]
      .sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
      .slice(0, 10);
  }, [activeStoreSales]);

  const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7'];

  if (isSalesLoading && activeStoreSales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20 gap-4 opacity-40">
        <Loader2 className="animate-spin" size={48} />
        <span className="text-[10px] font-black uppercase tracking-widest">Carregando Informações da Loja...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Visão Geral da Loja</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">
            MDR Informática & Celulares — Painel Operacional da Loja
          </p>
        </div>
      </div>

      {/* 4 Cards de Métricas da Loja */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Clientes Cadastrados', 
            value: customers.length.toString(), 
            icon: Users, 
            colorClass: 'text-logo-blue bg-logo-blue/5 border-logo-blue/10 group-hover:bg-logo-blue group-hover:text-white' 
          },
          { 
            label: 'Vendas da Loja', 
            value: activeStoreSales.length.toString(), 
            icon: ShoppingBag, 
            colorClass: 'text-logo-green bg-logo-green/5 border-logo-green/10 group-hover:bg-logo-green group-hover:text-white' 
          },
          { 
            label: 'Faturamento da Loja', 
            value: `R$ ${totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
            icon: CreditCard, 
            colorClass: 'text-logo-yellow bg-logo-yellow/5 border-logo-yellow/10 group-hover:bg-logo-yellow group-hover:text-white' 
          },
          { 
            label: 'Assistência Técnica (OS)', 
            value: (serviceOrders || []).length.toString(), 
            icon: Wrench, 
            colorClass: 'text-purple-400 bg-purple-500/5 border-purple-500/10 group-hover:bg-purple-500 group-hover:text-white' 
          },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-8 border border-outline-variant/30 rounded-4xl group hover:border-white/10 transition-all cursor-default">
            <div className="flex items-start justify-between mb-6">
              <div className={`p-4 rounded-2xl border transition-all shadow-inner ${stat.colorClass}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <h3 className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest opacity-60">{stat.label}</h3>
            <p className="text-3xl font-black text-on-surface tracking-tight mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] h-112.5 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-on-surface uppercase tracking-tight font-display">Fluxo de Vendas Semanal</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Faturamento</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 800 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '16px' }}
                />
                <Bar dataKey="vendas" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] h-112.5 flex flex-col">
          <h3 className="text-xl font-black text-on-surface uppercase tracking-tight font-display mb-10">Faturamento Realizado da Loja</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 800 }} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Últimas Vendas da Loja & Distribuição por Marca */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card border border-outline-variant/30 rounded-[40px] overflow-hidden flex flex-col">
          <div className="p-8 border-b border-outline-variant/30 flex items-center justify-between bg-white/2">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-on-surface uppercase tracking-tight font-display">Últimas Vendas da Loja</h3>
              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-on-surface-variant">
                {currentMonthName}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-outline-variant/20">
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Produto / Serviço</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Pagamento</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Data</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {recentStoreSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-xs font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                      Nenhuma venda registrada
                    </td>
                  </tr>
                ) : (
                  recentStoreSales.map((sale, i) => (
                    <tr key={sale.id || i} className="hover:bg-white/2 transition-colors cursor-pointer group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-on-surface">{sale.customer_name || 'Cliente Balcão'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-bold text-on-surface capitalize">
                          {sale.device_model || sale.device_model_manual || 'Produto / Acessório'}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-on-surface-variant">
                          {sale.origin_type === 'CREDIARIO_LOJA' ? 'Crediário Loja' :
                           sale.payment_method === 'pix' ? 'PIX' :
                           sale.payment_method === 'money' ? 'Dinheiro' :
                           sale.payment_type === 'vista' ? 'À Vista' :
                           sale.payment_type === 'card' ? 'Cartão' :
                           sale.payment_type === 'debit' ? 'Débito' :
                           sale.payment_type || 'Loja'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-on-surface uppercase tracking-widest">
                          {formatDate(sale.date || sale.created_at)}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-on-surface text-sm font-mono">
                        R$ {Number(sale.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] flex flex-col h-full bg-white/2">
          <h3 className="text-xl font-black text-on-surface uppercase tracking-tight mb-10 font-display">Vendas por Marca</h3>
          <div className="flex-1 flex flex-col items-center justify-center gap-12">
            <div className="w-full h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dynamicPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {dynamicPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-on-surface">{activeStoreSales.length}</span>
                <span className="text-[8px] uppercase font-black tracking-widest text-on-surface-variant">Aparelhos</span>
              </div>
            </div>
            <div className="w-full space-y-4">
              {dynamicPieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full transition-transform group-hover:scale-150" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
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
