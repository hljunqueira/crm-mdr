import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, DollarSign, Briefcase, Calendar, ChevronDown,
  Download, BarChart2, Printer, Percent, Award, BookOpen, Clock,
  Users, ArrowUpRight, CheckCircle2, AlertCircle, Wrench, ChevronUp, Eye,
  Calculator, Smartphone, ArrowDownRight, FileText, Plus, Loader2, Search, X, Trash2,
  Barcode, AlertTriangle, CreditCard
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell
} from 'recharts';
import { cn } from '../lib/utils';
import { useUI } from '../context/UIContext';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSaleStore } from '../store/useSaleStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useServiceOrderStore } from '../store/useServiceOrderStore';
import { useUnitStore } from '../store/useUnitStore';
import { useCashStore, CashTransaction } from '../store/useCashStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useInventoryAuditStore } from '../store/useInventoryAuditStore';
import { useFinancialDashboardStore } from '../store/useFinancialDashboardStore';

export default function Reports() {
  const { showNotification } = useUI();
  const { sales, fetchSales } = useSaleStore();
  const { installments, fetchInstallments } = useFinanceStore();
  const { serviceOrders, fetchServiceOrders } = useServiceOrderStore();
  const { units, fetchAllUnits } = useUnitStore();
  const { transactions, fetchTransactions, addTransaction, deleteTransaction } = useCashStore();
  const { inventory, fetchInventory } = useInventoryStore();

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
      const costPrice = matchedInv ? matchedInv.cost_price : 0;
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
  const { profile } = useAuthStore();
  const { bills, forecast, fetchDashboardData } = useFinancialDashboardStore();
  const [selectedCardDay, setSelectedCardDay] = useState<string>('all');

  const filteredCardBills = useMemo(() => {
    return bills.filter(b => selectedCardDay === 'all' || b.day === Number(selectedCardDay));
  }, [bills, selectedCardDay]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'lucro_presumido' | 'laboratorio' | 'fluxo_caixa' | 'auditoria' | 'metas' | 'liquidacoes' | 'controle_cartoes'>('overview');

  // Global filters
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');

  // Overview & Lab Period filters
  const [dateRange, setDateRange] = useState<'week' | 'month' | '30days' | 'year' | 'all' | 'custom'>('week');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  // Goals
  const [salesTarget, setSalesTarget] = useState<number>(50000);
  const [editingTarget, setEditingTarget] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<string>('50000');

  // Collaborator Goals States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [goalsList, setGoalsList] = useState<any[]>([]);
  const [editingGoalUserId, setEditingGoalUserId] = useState<string | null>(null);
  const [goalSalesInput, setGoalSalesInput] = useState<string>('0');
  const [goalOSInput, setGoalOSInput] = useState<string>('0');

  // Lucro Presumido filters
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const lucroPresumidoYears = useMemo(() => {
    const startYear = 2026;
    const currentYear = new Date().getFullYear();
    const endYear = Math.max(currentYear + 1, 2026);
    const list = [];
    for (let y = startYear; y <= endYear; y++) {
      list.push(y);
    }
    return list;
  }, []);
  const [accountingRegime, setAccountingRegime] = useState<'competence' | 'cash'>('competence');
  const [issRate, setIssRate] = useState<number>(5);

  // Manual transaction Modal States (Corporate/Admin)
  const [isManualTxOpen, setIsManualTxOpen] = useState(false);
  const [manualTx, setManualTx] = useState({
    type: 'outflow' as 'inflow' | 'outflow',
    category: 'outros' as CashTransaction['category'],
    amount: '',
    payment_method: 'money' as CashTransaction['payment_method'],
    description: ''
  });

  // Delete Transaction Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [txToDeleteId, setTxToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inventory Audit States
  const {
    audits,
    activeAudit,
    auditItems,
    isLoading: isAuditLoading,
    fetchAudits,
    fetchActiveAudit,
    startAudit,
    fetchAuditItems,
    saveAuditItem,
    finalizeAudit,
    cancelAudit,
    deleteAudit
  } = useInventoryAuditStore();

  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState('all');
  const [auditDivergence, setAuditDivergence] = useState<'all' | 'correct' | 'missing' | 'extra' | 'pending'>('all');
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelAuditModalOpen, setIsCancelAuditModalOpen] = useState(false);
  const [isFinalizeAuditModalOpen, setIsFinalizeAuditModalOpen] = useState(false);
  const [isDeleteAuditModalOpen, setIsDeleteAuditModalOpen] = useState(false);
  const [auditToDeleteId, setAuditToDeleteId] = useState<string | null>(null);
  const [isDeletingAudit, setIsDeletingAudit] = useState(false);

  // Fetch all required data when unit changes
  useEffect(() => {
    const unitParam = selectedUnitId === 'all' ? undefined : selectedUnitId;
    fetchSales(unitParam);
    fetchInstallments(unitParam);
    fetchServiceOrders(unitParam);
    fetchAllUnits();
  }, [selectedUnitId, fetchSales, fetchInstallments, fetchServiceOrders, fetchAllUnits]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error('[Reports] Erro ao buscar usuários:', e);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetch(`/api/users/goals/${selectedMonth}/${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setGoalsList(data);
      }
    } catch (e) {
      console.error('[Reports] Erro ao buscar metas:', e);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchGoals();
    }
  }, [profile, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchTransactions(selectedUnitId);
    fetchInventory(selectedUnitId);
  }, [selectedUnitId, fetchTransactions, fetchInventory]);

  useEffect(() => {
    if (activeTab === 'auditoria') {
      fetchAudits(selectedUnitId);
      if (selectedUnitId && selectedUnitId !== 'all') {
        fetchActiveAudit(selectedUnitId).then((active) => {
          if (active) {
            fetchAuditItems(active.id);
          }
        });
      }
    }
  }, [activeTab, selectedUnitId, fetchAudits, fetchActiveAudit, fetchAuditItems]);

  useEffect(() => {
    if (activeTab === 'controle_cartoes') {
      fetchDashboardData(selectedMonth, selectedYear, selectedUnitId);
    }
  }, [activeTab, selectedMonth, selectedYear, selectedUnitId, fetchDashboardData]);

  // Date check helper
  const filterByDateRange = (dateStr?: string) => {
    if (!dateStr) return false;
    // Extract date part only (YYYY-MM-DD) to prevent timezone shifts
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = new Date(cleanDateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === 'week') {
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMonday);
      monday.setHours(0, 0, 0, 0);
      return date >= monday;
    }
    if (dateRange === '30days') {
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 30);
      return date >= past30;
    }
    if (dateRange === 'month') {
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }
    if (dateRange === 'year') {
      return date.getFullYear() === today.getFullYear();
    }
    if (dateRange === 'custom') {
      const start = customStartDate ? new Date(customStartDate + 'T00:00:00') : null;
      const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : null;
      if (start && end) return date >= start && date <= end;
      if (start) return date >= start;
      if (end) return date <= end;
      return true;
    }
    return true; // 'all'
  };

  // Branch filter helper
  const filterByUnit = (unitId?: string) => {
    if (selectedUnitId === 'all') return true;
    return unitId === selectedUnitId;
  };

  // Brand filter helper
  const filterByBrand = (modelStr?: string) => {
    if (selectedBrand === 'all') return true;
    const str = (modelStr || '').toLowerCase();
    if (selectedBrand === 'Apple') return str.includes('iphone') || str.includes('apple') || str.includes('ipad');
    if (selectedBrand === 'Samsung') return str.includes('samsung') || str.includes('galaxy');
    if (selectedBrand === 'Xiaomi') return str.includes('xiaomi') || str.includes('redmi') || str.includes('poco');
    if (selectedBrand === 'Motorola') return str.includes('motorola') || str.includes('moto');
    if (selectedBrand === 'Outros') {
      const isKnown = str.includes('iphone') || str.includes('apple') || str.includes('samsung') || str.includes('galaxy') || str.includes('xiaomi') || str.includes('redmi') || str.includes('poco') || str.includes('motorola') || str.includes('moto');
      return !isKnown;
    }
    return true;
  };

  // Filtered datasets for Overview & Laboratorio
  const filteredSales = useMemo(() => {
    return sales.filter(s => s.status !== 'cancelled' && filterByUnit(s.unit_id) && filterByDateRange(s.date) && filterByBrand(s.device_model));
  }, [sales, selectedUnitId, dateRange, customStartDate, customEndDate, selectedBrand]);

  const filteredServiceOrders = useMemo(() => {
    return serviceOrders.filter(o =>
      (o.status === 'delivered' || o.status === 'ready') &&
      filterByUnit(o.unit_id) &&
      filterByDateRange(o.delivered_at || o.created_at) &&
      filterByBrand(o.device_model)
    );
  }, [serviceOrders, selectedUnitId, dateRange, customStartDate, customEndDate, selectedBrand]);

  const revenueChartData = useMemo(() => {
    const dayMap: Record<string, { date: string; formattedDate: string; total: number }> = {};

    filteredSales.forEach(s => {
      if (!s.date) return;
      const dayStr = s.date.split('T')[0];
      const tradeInVal = s.is_trade_in ? Number(s.trade_in_valuation || 0) : 0;
      const value = (s.original_price ?? s.total_value) - tradeInVal;

      if (!dayMap[dayStr]) {
        dayMap[dayStr] = {
          date: dayStr,
          formattedDate: new Date(dayStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          total: 0
        };
      }
      dayMap[dayStr].total += value;
    });

    filteredServiceOrders.forEach(o => {
      const dateStr = o.delivered_at || o.created_at;
      if (!dateStr) return;
      const dayStr = dateStr.split('T')[0];
      const value = o.total_value || 0;

      if (!dayMap[dayStr]) {
        dayMap[dayStr] = {
          date: dayStr,
          formattedDate: new Date(dayStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          total: 0
        };
      }
      dayMap[dayStr].total += value;
    });

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales, filteredServiceOrders]);

  // Overview metrics calculations
  const totalSalesValue = useMemo(() => filteredSales.reduce((acc, s) => {
    const tradeInVal = s.is_trade_in ? Number(s.trade_in_valuation || 0) : 0;
    const parsedAcc = parseAccessories(s.accessories || '');
    const accessoriesTotal = parsedAcc.reduce((sum, a) => sum + (a.isVenda ? a.salePrice : 0), 0);
    const expectedTotal = (s.original_price ?? s.total_value) + accessoriesTotal + (s.service_fee || 0) - tradeInVal;
    const discount = Math.max(0, expectedTotal - s.total_value);
    const devicePrice = Math.max(0, (s.original_price ?? s.total_value) - discount - tradeInVal);
    return acc + devicePrice + accessoriesTotal;
  }, 0), [filteredSales]);
  const totalServiceValue = useMemo(() => filteredServiceOrders.reduce((acc, o) => acc + o.total_value, 0), [filteredServiceOrders]);
  const totalRevenue = totalSalesValue + totalServiceValue;

  const totalFees = useMemo(() => filteredSales.reduce((acc, s) => acc + (s.service_fee || 0), 0), [filteredSales]);

  const totalReceivedCaixa = useMemo(() => {
    const downPayments = filteredSales.reduce((acc, s) => acc + (s.down_payment || 0), 0);
    const paidInstallmentsVal = installments
      .filter(i => i.status === 'paid' && filterByUnit(i.unit_id) && filterByDateRange(i.paid_at))
      .reduce((acc, i) => acc + i.value, 0);
    const paidServicesVal = filteredServiceOrders
      .filter(o => o.payment_status === 'paid')
      .reduce((acc, o) => acc + o.total_value, 0);

    return downPayments + paidInstallmentsVal + paidServicesVal;
  }, [filteredSales, installments, filteredServiceOrders, selectedUnitId, dateRange, customStartDate, customEndDate]);

  const ticketComercial = useMemo(() => (filteredSales.length > 0 ? totalSalesValue / filteredSales.length : 0), [filteredSales, totalSalesValue]);
  const ticketTecnico = useMemo(() => (filteredServiceOrders.length > 0 ? totalServiceValue / filteredServiceOrders.length : 0), [filteredServiceOrders, totalServiceValue]);

  // Goal Progress
  const metaPercentage = useMemo(() => (salesTarget > 0 ? (totalRevenue / salesTarget) * 100 : 0), [totalRevenue, salesTarget]);

  // Average Stock Turnover Days
  const averageStockDays = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    const totalDays = filteredSales.reduce((acc, s) => {
      const charCodeSum = s.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const days = (charCodeSum % 30) + 12; // Realistic stable mockup distribution
      return acc + days;
    }, 0);
    return Math.round(totalDays / filteredSales.length);
  }, [filteredSales]);

  // Top Customers
  const topCustomersList = useMemo(() => {
    const customerMap: Record<string, { name: string; total: number; count: number }> = {};
    filteredSales.forEach(s => {
      const name = s.customer_name || 'Cliente Sem Nome';
      if (!customerMap[name]) customerMap[name] = { name, total: 0, count: 0 };
      customerMap[name].total += s.original_price ?? s.total_value;
      customerMap[name].count += 1;
    });
    filteredServiceOrders.forEach(o => {
      const name = o.customers?.name || 'Cliente Sem Nome';
      if (!customerMap[name]) customerMap[name] = { name, total: 0, count: 0 };
      customerMap[name].total += o.total_value;
      customerMap[name].count += 1;
    });
    return Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [filteredSales, filteredServiceOrders]);

  // Payment method distribution percentage
  const paymentMethodDist = useMemo(() => {
    let crediarioCount = 0;
    let cardCount = 0;
    let vistaCount = 0;
    filteredSales.forEach(s => {
      if (s.payment_type === 'crediario') crediarioCount++;
      else if (s.payment_type === 'card') cardCount++;
      else vistaCount++;
    });
    const total = crediarioCount + cardCount + vistaCount;
    if (total === 0) return { crediario: 0, card: 0, vista: 0 };
    return {
      crediario: Math.round((crediarioCount / total) * 100),
      card: Math.round((cardCount / total) * 100),
      vista: Math.round((vistaCount / total) * 100)
    };
  }, [filteredSales]);

  // ─── LUCRO PRESUMIDO / REAL ITEM COMPUTATIONS ────────────────────────────────
  const isDateInMonth = (dateStr?: string, m?: number, y?: number) => {
    if (!dateStr) return false;
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = new Date(cleanDateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return false;

    const targetM = m ?? selectedMonth;
    const targetY = y ?? selectedYear;

    return date.getFullYear() === targetY && (date.getMonth() + 1) === targetM;
  };

  const getFormattedPeriodText = () => {
    if (dateRange === 'week') return 'Esta Semana';
    if (dateRange === 'month') return 'Este Mês';
    if (dateRange === '30days') return 'Últimos 30 dias';
    if (dateRange === 'year') return 'Este Ano';
    if (dateRange === 'custom') {
      const start = customStartDate ? formatPaymentDate(customStartDate) : 'Início';
      const end = customEndDate ? formatPaymentDate(customEndDate) : 'Fim';
      return `de ${start} a ${end}`;
    }
    return 'Todo o Período';
  };



  const monthlyProfitItems = useMemo(() => {
    const items: Array<{
      saleNumber: string;
      code: string;
      product: string;
      qtd: number;
      cost: number;
      sale: number;
      profit: number;
      margin: number;
    }> = [];

    // 1. Sales
    const mSales = sales.filter(s => s.status !== 'cancelled' && filterByUnit(s.unit_id) && filterByDateRange(s.date));
    mSales.forEach(s => {
      const saleNum = s.id.split('-')[0].toUpperCase();

      const mainDevice = inventory.find(inv => inv.id === s.device_id);
      const mainCost = mainDevice ? mainDevice.cost_price : (s.device_cost_price || 0);
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
        product: s.is_trade_in ? `${s.device_model} (Com Troca - Abatimento R$ ${tradeInVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : s.device_model,
        qtd: 1,
        cost: mainCost,
        sale: mainSale,
        profit: mainProfit,
        margin: mainMargin
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
          margin: accMargin
        });
      });
    });

    // 2. Service Orders (Repairs)
    const mServiceOrders = serviceOrders.filter(o => o.status === 'delivered' && filterByUnit(o.unit_id) && filterByDateRange(o.delivered_at || o.created_at));
    mServiceOrders.forEach(o => {
      const saleNum = `OS ${o.os_number}`;
      const code = `S-${o.os_number}`;
      const product = `ASSISTENCIA TECNICA - ${o.device_brand} ${o.device_model}`;
      const cost = o.parts_value || 0;
      const sale = o.total_value || 0;
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
        margin: margin
      });
    });

    return items;
  }, [sales, serviceOrders, inventory, dateRange, customStartDate, customEndDate, selectedUnitId]);

  const totals = useMemo(() => {
    let totalCost = 0;
    let totalSale = 0;
    let totalProfit = 0;

    monthlyProfitItems.forEach(item => {
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
  }, [monthlyProfitItems]);

  // ─── LABORATORY DESK METRICS ───────────────────────────────────────────
  const labMetrics = useMemo(() => {
    const finishedOS = filteredServiceOrders.filter(o => o.status === 'delivered' || o.status === 'ready');
    const totalLabor = finishedOS.reduce((acc, o) => acc + (o.labor_value || 0), 0);
    const totalParts = finishedOS.reduce((acc, o) => acc + (o.parts_value || 0), 0);
    const totalOSValue = finishedOS.reduce((acc, o) => acc + (o.total_value || 0), 0);
    const contributionMargin = totalLabor; // Em serviços a mão de obra representa o ganho do serviço menos peças
    const marginPercentage = totalOSValue > 0 ? (contributionMargin / totalOSValue) * 100 : 0;

    return {
      finishedOS,
      finishedCount: finishedOS.length,
      totalLabor,
      totalParts,
      totalOSValue,
      contributionMargin,
      marginPercentage
    };
  }, [filteredServiceOrders]);

  const collaboratorData = useMemo(() => {
    let cols = usersList.filter(u => u.role !== 'admin' && u.role !== 'investor' && !u.full_name.toLowerCase().includes('terminal'));

    // Filter by store if not "all"
    if (selectedUnitId !== 'all') {
      cols = cols.filter(u => u.store_id === selectedUnitId);
    }

    return cols.map(usr => {
      // Sales for this collaborator in the selected month/year
      const usrSales = sales.filter(s =>
        s.status !== 'cancelled' &&
        s.seller_id === usr.id &&
        isDateInMonth(s.date) &&
        filterByUnit(s.unit_id)
      );
      const totalSales = usrSales.reduce((acc, s) => {
        const tradeInVal = s.is_trade_in ? Number(s.trade_in_valuation || 0) : 0;
        return acc + (s.original_price ?? s.total_value) - tradeInVal;
      }, 0);

      // Completed/delivered OSs for this collaborator in the selected month/year
      const usrOSs = serviceOrders.filter(o =>
        (o.status === 'delivered' || o.status === 'ready') &&
        o.responsible_technician_id === usr.id &&
        isDateInMonth(o.delivered_at || o.created_at) &&
        filterByUnit(o.unit_id)
      );
      const totalOSCount = usrOSs.length;

      const goal = goalsList.find(g => g.profile_id === usr.id);
      const salesTargetVal = goal ? Number(goal.sales_target || 0) : 0;
      const osTargetVal = goal ? Number(goal.os_target || 0) : 0;

      return {
        id: usr.id,
        name: usr.full_name || 'Desconhecido',
        role: usr.role,
        sales: totalSales,
        salesTarget: salesTargetVal,
        salesProgress: salesTargetVal > 0 ? (totalSales / salesTargetVal) * 100 : 0,
        osCount: totalOSCount,
        osTarget: osTargetVal,
        osProgress: osTargetVal > 0 ? (totalOSCount / osTargetVal) * 100 : 0
      };
    });
  }, [usersList, sales, serviceOrders, goalsList, selectedMonth, selectedYear, selectedUnitId]);

  const terminalOrphanStats = useMemo(() => {
    const terminalUsers = usersList.filter(u => u.full_name.toLowerCase().includes('terminal'));
    let orphanSalesVal = 0;
    let orphanOSCount = 0;

    terminalUsers.forEach(term => {
      // Filter sales by selected month/year and unit
      const termSales = sales.filter(s =>
        s.status !== 'cancelled' &&
        s.seller_id === term.id &&
        isDateInMonth(s.date) &&
        filterByUnit(s.unit_id)
      );
      orphanSalesVal += termSales.reduce((acc, s) => {
        const tradeInVal = s.is_trade_in ? Number(s.trade_in_valuation || 0) : 0;
        return acc + (s.original_price ?? s.total_value) - tradeInVal;
      }, 0);

      // Filter OSs by selected month/year and unit
      const termOSs = serviceOrders.filter(o =>
        (o.status === 'delivered' || o.status === 'ready') &&
        o.responsible_technician_id === term.id &&
        isDateInMonth(o.delivered_at || o.created_at) &&
        filterByUnit(o.unit_id)
      );
      orphanOSCount += termOSs.length;
    });

    return { sales: orphanSalesVal, osCount: orphanOSCount };
  }, [usersList, sales, serviceOrders, selectedMonth, selectedYear, selectedUnitId]);

  const filteredInstallmentsReport = useMemo(() => {
    return installments.filter(i =>
      i.status === 'paid' &&
      filterByUnit(i.unit_id) &&
      filterByDateRange(i.paid_at)
    );
  }, [installments, selectedUnitId, dateRange, customStartDate, customEndDate]);

  const liquidationStats = useMemo(() => {
    let totalOriginal = 0;
    let totalReceived = 0;
    let totalDiscount = 0;
    let totalInterest = 0;

    filteredInstallmentsReport.forEach(i => {
      const orig = Number(i.value || 0);
      const paid = Number(i.paid_value !== undefined ? i.paid_value : orig);
      const disc = Number(i.discount_value || 0);
      const juros = Number(i.interest_value || 0);

      totalOriginal += orig;
      totalReceived += paid;
      totalDiscount += disc;
      totalInterest += juros;
    });

    return {
      totalOriginal,
      totalReceived,
      totalDiscount,
      totalInterest,
      count: filteredInstallmentsReport.length
    };
  }, [filteredInstallmentsReport]);

  const handleUpdateTarget = () => {
    const parsed = parseFloat(targetInput);
    if (!isNaN(parsed) && parsed >= 0) {
      setSalesTarget(parsed);
      setEditingTarget(false);
      showNotification('success', 'Meta Atualizada!', `Nova meta de faturamento definida para R$ ${parsed.toLocaleString('pt-BR')}`);
    } else {
      showNotification('error', 'Valor inválido', 'Digite um número válido para a meta.');
    }
  };

  const handleSaveCollaboratorGoal = async (profileId: string) => {
    try {
      const salesVal = parseFloat(goalSalesInput);
      const osVal = parseInt(goalOSInput);
      if (isNaN(salesVal) || salesVal < 0 || isNaN(osVal) || osVal < 0) {
        showNotification('error', 'Valores inválidos', 'Por favor, insira números válidos maiores ou iguais a zero.');
        return;
      }

      const res = await fetch('/api/users/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          month: selectedMonth,
          year: selectedYear,
          sales_target: salesVal,
          os_target: osVal
        })
      });

      if (res.ok) {
        const updatedGoal = await res.json();
        setGoalsList(prev => {
          const index = prev.findIndex(g => g.profile_id === profileId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedGoal;
            return next;
          } else {
            return [...prev, updatedGoal];
          }
        });
        setEditingGoalUserId(null);
        showNotification('success', 'Metas salvas com sucesso!');
      } else {
        const errData = await res.json();
        showNotification('error', 'Erro ao salvar metas', errData.error || 'Falha na requisição.');
      }
    } catch (e: any) {
      showNotification('error', 'Erro de rede', e.message);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Helper safe date formatter
  const formatPaymentDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
      return new Date(cleanStr).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const exportTableCSV = (data: any[], filename: string, headers: string[]) => {
    const csvRows = [headers.join(',')];
    data.forEach(row => {
      csvRows.push(row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','));
    });
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Planilha exportada com sucesso!');
  };

  const filteredAuditItems = useMemo(() => {
    return auditItems.filter(item => {
      if (item.category === 'service') return false;
      const matchesSearch =
        item.model.toLowerCase().includes(auditSearch.toLowerCase()) ||
        item.brand.toLowerCase().includes(auditSearch.toLowerCase()) ||
        (item.barcode || '').includes(auditSearch) ||
        (item.imei || '').includes(auditSearch);

      const matchesCategory = auditCategory === 'all' || item.category === auditCategory;

      let matchesDivergence = true;
      if (auditDivergence === 'correct') {
        matchesDivergence = item.physical_quantity !== null && item.physical_quantity === item.system_quantity;
      } else if (auditDivergence === 'missing') {
        matchesDivergence = item.physical_quantity !== null && item.physical_quantity < item.system_quantity;
      } else if (auditDivergence === 'extra') {
        matchesDivergence = item.physical_quantity !== null && item.physical_quantity > item.system_quantity;
      } else if (auditDivergence === 'pending') {
        matchesDivergence = item.physical_quantity === null;
      }

      return matchesSearch && matchesCategory && matchesDivergence;
    });
  }, [auditItems, auditSearch, auditCategory, auditDivergence]);

  const handlePrintAuditSheet = (blind: boolean) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('error', 'Bloqueador de Pop-ups', 'Por favor, permita pop-ups para imprimir a folha de conferência.');
      return;
    }

    const storeName = units.find(u => u.id === selectedUnitId)?.name || 'MDR';
    const dateStr = new Date().toLocaleDateString('pt-BR');

    let rowsHtml = filteredAuditItems
      .map(item => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${item.barcode || '—'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-transform: uppercase;">${item.brand} - ${item.model}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${item.imei ? `IMEI: ${item.imei}` : '—'}</td>
          ${!blind ? `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.system_quantity}</td>` : ''}
          <td style="padding: 8px; border: 1px solid #ddd; width: 80px;"></td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 150px;"></td>
        </tr>
      `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Folha de Conferência de Estoque</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
            p { margin-top: 0; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { border: 1px solid #aaa; padding: 10px 8px; text-align: left; background-color: #f0f0f0; text-transform: uppercase; font-size: 9px; letter-spacing: 1px; }
            td { border: 1px solid #ddd; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature-box { border-top: 1px solid #333; width: 230px; text-align: center; padding-top: 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-top: 30px; }
          </style>
        </head>
        <body>
          <h2>Folha de Conferência - ${storeName}</h2>
          <p>Emitido em: ${dateStr} às ${new Date().toLocaleTimeString('pt-BR')} | Modo: <strong>${blind ? 'Lista Cega (Contagem sem viés)' : 'Lista Completa'}</strong></p>
          <table>
            <thead>
              <tr>
                <th>Código de Barras</th>
                <th>Produto / Modelo</th>
                <th>Especificador / IMEI</th>
                ${!blind ? '<th style="text-align: center;">Qtd. Sistema</th>' : ''}
                <th style="width: 80px;">Qtd. Física</th>
                <th style="width: 150px;">Divergência / Obs</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="padding: 20px; text-align: center;">Nenhum produto selecionado ou filtrado.</td></tr>'}
            </tbody>
          </table>
          <div class="footer">
            <div class="signature-box">Assinatura do Conferente</div>
            <div class="signature-box">Assinatura do Gerente / Administrador</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode.trim()) return;
    if (!activeAudit) return;

    const code = scannedCode.trim().toLowerCase();
    const item = auditItems.find(i =>
      (i.barcode && i.barcode.toLowerCase() === code) ||
      (i.imei && i.imei.toLowerCase() === code)
    );

    if (item) {
      const currentQty = item.physical_quantity !== null ? item.physical_quantity : 0;
      const newQty = currentQty + 1;

      try {
        await saveAuditItem(activeAudit.id, item.device_id, newQty, item.reason);
        showNotification('success', `${item.brand} ${item.model} incrementado!`, `Total físico: ${newQty}`);

        try {
          const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
          audio.play().catch(() => { });
        } catch { }
      } catch (err: any) {
        showNotification('error', 'Erro ao bipar', err.message);
      }
    } else {
      showNotification('error', 'Produto não encontrado', `Código "${scannedCode}" não existe neste estoque.`);
    }
    setScannedCode('');
  };

  const handleExportSales = () => {
    if (filteredSales.length === 0) {
      showNotification('warning', 'Sem Dados', 'Não há registros filtrados para exportar.');
      return;
    }
    const headers = ['ID Venda', 'Vendedor', 'Cliente', 'Modelo Aparelho', 'Preço Base', 'Valor Total', 'Entrada', 'Parcelas', 'Data', 'Tipo Pagto', 'Status'];
    const rows = filteredSales.map(s => [
      s.id.split('-')[0],
      s.seller_id || 'MDR',
      s.customer_name || 'Sem Nome',
      s.device_model,
      (s.original_price ?? s.total_value).toFixed(2),
      s.total_value.toFixed(2),
      s.down_payment.toFixed(2),
      s.installments,
      s.date,
      s.payment_type === 'crediario' ? 'Crediário' : s.payment_type === 'card' ? 'Cartão' : 'À Vista',
      s.status === 'completed' ? 'Completo' : s.status === 'processing' ? 'Pendente' : 'Atrasado'
    ]);
    exportTableCSV(rows, 'relatorio_vendas_filtrado', headers);
  };

  // Cash Flow Calculations & Actions
  const totalStockCostValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + (Number(item.cost_price || 0) * (item.stock_quantity || 0)), 0);
  }, [inventory]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => filterByDateRange(t.created_at));
  }, [transactions, dateRange, customStartDate, customEndDate]);

  const flowInflows = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + Number(t.amount), 0);
  }, [filteredTransactions]);

  const flowOutflows = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + Number(t.amount), 0);
  }, [filteredTransactions]);

  const netBalance = flowInflows - flowOutflows;

  const handleAddManualTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || selectedUnitId === 'all') {
      showNotification('error', 'Selecione uma filial para realizar o lançamento.');
      return;
    }
    if (!manualTx.amount || Number(manualTx.amount) <= 0) {
      showNotification('error', 'Valor inválido');
      return;
    }
    try {
      await addTransaction({
        unit_id: selectedUnitId,
        type: manualTx.type,
        category: manualTx.category,
        amount: Number(manualTx.amount),
        payment_method: manualTx.payment_method,
        description: manualTx.description,
        created_by: profile?.id || ''
      });
      showNotification('success', 'Lançamento inserido com sucesso!');
      setIsManualTxOpen(false);
      setManualTx({
        type: 'outflow',
        category: 'outros',
        amount: '',
        payment_method: 'money',
        description: ''
      });
    } catch (err: any) {
      showNotification('error', 'Erro ao lançar', err?.response?.data?.error || err.message);
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!txToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(txToDeleteId, selectedUnitId);
      showNotification('success', 'Transação excluída com sucesso!');
      setIsDeleteModalOpen(false);
      setTxToDeleteId(null);
    } catch (err: any) {
      showNotification('error', 'Erro ao excluir transação', err.response?.data?.error || err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportTransactionsCSV = () => {
    if (filteredTransactions.length === 0) {
      showNotification('error', 'Sem dados', 'Não há transações para exportar.');
      return;
    }
    const headers = ['Data/Hora', 'Tipo', 'Categoria', 'Descrição', 'Meio Pagto', 'Valor'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.created_at).toLocaleString('pt-BR'),
      tx.type === 'inflow' ? 'Entrada' : 'Saída',
      tx.category === 'installment' ? 'Contrato' :
        tx.category === 'sale' ? 'Venda PDV' :
          tx.category === 'suprimento' ? 'Suprimento' :
            tx.category === 'sangria' ? 'Sangria' :
              tx.category === 'despesa_luz' ? 'Despesa Luz' :
                tx.category === 'despesa_aluguel' ? 'Despesa Aluguel' : 'Outros',
      tx.description || '',
      tx.payment_method === 'pix' ? 'PIX' :
        tx.payment_method === 'money' ? 'Dinheiro' :
          tx.payment_method === 'card' ? 'Cartão' : 'Conta/Banco',
      Number(tx.amount).toFixed(2)
    ]);
    exportTableCSV(rows, 'relatorio_fluxo_caixa', headers);
  };

  const handleExportLiquidacoesCSV = () => {
    if (filteredInstallmentsReport.length === 0) {
      showNotification('error', 'Sem dados', 'Não há liquidações para exportar.');
      return;
    }
    const headers = ['Cliente', 'Contrato/Parcela', 'Vencimento', 'Pagamento', 'Valor Original', 'Desconto Concedido', 'Juros/Multa', 'Valor Pago', 'Meio Pagto'];
    const rows = filteredInstallmentsReport.map(i => [
      i.customer_name || 'Sem Nome',
      `Parcela ${i.number}/${i.total}`,
      i.due_date,
      i.paid_at ? formatPaymentDate(i.paid_at) : '',
      Number(i.value || 0).toFixed(2),
      Number(i.discount_value || 0).toFixed(2),
      Number(i.interest_value || 0).toFixed(2),
      Number(i.paid_value !== undefined ? i.paid_value : i.value).toFixed(2),
      i.payment_method === 'pix' ? 'PIX' :
        i.payment_method === 'money' ? 'Dinheiro' :
          i.payment_method === 'card' ? 'Cartão' : 'Outros'
    ]);
    exportTableCSV(rows, 'relatorio_liquidacoes_descontos', headers);
  };

  const auditStats = useMemo(() => {
    if (!activeAudit || !auditItems.length) {
      return { totalItems: 0, countedItems: 0, deltaCount: 0, costDiscrepancy: 0, percentage: 0 };
    }
    const totalItems = auditItems.length;
    const countedItems = auditItems.filter(i => i.physical_quantity !== null).length;
    let deltaCount = 0;
    let costDiscrepancy = 0;
    auditItems.forEach(i => {
      if (i.physical_quantity !== null) {
        const d = i.physical_quantity - i.system_quantity;
        deltaCount += d;
        costDiscrepancy += d * i.cost_price;
      }
    });
    const percentage = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;
    return { totalItems, countedItems, deltaCount, costDiscrepancy, percentage };
  }, [activeAudit, auditItems]);

  const handleCancelAudit = async () => {
    if (!activeAudit) return;
    setIsCancelling(true);
    setIsCancelAuditModalOpen(false);
    try {
      await cancelAudit(activeAudit.id);
      showNotification('success', 'Auditoria cancelada com sucesso.');
      fetchAudits(selectedUnitId);
    } catch (err: any) {
      showNotification('error', 'Erro ao cancelar', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleFinalizeAudit = async () => {
    if (!activeAudit) return;
    setIsFinalizing(true);
    setIsFinalizeAuditModalOpen(false);
    try {
      await finalizeAudit(activeAudit.id, profile?.id || '');
      showNotification('success', 'Auditoria concluída e estoque ajustado com sucesso!');
      fetchAudits(selectedUnitId);
    } catch (err: any) {
      showNotification('error', 'Erro ao finalizar', err.response?.data?.error || err.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleDeleteAudit = async () => {
    if (!auditToDeleteId || !profile?.id) return;
    setIsDeletingAudit(true);
    try {
      await deleteAudit(auditToDeleteId, profile.id);
      showNotification('success', 'Auditoria excluída com sucesso.');
      setIsDeleteAuditModalOpen(false);
      setAuditToDeleteId(null);
    } catch (err: any) {
      showNotification('error', 'Erro ao excluir', err.response?.data?.error || err.message);
    } finally {
      setIsDeletingAudit(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 p-8 print:p-0 print:bg-white print:text-black print:space-y-4 print:pb-0">

      {/* HEADER SECTION (HIDDEN ON PRINT) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Painel de Relatórios</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Inteligência de Negócio & Planejamento</p>
        </div>

        {/* Global Branch Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[180px]">
            <span className="text-[10px] font-black uppercase text-on-surface-variant">Filial:</span>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-6 font-display font-black uppercase tracking-wider"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
              }}
            >
              <option value="all" className="bg-[#0f0f1a] text-white">Todas as Filiais</option>
              {units.map(u => (
                <option key={u.id} value={u.id} className="bg-[#0f0f1a] text-white">{u.name}</option>
              ))}
            </select>
          </div>

          {activeTab === 'overview' && (
            <button
              onClick={handleExportSales}
              className="bg-white text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
            >
              <Download size={14} /> Exportar CSV
            </button>
          )}

          {activeTab === 'fluxo_caixa' && (
            <button
              onClick={handleExportTransactionsCSV}
              className="bg-white text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
            >
              <Download size={14} /> Exportar Caixa CSV
            </button>
          )}

          {activeTab === 'liquidacoes' && (
            <button
              onClick={handleExportLiquidacoesCSV}
              className="bg-white text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
            >
              <Download size={14} /> Exportar Planilha CSV
            </button>
          )}

          {activeTab === 'lucro_presumido' && (
            <button
              onClick={handlePrintReport}
              className="bg-primary text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/10 flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
            >
              <Printer size={14} /> Imprimir PDF
            </button>
          )}
        </div>
      </div>

      {/* TABS SELECTOR (HIDDEN ON PRINT) */}
      <div className="flex p-1 bg-white/2 rounded-[24px] mb-8 gap-1 border border-white/5 max-w-4xl print:hidden overflow-x-auto scrollbar-none">
        {[
          { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
          { id: 'fluxo_caixa', label: 'Fluxo de Caixa', icon: DollarSign },
          { id: 'lucro_presumido', label: 'Lucro Presumido', icon: Calculator },
          { id: 'laboratorio', label: 'Laboratório (Assistência)', icon: Wrench },
          { id: 'liquidacoes', label: 'Liquidações & Descontos', icon: Percent },
          { id: 'auditoria', label: 'Auditoria de Estoque', icon: CheckCircle2 },
          { id: 'controle_cartoes', label: 'Controle de Cartões', icon: CreditCard },
          ...(profile?.role === 'admin' ? [{ id: 'metas', label: 'Desempenho & Metas', icon: Award }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`grow py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                ? 'bg-white text-black shadow-xl'
                : 'text-on-surface-variant hover:text-white hover:bg-white/5'
              }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* GLOBAL PERIOD & BRAND FILTERS (HIDDEN ON PRINT) */}
      {['overview', 'fluxo_caixa', 'lucro_presumido', 'laboratorio', 'liquidacoes'].includes(activeTab) && (
        <div className="bg-white/2 border border-white/5 rounded-3xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Period Selector */}
            <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[200px] flex-1 sm:flex-initial">
              <Calendar size={14} className="text-on-surface-variant" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-6 font-display font-black uppercase tracking-wider"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right center',
                }}
              >
                <option value="week" className="bg-[#0f0f1a]">Esta Semana</option>
                <option value="month" className="bg-[#0f0f1a]">Este Mês</option>
                <option value="30days" className="bg-[#0f0f1a]">Últimos 30 dias</option>
                <option value="year" className="bg-[#0f0f1a]">Este Ano</option>
                <option value="custom" className="bg-[#0f0f1a]">Período Personalizado</option>
                <option value="all" className="bg-[#0f0f1a]">Todo o Período</option>
              </select>
            </div>

            {/* Brand Selector - Only for Overview & Laboratorio */}
            {['overview', 'laboratorio'].includes(activeTab) && (
              <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[180px] flex-1 sm:flex-initial">
                <Smartphone size={14} className="text-on-surface-variant" />
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-6 font-display font-black uppercase tracking-wider"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                  }}
                >
                  <option value="all" className="bg-[#0f0f1a]">Todas as Marcas</option>
                  <option value="Apple" className="bg-[#0f0f1a]">Apple (iPhone)</option>
                  <option value="Samsung" className="bg-[#0f0f1a]">Samsung</option>
                  <option value="Xiaomi" className="bg-[#0f0f1a]">Xiaomi</option>
                  <option value="Motorola" className="bg-[#0f0f1a]">Motorola</option>
                  <option value="Outros" className="bg-[#0f0f1a]">Outros</option>
                </select>
              </div>
            )}
          </div>

          {/* Custom Dates inputs (reactive) */}
          <AnimatePresence>
            {dateRange === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5"
              >
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white">
                  <span className="text-[9px] font-black uppercase text-on-surface-variant">Início:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-transparent outline-none text-white w-full cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white">
                  <span className="text-[9px] font-black uppercase text-on-surface-variant">Fim:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-transparent outline-none text-white w-full cursor-pointer"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* GLOBAL MONTH/YEAR SELECTOR FOR GOALS & CARDS (HIDDEN ON PRINT) */}
      {['metas', 'controle_cartoes'].includes(activeTab) && (
        <div className="bg-white/2 border border-white/5 rounded-3xl p-5 flex flex-wrap gap-4 print:hidden">
          {/* Month Filter */}
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Mês</span>
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none font-display font-black uppercase"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right center',
                }}
              >
                <option value={1} className="bg-[#0f0f1a]">Janeiro</option>
                <option value={2} className="bg-[#0f0f1a]">Fevereiro</option>
                <option value={3} className="bg-[#0f0f1a]">Março</option>
                <option value={4} className="bg-[#0f0f1a]">Abril</option>
                <option value={5} className="bg-[#0f0f1a]">Maio</option>
                <option value={6} className="bg-[#0f0f1a]">Junho</option>
                <option value={7} className="bg-[#0f0f1a]">Julho</option>
                <option value={8} className="bg-[#0f0f1a]">Agosto</option>
                <option value={9} className="bg-[#0f0f1a]">Setembro</option>
                <option value={10} className="bg-[#0f0f1a]">Outubro</option>
                <option value={11} className="bg-[#0f0f1a]">Novembro</option>
                <option value={12} className="bg-[#0f0f1a]">Dezembro</option>
              </select>
            </div>
          </div>

          {/* Year Filter */}
          <div className="flex flex-col gap-1.5 min-w-[100px]">
            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Ano</span>
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none font-display font-black"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right center',
                }}
              >
                {lucroPresumidoYears.map(y => (
                  <option key={y} value={y} className="bg-[#0f0f1a]">{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Day Filter (Only for Card Control) */}
          {activeTab === 'controle_cartoes' && (
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Dia</span>
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                <select
                  value={selectedCardDay}
                  onChange={(e) => setSelectedCardDay(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none font-display font-black"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                  }}
                >
                  <option value="all" className="bg-[#0f0f1a]">Todos os Dias</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)} className="bg-[#0f0f1a]">{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 1: OVERVIEW (VISÃO GERAL) ─────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* Stats KPIs Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Faturamento Bruto', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: `${filteredSales.length} vendas + ${filteredServiceOrders.length} reparos`, color: 'text-primary' },
              { label: 'Recebido (Caixa)', value: `R$ ${totalReceivedCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Dinheiro/PIX/Cartão liquidados', color: 'text-success' },
              { label: 'Ticket Médio Vendas', value: `R$ ${ticketComercial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Média por aparelho vendido', color: 'text-white' },
              { label: 'Ticket Médio OS', value: `R$ ${ticketTecnico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Média por reparo finalizado', color: 'text-white' }
            ].map((stat, i) => (
              <div key={i} className="bg-white/1 hover:bg-white/2 p-6 border border-white/5 rounded-[28px] relative overflow-hidden transition-all">
                <div className="absolute top-4 right-4 opacity-10">
                  <TrendingUp size={24} className={stat.color} />
                </div>
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
                <h3 className="text-xl font-black text-white font-mono leading-none tracking-tight my-1.5">{stat.value}</h3>
                <p className="text-[9px] text-on-surface-variant opacity-70 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Revenue Evolution Chart */}
          <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 lg:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Evolução do Faturamento no Período</h3>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Entradas diárias combinadas de vendas e assistência</p>
            </div>

            {revenueChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 opacity-40">
                <BarChart2 size={32} className="text-on-surface-variant mb-2" />
                <p className="text-xs uppercase font-black tracking-widest text-on-surface-variant">Sem faturamento registrado para o período</p>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="formattedDate" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}
                      itemStyle={{ fontSize: '11px', color: '#6C63FF' }}
                      formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#6C63FF" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Goal Tracker & Payment Methods Distribution */}
          <div className={`grid grid-cols-1 ${profile?.role === 'admin' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>

            {/* Sales Goal Card */}
            {profile?.role === 'admin' && (
              <div className="bg-white/1 border border-white/5 rounded-[32px] p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Meta Mensal da Loja</h3>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Acompanhamento do Faturamento</p>
                  </div>

                  <div className="text-right">
                    {editingTarget ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={targetInput}
                          onChange={(e) => setTargetInput(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white w-28 font-mono"
                        />
                        <button
                          onClick={handleUpdateTarget}
                          className="px-3 py-1.5 bg-primary text-black rounded-xl text-[9px] font-black uppercase tracking-widest"
                        >
                          Salvar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white font-mono">Meta: R$ {salesTarget.toLocaleString()}</span>
                        <button
                          onClick={() => { setTargetInput(salesTarget.toString()); setEditingTarget(true); }}
                          className="p-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] text-on-surface-variant hover:text-white uppercase transition-all"
                        >
                          Ajustar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="space-y-2.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-on-surface-variant">Progresso</span>
                    <span className="text-primary">{metaPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, metaPercentage)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${metaPercentage >= 100
                          ? 'bg-linear-to-r from-green-500 to-emerald-400'
                          : 'bg-linear-to-r from-primary to-indigo-500'
                        }`}
                    />
                  </div>
                  <p className="text-[9px] text-on-surface-variant text-center mt-1">
                    {metaPercentage >= 100
                      ? '🎉 Meta de faturamento batida com sucesso! Parabéns!'
                      : `Falta R$ ${Math.max(0, salesTarget - totalRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para atingir o objetivo.`}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Type Distribution Bar */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Meios de Pagamento de Aparelhos</h3>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Fração Comercial por Tipo</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Crediário Próprio', pct: paymentMethodDist.crediario, color: 'bg-linear-to-r from-indigo-600 to-violet-500', value: `R$ ${(totalSalesValue * paymentMethodDist.crediario / 100).toLocaleString('pt-BR')}` },
                  { label: 'Cartões (Débito/Crédito)', pct: paymentMethodDist.card, color: 'bg-linear-to-r from-pink-600 to-rose-500', value: `R$ ${(totalSalesValue * paymentMethodDist.card / 100).toLocaleString('pt-BR')}` },
                  { label: 'À Vista (Dinheiro/PIX)', pct: paymentMethodDist.vista, color: 'bg-linear-to-r from-emerald-500 to-teal-500', value: `R$ ${(totalSalesValue * paymentMethodDist.vista / 100).toLocaleString('pt-BR')}` }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                      <span>{item.label}</span>
                      <span className="text-white">{item.pct}% ({item.value})</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stock Turnover & Top Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Stock Turnover Metric Card */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary mb-3">
                  <Clock size={16} />
                </div>
                <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Giro Médio de Estoque</h4>
                <p className="text-[8px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Tempo Médio em Prateleira</p>
              </div>

              <div className="my-2">
                <h3 className="text-4xl font-black text-white font-mono leading-none tracking-tight">
                  {averageStockDays} <span className="text-xs text-on-surface-variant uppercase tracking-widest font-display">dias</span>
                </h3>
              </div>

              <p className="text-[9px] text-on-surface-variant leading-relaxed opacity-70">
                Os celulares vendidos neste período demoraram em média {averageStockDays} dias entre a data de cadastro e a data de fechamento da venda.
              </p>
            </div>

            {/* Top Customers Card */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 lg:col-span-2 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Maiores Compradores do Período</h4>
                    <p className="text-[8px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Ranqueados por Volume de Faturamento</p>
                  </div>
                  <Award size={18} className="text-primary" />
                </div>
              </div>

              <div className="space-y-3 my-4">
                {topCustomersList.length === 0 ? (
                  <p className="text-xs text-on-surface-variant opacity-60 text-center py-6">Nenhum cliente registrado no período.</p>
                ) : (
                  topCustomersList.map((cust, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-primary font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-black text-white uppercase">{cust.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-white font-mono">R$ {cust.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <p className="text-[8px] text-on-surface-variant opacity-70 mt-0.5">{cust.count} contratos / ordens</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: FLUXO DE CAIXA (CENTRAL TRIBUTÁRIA / GERENCIAL) ─────────── */}
      {activeTab === 'fluxo_caixa' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Dashboard de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/2 p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center text-[#6C63FF] mb-4 border border-white/10">
                <TrendingUp size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Saldo Líquido</p>
              <h3 className={`text-2xl font-black font-mono leading-none tracking-tight ${netBalance >= 0 ? 'text-green-400' : 'text-error'}`}>
                R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="bg-white/2 p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success mb-4 border border-white/10">
                <ArrowUpRight size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Entradas</p>
              <h3 className="text-2xl font-black text-white font-mono leading-none tracking-tight">
                R$ {flowInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="bg-white/2 p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error mb-4 border border-white/10">
                <ArrowDownRight size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Saídas / Despesas</p>
              <h3 className="text-2xl font-black text-white font-mono leading-none tracking-tight">
                R$ {flowOutflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="bg-white/2 p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning mb-4 border border-white/10">
                <Smartphone size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Custo do Estoque</p>
              <h3 className="text-2xl font-black text-white font-mono leading-none tracking-tight">
                R$ {totalStockCostValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          {/* Seção Lançamento Rápido & Filtro de Fluxo */}
          <div className="bg-white/2 rounded-[40px] border border-outline-variant/30 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} /> Registro de Transações
              </h3>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setIsManualTxOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#6C63FF] text-white font-black uppercase tracking-widest text-[9px] px-5 py-3.5 rounded-2xl hover:scale-[1.02] transition-all cursor-pointer border border-[#6C63FF]/30"
                >
                  <Plus size={14} /> Novo Lançamento Manual (Gerencial)
                </button>
              )}
            </div>

            {/* Listagem de Transações do Fluxo de Caixa */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                    <th className="pb-3 pl-4">Data/Hora</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Categoria</th>
                    <th className="pb-3">Descrição</th>
                    <th className="pb-3">Meio Pagto</th>
                    <th className="pb-3 text-right pr-4">Valor</th>
                    {profile?.role === 'admin' && <th className="pb-3 text-center w-12 pr-4">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={profile?.role === 'admin' ? 7 : 6} className="text-center py-10 text-on-surface-variant/60 text-[10px] uppercase font-black tracking-widest">Nenhuma movimentação lançada no período.</td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/1 transition-colors">
                        <td className="py-4 pl-4 text-[10px] font-mono text-on-surface-variant">
                          {new Date(tx.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider ${tx.type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.type === 'inflow' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {tx.type === 'inflow' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="py-4 text-xs font-bold text-white uppercase tracking-wider">
                          {tx.category === 'installment' ? 'Contrato' :
                            tx.category === 'sale' ? 'Venda PDV' :
                              tx.category === 'suprimento' ? 'Suprimento' :
                                tx.category === 'sangria' ? 'Sangria' :
                                  tx.category === 'despesa_luz' ? 'Despesa Luz' :
                                    tx.category === 'despesa_aluguel' ? 'Despesa Aluguel' : 'Outros'}
                        </td>
                        <td className="py-4 text-xs text-on-surface-variant max-w-[200px] truncate" title={tx.description}>
                          {tx.description || '—'}
                        </td>
                        <td className="py-4 text-[10px] font-black uppercase text-on-surface-variant">
                          {tx.payment_method === 'pix' ? 'PIX' :
                            tx.payment_method === 'money' ? 'Dinheiro' :
                              tx.payment_method === 'card' ? 'Cartão' : 'Conta/Banco'}
                        </td>
                        <td className={`py-4 text-right pr-4 font-mono font-black text-xs ${tx.type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'inflow' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        {profile?.role === 'admin' && (
                          <td className="py-4 text-center pr-4">
                            <button
                              onClick={() => {
                                setTxToDeleteId(tx.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-lg transition-all"
                              title="Excluir Transação"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal de Confirmação de Exclusão */}
          <AnimatePresence>
            {isDeleteModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsDeleteModalOpen(false)} />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative bg-[#0f0f1a] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10 text-error">
                    <AlertCircle size={24} />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Confirmar Exclusão</h3>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Tem certeza que deseja excluir esta transação?
                    </p>
                    <div className="p-4 bg-error/5 border border-error/10 rounded-2xl text-[10px] text-error font-medium leading-relaxed">
                      ⚠️ Esta ação não pode ser desfeita e irá recalcular automaticamente o saldo do caixa caso o turno correspondente esteja aberto.
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={isDeleting}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all cursor-pointer border border-white/10 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteTransaction}
                      disabled={isDeleting}
                      className="flex-1 py-3.5 bg-error text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-error/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        'Confirmar Exclusão'
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Modal de Lançamento Manual */}
          <AnimatePresence>
            {isManualTxOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsManualTxOpen(false)} />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative bg-[#0f0f1a] border border-white/10 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Novo Lançamento Manual</h3>
                    <button onClick={() => setIsManualTxOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleAddManualTxSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-on-surface-variant pl-1">Tipo</label>
                        <select
                          value={manualTx.type}
                          onChange={(e) => setManualTx({ ...manualTx, type: e.target.value as any })}
                          className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white outline-none"
                        >
                          <option value="outflow">Saída / Despesa</option>
                          <option value="inflow">Entrada / Receita</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-on-surface-variant pl-1">Categoria</label>
                        <select
                          value={manualTx.category}
                          onChange={(e) => setManualTx({ ...manualTx, category: e.target.value as any })}
                          className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white outline-none"
                        >
                          <option value="outros">Outros</option>
                          <option value="suprimento">Suprimento</option>
                          <option value="sangria">Sangria</option>
                          <option value="despesa_luz">Despesa Luz</option>
                          <option value="despesa_aluguel">Despesa Aluguel</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-on-surface-variant pl-1">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={manualTx.amount}
                          onChange={(e) => setManualTx({ ...manualTx, amount: e.target.value })}
                          className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-on-surface-variant pl-1">Meio de Pagamento</label>
                        <select
                          value={manualTx.payment_method}
                          onChange={(e) => setManualTx({ ...manualTx, payment_method: e.target.value as any })}
                          className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white outline-none"
                        >
                          <option value="money">Dinheiro (Gaveta)</option>
                          <option value="pix">PIX</option>
                          <option value="card">Cartão</option>
                          <option value="bank">Conta Bancária</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-on-surface-variant pl-1">Descrição</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Pagamento de aluguel ref junho"
                        value={manualTx.description}
                        onChange={(e) => setManualTx({ ...manualTx, description: e.target.value })}
                        className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-[#6C63FF] text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] transition-all cursor-pointer border border-[#6C63FF]/30"
                    >
                      Confirmar Lançamento
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─── TAB 2: LUCRO PRESUMIDO (VALOR DE VENDA X VALOR DE CUSTO) ─────── */}
      {activeTab === 'lucro_presumido' && (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* PRINT-ONLY TITLE (VISIBLE ON PRINT) */}
          <div className="hidden print:block border-b border-black pb-4 mb-4 text-black">
            <h1 className="text-2xl font-black uppercase">Lucro Presumido de Venda de Serviços/Itens Avulsos ou do Estoque</h1>
            <p className="text-[10px] text-gray-700 uppercase tracking-wider font-bold">
              Referência: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} | Período: {getFormattedPeriodText()}
            </p>
          </div>

          {/* Profit Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* Total Sale Card */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 flex flex-col justify-between min-h-[140px] print:border-black print:text-black">
              <div>
                <h4 className="text-[10px] font-black text-on-surface-variant print:text-black uppercase tracking-widest">Faturamento do Período (Venda)</h4>
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-black text-white print:text-black font-mono leading-none tracking-tight">
                  R$ {totals.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Total Cost Card */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 flex flex-col justify-between min-h-[140px] print:border-black print:text-black">
              <div>
                <h4 className="text-[10px] font-black text-on-surface-variant print:text-black uppercase tracking-widest">Valor de Custo Geral</h4>
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-black text-white print:text-black font-mono leading-none tracking-tight">
                  R$ {totals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Total Profit Card */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 flex flex-col justify-between min-h-[140px] print:border-black print:text-black">
              <div>
                <h4 className="text-[10px] font-black text-on-surface-variant print:text-black uppercase tracking-widest">Lucro do Período</h4>
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-black text-success print:text-black font-mono leading-none tracking-tight">
                  R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Average Margin Card */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 flex flex-col justify-between min-h-[140px] print:border-black print:text-black">
              <div>
                <h4 className="text-[10px] font-black text-on-surface-variant print:text-black uppercase tracking-widest">Rentabilidade Média</h4>
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-black text-primary print:text-black font-mono leading-none tracking-tight">
                  {totals.margin.toFixed(2)}%
                </h3>
              </div>
            </div>
          </div>

          {/* Detailed monthly items table */}
          <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 overflow-hidden print:border-black print:text-black">
            <div className="mb-4 print:hidden">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Itens e Serviços Vendidos</h3>
              <p className="text-[8px] text-on-surface-variant uppercase tracking-widest">Detalhamento unitário com custos e margens</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 print:border-black text-[9px] font-black text-on-surface-variant print:text-black uppercase tracking-widest pb-3">
                    <th className="pb-3 pl-4">Nº Venda</th>
                    <th className="pb-3">Código</th>
                    <th className="pb-3">Produto</th>
                    <th className="pb-3 text-center">QTD</th>
                    <th className="pb-3 text-right">Custo</th>
                    <th className="pb-3 text-right">Venda</th>
                    <th className="pb-3 text-right">Lucro</th>
                    <th className="pb-3 text-right pr-4">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-black">
                  {monthlyProfitItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-on-surface-variant/60 text-[10px] uppercase font-black tracking-widest print:text-black">
                        Nenhuma movimentação registrada no período.
                      </td>
                    </tr>
                  ) : (
                    monthlyProfitItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/1 print:hover:bg-transparent">
                        <td className="py-4 pl-4 font-mono font-bold text-white print:text-black">
                          {item.saleNumber}
                        </td>
                        <td className="py-4 font-mono text-on-surface-variant print:text-black">
                          {item.code}
                        </td>
                        <td className="py-4 font-bold text-white print:text-black uppercase">
                          {item.product}
                        </td>
                        <td className="py-4 text-center font-bold text-white print:text-black">
                          {item.qtd}
                        </td>
                        <td className="py-4 text-right font-mono print:text-black">
                          R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-right font-mono print:text-black">
                          R$ {item.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-right font-mono font-bold text-white print:text-black">
                          R$ {item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-right pr-4 font-mono font-black text-primary print:text-black">
                          {item.cost > 0 ? `${item.margin.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Total Row */}
                {monthlyProfitItems.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-white/10 print:border-black font-black text-xs text-white print:text-black bg-white/2 print:bg-transparent">
                      <td colSpan={3} className="py-4 pl-4 uppercase">
                        Totais Consolidados
                      </td>
                      <td className="py-4 text-center">
                        {monthlyProfitItems.reduce((acc, item) => acc + item.qtd, 0)}
                      </td>
                      <td className="py-4 text-right font-mono">
                        R$ {totals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right font-mono">
                        R$ {totals.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right font-mono">
                        R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right pr-4 font-mono text-primary print:text-black">
                        {totals.margin.toFixed(2)}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: LABORATÓRIO (DESEMPENHO TÉCNICO) ────────────────────────── */}
      {activeTab === 'laboratorio' && (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* Stats Laboratory cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Serviços Finalizados', value: labMetrics.finishedCount.toString(), sub: 'Ordens de serviço concluídas', color: 'text-primary' },
              { label: 'Faturamento Bruto Assist.', value: `R$ ${labMetrics.totalOSValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Total cobrado dos clientes', color: 'text-white' },
              { label: 'Custo de Peças Utilizadas', value: `R$ ${labMetrics.totalParts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Valor descontado do estoque', color: 'text-error' },
              { label: 'Margem do Laboratório', value: `R$ ${labMetrics.contributionMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: `Rentabilidade de ${labMetrics.marginPercentage.toFixed(1)}%`, color: 'text-success' }
            ].map((stat, i) => (
              <div key={i} className="bg-white/1 hover:bg-white/2 p-6 border border-white/5 rounded-[28px] relative overflow-hidden transition-all">
                <div className="absolute top-4 right-4 opacity-10">
                  <Wrench size={24} />
                </div>
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
                <h3 className="text-xl font-black text-white font-mono leading-none tracking-tight my-1.5">{stat.value}</h3>
                <p className="text-[9px] text-on-surface-variant opacity-70 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* List of completed OS in period */}
          <div className="bg-white/2 rounded-[40px] border border-outline-variant/30 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Histórico de Reparos Finalizados</h3>
                <p className="text-[8px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Ordens de Serviço faturadas no período</p>
              </div>

              <button
                onClick={() => {
                  if (labMetrics.finishedCount === 0) {
                    showNotification('warning', 'Sem Dados', 'Não há ordens de serviço finalizadas para exportar.');
                    return;
                  }
                  const headers = ['OS #', 'Cliente', 'Aparelho', 'Mão de Obra', 'Peças', 'Total', 'Data Conclusão'];
                  const rows = labMetrics.finishedOS.map(o => [
                    o.os_number,
                    o.customers?.name || 'Sem Nome',
                    o.device_model,
                    o.labor_value.toFixed(2),
                    o.parts_value.toFixed(2),
                    o.total_value.toFixed(2),
                    o.delivered_at ? formatPaymentDate(o.delivered_at) : ''
                  ]);
                  exportTableCSV(rows, 'relatorio_laboratorio_assistencia', headers);
                }}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download size={12} /> Exportar Assistência
              </button>
            </div>

            <div className="p-6">
              {labMetrics.finishedCount === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
                  <Wrench size={48} className="text-on-surface-variant mb-2 opacity-20" />
                  <p className="text-xs font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhuma OS finalizada no período</p>
                  <p className="text-[9px] font-display text-on-surface-variant opacity-70">Ajuste os filtros de período para visualizar a produtividade do laboratório.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-widest pb-3">
                        <th className="pb-3 pl-4">Número OS</th>
                        <th className="pb-3">Cliente</th>
                        <th className="pb-3">Aparelho</th>
                        <th className="pb-3 text-right">Mão de Obra</th>
                        <th className="pb-3 text-right">Custo Peças</th>
                        <th className="pb-3 text-right">Valor Total</th>
                        <th className="pb-3 text-right pr-4">Margem (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {labMetrics.finishedOS.map((o) => {
                        const marginPercent = o.total_value > 0 ? (o.labor_value / o.total_value) * 100 : 0;
                        return (
                          <tr key={o.id} className="hover:bg-white/1">
                            <td className="py-4 pl-4 font-bold text-white">
                              #{o.os_number}
                            </td>
                            <td className="py-4 text-white uppercase font-black text-[10px]">{o.customers?.name || 'Cliente Sem Nome'}</td>
                            <td className="py-4 text-on-surface-variant font-display">{o.device_brand} {o.device_model}</td>
                            <td className="py-4 text-right font-mono">R$ {o.labor_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-4 text-right font-mono text-error">R$ {o.parts_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-4 text-right font-mono font-bold text-white">R$ {o.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-4 text-right pr-4 font-mono font-black text-success">
                              {marginPercent.toFixed(0)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: AUDITORIA DE ESTOQUE ─────────────────────────────────────── */}
      {activeTab === 'auditoria' && (
        <div className="space-y-8 animate-in fade-in duration-500">

          {activeAudit ? (
            // ==================== SEÇÃO: AUDITORIA EM ANDAMENTO ====================
            <div className="space-y-6">

              {/* Card de Sessão Ativa */}
              <div className="bg-white/2 border border-[#6C63FF]/30 rounded-[32px] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <span className="bg-[#6C63FF]/20 text-[#6C63FF] border border-[#6C63FF]/30 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Auditoria Ativa</span>
                  <h2 className="text-xl font-black text-white uppercase mt-2">
                    {units.find(u => u.id === activeAudit.store_id)?.name || 'Carregando Filial...'}
                  </h2>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1 opacity-70">
                    Iniciada em {new Date(activeAudit.created_at).toLocaleString('pt-BR')} por {activeAudit.profiles?.full_name || 'Usuário'}
                  </p>
                </div>

                {/* Ações de Sessão */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handlePrintAuditSheet(true)}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer"
                    title="Imprime a lista sem quantidades do sistema, forçando a contagem real."
                  >
                    <Printer size={12} /> Folha Cega
                  </button>
                  <button
                    onClick={() => handlePrintAuditSheet(false)}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer"
                    title="Imprime a lista mostrando a quantidade cadastrada no sistema."
                  >
                    <Printer size={12} /> Folha Completa
                  </button>

                  <button
                    onClick={() => setIsCancelAuditModalOpen(true)}
                    disabled={isCancelling}
                    className="bg-error/10 hover:bg-error/20 text-error border border-error/20 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCancelling ? <Loader2 size={12} className="animate-spin" /> : 'Cancelar'}
                  </button>

                  <button
                    onClick={() => setIsFinalizeAuditModalOpen(true)}
                    disabled={isFinalizing}
                    className="bg-primary text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/10 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isFinalizing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Finalizar e Ajustar
                  </button>
                </div>
              </div>

              {/* KPIs de Auditoria */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/1 p-5 border border-white/5 rounded-3xl">
                  <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Progresso da Contagem</p>
                  <h3 className="text-xl font-black text-white font-mono">{auditStats.countedItems} / {auditStats.totalItems} <span className="text-[10px] text-on-surface-variant font-display font-medium">({auditStats.percentage}%)</span></h3>
                  <div className="w-full h-2 bg-white/5 rounded-full mt-3 overflow-hidden border border-white/5 p-0.5">
                    <div className="h-full rounded-full bg-linear-to-r from-[#6C63FF] to-primary" style={{ width: `${auditStats.percentage}%` }} />
                  </div>
                </div>

                <div className="bg-white/1 p-5 border border-white/5 rounded-3xl">
                  <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Variação Total (Divergências)</p>
                  <h3 className={`text-xl font-black font-mono ${auditStats.deltaCount === 0 ? 'text-white' : auditStats.deltaCount > 0 ? 'text-green-400' : 'text-error'}`}>
                    {auditStats.deltaCount > 0 ? `+${auditStats.deltaCount}` : auditStats.deltaCount} unidades
                  </h3>
                  <p className="text-[8px] text-on-surface-variant opacity-70 mt-1 uppercase tracking-widest">Saldo total de itens a mais/menos</p>
                </div>

                <div className="bg-white/1 p-5 border border-white/5 rounded-3xl">
                  <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Impacto Financeiro (Custo)</p>
                  <h3 className={`text-xl font-black font-mono ${auditStats.costDiscrepancy === 0 ? 'text-white' : auditStats.costDiscrepancy > 0 ? 'text-green-400' : 'text-error'}`}>
                    R$ {auditStats.costDiscrepancy.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[8px] text-on-surface-variant opacity-70 mt-1 uppercase tracking-widest">Baseado no preço de custo cadastrado</p>
                </div>
              </div>

              {/* Modo Bipador Contínuo */}
              <div className="bg-white/2 border border-white/5 rounded-3xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Barcode size={16} className="text-[#6C63FF]" /> Modo Leitor de Código de Barras (Contínuo)
                    </h3>
                    <p className="text-[9px] text-on-surface-variant opacity-70 mt-0.5">
                      Ao ativar, bipar um produto adicionará automaticamente +1 na quantidade física sem requerer cliques.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setBarcodeMode(!barcodeMode);
                      setScannedCode('');
                    }}
                    className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${barcodeMode
                        ? 'bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/20'
                        : 'bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white border border-white/10'
                      }`}
                  >
                    {barcodeMode ? 'Modo Bipador: ATIVO' : 'Ativar Modo Bipador'}
                  </button>
                </div>

                <AnimatePresence>
                  {barcodeMode && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleBarcodeSubmit}
                      className="mt-4 pt-4 border-t border-white/5 flex gap-3"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={scannedCode}
                        onChange={(e) => setScannedCode(e.target.value)}
                        placeholder="Bipe o código de barras ou IMEI do produto aqui..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white outline-none focus:border-[#6C63FF] focus:bg-white/8 transition-all font-mono"
                      />
                      <button
                        type="submit"
                        className="bg-[#6C63FF] text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all cursor-pointer"
                      >
                        Bipar
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Tabela de Produtos para Auditoria */}
              <div className="bg-white/2 border border-white/5 rounded-[40px] p-6 space-y-6">

                {/* Filtros da Tabela */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                  <div className="flex flex-wrap items-center gap-3 grow">
                    <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex-1 min-w-[200px]">
                      <Search size={14} className="text-on-surface-variant mr-2" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Buscar por modelo, marca, código..."
                        className="bg-transparent border-none outline-none text-xs text-white placeholder-on-surface-variant/40 w-full"
                      />
                      {auditSearch && (
                        <button onClick={() => setAuditSearch('')} className="text-on-surface-variant hover:text-white">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[160px]">
                      <select
                        value={auditCategory}
                        onChange={(e) => setAuditCategory(e.target.value)}
                        className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-6 font-display font-black uppercase tracking-wider"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right center',
                        }}
                      >
                        <option value="all" className="bg-[#0f0f1a]">Todas as Categorias</option>
                        <option value="smartphone" className="bg-[#0f0f1a]">Celular</option>
                        <option value="accessory_mobile" className="bg-[#0f0f1a]">Acessório Celular</option>
                        <option value="accessory_it" className="bg-[#0f0f1a]">Acessório TI</option>
                        <option value="part" className="bg-[#0f0f1a]">Peça</option>
                        <option value="other" className="bg-[#0f0f1a]">Outros</option>
                      </select>
                    </div>

                    <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[180px]">
                      <select
                        value={auditDivergence}
                        onChange={(e) => setAuditDivergence(e.target.value as any)}
                        className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-6 font-display font-black uppercase tracking-wider"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right center',
                        }}
                      >
                        <option value="all" className="bg-[#0f0f1a]">Divergência: Todas</option>
                        <option value="correct" className="bg-[#0f0f1a]">Divergência: Sem Desvios</option>
                        <option value="missing" className="bg-[#0f0f1a]">Divergência: Falta (-)</option>
                        <option value="extra" className="bg-[#0f0f1a]">Divergência: Sobra (+)</option>
                        <option value="pending" className="bg-[#0f0f1a]">Divergência: Não Conferidos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Listagem */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-widest pb-3">
                        <th className="pb-3 pl-4">Produto</th>
                        <th className="pb-3">Código/Identificador</th>
                        <th className="pb-3 text-center">Qtd. Sistema</th>
                        <th className="pb-3 text-center" style={{ width: '160px' }}>Qtd. Física</th>
                        <th className="pb-3 text-center">Desvio</th>
                        <th className="pb-3" style={{ width: '180px' }}>Motivo (Se Desvio)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredAuditItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-on-surface-variant/60 text-[10px] uppercase font-black tracking-widest">Nenhum produto atende aos filtros de auditoria.</td>
                        </tr>
                      ) : (
                        filteredAuditItems.map((item) => {
                          const physical = item.physical_quantity;
                          const system = item.system_quantity;
                          const hasCounted = physical !== null;
                          const diff = hasCounted ? physical - system : 0;

                          return (
                            <tr key={item.device_id} className="hover:bg-white/1 transition-colors">
                              <td className="py-4 pl-4">
                                <span className="text-xs font-black text-white uppercase tracking-wider">{item.brand} {item.model}</span>
                                <div className="text-[8px] font-black uppercase text-on-surface-variant opacity-75 mt-0.5">
                                  {item.category === 'smartphone' ? 'Celular' :
                                    item.category === 'accessory_mobile' ? 'Acessório Celular' :
                                      item.category === 'accessory_it' ? 'Acessório TI' :
                                        item.category === 'part' ? 'Peça' : 'Outros'}
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="text-[10px] font-mono text-white opacity-80">{item.barcode ? `BARCODE: ${item.barcode}` : '—'}</div>
                                {item.imei && <div className="text-[9px] font-mono text-[#6C63FF] mt-0.5">IMEI: {item.imei}</div>}
                              </td>
                              <td className="py-4 text-center font-mono text-xs font-bold text-white">
                                {system}
                              </td>
                              <td className="py-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      const current = physical !== null ? physical : 0;
                                      if (current > 0) {
                                        saveAuditItem(activeAudit.id, item.device_id, current - 1, item.reason);
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white font-black font-mono transition-all text-xs"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={physical !== null ? physical : ''}
                                    placeholder="Não contado"
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : Number(e.target.value);
                                      if (val !== null && val >= 0) {
                                        saveAuditItem(activeAudit.id, item.device_id, val, item.reason);
                                      }
                                    }}
                                    className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-center text-xs font-mono text-white outline-none focus:border-[#6C63FF]"
                                  />
                                  <button
                                    onClick={() => {
                                      const current = physical !== null ? physical : 0;
                                      saveAuditItem(activeAudit.id, item.device_id, current + 1, item.reason);
                                    }}
                                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white font-black font-mono transition-all text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-4 text-center">
                                {!hasCounted ? (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant opacity-50">—</span>
                                ) : diff === 0 ? (
                                  <span className="bg-success/15 border border-success/30 text-success text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">Ok (0)</span>
                                ) : diff > 0 ? (
                                  <span className="bg-warning/15 border border-warning/30 text-warning text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">+{diff} Sobra</span>
                                ) : (
                                  <span className="bg-error/15 border border-error/30 text-error text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">{diff} Falta</span>
                                )}
                              </td>
                              <td className="py-4">
                                {hasCounted && diff !== 0 ? (
                                  <select
                                    value={item.reason || ''}
                                    onChange={(e) => saveAuditItem(activeAudit.id, item.device_id, physical, e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg text-xs text-white p-1.5 outline-none w-full"
                                  >
                                    <option value="" className="bg-[#0f0f1a] text-on-surface-variant">Selecione o motivo...</option>
                                    <option value="erro_cadastro" className="bg-[#0f0f1a]">Erro de Lançamento</option>
                                    <option value="dano" className="bg-[#0f0f1a]">Dano/Quebra</option>
                                    <option value="furto" className="bg-[#0f0f1a]">Furto/Avaria</option>
                                    <option value="uso_interno" className="bg-[#0f0f1a]">Brinde/Uso Interno</option>
                                    <option value="outros" className="bg-[#0f0f1a]">Outros motivos</option>
                                  </select>
                                ) : (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant opacity-40">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            // ==================== SEÇÃO: INICIAR NOVA AUDITORIA / HISTÓRICO ====================
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Card Iniciar Sessão */}
              <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 lg:col-span-1 flex flex-col justify-between min-h-[300px]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Nova Conferência de Estoque</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Inicie uma sessão de auditoria para conferir o estoque físico desta filial. O sistema bloqueará novas movimentações e permitirá lançar e gerar o arquivo impresso blindado.
                  </p>

                  {selectedUnitId === 'all' && (
                    <div className="p-4 bg-warning/5 border border-warning/10 rounded-2xl text-[10px] text-warning flex items-start gap-2 leading-relaxed">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span>Selecione uma filial específica no topo da página antes de iniciar uma nova auditoria.</span>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={async () => {
                      if (selectedUnitId === 'all') return;
                      try {
                        const sess = await startAudit(selectedUnitId, profile?.id || '');
                        showNotification('success', 'Sessão de auditoria iniciada com sucesso!', 'Comece a lançar as quantidades.');
                        fetchAuditItems(sess.id);
                      } catch (err: any) {
                        showNotification('error', 'Erro ao iniciar auditoria', err.response?.data?.error || err.message);
                      }
                    }}
                    disabled={selectedUnitId === 'all' || isAuditLoading}
                    className="w-full bg-primary text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/10 hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isAuditLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Iniciar Nova Auditoria
                  </button>
                </div>
              </div>

              {/* Tabela de Histórico de Auditorias passadas */}
              <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Histórico de Auditorias Concluídas</h3>
                  <p className="text-[8px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Sessões finalizadas nesta filial</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-widest pb-3">
                        <th className="pb-3 pl-4">Data Conclusão</th>
                        <th className="pb-3">Loja/Filial</th>
                        <th className="pb-3">Responsável</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Impacto Custo</th>
                        {profile?.role === 'admin' && <th className="pb-3 text-right pr-4" style={{ width: '50px' }}>Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {audits.length === 0 ? (
                        <tr>
                          <td colSpan={profile?.role === 'admin' ? 6 : 5} className="text-center py-10 text-on-surface-variant/60 text-[10px] uppercase font-black tracking-widest">Nenhuma auditoria realizada no histórico.</td>
                        </tr>
                      ) : (
                        audits.map((a) => (
                          <tr key={a.id} className="hover:bg-white/1 transition-colors">
                            <td className="py-4 pl-4 font-mono text-[10px] text-on-surface-variant">
                              {new Date(a.completed_at || a.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="py-4 text-white uppercase font-black text-[10px]">
                              {a.stores?.name || 'MDR'}
                            </td>
                            <td className="py-4 text-on-surface-variant">
                              {a.profiles?.full_name || 'N/A'}
                            </td>
                            <td className="py-4 text-center">
                              <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${a.status === 'completed'
                                  ? 'bg-success/15 border border-success/30 text-success'
                                  : 'bg-error/15 border border-error/30 text-error'
                                }`}>
                                {a.status === 'completed' ? 'Ajustado' : 'Cancelado'}
                              </span>
                            </td>
                            <td className={`py-4 text-right font-mono font-black ${profile?.role === 'admin' ? '' : 'pr-4'
                              } ${Number(a.total_cost_discrepancy) === 0 ? 'text-white' : Number(a.total_cost_discrepancy) > 0 ? 'text-green-400' : 'text-error'
                              }`}>
                              R$ {Number(a.total_cost_discrepancy || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            {profile?.role === 'admin' && (
                              <td className="py-4 text-right pr-4">
                                <button
                                  onClick={() => {
                                    setAuditToDeleteId(a.id);
                                    setIsDeleteAuditModalOpen(true);
                                  }}
                                  className="p-1.5 bg-error/10 hover:bg-error/20 text-error rounded-xl transition-all border border-error/20 cursor-pointer"
                                  title="Excluir auditoria do histórico"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Modal de Cancelar Auditoria Ativa */}
          <AnimatePresence>
            {isCancelAuditModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsCancelAuditModalOpen(false)} />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative bg-[#0f0f1a] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Cancelar Auditoria</h3>
                    <button onClick={() => setIsCancelAuditModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Tem certeza que deseja cancelar esta auditoria? Todo o progresso de contagem desta sessão será perdido.
                    </p>
                    <div className="p-4 bg-error/5 border border-error/10 rounded-2xl text-[10px] text-error font-medium leading-relaxed">
                      ⚠️ Esta ação não pode ser desfeita. Nenhuma alteração será feita no estoque do sistema.
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCancelAuditModalOpen(false)}
                      disabled={isCancelling}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all cursor-pointer border border-white/10 disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAudit}
                      disabled={isCancelling}
                      className="flex-1 py-3.5 bg-error text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-error/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Cancelando...
                        </>
                      ) : (
                        'Confirmar Cancelamento'
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Modal de Finalizar Auditoria */}
          <AnimatePresence>
            {isFinalizeAuditModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsFinalizeAuditModalOpen(false)} />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative bg-[#0f0f1a] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Finalizar Auditoria</h3>
                    <button onClick={() => setIsFinalizeAuditModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {auditStats.countedItems < auditStats.totalItems
                        ? `Você só conferiu ${auditStats.countedItems} de ${auditStats.totalItems} produtos. Tem certeza que deseja finalizar mesmo assim?`
                        : 'Deseja realmente finalizar esta auditoria de estoque?'
                      }
                    </p>
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-[10px] text-primary font-medium leading-relaxed">
                      💡 O estoque de todos os itens conferidos com divergência será ajustado automaticamente para refletir as quantidades físicas registradas. Itens não conferidos não sofrerão alterações.
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFinalizeAuditModalOpen(false)}
                      disabled={isFinalizing}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all cursor-pointer border border-white/10 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalizeAudit}
                      disabled={isFinalizing}
                      className="flex-1 py-3.5 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isFinalizing ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Finalizando...
                        </>
                      ) : (
                        'Confirmar e Ajustar'
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Modal de Excluir Histórico de Auditoria */}
          <AnimatePresence>
            {isDeleteAuditModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsDeleteAuditModalOpen(false)} />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative bg-[#0f0f1a] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Excluir Auditoria</h3>
                    <button onClick={() => setIsDeleteAuditModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Tem certeza que deseja remover este registro de auditoria permanentemente do histórico da loja?
                    </p>
                    <div className="p-4 bg-error/5 border border-error/10 rounded-2xl text-[10px] text-error font-medium leading-relaxed">
                      ⚠️ Esta ação é irreversível e excluirá permanentemente os relatórios e itens salvos nesta auditoria específica. O estoque já ajustado anteriormente não sofrerá nova alteração.
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteAuditModalOpen(false)}
                      disabled={isDeletingAudit}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all cursor-pointer border border-white/10 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAudit}
                      disabled={isDeletingAudit}
                      className="flex-1 py-3.5 bg-error text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-error/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDeletingAudit ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        'Confirmar Exclusão'
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* ─── TAB: DESEMPENHO & METAS (ADMIN EXCLUSIVE) ────────────────────── */}
      {activeTab === 'metas' && profile?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Controls Bar for Goals */}
          <div className="bg-white/2 border border-white/5 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Metas por Colaboradores</h3>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Acompanhamento e definição de objetivos</p>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-4">
              <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[150px]">
                <span className="text-[10px] font-black uppercase text-on-surface-variant">Mês:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-6 font-display font-black uppercase tracking-wider"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                  }}
                >
                  <option value={1} className="bg-[#0f0f1a]">Janeiro</option>
                  <option value={2} className="bg-[#0f0f1a]">Fevereiro</option>
                  <option value={3} className="bg-[#0f0f1a]">Março</option>
                  <option value={4} className="bg-[#0f0f1a]">Abril</option>
                  <option value={5} className="bg-[#0f0f1a]">Maio</option>
                  <option value={6} className="bg-[#0f0f1a]">Junho</option>
                  <option value={7} className="bg-[#0f0f1a]">Julho</option>
                  <option value={8} className="bg-[#0f0f1a]">Agosto</option>
                  <option value={9} className="bg-[#0f0f1a]">Setembro</option>
                  <option value={10} className="bg-[#0f0f1a]">Outubro</option>
                  <option value={11} className="bg-[#0f0f1a]">Novembro</option>
                  <option value={12} className="bg-[#0f0f1a]">Dezembro</option>
                </select>
              </div>

              <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[120px]">
                <span className="text-[10px] font-black uppercase text-on-surface-variant">Ano:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-6 font-display font-black uppercase tracking-wider"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                  }}
                >
                  {lucroPresumidoYears.map(y => (
                    <option key={y} value={y} className="bg-[#0f0f1a]">{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Warning for orphan transactions registered under Terminal accounts */}
          {(terminalOrphanStats.sales > 0 || terminalOrphanStats.osCount > 0) && (
            <div className="bg-warning/10 border border-warning/20 rounded-3xl p-5 flex items-start gap-3 text-warning animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Lançamentos não identificados nos Terminais</h4>
                <p className="text-[10px] opacity-85 mt-1 leading-relaxed">
                  Detectamos <strong>R$ {terminalOrphanStats.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em vendas e/ou <strong>{terminalOrphanStats.osCount} OS</strong> registrados diretamente nas contas de terminal genéricas no período selecionado.
                  Certifique-se de que os colaboradores se identificam com suas senhas individuais ao realizar lançamentos, para que suas metas individuais sejam devidamente creditadas.
                </p>
              </div>
            </div>
          )}

          {/* Goals KPIs Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Total Vendas (Colaboradores)</p>
              <h3 className="text-2xl font-black text-white font-mono leading-none tracking-tight my-1.5">
                R$ {collaboratorData.reduce((acc, c) => acc + c.sales, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] text-on-surface-variant opacity-70 mt-1">
                Soma de vendas de todos os colaboradores ativos no mês selecionado
              </p>
            </div>

            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Total OS Finalizadas (Colaboradores)</p>
              <h3 className="text-2xl font-black text-white font-mono leading-none tracking-tight my-1.5">
                {collaboratorData.reduce((acc, c) => acc + c.osCount, 0)} OS
              </h3>
              <p className="text-[9px] text-on-surface-variant opacity-70 mt-1">
                Soma de ordens de serviço executadas por técnicos ativos no mês selecionado
              </p>
            </div>
          </div>

          {/* Graphics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 space-y-4">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Vendas por Colaborador (Faturamento)</h3>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Comparação em R$ contra metas individuais</p>
              </div>
              <div className="h-64 w-full">
                {collaboratorData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40">
                    <p className="text-xs uppercase font-black tracking-widest">Nenhum colaborador cadastrado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={collaboratorData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}
                        itemStyle={{ fontSize: '11px' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'sales') return [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Vendas'];
                          if (name === 'salesTarget') return [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Meta Vendas'];
                          return [value, name];
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                      <Bar dataKey="sales" name="Vendido" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="salesTarget" name="Meta" fill="#3b3b4f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* OS Chart */}
            <div className="bg-white/1 border border-white/5 rounded-[32px] p-6 space-y-4">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">OS Concluídas por Técnico</h3>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5 opacity-60">Comparação em quantidade contra metas individuais</p>
              </div>
              <div className="h-64 w-full">
                {collaboratorData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40">
                    <p className="text-xs uppercase font-black tracking-widest">Nenhum colaborador cadastrado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={collaboratorData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}
                        itemStyle={{ fontSize: '11px' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'osCount') return [`${value} OS`, 'Concluído'];
                          if (name === 'osTarget') return [`${value} OS`, 'Meta OS'];
                          return [value, name];
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                      <Bar dataKey="osCount" name="Entregue/Concluído" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="osTarget" name="Meta OS" fill="#3b3b4f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Collaborators Targets Management list */}
          <div className="bg-white/2 border border-white/5 rounded-[40px] p-6 space-y-6">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Users size={16} /> Configurações de Metas Individuais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collaboratorData.map(col => {
                const isEditing = editingGoalUserId === col.id;

                return (
                  <div key={col.id} className="bg-white/1 border border-white/5 rounded-[28px] p-5 space-y-4 flex flex-col justify-between hover:bg-white/2 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black text-white uppercase">{col.name}</h4>
                        <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${col.role === 'technician'
                            ? 'bg-primary/20 text-primary border border-primary/20'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/25'
                          }`}>
                          {col.role === 'technician' ? 'Técnico' : 'Atendente'}
                        </span>
                      </div>

                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingGoalUserId(col.id);
                            setGoalSalesInput(col.salesTarget.toString());
                            setGoalOSInput(col.osTarget.toString());
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase text-on-surface-variant hover:text-white transition-all cursor-pointer"
                        >
                          Ajustar
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-on-surface-variant pl-1">Meta Vendas (R$)</label>
                            <input
                              type="number"
                              value={goalSalesInput}
                              onChange={(e) => setGoalSalesInput(e.target.value)}
                              className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-on-surface-variant pl-1">Meta OS (Qtd)</label>
                            <input
                              type="number"
                              value={goalOSInput}
                              onChange={(e) => setGoalOSInput(e.target.value)}
                              className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingGoalUserId(null)}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/10 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveCollaboratorGoal(col.id)}
                            className="flex-1 py-2 bg-primary text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-[1.02] transition-all cursor-pointer"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {/* Sales target progression */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase text-on-surface-variant">
                            <span>Vendas</span>
                            <span className="text-white">R$ {col.sales.toLocaleString('pt-BR')} / R$ {col.salesTarget.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div
                              className={`h-full rounded-full ${col.salesProgress >= 100 ? 'bg-linear-to-r from-green-500 to-emerald-400' : 'bg-linear-to-r from-primary to-indigo-500'}`}
                              style={{ width: `${Math.min(100, col.salesProgress)}%` }}
                            />
                          </div>
                        </div>

                        {/* OS target progression */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase text-on-surface-variant">
                            <span>OS Concluídas</span>
                            <span className="text-white">{col.osCount} / {col.osTarget} OS</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div
                              className={`h-full rounded-full ${col.osProgress >= 100 ? 'bg-linear-to-r from-green-500 to-emerald-400' : 'bg-linear-to-r from-emerald-500 to-teal-500'}`}
                              style={{ width: `${Math.min(100, col.osProgress)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: LIQUIDAÇÕES & DESCONTOS ────────────────────────────────────── */}
      {activeTab === 'liquidacoes' && (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* Sub Filters Toolbar */}
          <div className="bg-white/2 border border-white/5 rounded-3xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              {/* Period Selector */}
              <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[200px] flex-1 sm:flex-initial">
                <Calendar size={14} className="text-on-surface-variant" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-6 font-display font-black uppercase tracking-wider"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                  }}
                >
                  <option value="week" className="bg-[#0f0f1a]">Esta Semana</option>
                  <option value="month" className="bg-[#0f0f1a]">Este Mês</option>
                  <option value="30days" className="bg-[#0f0f1a]">Últimos 30 dias</option>
                  <option value="year" className="bg-[#0f0f1a]">Este Ano</option>
                  <option value="custom" className="bg-[#0f0f1a]">Período Personalizado</option>
                  <option value="all" className="bg-[#0f0f1a]">Todo o Período</option>
                </select>
              </div>
            </div>

            {/* Custom Dates inputs (reactive) */}
            <AnimatePresence>
              {dateRange === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5"
                >
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white">
                    <span className="text-[9px] font-black uppercase text-on-surface-variant">Início:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-transparent outline-none text-white w-full cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white">
                    <span className="text-[9px] font-black uppercase text-on-surface-variant">Fim:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-transparent outline-none text-white w-full cursor-pointer"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Recebido (Líquido)', value: `R$ ${liquidationStats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: `${liquidationStats.count} parcelas quitadas`, color: 'text-success' },
              { label: 'Total de Descontos Concedidos', value: `R$ ${liquidationStats.totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Redução proporcional (antecipação)', color: 'text-primary' },
              { label: 'Total de Juros e Multas Cobrados', value: `R$ ${liquidationStats.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Acrescimos por atraso', color: 'text-error' },
              { label: 'Valor Original das Parcelas', value: `R$ ${liquidationStats.totalOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Expectativa contratual base', color: 'text-white' }
            ].map((stat, i) => (
              <div key={i} className="bg-white/1 hover:bg-white/2 p-6 border border-white/5 rounded-[28px] relative overflow-hidden transition-all">
                <div className="absolute top-4 right-4 opacity-10">
                  <DollarSign size={24} className={stat.color} />
                </div>
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
                <h3 className="text-xl font-black text-white font-mono leading-none tracking-tight my-1.5">{stat.value}</h3>
                <p className="text-[9px] text-on-surface-variant opacity-70 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Detailed Table */}
          <div className="bg-white/2 border border-white/5 rounded-[40px] p-6 space-y-6">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Histórico de Liquidações e Descontos</h3>
              <p className="text-[8px] text-on-surface-variant uppercase tracking-widest">Detalhamento das parcelas recebidas com descontos ou mora no período</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-widest pb-3">
                    <th className="pb-3 pl-4">Cliente</th>
                    <th className="pb-3">Contrato / Parcela</th>
                    <th className="pb-3">Vencimento</th>
                    <th className="pb-3">Pagamento</th>
                    <th className="pb-3 text-right">Valor Original</th>
                    <th className="pb-3 text-right">Desconto</th>
                    <th className="pb-3 text-right">Juros/Multa</th>
                    <th className="pb-3 text-right pr-4">Valor Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredInstallmentsReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-on-surface-variant/60 text-[10px] uppercase font-black tracking-widest">Nenhuma parcela liquidada no período.</td>
                    </tr>
                  ) : (
                    filteredInstallmentsReport.map((inst, idx) => {
                      const paidVal = inst.paid_value !== undefined ? inst.paid_value : inst.value;
                      return (
                        <tr key={inst.id || idx} className="hover:bg-white/1">
                          <td className="py-4 pl-4 font-bold text-white uppercase">{inst.customer_name || 'Sem Nome'}</td>
                          <td className="py-4 text-on-surface-variant">Parcela {inst.number}/{inst.total}</td>
                          <td className="py-4 font-mono">{new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                          <td className="py-4 font-mono">{inst.paid_at ? formatPaymentDate(inst.paid_at) : '—'}</td>
                          <td className="py-4 text-right font-mono text-white">R$ {Number(inst.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono text-green-400">
                            {Number(inst.discount_value || 0) > 0 ? `- R$ ${Number(inst.discount_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="py-4 text-right font-mono text-error">
                            {Number(inst.interest_value || 0) > 0 ? `+ R$ ${Number(inst.interest_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="py-4 text-right pr-4 font-mono font-black text-success">
                            R$ {Number(paidVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'controle_cartoes' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/2 p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                <CreditCard size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-70">Total a pagar cartão (Dívida Total)</p>
              <h3 className="text-2xl font-black text-white leading-none font-mono">
                R$ {filteredCardBills.reduce((sum, b) => sum + (Number(b.value) * Math.max(0, b.remaining_installments || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="bg-white/2 p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success mb-4">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-70">Pago este Mês</p>
              <h3 className="text-2xl font-black text-success leading-none font-mono">
                R$ {filteredCardBills.filter(b => b.is_paid).reduce((sum, b) => sum + Number(b.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="bg-white/2 p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error mb-4">
                <AlertCircle size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-70">Pendente este Mês</p>
              <h3 className="text-2xl font-black text-error leading-none font-mono">
                R$ {filteredCardBills.filter(b => !b.is_paid).reduce((sum, b) => sum + Number(b.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 bg-white/2 border border-white/5 rounded-[40px] p-6 space-y-6">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                Detalhamento dos Lançamentos Ativos no Mês
              </h3>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                      <th className="pb-3 pl-4">Dia</th>
                      <th className="pb-3">Descrição</th>
                      <th className="pb-3 text-center">Parcela</th>
                      <th className="pb-3 text-center">Restantes</th>
                      <th className="pb-3 text-right">Valor Parcela</th>
                      <th className="pb-3 text-right pr-4">Total Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCardBills.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-on-surface-variant">
                          Nenhum cartão ativo ou despesa registrada neste período.
                        </td>
                      </tr>
                    ) : (
                      [...filteredCardBills]
                        .sort((a, b) => a.day - b.day)
                        .map((bill) => (
                          <tr key={bill.id} className="hover:bg-white/1 transition-all">
                            <td className="py-4 pl-4 text-xs font-black font-mono text-white">
                              {String(bill.day).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}
                            </td>
                            <td className="py-4 text-xs font-bold text-white uppercase">
                              {bill.description}
                              <span className={cn(
                                "ml-2 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                bill.category === 'store'
                                  ? "bg-primary/10 border-primary/20 text-primary"
                                  : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                              )}>
                                {bill.category === 'store' ? 'Loja' : 'Pessoal'}
                              </span>
                            </td>
                            <td className="py-4 text-center text-xs font-mono text-on-surface-variant">
                              {bill.current_installment} / {bill.total_installments}
                            </td>
                            <td className="py-4 text-center text-xs font-mono text-on-surface-variant">
                              {bill.remaining_installments}
                            </td>
                            <td className="py-4 text-right text-xs font-mono font-black text-white">
                              R$ {Number(bill.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 text-right pr-4 text-xs font-mono font-black text-white/80">
                              R$ {(Number(bill.value) * Math.max(0, bill.remaining_installments || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white/2 border border-white/5 rounded-[40px] p-6 space-y-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">
                  Comparativo de Custos e Previsões
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-widest font-black">Previsão Entrada Total</span>
                    <span className="text-white font-mono font-black">
                      R$ {((forecast?.store_1_forecast || 0) + (forecast?.store_2_forecast || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-widest font-black">Entrada Cartão Mês</span>
                    <span className="text-green-400 font-mono font-black">
                      + R$ {Number(forecast?.card_payments_inflow || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-widest font-black">Fatura Cartão Mês</span>
                    <span className="text-error font-mono font-black">
                      - R$ {bills.reduce((sum, b) => sum + Number(b.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-widest font-black">Despesas Fixas Loja</span>
                    <span className="text-error font-mono font-black">
                      - R$ {Number(forecast?.fixed_store_expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant uppercase tracking-widest font-black">Despesas Pessoais</span>
                    <span className="text-purple-400 font-mono font-black">
                      - R$ {Number(forecast?.fixed_personal_expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex justify-between items-center text-sm font-bold">
                    <span className="text-white uppercase tracking-widest font-black">Saldo Operacional</span>
                    {(() => {
                      const totalInflow = (forecast?.store_1_forecast || 0) + (forecast?.store_2_forecast || 0) + (forecast?.card_payments_inflow || 0);
                      const totalOutflow = bills.reduce((sum, b) => sum + Number(b.value), 0) + (forecast?.fixed_store_expenses || 0) + (forecast?.fixed_personal_expenses || 0);
                      const balance = totalInflow - totalOutflow;
                      return (
                        <span className={cn("font-mono font-black", balance >= 0 ? "text-success" : "text-error")}>
                          R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-only CSS layout */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .glass-card, div, tr, td, th {
            background: none !important;
            background-color: transparent !important;
            border-color: #000 !important;
            color: black !important;
            box-shadow: none !important;
          }
          h1, h2, h3, h4, span, p, td, th {
            color: black !important;
          }
          .print\\:border-black {
            border: 1px solid black !important;
            border-radius: 8px !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
