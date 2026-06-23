import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, AlertCircle, ShieldCheck, 
  Activity, ArrowDownLeft, ArrowUpRight, BarChart3, Package, Calendar,
  LogOut, Loader2, CheckCircle2, X
} from 'lucide-react';
import ScpManagement from './ScpManagement';

interface InvestedLot {
  id: string;
  quotaId?: string;
  title: string;
  amountInvested: number;
  ownershipPercentage: number;
  totalProducts: number;
  soldProducts: number;
  healthRate: number; // 0-100 percentage of on-time payments
  status: 'OPEN' | 'IN_STOCK' | 'IN_SALES' | 'CLOSED';
  contractUrl?: string;
}

interface Transaction {
  id: string;
  type: 'AMORTIZATION' | 'PROFIT' | 'WITHDRAWAL';
  amount: number;
  description: string;
  date: string;
}

export default function InvestorDashboard() {
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'investor' | 'admin'>('investor');
  
  const [wallet, setWallet] = useState({
    balance: 0,
    futureReceipts: 0
  });

  const [lots, setLots] = useState<InvestedLot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Estados do Modal de Resgate
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [pixKey, setPixKey] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState('');
  const [withdrawalError, setWithdrawalError] = useState('');

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
      setTransactions(data.transactions);
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
              {profile?.role === 'admin' ? 'Administrador' : 'Painel do Investidor'}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Card: Saldo Disponível */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Saldo Disponível</span>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Wallet size={18} />
                  </div>
                </div>
                <div>
                  <span className="text-4xl font-extrabold tracking-tight">
                    R$ {wallet.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Disponível para saque imediato via Pix
                  </p>
                </div>
                <button 
                  onClick={() => setIsWithdrawalOpen(true)}
                  className="w-full mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[10px] rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Solicitar Resgate
                </button>
              </div>

              {/* Card: Recebíveis Futuros */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#18181b] to-[#121214] border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Recebíveis Futuros</span>
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div>
                  <span className="text-4xl font-extrabold tracking-tight">
                    R$ {wallet.futureReceipts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1.5">
                    <Calendar size={14} className="text-indigo-400" />
                    Projeção de carteira com base nas parcelas pendentes
                  </p>
                </div>
                <div className="h-[46px] flex items-center text-xs text-zinc-500 italic mt-6 border-t border-zinc-800/60 pt-4">
                  * Atualizado com base nas vendas ativas
                </div>
              </div>

              {/* Card: Indicador de Saúde */}
              <div className="relative overflow-hidden bg-[#18181b] border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
                <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Saúde da Carteira</span>
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <BarChart3 size={18} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="relative h-24 w-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-zinc-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-500 transition-all duration-1000"
                        strokeWidth="3.5"
                        strokeDasharray={`${averageHealth}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-lg font-black">{averageHealth}%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Em dia</span>
                      <span className="font-semibold text-emerald-400">{averageHealth}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Inadimplência</span>
                      <span className="font-semibold text-rose-500">{(100 - Number(averageHealth)).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${averageHealth}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 mt-4 leading-relaxed">
                  Calculado a partir de parcelas pagas em dia vs. parcelas atrasadas nos lotes SCP investidos.
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
                              <span className="text-xs font-bold text-white">{lot.ownershipPercentage}%</span>
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
                <div className="bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="divide-y divide-zinc-800/60">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'PROFIT' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : tx.type === 'AMORTIZATION'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {tx.type === 'WITHDRAWAL' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{tx.description}</span>
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-1">
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${
                                tx.type === 'PROFIT' 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : tx.type === 'AMORTIZATION'
                                    ? 'bg-indigo-500/10 text-indigo-400'
                                    : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {tx.type}
                              </span>
                              • {tx.date}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-extrabold tracking-tight ${
                            tx.type === 'WITHDRAWAL' ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {tx.type === 'WITHDRAWAL' ? '-' : '+'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
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
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingWithdrawal}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submittingWithdrawal ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar Saque'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
