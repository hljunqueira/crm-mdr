import React, { useState, useEffect } from 'react';
import {
  Wallet, TrendingUp, AlertCircle, ShieldCheck,
  Activity, ArrowDownLeft, ArrowUpRight, BarChart3, Package, Calendar,
  LogOut, Loader2, CheckCircle2, X, Info, Calculator, FileText
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import ScpManagement from './ScpManagement';
import ContractPrint from '../components/sales/ContractPrint';
import InvestorContractPrint from '../components/scp/InvestorContractPrint';

interface InvestedLot {
  id: string;
  quotaId?: string;
  title: string;
  amountInvested: number;
  ownershipPercentage: number;
  interestSharingPercentage: number;
  totalProducts: number;
  soldProducts: number;
  healthRate: number;
  status: 'OPEN' | 'IN_STOCK' | 'IN_SALES' | 'CLOSED';
  contractUrl?: string;
  signedContractAt?: string;
}

interface Transaction {
  id: string;
  type: 'AMORTIZATION' | 'PROFIT' | 'WITHDRAWAL' | 'CREDIT';
  amount: number;
  capitalPortion: number;
  interestPortion: number;
  description: string;
  date: string;
}

interface Product {
  id: string;
  model: string;
  imei: string;
  client: string;
  installments: string;
  capitalReturned: number;
  interestReceived: number;
  totalReceived: number;
  remainingValue: number;
  projectedTotalProfit?: number;
  projectedTotalContract?: number;
  saleId?: string;
  saleTotalValue?: number;
  status: 'estoque' | 'ativo' | 'quitado' | 'inadimplente';
}

export default function InvestorDashboard() {
  const [profile, setProfile] = useState<{ id: string; role: string; full_name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'investor' | 'admin'>('investor');

  const [wallet, setWallet] = useState({
    balance: 0,
    futureReceipts: 0,
    capitalInvested: 0,
    capitalRecovered: 0,
    interestReceived: 0,
    totalReceived: 0,
    roi: 0,
    activeDevicesCount: 0,
    paidDevicesCount: 0,
    defaultedDevicesCount: 0,
    projectedInterest: 0
  });

  const [lots, setLots] = useState<InvestedLot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [monthlyForecast, setMonthlyForecast] = useState<any[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<any[]>([]);
  const [chartView, setChartView] = useState<'history' | 'forecast' | 'evolution'>('history');
  const [fintechCategory, setFintechCategory] = useState({
    totalInvested: 0,
    category: 'bronze',
    rate: 2.0,
    isCustomRate: false,
    autoReinvest: false,
    benefits: [] as string[]
  });
  const [fintechEvolution, setFintechEvolution] = useState<any[]>([]);

  const [renda, setRenda] = useState({
    purchases: [] as any[],
    totalReceivable: 0,
    totalFuture: 0,
    totalOverdue: 0,
    delinquencyRate: 0
  });

  // Estados do Modal de Resgate
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [pixKey, setPixKey] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState('');
  const [withdrawalError, setWithdrawalError] = useState('');

  // Estados para Solicitação de Compra de Recebíveis
  const [isBuyReceivableOpen, setIsBuyReceivableOpen] = useState(false);
  const [availableSales, setAvailableSales] = useState<any[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [totalReceivableVal, setTotalReceivableVal] = useState<number | ''>('');
  const [interestRateInput, setInterestRateInput] = useState<number | ''>(40);
  const [ownershipPercentage, setOwnershipPercentage] = useState(100);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseSuccess, setPurchaseSuccess] = useState('');

  // Estados do Simulador de Investimento
  const [selectedLotIdForSim, setSelectedLotIdForSim] = useState<string>('');
  const [simVal, setSimVal] = useState(10000);
  const [simTab, setSimTab] = useState<'venda'>('venda');
  const [simCostPrice, setSimCostPrice] = useState<number | ''>(1000);
  const [simSalePrice, setSimSalePrice] = useState<number | ''>(1890);
  const [simSaleType, setSimSaleType] = useState<'vista' | 'prazo'>('prazo');
  const [simInterestRate, setSimInterestRate] = useState<number>(0.08); // 8%
  const [simProfitShare, setSimProfitShare] = useState<number | ''>(60);
  const [simAdminFee, setSimAdminFee] = useState<number | ''>(10);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Estados do Modal do Contrato de Risco
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  // Estados para visualização de contratos
  const [selectedSaleForContract, setSelectedSaleForContract] = useState<any>(null);
  const [investorContractData, setInvestorContractData] = useState<any>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [isClientContractOpen, setIsClientContractOpen] = useState(false);
  const [isInvestorContractOpen, setIsInvestorContractOpen] = useState(false);

  const handleViewClientContract = async (saleId: string) => {
    if (!saleId) return;
    try {
      setLoadingContract(true);
      // Registra visualização de contrato no log do servidor
      await fetch(`/api/scp/fintech/contracts/sale/${saleId}/view?userId=${profile?.id}`);
      
      const res = await fetch(`/api/scp/sale-contract/${saleId}`);
      if (!res.ok) throw new Error('Não foi possível carregar os dados do contrato.');
      const data = await res.json();
      setSelectedSaleForContract(data);
      setIsClientContractOpen(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar contrato.');
    } finally {
      setLoadingContract(false);
    }
  };

  const handleViewInvestorContract = async () => {
    if (!profile?.id) return;
    try {
      setLoadingContract(true);
      // Registra visualização de contrato de parceria no log do servidor
      await fetch('/api/scp/fintech/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          action: 'partnership_contract_view',
          details: { profile_id: profile.id }
        })
      });

      const res = await fetch(`/api/scp/investor-contract/${profile.id}`);
      if (!res.ok) throw new Error('Não foi possível carregar os dados do contrato de SCP.');
      const data = await res.json();
      setInvestorContractData(data);
      setIsInvestorContractOpen(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar contrato.');
    } finally {
      setLoadingContract(false);
    }
  };

  useEffect(() => {
    const storedProfile = localStorage.getItem('partners_profile');
    const storedToken = localStorage.getItem('partners_token');

    if (!storedProfile || !storedToken) {
      window.location.href = '/login';
      return;
    }

    try {
      const parsed = JSON.parse(storedProfile);
      setProfile(parsed);
      fetchDashboardData(parsed.id);
      fetchAvailableSales();
    } catch (err) {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    if (lots.length > 0 && !selectedLotIdForSim) {
      setSelectedLotIdForSim(lots[0].quotaId || '');
    }
  }, [lots, selectedLotIdForSim]);

  const fetchDashboardData = async (profileId: string) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/scp/dashboard/${profileId}`);
      if (!res.ok) {
        throw new Error('Falha ao obter dados reais do servidor.');
      }
      const data = await res.json();
      setWallet(data.wallet);
      setLots(data.lots);
      setProducts(data.products || []);
      setTransactions(data.transactions);
      setMonthlyHistory(data.monthlyHistory || []);
      setMonthlyForecast(data.monthlyForecast || []);
      setUpcomingPayments(data.upcomingPayments || []);
      
      // Buscar resgates do investidor
      try {
        const withdrawRes = await fetch(`/api/scp/withdrawals?profile_id=${profileId}`);
        if (withdrawRes.ok) {
          const withdrawData = await withdrawRes.json();
          setWithdrawals(withdrawData || []);
        }
      } catch (withdrawErr) {
        console.error('Error fetching withdrawals:', withdrawErr);
      }

      if (data.renda) {
        setRenda(data.renda);
      }

      // Buscar categorização e evolução da plataforma fintech
      try {
        const catRes = await fetch(`/api/scp/fintech/categories/${profileId}`);
        if (catRes.ok) {
          const catData = await catRes.json();
          setFintechCategory(catData);
        }
        const evoRes = await fetch(`/api/scp/fintech/investor/evolution/${profileId}`);
        if (evoRes.ok) {
          const evoData = await evoRes.json();
          setFintechEvolution(evoData);
        }
      } catch (catErr) {
        console.error('Error fetching fintech data:', catErr);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('partners_token');
    localStorage.removeItem('partners_profile');
    window.location.href = '/login';
  };

  const fetchAvailableSales = async () => {
    try {
      const res = await fetch('/api/scp/available-sales');
      const data = await res.json();
      setAvailableSales(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !selectedSaleId || !purchasePrice || !totalReceivableVal) {
      setPurchaseError('Preencha todos os campos obrigatórios.');
      return;
    }
    setIsSubmittingPurchase(true);
    setPurchaseError('');
    setPurchaseSuccess('');
    try {
      const res = await fetch('/api/scp/receivables/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profile.id,
          sale_id: selectedSaleId,
          purchase_price: purchasePrice,
          total_receivable: totalReceivableVal,
          ownership_percentage: 1.00
        })
      });
      if (!res.ok) throw new Error();
      setPurchaseSuccess('Solicitação de compra enviada com sucesso! Aguarde a aprovação do administrador.');
      setSelectedSaleId('');
      setPurchasePrice('');
      setTotalReceivableVal('');
      setInterestRateInput(40);
      setOwnershipPercentage(100);
      fetchDashboardData(profile.id);
    } catch (err) {
      setPurchaseError('Falha ao enviar solicitação de compra.');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Descricao', 'Data', 'Tipo', 'Valor'];
    const rows = transactions.map(t => [
      `"${t.description.replace(/"/g, '""')}"`,
      t.date,
      t.type,
      t.amount.toString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_parceiro_${profile?.id || 'investidor'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !withdrawAmount || !pixKey) {
      setWithdrawalError('Preencha todos os campos.');
      return;
    }

    const val = parseFloat(withdrawAmount);
    if (isNaN(val) || val <= 0) {
      setWithdrawalError('O valor do saque deve ser maior que zero.');
      return;
    }

    if (val > wallet.balance) {
      setWithdrawalError('Saldo insuficiente para solicitar este saque.');
      return;
    }

    setSubmittingWithdrawal(true);
    setWithdrawalError('');
    setWithdrawalSuccess('');
    try {
      const res = await fetch('/api/scp/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profile.id,
          amount: val,
          pix_key_type: pixKeyType,
          pix_key: pixKey
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar solicitação.');

      setWithdrawalSuccess('Solicitação de saque Pix enviada para aprovação do administrador!');
      setWithdrawAmount('');
      setPixKey('');

      // Atualizar dados da tela
      fetchDashboardData(profile.id);
      setTimeout(() => {
        setIsWithdrawalOpen(false);
        setWithdrawalSuccess('');
      }, 3000);
    } catch (err: any) {
      setWithdrawalError(err.message || 'Falha ao solicitar resgate.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const averageHealth = lots.length > 0
    ? (lots.reduce((acc, lot) => acc + lot.healthRate, 0) / lots.length).toFixed(1)
    : "100.0";

  // Find current rate based on selected lot, fallback to first lot, fallback to 20
  const selectedLotForSimObj = lots.find(l => l.quotaId === selectedLotIdForSim) || lots[0];
  const simRate = selectedLotForSimObj ? selectedLotForSimObj.interestSharingPercentage : 20;

  const simTotalInterest = simVal * 2.0; // Juros/lucro gerado total na carteira financiada
  const simInvShareInterest = simTotalInterest * (simRate / 100);
  const simTotalProjectedReturn = simVal + simInvShareInterest;
  const simMonthlyReturn = simTotalProjectedReturn / 12;

  // Cálculos do simulador de venda de aparelho
  const costPriceVal = Number(simCostPrice) || 0;
  const salePriceVal = Number(simSalePrice) || 0;
  const profitShareVal = Number(simProfitShare) || 0;
  const adminFeeVal = simAdminFee === '' ? 0 : Number(simAdminFee);

  let simSaleTotal = salePriceVal;
  let simSaleGrossProfit = 0;
  let simSaleNetProfit = 0;
  let simSaleInvestorProfit = 0;
  let simSaleAmortization = 0;
  let simSaleTotalPayout = 0;

  if (simSaleType === 'vista') {
    simSaleTotal = salePriceVal;
    simSaleGrossProfit = Math.max(0, salePriceVal - costPriceVal);
    simSaleNetProfit = simSaleGrossProfit * (1 - adminFeeVal / 100);
    simSaleInvestorProfit = simSaleNetProfit * (profitShareVal / 100);
    simSaleAmortization = costPriceVal;
    simSaleTotalPayout = simSaleAmortization + simSaleInvestorProfit;
  } else {
    // A Prazo 12x com juros
    simSaleTotal = salePriceVal * (1 + simInterestRate * 12);
    simSaleGrossProfit = Math.max(0, simSaleTotal - costPriceVal);
    simSaleNetProfit = simSaleGrossProfit * (1 - adminFeeVal / 100);
    simSaleInvestorProfit = simSaleNetProfit * (profitShareVal / 100);
    simSaleAmortization = costPriceVal; // Retorna o capital investido (custo)
    simSaleTotalPayout = simSaleAmortization + simSaleInvestorProfit;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-center items-center font-sans antialiased">
        <Loader2 className="animate-spin text-emerald-400 mb-4" size={40} />
        <p className="text-sm text-zinc-400 uppercase tracking-widest font-bold">Carregando painel de investimentos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Activity className="text-black" size={20} />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight uppercase">MDR PARCEIROS</h1>
            <p className="text-[10px] text-zinc-400 tracking-wider">PORTAL DE INVESTIMENTOS SCP</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {profile?.role === 'admin' && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 mr-2">
              <button
                onClick={() => setActiveTab('investor')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'investor'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/10'
                    : 'text-zinc-400 hover:text-white'
                  }`}
              >
                Investidor
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'admin'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/10'
                    : 'text-zinc-400 hover:text-white'
                  }`}
              >
                Gestão Admin
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 border-r border-[#27272a] pr-4 mr-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-zinc-300">
              {profile?.full_name ? profile.full_name : (profile?.role === 'admin' ? 'Administrador' : 'Investidor')}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 transition-colors bg-transparent border-0 cursor-pointer outline-none"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-8 py-10 space-y-10">
        {activeTab === 'admin' ? (
          <ScpManagement />
        ) : (
          <>
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                  {error}
                </div>
                <button
                  onClick={() => profile && fetchDashboardData(profile.id)}
                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-all text-[10px] uppercase font-bold"
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            {/* Wallet & Health Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">

              {/* Card: Saldo Disponível */}
              <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Saldo Disponível</span>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Wallet size={18} />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold tracking-tight">
                    R$ {wallet.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Pronto para saque Pix
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (wallet.balance > 0) setIsWithdrawalOpen(true);
                  }}
                  disabled={wallet.balance <= 0}
                  className={`w-full mt-4 py-3 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all border-0 ${
                    wallet.balance <= 0
                      ? 'bg-emerald-500/20 text-zinc-500 cursor-not-allowed opacity-50 shadow-none'
                      : 'bg-emerald-500 hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer'
                  }`}
                >
                  Solicitar Resgate
                </button>
                <button
                  onClick={() => setIsBuyReceivableOpen(true)}
                  className="w-full mt-2 py-3 bg-white/5 hover:bg-white/10 text-white font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all hover:scale-[1.02] active:scale-95 border border-white/10 cursor-pointer"
                >
                  Comprar Recebíveis
                </button>
              </div>

              {/* Card: Capital Investido */}
              <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Capital Investido</span>
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold tracking-tight">
                    R$ {wallet.capitalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                    <Calendar size={14} className="text-indigo-400" />
                    Capital ativo sob gestão
                  </p>
                </div>
                <div className="h-[38px] flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3">
                  <span>Recebido de volta:</span>
                  <span className="font-bold text-zinc-300">R$ {wallet.capitalRecovered.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Card: Previsão de Lucro */}
              <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Previsão de Lucro</span>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Calculator size={18} />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold tracking-tight text-emerald-400">
                    R$ {wallet.projectedInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                    <Info size={14} className="text-emerald-400" />
                    Lucro previsto de parcelas em aberto
                  </p>
                </div>
                <div className="h-[38px] flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3">
                  <span>Recebíveis Totais:</span>
                  <span className="font-bold text-zinc-300">
                    R$ {(wallet.futureReceipts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Card: Modelo Renda (Condicional) */}
              {renda && renda.purchases && renda.purchases.length > 0 && (
                <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-[#4338ca]/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                  <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Modelo Renda</span>
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold tracking-tight text-indigo-400">
                      R$ {renda.totalFuture.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                      <Info size={14} className="text-indigo-400" />
                      Recebíveis futuros da carteira
                    </p>
                  </div>
                  <div className="h-[38px] flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3">
                    <span>Inadimplência Renda:</span>
                    <span className={`font-bold ${renda.delinquencyRate > 10 ? 'text-rose-400' : 'text-zinc-300'}`}>
                      {renda.delinquencyRate.toFixed(1)}% (R$ {renda.totalOverdue.toLocaleString('pt-BR')})
                    </span>
                  </div>
                </div>
              )}

              {/* Card: ROI & Saúde */}
              <div className="relative overflow-hidden bg-[#18181b] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Retorno & Saúde</span>
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <BarChart3 size={18} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-400">ROI Acumulado</span>
                      <span className="font-extrabold text-emerald-400">+{wallet.roi.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-400">Saúde em Dia</span>
                      <span className="font-extrabold text-indigo-400">{averageHealth}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${averageHealth}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 mt-4 border-t border-zinc-800/60 pt-3 text-[10px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] uppercase tracking-wider text-zinc-500">Aparelhos no lote:</span>
                    <span className="font-bold text-white">
                      {wallet.activeDevicesCount} Ativos • {wallet.paidDevicesCount} Quitados • {wallet.defaultedDevicesCount} Inad.
                    </span>
                  </div>
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      type="button"
                      onClick={() => setIsContractModalOpen(true)}
                      className="flex-1 py-2.5 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-[#1e1e22] text-center"
                    >
                      Termos de Riscos
                    </button>
                    <button
                      type="button"
                      disabled={loadingContract}
                      onClick={handleViewInvestorContract}
                      className="flex-1 py-2.5 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-[#1e1e22] flex items-center justify-center gap-1"
                    >
                      {loadingContract ? <Loader2 size={8} className="animate-spin" /> : <FileText size={8} />}
                      Ver Contrato
                    </button>
                  </div>
                </div>
              </div>

              {/* Card: Categoria & Taxa de Retorno */}
              <div className="relative overflow-hidden bg-linear-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Categoria & Taxa</span>
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <div>
                  <span className={`text-xl font-black uppercase tracking-tight flex items-center gap-1.5 ${
                    fintechCategory.category === 'gold' ? 'text-amber-400' :
                    fintechCategory.category === 'silver' ? 'text-zinc-300' : 'text-amber-700'
                  }`}>
                    {fintechCategory.category === 'gold' ? '🏆 Ouro' :
                     fintechCategory.category === 'silver' ? '🥈 Prata' : '🥉 Bronze'}
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-amber-500" />
                    Retorno: {fintechCategory.rate.toFixed(1)}% a.m.
                  </p>
                </div>
                <div className="h-[38px] flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3">
                  <span className="text-[9px]">Reinvestir:</span>
                  <button
                    onClick={async () => {
                      const newReinvest = !fintechCategory.autoReinvest;
                      try {
                        const res = await fetch(`/api/scp/fintech/investor-settings/${profile?.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            customInterestRate: fintechCategory.isCustomRate ? fintechCategory.rate : null,
                            autoReinvest: newReinvest
                          })
                        });
                        if (res.ok) {
                          setFintechCategory(prev => ({ ...prev, autoReinvest: newReinvest }));
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border-0 cursor-pointer ${
                      fintechCategory.autoReinvest ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'bg-zinc-800 text-zinc-500 font-bold'
                    }`}
                  >
                    {fintechCategory.autoReinvest ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>
              </div>
            </div>

            {/* Layout Column: Evolution Chart & Investment Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Gráfico "Meu Dinheiro Trabalhando" */}
              <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 lg:col-span-8 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <BarChart3 size={16} className="text-emerald-500" />
                    {chartView === 'history' ? 'Rendimentos Mensais - Realizado' : chartView === 'evolution' ? 'Evolução Patrimonial - Ativos Acumulados' : 'Previsão Mensal - Recebíveis Futuros'}
                  </h3>
                  <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-0.5 self-start sm:self-auto">
                    <button
                      onClick={() => setChartView('history')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${chartView === 'history'
                          ? 'bg-emerald-500 text-black shadow-md'
                          : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                      Rendimentos
                    </button>
                    <button
                      onClick={() => setChartView('evolution')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${chartView === 'evolution'
                          ? 'bg-amber-500 text-black shadow-md'
                          : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                      Patrimônio
                    </button>
                    <button
                      onClick={() => setChartView('forecast')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${chartView === 'forecast'
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                      Previsão
                    </button>
                  </div>
                </div>
                {(chartView === 'history' ? monthlyHistory : chartView === 'evolution' ? fintechEvolution : monthlyForecast).length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-zinc-500 text-xs">
                    {chartView === 'history'
                      ? 'Dados históricos indisponíveis ou sem repasses efetuados ainda.'
                      : chartView === 'evolution'
                      ? 'Histórico de evolução patrimonial indisponível.'
                      : 'Sem previsão de recebimentos futuros para os lotes ativos.'}
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartView === 'evolution' ? (
                        <AreaChart data={fintechEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                            labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                            formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Aportes Ativos']}
                          />
                          <Area type="monotone" dataKey="patrimonio" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPatrimonio)" strokeWidth={2.5} />
                        </AreaChart>
                      ) : (
                        <BarChart data={chartView === 'history' ? monthlyHistory : monthlyForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                            labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                            formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, chartView === 'history' ? 'Repasse creditado' : 'Previsão de recebimento']}
                          />
                          <Bar dataKey="amount" fill={chartView === 'history' ? "#10b981" : "#6366f1"} radius={[6, 6, 0, 0]} barSize={36} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Simulador de Rentabilidade */}
              <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 lg:col-span-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <Calculator size={16} className="text-emerald-500" /> Simulador
                    </h3>
                  </div>

                  {/* Simular Venda de Celular */}
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Custo (R$)</label>
                        <input
                          type="number"
                          step="any"
                          value={simCostPrice}
                          onChange={(e) => setSimCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700 transition-colors font-mono"
                          placeholder="Ex: 1000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Venda À Vista (R$)</label>
                        <input
                          type="number"
                          step="any"
                          value={simSalePrice}
                          onChange={(e) => setSimSalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700 transition-colors font-mono"
                          placeholder="Ex: 1890"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Tipo de Venda</label>
                        <select
                          value={simSaleType}
                          onChange={(e) => setSimSaleType(e.target.value as any)}
                          className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700 transition-colors"
                        >
                          <option value="vista" className="bg-[#121214]">À Vista</option>
                          <option value="prazo" className="bg-[#121214]">A Prazo (12x)</option>
                        </select>
                      </div>

                      {simSaleType === 'prazo' ? (
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Taxa de Juros</label>
                          <select
                            value={simInterestRate}
                            onChange={(e) => setSimInterestRate(parseFloat(e.target.value))}
                            className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700 transition-colors"
                          >
                            <option value="0.05" className="bg-[#121214]">5% a.m.</option>
                            <option value="0.08" className="bg-[#121214]">8% a.m.</option>
                            <option value="0.12" className="bg-[#121214]">12% a.m.</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1 opacity-50">
                          <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Taxa de Juros</label>
                          <select disabled className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-not-allowed">
                            <option className="bg-[#121214]">N/A (À Vista)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Sua Part. Lucro (%)</label>
                        <input
                          type="number"
                          step="any"
                          value={simProfitShare}
                          onChange={(e) => setSimProfitShare(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700 transition-colors font-mono"
                          placeholder="Ex: 60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Taxa Adm. Loja (%)</label>
                        <input
                          type="number"
                          step="any"
                          value={simAdminFee}
                          onChange={(e) => setSimAdminFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700 transition-colors font-mono"
                          placeholder="Ex: 10"
                        />
                      </div>
                    </div>

                    {/* Resultado Simulado Venda */}
                    <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-3.5 space-y-1.5 text-[10px] text-zinc-400">
                      <div className="flex justify-between">
                        <span>Valor Total de Venda:</span>
                        <span className="font-bold text-white">R$ {simSaleTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{simSaleType === 'vista' ? 'Lucro Bruto (Markup):' : 'Lucro de Juros (Bruto):'}</span>
                        <span className="font-bold text-white">R$ {simSaleGrossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/60 pb-1.5 mb-1.5">
                        <span>Lucro Líquido (Pós Taxa Adm 10%):</span>
                        <span className="font-bold text-white">R$ {simSaleNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Seu Repasse de Lucro:</span>
                        <span className="font-bold text-emerald-400">R$ {simSaleInvestorProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({Number(simProfitShare || 0)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amortização (Retorno de Capital):</span>
                        <span className="font-bold text-zinc-300 font-mono">R$ {simSaleAmortization.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5 text-[11px] font-black text-emerald-400">
                        <span>Retorno Total Estimado:</span>
                        <span className="font-mono">R$ {simSaleTotalPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>

                      {simSaleType === 'prazo' && (
                        <div className="border-t border-zinc-800/80 pt-2 mt-2 space-y-1 text-[9px] text-zinc-400 bg-black/20 p-2 rounded-xl">
                          <span className="font-bold text-white uppercase tracking-wider block text-[8px] mb-1">Detalhamento por Parcela (12x)</span>
                          <div className="flex justify-between">
                            <span>Parcela de Capital (Amortização):</span>
                            <span className="font-mono text-zinc-300">R$ {(simSaleAmortization / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Parcela de Juros (Repasse):</span>
                            <span className="font-mono text-emerald-400">R$ {(simSaleInvestorProfit / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between border-t border-zinc-800/60 pt-1 mt-1 font-bold text-emerald-400">
                            <span>Repasse Total por Parcela:</span>
                            <span className="font-mono">R$ {(simSaleTotalPayout / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invested Lots List */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Package size={14} className="text-emerald-500" /> Meus Lotes Participantes
              </h3>

              {lots.length === 0 ? (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
                  Nenhum lote com cota ativa localizado para sua conta.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lots.map((lot) => {
                    const salesProgress = lot.totalProducts > 0 ? (lot.soldProducts / lot.totalProducts) * 100 : 0;
                    return (
                      <div key={lot.id} className="bg-[#121214] border border-zinc-800 hover:border-zinc-700 transition-all rounded-3xl p-6 flex flex-col justify-between shadow-lg">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-sm tracking-tight text-white">{lot.title}</h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${lot.status === 'IN_SALES'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}>
                              {lot.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 my-6">
                            <div className="bg-[#18181b] p-3 rounded-2xl border border-zinc-800/80">
                              <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Investimento</span>
                              <span className="text-xs font-bold text-white">
                                R$ {lot.amountInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="bg-[#18181b] p-3 rounded-2xl border border-zinc-800/80">
                              <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Participação</span>
                              <span className="text-xs font-bold text-white">
                                {lot.ownershipPercentage}% (Juros: {lot.interestSharingPercentage}%)
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar of Sold Products */}
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-400">Progresso de Vendas</span>
                              <span className="font-semibold text-zinc-200">
                                {lot.soldProducts}/{lot.totalProducts} Aparelhos
                              </span>
                            </div>
                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${salesProgress}%` }}></div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-zinc-800/60 pt-4 flex justify-between items-center mt-2">
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <AlertCircle size={12} className="text-zinc-400" /> Saúde: <span className="font-bold text-white">{lot.healthRate}% em dia</span>
                          </span>
                          {lot.contractUrl && (
                            <a
                              href={lot.contractUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider"
                            >
                              Contrato PDF
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Detailed Products List: Meus Produtos */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Package size={14} className="text-emerald-500" /> Meus Produtos Detalhados
              </h3>

              {products.length === 0 ? (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
                  Nenhum aparelho associado aos lotes investidos.
                </div>
              ) : (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-white/2 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                        <th className="py-4 px-6">Aparelho</th>
                        <th className="py-4 px-6">Cliente Final</th>
                        <th className="py-4 px-6 text-center">Parcelas</th>
                        <th className="py-4 px-6 text-right">Capital Recuperado</th>
                        <th className="py-4 px-6 text-right">Juros Recebidos</th>
                        <th className="py-4 px-6 text-right">Total Repassado</th>
                        <th className="py-4 px-6 text-right">Capital Restante</th>
                        <th className="py-4 px-6 text-right">Total Venda Cliente</th>
                        <th className="py-4 px-6 text-right">Lucro Previsto</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-800/10 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-bold text-white block">{p.model}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">IMEI: {p.imei}</span>
                          </td>
                          <td className="py-4 px-6 text-zinc-300 font-medium">{p.client}</td>
                          <td className="py-4 px-6 text-center font-mono text-zinc-400">{p.installments}</td>
                          <td className="py-4 px-6 text-right font-mono text-zinc-300">R$ {p.capitalReturned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-right font-mono text-emerald-400">R$ {p.interestReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">R$ {p.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-right font-mono text-zinc-400">R$ {p.remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-right font-mono text-indigo-400">R$ {(p.saleTotalValue || p.projectedTotalContract || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-right font-mono text-emerald-400 font-bold">R$ {(p.projectedTotalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${p.status === 'estoque'
                                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                : p.status === 'quitado'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : p.status === 'inadimplente'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                              {p.status === 'estoque' ? 'Estoque' : p.status === 'quitado' ? 'Quitado' : p.status === 'inadimplente' ? 'Inadimplente' : 'Ativo'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {p.saleId ? (
                              <button
                                onClick={() => handleViewClientContract(p.saleId!)}
                                className="px-2 py-1 bg-zinc-850 hover:bg-zinc-750 text-emerald-400 hover:text-emerald-300 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Ver Contrato
                              </button>
                            ) : (
                              <span className="text-zinc-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Renda Purchases Table */}
            {renda && renda.purchases && renda.purchases.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-500" /> Meus Contratos Renda (Recebíveis)
                </h3>

                <div className="bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-white/2 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                        <th className="py-4 px-6">Contrato</th>
                        <th className="py-4 px-6">Data de Aquisição</th>
                        <th className="py-4 px-6 text-right">Preço de Compra</th>
                        <th className="py-4 px-6 text-right">Valor Nominal Total</th>
                        <th className="py-4 px-6 text-center">Fração Adquirida</th>
                        <th className="py-4 px-6 text-right">Lucro Previsto</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {renda.purchases.map((purchase: any) => (
                        <tr key={purchase.id} className="hover:bg-zinc-800/10 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-bold text-white block">{purchase.device || 'Aparelho'}</span>
                            <span className="text-[10px] text-zinc-400 block font-medium">Cliente: {purchase.client}</span>
                            <span className="text-[9px] text-zinc-500 block font-mono">ID Venda: #{purchase.saleId.slice(0, 8)}</span>
                          </td>
                          <td className="py-4 px-6 text-zinc-400 font-medium">{new Date(purchase.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td className="py-4 px-6 text-right font-mono text-zinc-300">R$ {Number(purchase.purchasePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-right font-mono text-emerald-400">R$ {Number(purchase.totalReceivable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-center font-mono text-zinc-300">{(Number(purchase.ownershipPercentage)).toFixed(0)}%</td>
                          <td className="py-4 px-6 text-right font-mono text-emerald-400 font-bold">R$ {Number(purchase.projectedTotalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Adquirido
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                             {purchase.saleId ? (
                               <button
                                 onClick={() => handleViewClientContract(purchase.saleId)}
                                 className="px-2 py-1 bg-zinc-850 hover:bg-zinc-750 text-emerald-400 hover:text-emerald-300 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                               >
                                 Ver Contrato
                               </button>
                             ) : (
                               <span className="text-zinc-500">-</span>
                             )}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Previsão dos Próximos Pagamentos */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Calendar size={14} className="text-emerald-500" /> Previsão dos Próximos Pagamentos
              </h3>

              {upcomingPayments.length === 0 ? (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
                  Nenhum repasse agendado ou pendente de recebimento.
                </div>
              ) : (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-white/2 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                        <th className="py-4 px-6">Aparelho / Lote</th>
                        <th className="py-4 px-6">Cliente</th>
                        <th className="py-4 px-6 text-center">Data de Vencimento</th>
                        <th className="py-4 px-6 text-center">Parcela</th>
                        <th className="py-4 px-6 text-right">Valor Previsto</th>
                        <th className="py-4 px-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {upcomingPayments
                        .slice()
                        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .slice(0, 15)
                        .map((up) => (
                          <tr key={up.id} className="hover:bg-zinc-800/10 transition-colors">
                            <td className="py-4 px-6 font-bold text-white">{up.description}</td>
                            <td className="py-4 px-6 text-zinc-300">{up.client}</td>
                            <td className="py-4 px-6 text-center font-mono text-zinc-400">
                              {new Date(up.dueDate).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-4 px-6 text-center font-mono text-zinc-400">{up.installmentNumber}</td>
                            <td className="py-4 px-6 text-right font-mono text-emerald-400 font-bold">
                              R$ {up.expectedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${up.status === 'overdue' || up.status === 'blocked'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-zinc-850 text-zinc-400 border border-zinc-700/60'
                                }`}>
                                {up.status === 'overdue' || up.status === 'blocked' ? 'Atrasado' : 'Pendente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Pix Withdrawal Requests */}
            {withdrawals.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <ArrowDownLeft size={14} className="text-emerald-500" /> Minhas Solicitações de Resgate Pix
                </h3>

                <div className="bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-white/2 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                        <th className="py-4 px-6">Valor</th>
                        <th className="py-4 px-6">Chave Pix</th>
                        <th className="py-4 px-6">Data Solicitação</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-right">Comprovante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-zinc-800/10 transition-colors">
                          <td className="py-4 px-6 font-extrabold text-emerald-400">
                            R$ {Number(w.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-zinc-300 font-mono">
                            <span className="text-[10px] text-zinc-500 uppercase font-sans mr-1">{w.pix_key_type}:</span>
                            {w.pix_key}
                          </td>
                          <td className="py-4 px-6 text-zinc-400 font-medium">
                            {new Date(w.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              w.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : w.status === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {w.status === 'PENDING' ? 'Pendente' : w.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {w.receipt_url ? (
                              <a
                                href={w.receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all"
                              >
                                Ver Comprovante
                              </a>
                            ) : (
                              <span className="text-zinc-600 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Transaction History */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Activity size={14} className="text-emerald-500" /> Extrato Recente da Carteira
                </h3>
                <button
                  onClick={exportToCSV}
                  className="px-3 py-1.5 bg-[#18181b] hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={12} />
                  Exportar CSV
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
                  Nenhuma transação financeira registrada para este parceiro.
                </div>
              ) : (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-white/2 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                        <th className="py-4 px-6">Transação</th>
                        <th className="py-4 px-6">Data</th>
                        <th className="py-4 px-6 text-right">Capital</th>
                        <th className="py-4 px-6 text-right">Juros/Rentabilidade</th>
                        <th className="py-4 px-6 text-right">Valor Lançado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-zinc-800/10 transition-colors">
                          <td className="py-4 px-6 flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'WITHDRAWAL'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                              {tx.type === 'WITHDRAWAL' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            </div>
                            <span className="font-bold text-white">{tx.description}</span>
                          </td>
                          <td className="py-4 px-6 text-zinc-400 font-medium">{tx.date}</td>
                          <td className="py-4 px-6 text-right font-mono text-zinc-400">
                            {tx.type === 'WITHDRAWAL' ? "-" : `R$ ${tx.capitalPortion.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-emerald-400">
                            {tx.type === 'WITHDRAWAL' ? "-" : `R$ ${tx.interestPortion.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className={`py-4 px-6 text-right font-mono font-extrabold ${tx.type === 'WITHDRAWAL' ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                            {tx.type === 'WITHDRAWAL' ? '-' : '+'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modal: Solicitar Resgate */}
      {isWithdrawalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRequestWithdrawal} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsWithdrawalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider pr-6">Solicitar Resgate Pix</h3>
            <p className="text-xs text-zinc-400">
              Insira o valor que deseja resgatar e os dados da sua chave Pix. O saldo disponível na sua carteira é de: <strong>R$ {wallet.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>

            {withdrawalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {withdrawalError}
              </div>
            )}

            {withdrawalSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} />
                {withdrawalSuccess}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Valor do Resgate (R$)</label>
              <input
                type="number"
                required
                min={1}
                step="0.01"
                placeholder="Ex: 500,00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Tipo de Chave Pix</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="CPF" className="bg-[#121214]">CPF</option>
                  <option value="CNPJ" className="bg-[#121214]">CNPJ</option>
                  <option value="Celular" className="bg-[#121214]">Celular</option>
                  <option value="E-mail" className="bg-[#121214]">E-mail</option>
                  <option value="Chave Aleatória" className="bg-[#121214]">Chave Aleatória</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Chave Pix</label>
                <input
                  type="text"
                  required
                  placeholder="Insira a chave Pix"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsWithdrawalOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingWithdrawal}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {submittingWithdrawal ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar Saque'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Comprar Recebíveis */}
      {isBuyReceivableOpen && (() => {
        const selectedSale = availableSales.find(s => s.id === selectedSaleId);
        const unpaidCount = selectedSale ? (selectedSale.unpaid_installments_count ?? selectedSale.installments_count) : 12;
        const saleTotal = selectedSale ? Number(selectedSale.remaining_receivable_value ?? selectedSale.total_value) : 0;
        
        const monthlyRate = fintechCategory.rate || 2.0;
        const totalInterestRate = monthlyRate * unpaidCount;
        const calculatedPrice = saleTotal / (1 + (totalInterestRate / 100));
        const monthlyPayout = saleTotal / unpaidCount;
        const estimatedProfit = saleTotal - calculatedPrice;

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={handleRequestPurchaseSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl relative">
              <button
                type="button"
                onClick={() => {
                  setIsBuyReceivableOpen(false);
                  setSelectedSaleId('');
                  setPurchasePrice('');
                  setTotalReceivableVal('');
                  setInterestRateInput(40);
                  setOwnershipPercentage(100);
                  setPurchaseError('');
                  setPurchaseSuccess('');
                }}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>

              <h3 className="text-sm font-bold text-white uppercase tracking-wider pr-6">Adquirir Recebíveis</h3>
              <p className="text-xs text-zinc-400">
                Selecione um contrato disponível para adquirir os seus recebíveis futuros (100% de aquisição).
              </p>

              {purchaseError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                  {purchaseError}
                </div>
              )}

              {purchaseSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {purchaseSuccess}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Selecione o Contrato</label>
                <select
                  required
                  value={selectedSaleId}
                  onChange={(e) => {
                    const saleId = e.target.value;
                    setSelectedSaleId(saleId);
                    const sSale = availableSales.find(s => s.id === saleId);
                    if (sSale) {
                      const sVal = Number(sSale.remaining_receivable_value ?? sSale.total_value);
                      setTotalReceivableVal(sVal);
                      const uCount = sSale.unpaid_installments_count ?? sSale.installments_count ?? 12;
                      const mRate = fintechCategory.rate || 2.0;
                      const tRate = mRate * uCount;
                      const price = sVal / (1 + (tRate / 100));
                      setPurchasePrice(parseFloat(price.toFixed(2)));
                    }
                  }}
                  className="w-full bg-[#18181b] border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="" disabled className="bg-[#121214]">-- Escolha o Contrato --</option>
                  {availableSales.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#121214]">
                      {s.customer_name} - {s.device ? `${s.device.brand} ${s.device.model}` : 'Celular'} ({s.unpaid_installments_count ?? s.installments_count}x de R$ {(Number(s.remaining_receivable_value ?? s.total_value) / (s.unpaid_installments_count ?? s.installments_count)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              {selectedSale && (
                <div className="bg-white/2 border border-zinc-800/80 p-3 rounded-2xl text-[10px] space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Equipamento:</span>
                    <span className="font-bold text-white">{selectedSale.device ? `${selectedSale.device.brand} ${selectedSale.device.model}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor em Aberto:</span>
                    <span className="font-bold text-white">R$ {saleTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Parcelas a Receber (Futuras):</span>
                    <span className="font-bold text-white">{unpaidCount}x</span>
                  </div>
                </div>
              )}

              {selectedSale && (
                <div className="bg-white/2 border border-zinc-800/80 p-3 rounded-2xl text-[10px] space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Sua Categoria:</span>
                    <span className={`font-bold uppercase ${
                      fintechCategory.category === 'gold' ? 'text-amber-400' :
                      fintechCategory.category === 'silver' ? 'text-zinc-300' : 'text-amber-700'
                    }`}>
                      {fintechCategory.category === 'gold' ? '🏆 Ouro' :
                       fintechCategory.category === 'silver' ? '🥈 Prata' : '🥉 Bronze'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa Mensal (a.m.):</span>
                    <span className="font-bold text-white">{Number(fintechCategory.rate || 2.0).toFixed(1)}% a.m.</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa Total do Período ({unpaidCount}m):</span>
                    <span className="font-bold text-emerald-400">{(Number(fintechCategory.rate || 2.0) * unpaidCount).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {selectedSale && totalReceivableVal !== '' && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl text-[10px] space-y-1.5 text-emerald-300">
                  <div className="flex justify-between font-bold">
                    <span>Desembolso Imediato (À Vista):</span>
                    <span>R$ {calculatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Recebimento Mensal Estimado:</span>
                    <span>R$ {monthlyPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-zinc-800/60 pt-1.5 mt-1.5 text-indigo-300">
                    <span>Lucro Total Estimado:</span>
                    <span>R$ {estimatedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsBuyReceivableOpen(false);
                    setSelectedSaleId('');
                    setPurchasePrice('');
                    setTotalReceivableVal('');
                    setInterestRateInput(40);
                    setOwnershipPercentage(100);
                    setPurchaseError('');
                    setPurchaseSuccess('');
                  }}
                  className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPurchase || !selectedSaleId}
                  className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-450 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0 disabled:opacity-50"
                >
                  {isSubmittingPurchase ? <Loader2 size={12} className="animate-spin" /> : 'Solicitar Compra'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* Modal: Termos de Riscos e Compromisso */}
      {isContractModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-zinc-800 w-full max-w-2xl rounded-3xl p-8 space-y-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setIsContractModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText size={18} className="text-emerald-500" /> Regulamento de Investimento SCP
            </h3>

            <div className="flex-1 overflow-y-auto text-xs text-zinc-400 space-y-4 pr-2 leading-relaxed font-sans">
              <section className="space-y-2 border-b border-zinc-800/50 pb-4">
                <h4 className="font-bold text-zinc-200">1. Natureza do Aporte</h4>
                <p>O investidor injeta capital de forma voluntária para compor o estoque e o financiamento (venda no crediário) de smartphones controlados pela MDR Informática & Celulares.</p>
              </section>

              <section className="space-y-2 border-b border-zinc-800/50 pb-4">
                <h4 className="font-bold text-zinc-200">2. Rentabilidade e Riscos</h4>
                <p>Os retornos (devolução de capital e dividendos sobre juros) são vinculados exclusivamente à venda efetiva dos aparelhos e ao adimplemento de cada parcela paga pelos clientes finais.</p>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                  ⚠️ <strong>Risco de Inadimplência:</strong> Em caso de falta de pagamento por parte do cliente final, as parcelas correspondentes ao investidor sofrerão atraso no repasse. A MDR aplicará as penalidades de restrição de acesso ao aparelho (bloqueio via PayJoy/DeviceLock) e cobrará o cliente para reestabelecer o fluxo de caixa ou reaver o aparelho.
                </div>
              </section>

              <section className="space-y-2 border-b border-zinc-800/50 pb-4">
                <h4 className="font-bold text-zinc-200">3. Retomada de Estoque</h4>
                <p>Caso o aparelho seja repossessado devido à inadimplência definitiva, ele retornará ao estoque do Lote como "Disponível" e será revendido. A amortização de capital recomeçará a partir da nova venda do aparelho, protegendo o saldo de capital investido.</p>
              </section>

              <section className="space-y-2 pb-2">
                <h4 className="font-bold text-zinc-200">4. Desistência e Prazos de Reembolso</h4>
                <p>A desistência do negócio antes do prazo final estimado do lote sujeita-se a uma carência de 60 (sessenta) dias para o início do estorno do capital não amortizado, com aplicação de multa administrativa de 10% sobre o saldo remanescente sob custódia da MDR.</p>
              </section>
            </div>

            <div className="pt-4 border-t border-zinc-800/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsContractModalOpen(false)}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all cursor-pointer border-0"
              >
                Fechar e Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Contrato de Venda do Cliente */}
      {isClientContractOpen && selectedSaleForContract && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#121214] border border-zinc-850 w-full max-w-4xl mx-auto rounded-3xl p-6 shadow-2xl relative flex flex-col my-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4 shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" /> Pré-visualização do Contrato de Venda
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-450 text-black font-extrabold uppercase tracking-widest text-[10px] rounded-xl transition-all cursor-pointer border-0 flex items-center gap-1.5"
                >
                  <FileText size={12} />
                  Imprimir Contrato
                </button>
                <button 
                  type="button"
                  onClick={() => setIsClientContractOpen(false)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-2xl p-4 sm:p-8 border border-zinc-800 text-black shadow-inner">
              <ContractPrint
                sale={selectedSaleForContract.sale}
                customer={selectedSaleForContract.customer}
                unit={selectedSaleForContract.unit}
                installments={selectedSaleForContract.installments}
                isPreview={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Contrato de SCP do Investidor */}
      {isInvestorContractOpen && investorContractData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#121214] border border-zinc-850 w-full max-w-4xl mx-auto rounded-3xl p-6 shadow-2xl relative flex flex-col my-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4 shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" /> Pré-visualização do Contrato SCP
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-450 text-black font-extrabold uppercase tracking-widest text-[10px] rounded-xl transition-all cursor-pointer border-0 flex items-center gap-1.5"
                >
                  <FileText size={12} />
                  Imprimir Contrato
                </button>
                <button 
                  type="button"
                  onClick={() => setIsInvestorContractOpen(false)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-2xl p-4 sm:p-8 border border-zinc-800 text-black shadow-inner">
              <InvestorContractPrint
                profile={investorContractData.profile}
                unit={investorContractData.unit}
                quotas={investorContractData.quotas}
                devices={investorContractData.devices}
                isPreview={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Printable Components */}
      {selectedSaleForContract && (
        <ContractPrint
          sale={selectedSaleForContract.sale}
          customer={selectedSaleForContract.customer}
          unit={selectedSaleForContract.unit}
          installments={selectedSaleForContract.installments}
          isPreview={false}
        />
      )}
      {investorContractData && (
        <InvestorContractPrint
          profile={investorContractData.profile}
          unit={investorContractData.unit}
          quotas={investorContractData.quotas}
          devices={investorContractData.devices}
          isPreview={false}
        />
      )}
    </div>
  );
}
