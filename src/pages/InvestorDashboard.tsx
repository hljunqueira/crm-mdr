import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, AlertCircle, ShieldCheck, 
  Activity, ArrowDownLeft, ArrowUpRight, BarChart3, Package, Calendar,
  LogOut, Loader2, CheckCircle2, X, Info, Calculator, FileText
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import ScpManagement from './ScpManagement';

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
  status: 'estoque' | 'ativo' | 'quitado' | 'inadimplente';
}

export default function InvestorDashboard() {
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null);
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
    defaultedDevicesCount: 0
  });

  const [lots, setLots] = useState<InvestedLot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);

  // Estados do Modal de Resgate
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [pixKey, setPixKey] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState('');
  const [withdrawalError, setWithdrawalError] = useState('');



  // Estados do Modal do Contrato de Risco
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

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
    } catch (err) {
      window.location.href = '/login';
    }
  }, []);

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
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
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
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'investor' 
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/10' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Investidor
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'admin' 
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
              {profile?.role === 'admin' ? 'Administrador' : 'Investidor'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card: Saldo Disponível */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
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
                  onClick={() => setIsWithdrawalOpen(true)}
                  className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer border-0"
                >
                  Solicitar Resgate
                </button>
              </div>

              {/* Card: Capital Investido */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
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
                    Valor aportado nos lotes SCP
                  </p>
                </div>
                <div className="h-[38px] flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3">
                  <span>Recebido de volta:</span>
                  <span className="font-bold text-zinc-300">R$ {wallet.capitalRecovered.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Card: Juros Recebidos */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Participação nos Juros</span>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ArrowDownLeft size={18} />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold tracking-tight text-emerald-400">
                    R$ {wallet.interestReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                    <Info size={14} className="text-emerald-400" />
                    Lucros obtidos dos financiamentos
                  </p>
                </div>
                <div className="h-[38px] flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3">
                  <span>Total Recebido (Cap+Juros):</span>
                  <span className="font-bold text-emerald-400">R$ {wallet.totalReceived.toLocaleString('pt-BR')}</span>
                </div>
              </div>

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
                <div className="h-[38px] flex items-center justify-between text-[9px] text-zinc-500 mt-4 border-t border-zinc-800/60 pt-3 leading-tight gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] uppercase tracking-wider text-zinc-500">Aparelhos no lote:</span>
                    <span className="font-bold text-white">
                      {wallet.activeDevicesCount} Ativos • {wallet.paidDevicesCount} Quitados • {wallet.defaultedDevicesCount} Inad.
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsContractModalOpen(true)}
                    className="py-1.5 px-2.5 border border-zinc-850 hover:border-zinc-700 hover:text-white text-zinc-400 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-[#1e1e22]"
                  >
                    Termos de Riscos
                  </button>
                </div>
              </div>
            </div>

            {/* Layout Column: Evolution Chart */}
            <div className="grid grid-cols-1 gap-6">
              
              {/* Gráfico "Meu Dinheiro Trabalhando" */}
              <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-500" /> Evolução Mensal - Meu Dinheiro Trabalhando
                </h3>
                {monthlyHistory.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-zinc-500 text-xs">
                    Dados históricos indisponíveis ou sem repasses efetuados ainda.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                          labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                          formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Repasse creditado']}
                        />
                        <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} barSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
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
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${
                              lot.status === 'IN_SALES' 
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
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-white/[0.02] text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                        <th className="py-4 px-6">Aparelho</th>
                        <th className="py-4 px-6">Cliente Final</th>
                        <th className="py-4 px-6 text-center">Parcelas</th>
                        <th className="py-4 px-6 text-right">Capital Recuperado</th>
                        <th className="py-4 px-6 text-right">Juros Recebidos</th>
                        <th className="py-4 px-6 text-right">Total Repassado</th>
                        <th className="py-4 px-6 text-right">Capital Restante</th>
                        <th className="py-4 px-6 text-center">Status</th>
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
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                              p.status === 'estoque' 
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Transaction History */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" /> Extrato Recente da Carteira
              </h3>

              {transactions.length === 0 ? (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
                  Nenhuma transação financeira registrada para este parceiro.
                </div>
              ) : (
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-white/[0.02] text-zinc-500 uppercase tracking-widest text-[9px] font-black">
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
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              tx.type === 'WITHDRAWAL' 
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
                          <td className={`py-4 px-6 text-right font-mono font-extrabold ${
                            tx.type === 'WITHDRAWAL' ? 'text-rose-400' : 'text-emerald-400'
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
    </div>
  );
}
