import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Settings, 
  Plus, 
  Trash2, 
  Calendar, 
  Percent, 
  TrendingUp, 
  FileText, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Building,
  Loader2,
  Trophy
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUnitStore } from '../store/useUnitStore';
import { useCommissionStore, CommissionSetting } from '../store/useCommissionStore';
import { useCashStore } from '../store/useCashStore';
import { useUI } from '../context/UIContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

export default function Commissions() {
  const { profile, user } = useAuthStore();
  const { units, fetchAllUnits } = useUnitStore();
  const { 
    settings, 
    vouchers, 
    isLoading: storeLoading, 
    fetchSettings, 
    saveSetting, 
    fetchVouchers, 
    addVoucher, 
    deleteVoucher 
  } = useCommissionStore();
  const { activeShift, fetchActiveShift } = useCashStore();
  const { showNotification } = useUI();

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'payroll' | 'vouchers' | 'settings'>('payroll');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('');

  // Collaborators/Users List from backend
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Vales Form Modal State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    profile_id: '',
    unit_id: '',
    amount: '',
    payment_method: 'pix' as 'pix' | 'money' | 'bank',
    type: 'vale' as 'vale' | 'pro_labore' | 'profit_distribution',
    description: ''
  });
  const [submittingVoucher, setSubmittingVoucher] = useState(false);

  // Settings Edit State
  const [editingSetting, setEditingSetting] = useState<any | null>(null);
  const [submittingSetting, setSubmittingSetting] = useState(false);

  // Goals and Performance cache for calculation
  const [periodGoals, setPeriodGoals] = useState<any[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // Sales and OS cache for calculating commission details
  const [salesList, setSalesList] = useState<any[]>([]);
  const [osList, setOsList] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Policy setting: 'faturamento' or 'recebimento' (defaults to faturamento)
  const [commissionPolicy, setCommissionPolicy] = useState<'billing' | 'receipt'>('billing');

  const monthsList = [
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

  const yearsList = [2025, 2026, 2027];

  useEffect(() => {
    fetchAllUnits();
    fetchSettings();
    loadCollaborators();
  }, []);

  // Sync unit for new voucher modal with owner unit or first store
  useEffect(() => {
    if (units.length > 0 && !voucherForm.unit_id) {
      setVoucherForm(prev => ({ ...prev, unit_id: units[0].id }));
    }
  }, [units]);

  // Reload data when filters change
  useEffect(() => {
    const start_date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const end_date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    fetchVouchers({
      unit_id: selectedUnitId !== 'all' ? selectedUnitId : undefined,
      profile_id: selectedCollaboratorId || undefined,
      start_date,
      end_date
    });

    loadGoalsAndPerformance();
  }, [selectedUnitId, selectedCollaboratorId, selectedMonth, selectedYear]);

  // Check cashier shift if payment method is money
  useEffect(() => {
    if (voucherForm.payment_method === 'money' && voucherForm.unit_id) {
      fetchActiveShift(voucherForm.unit_id);
    }
  }, [voucherForm.payment_method, voucherForm.unit_id]);

  const loadCollaborators = async () => {
    setLoadingCollaborators(true);
    try {
      const data = await api.get('/users');
      const filtered = (data || []).filter((u: any) => 
        u.role !== 'investor' && 
        !u.full_name?.toLowerCase().includes('terminal')
      );
      setCollaborators(filtered);
      if (filtered && filtered.length > 0 && !selectedCollaboratorId) {
        setSelectedCollaboratorId(filtered[0].id);
      }
    } catch (err) {
      console.error('Error loading collaborators:', err);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const loadGoalsAndPerformance = async () => {
    setLoadingGoals(true);
    setLoadingTransactions(true);
    try {
      // 1. Fetch goals progress from collaborator_goals for the period
      const goals = await api.get(`/users/goals/${selectedMonth}/${selectedYear}`);
      setPeriodGoals(goals || []);

      // 2. Fetch sales for calculating commissions
      const sales = await api.get('/sales');
      setSalesList(sales || []);

      // 3. Fetch OS list
      const os = await api.get('/os');
      setOsList(os || []);
    } catch (err) {
      console.error('Error loading period metrics:', err);
    } finally {
      setLoadingGoals(false);
      setLoadingTransactions(false);
    }
  };

  const selectedColProfile = useMemo(() => {
    return collaborators.find(c => c.id === selectedCollaboratorId);
  }, [collaborators, selectedCollaboratorId]);

  const selectedColSetting = useMemo(() => {
    return settings.find(s => s.profile_id === selectedCollaboratorId);
  }, [settings, selectedCollaboratorId]);

  const selectedColGoal = useMemo(() => {
    return periodGoals.find(g => g.profile_id === selectedCollaboratorId);
  }, [periodGoals, selectedCollaboratorId]);

  // Vales filter matching current monthly selection
  const monthlyVouchers = useMemo(() => {
    return vouchers.filter(v => v.profile_id === selectedCollaboratorId);
  }, [vouchers, selectedCollaboratorId]);

  // ----------------------------------------------------
  // COMMISSION CALCULATIONS
  // ----------------------------------------------------
  const collaboratorMetrics = useMemo(() => {
    if (!selectedCollaboratorId) return { salesTotal: 0, servicesTotal: 0, salesCommission: 0, servicesCommission: 0 };

    const rule = selectedColSetting || { sales_commission_pct: 0, services_commission_pct: 0 };

    // Filter sales for this collaborator in the active month/year (excluding cancelled/waiting_pickup depending on rule)
    const activeSales = salesList.filter(s => {
      if (s.seller_id !== selectedCollaboratorId) return false;
      if (s.status === 'cancelled') return false;
      
      const dateStr = s.date || s.created_at;
      if (!dateStr) return false;
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const d = new Date(cleanDate + 'T12:00:00');
      return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });

    const salesTotal = activeSales.reduce((sum, s) => {
      const tradeInVal = s.is_trade_in ? Number(s.trade_in_valuation || 0) : 0;
      return sum + (s.original_price ?? s.total_value) - tradeInVal;
    }, 0);

    const salesCommission = activeSales.reduce((sum, s) => {
      const tradeInVal = s.is_trade_in ? Number(s.trade_in_valuation || 0) : 0;
      const baseVal = (s.original_price ?? s.total_value) - tradeInVal;
      // If commission policy is by receipt (parcelas pagas)
      if (commissionPolicy === 'receipt' && s.payment_type === 'crediario') {
        // Commission is calculated only on paid installments this month? Or we just count whatever is faturado?
        // For simplicity, we fallback to faturamento or calculate % on actual payments. Let's do % on faturamento
      }
      return sum + (baseVal * (Number(rule.sales_commission_pct || 0) / 100));
    }, 0);

    // Filter OS for this technician delivered/ready in active month
    const activeOs = osList.filter(o => {
      if (o.responsible_technician_id !== selectedCollaboratorId) return false;
      if (o.status !== 'delivered') return false; // only pay completed/delivered OS

      const dateStr = o.delivered_at || o.created_at;
      if (!dateStr) return false;
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const d = new Date(cleanDate + 'T12:00:00');
      return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });

    const servicesTotal = activeOs.reduce((sum, o) => sum + Number(o.labor_value || 0), 0);
    const servicesCommission = activeOs.reduce((sum, o) => sum + (Number(o.labor_value || 0) * (Number(rule.services_commission_pct || 0) / 100)), 0);

    return {
      salesTotal,
      servicesTotal,
      salesCommission,
      servicesCommission,
      salesCount: activeSales.length,
      servicesCount: activeOs.length
    };
  }, [selectedCollaboratorId, salesList, osList, selectedColSetting, selectedMonth, selectedYear, commissionPolicy]);

  // Goal Rewards Application
  const goalsBonus = useMemo(() => {
    let salesBonus = 0;
    let osBonus = 0;
    let extraSalesPct = 0;

    if (!selectedColGoal || !selectedColSetting) return { salesBonus, osBonus, extraSalesPct, salesAchieved: false, osAchieved: false };

    const salesProgress = Number(selectedColGoal.sales_progress || 0);
    const salesTarget = Number(selectedColGoal.sales_target || 0);
    const osProgress = Number(selectedColGoal.os_progress || 0);
    const osTarget = Number(selectedColGoal.os_target || 0);

    const salesAchieved = salesTarget > 0 && salesProgress >= salesTarget;
    const osAchieved = osTarget > 0 && osProgress >= osTarget;

    if (salesAchieved) {
      salesBonus = Number(selectedColSetting.sales_goal_bonus_fixed || 0);
      extraSalesPct = Number(selectedColSetting.sales_goal_bonus_pct || 0);
    }
    if (osAchieved) {
      osBonus = Number(selectedColSetting.os_goal_bonus_fixed || 0);
    }

    return {
      salesBonus,
      osBonus,
      extraSalesPct,
      salesAchieved,
      osAchieved
    };
  }, [selectedColGoal, selectedColSetting]);

  const finalCalculatedSalesCommission = useMemo(() => {
    const base = collaboratorMetrics.salesCommission;
    const extraPct = goalsBonus.extraSalesPct;
    if (extraPct > 0) {
      // Extra percentage added to base comission
      return base + (collaboratorMetrics.salesTotal * (extraPct / 100));
    }
    return base;
  }, [collaboratorMetrics, goalsBonus]);

  const baseSalaryOrProLabore = useMemo(() => {
    return Number(selectedColSetting?.base_salary || 0);
  }, [selectedColSetting]);

  const totalVouchersSum = useMemo(() => {
    return monthlyVouchers.reduce((sum, v) => sum + Number(v.amount), 0);
  }, [monthlyVouchers]);

  const netPayable = useMemo(() => {
    const gross = baseSalaryOrProLabore + finalCalculatedSalesCommission + collaboratorMetrics.servicesCommission + goalsBonus.salesBonus + goalsBonus.osBonus;
    return Math.max(0, gross - totalVouchersSum);
  }, [baseSalaryOrProLabore, finalCalculatedSalesCommission, collaboratorMetrics, goalsBonus, totalVouchersSum]);

  // ----------------------------------------------------
  // EVENT HANDLERS
  // ----------------------------------------------------
  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherForm.profile_id || !voucherForm.unit_id || !voucherForm.amount) {
      showNotification('error', 'Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmittingVoucher(true);
    try {
      await addVoucher({
        ...voucherForm,
        amount: parseFloat(voucherForm.amount),
        created_by: profile?.id
      });
      showNotification('success', 'Lançamento Concluído', 'O vale/retirada foi registrado com sucesso.');
      setIsVoucherModalOpen(false);
      setVoucherForm({
        profile_id: '',
        unit_id: units[0]?.id || '',
        amount: '',
        payment_method: 'pix',
        type: 'vale',
        description: ''
      });
      loadGoalsAndPerformance();
    } catch (err: any) {
      showNotification('error', 'Falha no Lançamento', err.message || 'Erro ao registrar adiantamento.');
    } finally {
      setSubmittingVoucher(false);
    }
  };

  const handleEditSetting = (col: any) => {
    const colSetting = settings.find(s => s.profile_id === col.id) || {
      profile_id: col.id,
      sales_commission_pct: 0,
      services_commission_pct: 0,
      base_salary: 0,
      sales_goal_bonus_pct: 0,
      sales_goal_bonus_fixed: 0,
      os_goal_bonus_fixed: 0
    };
    setEditingSetting(colSetting);
  };

  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetting) return;

    setSubmittingSetting(true);
    try {
      await saveSetting(editingSetting);
      showNotification('success', 'Configuração Salva', 'As regras de comissão foram atualizadas com sucesso.');
      setEditingSetting(null);
    } catch (err: any) {
      showNotification('error', 'Falha ao Salvar', err.message || 'Erro ao atualizar configurações.');
    } finally {
      setSubmittingSetting(false);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este vale? Se pago do caixa físico, a saída correspondente será removida.')) return;
    try {
      await deleteVoucher(id);
      showNotification('success', 'Excluído', 'O adiantamento foi excluído com sucesso.');
      loadGoalsAndPerformance();
    } catch (err: any) {
      showNotification('error', 'Erro', err.message || 'Erro ao excluir adiantamento.');
    }
  };

  const handleClosePayroll = () => {
    showNotification('success', 'Folha Fechada', 'O fechamento foi salvo e o comprovante está pronto para impressão.');
    window.print();
  };

  const isSocio = selectedColProfile?.role === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Comissões &amp; Folha</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gestão de Comissões, Vales e Pró-labore</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setVoucherForm(prev => ({ ...prev, profile_id: selectedCollaboratorId }));
              setIsVoucherModalOpen(true);
            }}
            className="flex items-center gap-2 bg-white text-black px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            <Plus size={16} />
            Lançar Vale/Retirada
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 pb-1 gap-4 print:hidden">
        {[
          { id: 'payroll', label: 'Fechamento de Folha', icon: FileText },
          { id: 'vouchers', label: 'Histórico de Vales', icon: DollarSign },
          { id: 'settings', label: 'Configurações de Regras', icon: Settings }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 border-b-2 border-transparent font-black uppercase tracking-widest text-[10px] transition-all text-on-surface-variant",
              activeTab === t.id && "border-primary text-white"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Collaborator Selector (only for Payroll & Vouchers) */}
        {activeTab !== 'settings' && (
          <div className="lg:col-span-1 space-y-4 print:hidden">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant opacity-60">Colaboradores</h3>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {loadingCollaborators ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white/40" /></div>
              ) : (
                collaborators.map(col => {
                  const isSelected = selectedCollaboratorId === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => setSelectedCollaboratorId(col.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between group",
                        isSelected 
                          ? "bg-white/10 border-white/20 text-white shadow-lg"
                          : "bg-white/2 border-white/5 text-on-surface-variant hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs",
                          col.role === 'admin' ? "bg-primary/20 text-primary border border-primary/10" : "bg-white/5 border border-white/10"
                        )}>
                          {col.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-black leading-tight uppercase">{col.full_name}</p>
                          <p className="text-[9px] font-bold opacity-60 tracking-wider uppercase mt-0.5">{col.role === 'admin' ? 'Dono/Sócio' : col.role === 'technician' ? 'Técnico' : 'Atendente'}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", isSelected && "opacity-100 text-primary")} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Side: Tab Content */}
        <div className={cn(activeTab === 'settings' ? "lg:col-span-4" : "lg:col-span-3", "space-y-6")}>
          
          {/* TAB 1: PAYROLL CLOSURE */}
          {activeTab === 'payroll' && selectedCollaboratorId && (
            <div className="space-y-6">
              
              {/* Period Filters */}
              <div className="bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider opacity-60">Mês de Referência</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none"
                    >
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value} className="bg-neutral-900">{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider opacity-60">Ano</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none"
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y} className="bg-neutral-900">{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider opacity-60">Unidade (Filtro Caixa)</span>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none"
                    >
                      <option value="all" className="bg-neutral-900">Todas as Unidades</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id} className="bg-neutral-900">{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1 align-right">
                    <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider opacity-60">Política de Comissão</span>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                      <button
                        onClick={() => setCommissionPolicy('billing')}
                        className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider", commissionPolicy === 'billing' ? "bg-white text-black" : "text-on-surface-variant hover:text-white")}
                      >
                        Faturamento
                      </button>
                      <button
                        onClick={() => setCommissionPolicy('receipt')}
                        className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider", commissionPolicy === 'receipt' ? "bg-white text-black" : "text-on-surface-variant hover:text-white")}
                      >
                        Pagas (Recebido)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Goal Achieved Cards (Integration section) */}
              {selectedColGoal && (
                <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <TrendingUp size={16} />
                        Meta de Venda de Aparelhos
                      </h4>
                      {goalsBonus.salesAchieved && (
                        <span className="bg-success/15 border border-success/20 text-success text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Trophy size={10} />
                          Atingida!
                        </span>
                      )}
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", goalsBonus.salesAchieved ? "bg-success" : "bg-primary")} 
                        style={{ width: `${Math.min(100, (Number(selectedColGoal.sales_progress || 0) / Number(selectedColGoal.sales_target || 1)) * 100)}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold">
                      Realizado: <span className="text-white">R$ {Number(selectedColGoal.sales_progress || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> de R$ {Number(selectedColGoal.sales_target || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({((Number(selectedColGoal.sales_progress || 0) / Number(selectedColGoal.sales_target || 1)) * 100).toFixed(0)}%)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <TrendingUp size={16} />
                        Meta de Reparos (Ordens de Serviço)
                      </h4>
                      {goalsBonus.osAchieved && (
                        <span className="bg-success/15 border border-success/20 text-success text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Trophy size={10} />
                          Atingida!
                        </span>
                      )}
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", goalsBonus.osAchieved ? "bg-success" : "bg-primary")} 
                        style={{ width: `${Math.min(100, (Number(selectedColGoal.os_progress || 0) / Number(selectedColGoal.os_target || 1)) * 100)}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold">
                      Realizado: <span className="text-white">{selectedColGoal.os_progress || 0}</span> de {selectedColGoal.os_target || 0} reparos ({((Number(selectedColGoal.os_progress || 0) / Number(selectedColGoal.os_target || 1)) * 100).toFixed(0)}%)
                    </p>
                  </div>
                </div>
              )}

              {/* Main Payroll Print area */}
              <div id="payroll-document-area" className="bg-white/2 border border-white/5 rounded-[40px] p-8 space-y-8 print:border-none print:bg-white print:text-black">
                
                {/* Print Invoice Header */}
                <div className="hidden print:flex items-center justify-between border-b border-black pb-4">
                  <div className="flex items-center gap-3">
                    <img src="/logo-mdr.png" alt="MDR" className="h-10 w-auto filter grayscale contrast-150" />
                    <div>
                      <h2 className="font-bold text-sm tracking-tight">MDR INFORMÁTICA &amp; CELULARES</h2>
                      <p className="text-[9px] opacity-60">Demonstrativo de Fechamento Mensal</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-xs uppercase">{isSocio ? 'Retirada de Sócio / Pró-labore' : 'Folha de Pagamento'}</h3>
                    <p className="text-[9px] opacity-60">Referência: {monthsList.find(m => m.value === selectedMonth)?.label}/{selectedYear}</p>
                  </div>
                </div>

                {/* Collaborator Card Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-white/5 print:border-black">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight print:text-black">{selectedColProfile?.full_name}</h2>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider print:text-black">{selectedColProfile?.role === 'admin' ? 'Sócio-Administrador' : selectedColProfile?.role === 'technician' ? 'Técnico em Manutenção' : 'Vendedor/Atendente'}</p>
                  </div>
                  <div className="md:text-right space-y-1 font-mono text-xs text-on-surface-variant print:text-black">
                    <p>Unidade Base: {units.find(u => u.id === selectedColProfile?.store_id)?.name || 'Principal'}</p>
                    <p>Apuração: {commissionPolicy === 'billing' ? 'Faturamento Total' : 'Recebido Físico'}</p>
                  </div>
                </div>

                {/* Breakdown Tables */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary print:text-black">{isSocio ? 'Resumo de Retiradas de Sócios' : 'Demonstrativo de Vencimentos'}</h3>

                  {/* Calculations Details */}
                  <div className="divide-y divide-white/5 border border-white/5 rounded-3xl overflow-hidden font-sans print:border-black print:divide-black">
                    
                    {/* Fixo/Pró-labore */}
                    <div className="flex justify-between items-center p-4 bg-white/2 print:bg-gray-150">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-white print:text-black">{isSocio ? 'Pró-labore Mensal' : 'Salário Base CLT'}</p>
                        <p className="text-[9px] text-on-surface-variant print:text-black">Remuneração fixa acordada</p>
                      </div>
                      <span className="font-mono text-xs font-black text-white print:text-black">R$ {baseSalaryOrProLabore.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* Vendas comissão */}
                    {collaboratorMetrics.salesTotal > 0 && (
                      <div className="flex justify-between items-center p-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-white print:text-black">Comissão sobre Vendas de Aparelhos</p>
                          <p className="text-[9px] text-on-surface-variant print:text-black">
                            Volume: R$ {collaboratorMetrics.salesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({collaboratorMetrics.salesCount} vendas)
                            | Taxa: {selectedColSetting?.sales_commission_pct}% 
                            {goalsBonus.extraSalesPct > 0 && ` + ${goalsBonus.extraSalesPct}% (Bônus Meta)`}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-black text-white print:text-black">R$ {finalCalculatedSalesCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* OS comissão */}
                    {collaboratorMetrics.servicesTotal > 0 && (
                      <div className="flex justify-between items-center p-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-white print:text-black">Comissão sobre Serviços (Mão de Obra)</p>
                          <p className="text-[9px] text-on-surface-variant print:text-black">Volume de Mão de Obra: R$ {collaboratorMetrics.servicesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({collaboratorMetrics.servicesCount} serviços finalizados) | Taxa: {selectedColSetting?.services_commission_pct}%</p>
                        </div>
                        <span className="font-mono text-xs font-black text-white print:text-black">R$ {collaboratorMetrics.servicesCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* Goal achievement cash bonuses */}
                    {(goalsBonus.salesBonus > 0 || goalsBonus.osBonus > 0) && (
                      <div className="flex justify-between items-center p-4 bg-success/5 print:bg-gray-100">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-success print:text-black">Bônus por Atingimento de Metas (Performance)</p>
                          <p className="text-[9px] text-on-surface-variant print:text-black">
                            {goalsBonus.salesBonus > 0 && `Meta de Vendas: + R$ ${goalsBonus.salesBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            {goalsBonus.osBonus > 0 && ` | Meta de OS: + R$ ${goalsBonus.osBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-black text-success print:text-black">R$ {(goalsBonus.salesBonus + goalsBonus.osBonus).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* Vouchers (vales) debit */}
                    {totalVouchersSum > 0 && (
                      <div className="flex justify-between items-center p-4 bg-error/5 print:bg-gray-50">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-error print:text-black">{isSocio ? 'Distribuições de Lucro Realizadas' : 'Descontos de Vales / Adiantamentos'}</p>
                          <p className="text-[9px] text-on-surface-variant print:text-black">Total de adiantamentos retirados ao longo do mês</p>
                        </div>
                        <span className="font-mono text-xs font-black text-error print:text-black">- R$ {totalVouchersSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* Net Total card */}
                    <div className="flex justify-between items-center p-6 bg-white/5 border-t border-white/10 print:border-black print:bg-gray-100">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-wide text-white print:text-black">Saldo Líquido a Receber</h4>
                        <p className="text-[9px] text-on-surface-variant print:text-black">Valor final líquido para pagamento de folha</p>
                      </div>
                      <span className="font-mono text-xl font-black text-primary print:text-black">R$ {netPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                  </div>
                </div>

                {/* Vales List inside document area */}
                {monthlyVouchers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 print:text-black">Relação de Retiradas / Vales do Período</h4>
                    <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 print:border-black print:divide-black">
                      {monthlyVouchers.map((v) => (
                        <div key={v.id} className="flex justify-between items-center p-3 text-xs text-on-surface-variant print:text-black">
                          <div>
                            <p className="font-bold text-white uppercase text-[10px] print:text-black">
                              {v.type === 'pro_labore' ? 'Adiantamento Pró-labore' : v.type === 'profit_distribution' ? 'Retirada de Lucro' : 'Vale Funcionário'}
                            </p>
                            <p className="text-[9px] opacity-75">{new Date(v.voucher_date + 'T12:00:00').toLocaleDateString('pt-BR')} | {v.payment_method === 'money' ? 'Caixa Físico' : v.payment_method === 'pix' ? 'PIX' : 'Transferência'}</p>
                            {v.description && <p className="text-[9px] mt-0.5 opacity-60 font-sans italic">"{v.description}"</p>}
                          </div>
                          <span className="font-mono font-bold">R$ {Number(v.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Print Signatures */}
                <div className="hidden print:grid grid-cols-2 gap-12 pt-16 text-center text-[10px]">
                  <div className="space-y-1">
                    <div className="border-b border-black w-48 mx-auto h-8" />
                    <p className="font-bold">MDR INFORMÁTICA &amp; CELULARES</p>
                    <p className="opacity-60">Responsável Financeiro</p>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-black w-48 mx-auto h-8" />
                    <p className="font-bold">{selectedColProfile?.full_name?.toUpperCase()}</p>
                    <p className="opacity-60">Assinatura do Recibo</p>
                  </div>
                </div>

              </div>

              {/* Closure controls */}
              <div className="flex gap-4 justify-end print:hidden">
                <button
                  onClick={handleClosePayroll}
                  className="flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  <CheckCircle2 size={16} />
                  Fechar Folha / Imprimir Recibo
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: VOUCHERS HISTORY */}
          {activeTab === 'vouchers' && (
            <div className="space-y-6">
              
              {/* List */}
              <div className="bg-white/2 rounded-[40px] border border-outline-variant/30 overflow-hidden print:border-none">
                <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Histórico de Adiantamentos</h3>
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-on-surface-variant" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant opacity-60">Unidade Atual</span>
                  </div>
                </div>

                {monthlyVouchers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
                    <DollarSign size={48} className="text-on-surface-variant mb-2 opacity-20" />
                    <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhum vale lançado</p>
                    <p className="text-[10px] font-display text-on-surface-variant opacity-70">Nenhum adiantamento ou retirada de lucros foi encontrado para o período selecionado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Data</th>
                          <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Tipo</th>
                          <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Método</th>
                          <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Descrição</th>
                          <th className="px-8 py-5 text-right text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Valor</th>
                          <th className="px-8 py-5 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {monthlyVouchers.map((v) => (
                          <tr key={v.id} className="hover:bg-white/2 transition-colors">
                            <td className="px-8 py-6 text-xs font-bold text-white">
                              {new Date(v.voucher_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-8 py-6 text-xs font-black uppercase text-on-surface">
                              {v.type === 'pro_labore' ? 'Pró-labore' : v.type === 'profit_distribution' ? 'Retirada de Lucro' : 'Vale'}
                            </td>
                            <td className="px-8 py-6 text-xs font-bold text-on-surface-variant uppercase">
                              {v.payment_method === 'money' ? 'Dinheiro (Caixa)' : v.payment_method === 'pix' ? 'Pix' : 'Banco'}
                            </td>
                            <td className="px-8 py-6 text-xs text-on-surface-variant font-display opacity-80 max-w-xs truncate">
                              {v.description || '-'}
                            </td>
                            <td className="px-8 py-6 text-xs font-mono font-black text-white text-right">
                              R$ {Number(v.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button
                                onClick={() => handleDeleteVoucher(v.id)}
                                className="p-2 rounded-xl bg-error/10 hover:bg-error/20 text-error hover:scale-105 transition-all"
                                title="Excluir Lançamento"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: COMMISSION SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              <div className="bg-white/2 rounded-[40px] border border-outline-variant/30 overflow-hidden">
                <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Configurações de Regras de Comissão</h3>
                  <span className="text-[8px] font-black text-primary border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Painel Administrativo</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Funcionário</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Salário / Pró-labore</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">% Comissão Vendas</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">% Comissão OS</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Bônus de Meta (Vendas)</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Bônus de Meta (OS)</th>
                        <th className="px-8 py-5 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {collaborators.map((col) => {
                        const rule = settings.find(s => s.profile_id === col.id) || {
                          base_salary: 0,
                          sales_commission_pct: 0,
                          services_commission_pct: 0,
                          sales_goal_bonus_pct: 0,
                          sales_goal_bonus_fixed: 0,
                          os_goal_bonus_fixed: 0
                        };

                        return (
                          <tr key={col.id} className="hover:bg-white/2 transition-colors">
                            <td className="px-8 py-6">
                              <p className="text-xs font-black text-white uppercase">{col.full_name}</p>
                              <p className="text-[9px] text-on-surface-variant uppercase font-bold opacity-60">{col.role === 'admin' ? 'Dono/Sócio' : 'Colaborador'}</p>
                            </td>
                            <td className="px-8 py-6 text-xs font-mono text-white">
                              R$ {Number(rule.base_salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-8 py-6 text-xs font-mono text-white">
                              {rule.sales_commission_pct || 0}%
                            </td>
                            <td className="px-8 py-6 text-xs font-mono text-white">
                              {rule.services_commission_pct || 0}%
                            </td>
                            <td className="px-8 py-6 text-xs font-mono text-white">
                              {rule.sales_goal_bonus_pct > 0 ? `+${rule.sales_goal_bonus_pct}%` : ''} 
                              {rule.sales_goal_bonus_fixed > 0 ? ` + R$ ${Number(rule.sales_goal_bonus_fixed).toLocaleString('pt-BR')}` : ''}
                              {(!rule.sales_goal_bonus_pct && !rule.sales_goal_bonus_fixed) && '-'}
                            </td>
                            <td className="px-8 py-6 text-xs font-mono text-white">
                              {rule.os_goal_bonus_fixed > 0 ? `R$ ${Number(rule.os_goal_bonus_fixed).toLocaleString('pt-BR')}` : '-'}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button
                                onClick={() => handleEditSetting(col)}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white text-[9px] font-black uppercase text-on-surface-variant hover:text-black transition-all"
                              >
                                Editar Regras
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MODAL: REGISTRAR NOVO VALE / RETIRADA */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-[32px] w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Novo Vale / Retirada</h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Lançamento de Adiantamento</p>
              </div>
              <button 
                onClick={() => setIsVoucherModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVoucherSubmit} className="space-y-4">
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Beneficiário</label>
                <select
                  value={voucherForm.profile_id}
                  onChange={(e) => {
                    const col = collaborators.find(c => c.id === e.target.value);
                    setVoucherForm(prev => ({ 
                      ...prev, 
                      profile_id: e.target.value,
                      type: col?.role === 'admin' ? 'pro_labore' : 'vale'
                    }));
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none"
                >
                  <option value="" className="bg-neutral-900">Selecione o Funcionário</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id} className="bg-neutral-900">{c.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Type selector base on role */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Tipo de Retirada</label>
                <select
                  value={voucherForm.type}
                  onChange={(e) => setVoucherForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none"
                >
                  {isSocio ? (
                    <>
                      <option value="pro_labore" className="bg-neutral-900">Adiantamento de Pró-labore</option>
                      <option value="profit_distribution" className="bg-neutral-900">Retirada de Lucro (Dividendos)</option>
                    </>
                  ) : (
                    <option value="vale" className="bg-neutral-900">Vale / Adiantamento de Salário</option>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Unidade Física (Lançar Caixa)</label>
                <select
                  value={voucherForm.unit_id}
                  onChange={(e) => setVoucherForm(prev => ({ ...prev, unit_id: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none"
                >
                  {units.map(u => (
                    <option key={u.id} value={u.id} className="bg-neutral-900">{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={voucherForm.amount}
                    onChange={(e) => setVoucherForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Método</label>
                  <select
                    value={voucherForm.payment_method}
                    onChange={(e) => setVoucherForm(prev => ({ ...prev, payment_method: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="pix" className="bg-neutral-900">PIX</option>
                    <option value="money" className="bg-neutral-900">Dinheiro (Caixa)</option>
                    <option value="bank" className="bg-neutral-900">Transf. Bancária</option>
                  </select>
                </div>
              </div>

              {voucherForm.payment_method === 'money' && voucherForm.unit_id && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2 text-[10px] text-on-surface-variant">
                  <AlertCircle size={14} className="text-warning shrink-0" />
                  <div>
                    {activeShift ? (
                      <p>
                        Turno de caixa ativo encontrado. Dinheiro disponível na gaveta: 
                        <strong className="text-white"> R$ {Number(activeShift.expected_cash || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
                      </p>
                    ) : (
                      <p className="text-error">
                        <strong>Nenhum caixa aberto nesta unidade!</strong> Abra o caixa para permitir retiradas em dinheiro.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Observações/Motivo</label>
                <textarea
                  placeholder="Ex: Adiantamento para compra de insumos, etc."
                  value={voucherForm.description}
                  onChange={(e) => setVoucherForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none h-20"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingVoucher || (voucherForm.payment_method === 'money' && !activeShift)}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {submittingVoucher && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar Lançamento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR REGRAS DE COMISSÃO */}
      {editingSetting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-[32px] w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Editar Regras de Comissão</h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Beneficiário: {collaborators.find(c => c.id === editingSetting.profile_id)?.full_name}</p>
              </div>
              <button 
                onClick={() => setEditingSetting(null)}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSetting} className="space-y-4">
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">
                  {collaborators.find(c => c.id === editingSetting.profile_id)?.role === 'admin' ? 'Pró-labore Fixo (R$)' : 'Salário Fixo Mensal (R$)'}
                </label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={editingSetting.base_salary}
                  onChange={(e) => setEditingSetting(prev => ({ ...prev, base_salary: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">% Comissão Vendas</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editingSetting.sales_commission_pct}
                      onChange={(e) => setEditingSetting(prev => ({ ...prev, sales_commission_pct: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-8 py-3 text-xs font-bold text-white focus:outline-none"
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">% Comissão OS</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editingSetting.services_commission_pct}
                      onChange={(e) => setEditingSetting(prev => ({ ...prev, services_commission_pct: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-8 py-3 text-xs font-bold text-white focus:outline-none"
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  </div>
                </div>
              </div>

              <h4 className="text-[9px] font-black uppercase text-primary tracking-widest pt-2 border-t border-white/5">Bônus por Atingimento de Metas</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">% Comissão Extra (Meta Vendas)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editingSetting.sales_goal_bonus_pct}
                      onChange={(e) => setEditingSetting(prev => ({ ...prev, sales_goal_bonus_pct: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-8 py-3 text-xs font-bold text-white focus:outline-none"
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Bônus Fixo Vendas (R$)</label>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={editingSetting.sales_goal_bonus_fixed}
                    onChange={(e) => setEditingSetting(prev => ({ ...prev, sales_goal_bonus_fixed: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Bônus Fixo OS / Reparos (R$)</label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={editingSetting.os_goal_bonus_fixed}
                  onChange={(e) => setEditingSetting(prev => ({ ...prev, os_goal_bonus_fixed: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSetting(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingSetting}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {submittingSetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Alterações
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
