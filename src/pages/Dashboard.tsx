import React, { useMemo, useEffect } from 'react';
import { TrendingUp, Users, Smartphone, CreditCard, Activity, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSaleStore } from '../store/useSaleStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAuthStore } from '../store/useAuthStore';

export default function Dashboard() {
  const { customers, fetchCustomers } = useCustomerStore();
  const { sales, fetchSales } = useSaleStore();
  const { installments, fetchInstallments, isLoading: isFinanceLoading } = useFinanceStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    const unitId = profile?.unit_id || undefined;
    fetchCustomers(unitId);
    fetchSales(unitId);
    fetchInstallments(unitId);
  }, [profile?.unit_id, fetchCustomers, fetchSales, fetchInstallments]);

  const totalSalesValue = sales.reduce((acc, s) => acc + s.total_value, 0);
  const overdueCount = installments.filter(i => i.status === 'overdue' || i.status === 'blocked').length;
  const overdueRate = installments.length > 0 ? (overdueCount / installments.length * 100).toFixed(1) : '0';

  // Dynamic Weekly Flow Data
  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const result = days.map(day => ({ name: day, vendas: 0, pagamentos: 0 }));
    
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    sales.forEach(s => {
      const saleDate = new Date(s.date);
      if (saleDate >= lastWeek) {
        const dayIndex = saleDate.getDay();
        result[dayIndex].vendas += s.total_value;
      }
    });

    installments.forEach(i => {
      if (i.status === 'paid') {
        const payDate = new Date(i.due_date); // Proxy for payment date
        if (payDate >= lastWeek) {
          const dayIndex = payDate.getDay();
          result[dayIndex].pagamentos += i.value;
        }
      }
    });

    return [...result.slice(1), result[0]];
  }, [sales, installments]);

  // Dynamic Revenue Data (Last 6 Months)
  const revenueData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[d.getMonth()];
      const value = sales
        .filter(s => {
          const sd = new Date(s.date);
          return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        })
        .reduce((acc, current) => acc + current.total_value, 0);
      
      result.push({ month: monthName, value });
    }
    return result;
  }, [sales]);

  const dynamicPieData = useMemo(() => {
    const brands = ['iPhone', 'Samsung', 'Motorola', 'Xiaomi', 'Outros'];
    return brands.map(brand => {
      const count = brand === 'Outros' 
        ? sales.filter(s => !brands.slice(0, 4).some(b => s.device_model.toLowerCase().includes(b.toLowerCase()))).length
        : sales.filter(s => s.device_model.toLowerCase().includes(brand.toLowerCase())).length;
      return { name: brand, value: count };
    }).filter(b => b.value > 0);
  }, [sales]);

  const currentMonthName = useMemo(() => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[new Date().getMonth()];
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const clientsOwingThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const unpaidThisMonth = installments.filter(i => {
      if (i.status === 'paid') return false;
      const [yearStr, monthStr] = i.due_date.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      return year === currentYear && month === currentMonth;
    });

    const grouped: { [key: string]: {
      customer_id: string;
      customer_name: string;
      totalValue: number;
      dueDates: string[];
      statuses: string[];
      installmentsCount: number;
    } } = {};

    unpaidThisMonth.forEach(i => {
      const key = i.customer_id || i.customer_name || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          customer_id: i.customer_id,
          customer_name: i.customer_name || 'Cliente Sem Nome',
          totalValue: 0,
          dueDates: [],
          statuses: [],
          installmentsCount: 0
        };
      }
      grouped[key].totalValue += i.value;
      grouped[key].installmentsCount += 1;
      if (i.due_date && !grouped[key].dueDates.includes(i.due_date)) {
        grouped[key].dueDates.push(i.due_date);
      }
      if (i.status && !grouped[key].statuses.includes(i.status)) {
        grouped[key].statuses.push(i.status);
      }
    });

    return Object.values(grouped).map(group => {
      let finalStatus: 'pending' | 'overdue' | 'blocked' = 'pending';
      if (group.statuses.includes('blocked')) {
        finalStatus = 'blocked';
      } else if (group.statuses.includes('overdue')) {
        finalStatus = 'overdue';
      }

      const sortedDates = [...group.dueDates].sort();
      const earliestDate = sortedDates[0];

      return {
        customer_id: group.customer_id,
        customer_name: group.customer_name,
        totalValue: group.totalValue,
        installmentsCount: group.installmentsCount,
        dueDate: earliestDate,
        status: finalStatus,
        hasMultipleDates: group.dueDates.length > 1
      };
    });
  }, [installments]);

  const COLORS = ['#ffffff', '#a3a3a3', '#525252', '#262626', '#404040'];

  if (isFinanceLoading && sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20 gap-4 opacity-40">
        <Loader2 className="animate-spin" size={48} />
        <span className="text-[10px] font-black uppercase tracking-widest">Carregando Inteligência...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Painel Executivo</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">MDR Informática & Celulares CRM</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Novos Clientes', value: customers.length.toString(), trend: '+100%', icon: Users, color: 'text-white' },
          { label: 'Vendas Ativas', value: sales.length.toString(), trend: '+100%', icon: Smartphone, color: 'text-white' },
          { label: 'Rec. Previsto', value: `R$ ${totalSalesValue.toLocaleString('pt-BR')}`, trend: 'Base', icon: CreditCard, color: 'text-white' },
          { label: 'Inadimplência', value: `${overdueRate}%`, trend: overdueCount > 0 ? 'Atenção' : 'Ideal', icon: AlertCircle, color: overdueCount > 0 ? 'text-error' : 'text-primary' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-8 border border-outline-variant/30 rounded-[32px] group hover:border-white/20 transition-all cursor-default">
            <div className="flex items-start justify-between mb-6">
              <div className={`bg-white/5 ${stat.color} p-4 rounded-2xl border border-white/10 group-hover:bg-white group-hover:text-black transition-all shadow-inner`}>
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
        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] h-[450px] flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-on-surface uppercase tracking-tight font-display">Fluxo de Caixa Semanal</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Vendas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Pagamentos</span>
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
                <Bar dataKey="vendas" fill="#ffffff" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="pagamentos" fill="rgba(255,255,255,0.2)" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] h-[450px] flex flex-col">
          <h3 className="text-xl font-black text-on-surface uppercase tracking-tight font-display mb-10">Faturamento Realizado</h3>
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
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-on-surface uppercase tracking-tight font-display">Alertas de Pagamento</h3>
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
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Vencimento</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {clientsOwingThisMonth.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-10 text-center text-xs font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                      Nenhum cliente devendo neste mês
                    </td>
                  </tr>
                ) : (
                  clientsOwingThisMonth.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-on-surface">{row.customer_name}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">
                          {row.installmentsCount === 1 ? '1 parcela pendente' : `${row.installmentsCount} parcelas pendentes`}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-on-surface uppercase tracking-widest">
                          {formatDate(row.dueDate)}
                          {row.hasMultipleDates && (
                            <span className="text-[9px] text-on-surface-variant ml-1 font-normal lowercase">
                              (mais antiga)
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          row.status === 'blocked' || row.status === 'overdue'
                            ? 'border-error/20 bg-error/10 text-error'
                            : 'border-white/10 text-on-surface-variant'
                        }`}>
                          {row.status === 'blocked' ? 'Bloqueado' :
                           row.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-on-surface text-sm font-mono">
                        R$ {row.totalValue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/30 rounded-[40px] flex flex-col h-full bg-white/[0.02]">
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
                <span className="text-2xl font-black text-on-surface">{sales.length}</span>
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


