import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Loader2, 
  AlertCircle, 
  ArrowLeft,
  Smartphone,
  Wrench,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { formatCPF } from '../lib/utils';
import RepairTimeline from '../components/layout/RepairTimeline';
import CustomerSalesCatalog from '../components/layout/CustomerSalesCatalog';

// Mathematical CPF validation (checksum)
const isValidCPF = (cpf: string): boolean => {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return false;
  
  // Exclude known invalid patterns
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;
  
  return true;
};

export default function CustomerOSPortal() {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search results
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    setError(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');

    if (!cleanCpf) {
      setError('Por favor, digite seu CPF.');
      return;
    }

    if (!isValidCPF(cleanCpf)) {
      setError('CPF inválido. Por favor, verifique os dígitos.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(false);
    setSelectedOrder(null);
    setServiceOrders([]);
    setCustomerName(null);

    try {
      // 1. Encontrar o cliente pelo CPF formatado (ou limpo dependendo de como está salvo)
      // Buscamos das duas formas para garantir compatibilidade
      const { data: customer, error: customerErr } = await supabase
        .from('customers')
        .select('id, name')
        .or(`cpf.eq.${cpf},cpf.eq.${cleanCpf}`)
        .maybeSingle();

      if (customerErr) throw customerErr;

      if (!customer) {
        setError('Nenhum cadastro ou ordem de serviço encontrado para este CPF.');
        setLoading(false);
        return;
      }

      setCustomerName(customer.name);

      // 2. Buscar ordens de serviço deste cliente
      const { data: orders, error: ordersErr } = await supabase
        .from('service_orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      setServiceOrders(orders || []);
      
      // Auto selecionar a ordem de serviço mais recente se houver
      if (orders && orders.length > 0) {
        setSelectedOrder(orders[0]);
      }
      
      setHasSearched(true);
    } catch (err) {
      console.error('Portal Search Error:', err);
      setError('Ocorreu um erro ao conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col font-sans text-white overflow-x-hidden relative">
      {/* Background visual styles */}
      <div className="fixed inset-0 tech-grid-pattern opacity-5 pointer-events-none z-0"></div>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] -z-10 rounded-full animate-pulse-slow"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] -z-10 rounded-full"></div>

      {/* Navigation Header */}
      <nav className="h-20 px-8 flex items-center justify-between backdrop-blur-xl sticky top-0 z-[100] border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-[11px] uppercase font-black tracking-widest text-on-surface-variant group-hover:text-white transition-colors">Home</span>
        </Link>
        <div className="flex items-center gap-3">
          <img src="/logo-mdr.png" alt="MDR" className="h-10 w-auto" />
          <span className="font-display font-black text-white text-lg tracking-tighter uppercase hidden sm:inline">
            MDR <span className="text-primary italic">Acompanhamento</span>
          </span>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-3xl">
          
          <AnimatePresence mode="wait">
            {!hasSearched ? (
              /* CPF INPUT PORTAL BOARD */
              <motion.div
                key="login-board"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center"
              >
                <div className="mb-10 space-y-4">
                  <h1 className="text-4xl md:text-6xl font-display font-black text-white uppercase tracking-tight leading-none">
                    Consulte seu <br />
                    <span className="text-primary italic">Aparelho.</span>
                  </h1>
                  <p className="text-on-surface-variant font-display text-sm md:text-base max-w-md mx-auto leading-relaxed opacity-75">
                    Acompanhe em tempo real a bancada técnica de conserto e o status de garantia do seu dispositivo.
                  </p>
                </div>

                <div className="glass-card border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl relative overflow-hidden bg-white/[0.01] max-w-xl mx-auto">
                  <form onSubmit={handleSearch} className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] pl-1">Digite seu CPF cadastrado</label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          required
                          placeholder="000.000.000-00" 
                          value={cpf}
                          onChange={handleCpfChange}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-lg text-center text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-mono" 
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error text-xs text-left">
                        <AlertCircle size={16} className="shrink-0" />
                        <p className="font-bold">{error}</p>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-primary text-on-primary rounded-2xl font-display font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all text-sm flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} /> Buscando Ordem...
                        </>
                      ) : (
                        <>
                          Consultar Status <Search size={18} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : (
              /* ORDERS TIMELINE DISPLAY */
              <motion.div
                key="timeline-board"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Search Return Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Olá, {customerName?.split(' ')[0]}!</h2>
                    <p className="text-[10px] text-on-surface-variant font-display uppercase tracking-widest opacity-60 mt-0.5">
                      Encontramos {serviceOrders.length === 1 ? '1 Ordem de Serviço' : `${serviceOrders.length} Ordens de Serviço`} ativas
                    </p>
                  </div>
                  <button 
                    onClick={() => setHasSearched(false)}
                    className="self-start sm:self-auto flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-wider hover:bg-white/10 transition-all text-white"
                  >
                    Consultar outro CPF
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  
                  {/* Select Order Sidebar if multiple exist */}
                  <div className="space-y-3 lg:col-span-1">
                    <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest block mb-2 opacity-60">Selecione o Serviço</span>
                    {serviceOrders.map(os => {
                      const numberStr = String(os.os_number).padStart(4, '0');
                      const isSelected = selectedOrder?.id === os.id;
                      
                      return (
                        <button
                          key={os.id}
                          onClick={() => setSelectedOrder(os)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                            isSelected 
                              ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/10' 
                              : 'bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="text-[9px] font-black font-mono leading-none tracking-widest opacity-70">OS #{numberStr}</span>
                          <span className="text-xs font-black uppercase truncate mt-0.5">{os.device_brand} {os.device_model}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Render Selected Timeline Detail */}
                  <div className="lg:col-span-2 space-y-6">
                    {selectedOrder ? (
                      <>
                        <RepairTimeline 
                          status={selectedOrder.status}
                          deviceModel={selectedOrder.device_model}
                          deviceBrand={selectedOrder.device_brand}
                          estimatedDelivery={selectedOrder.estimated_delivery}
                          warrantyPeriod={selectedOrder.warranty_period}
                          osNumber={selectedOrder.os_number}
                        />
                        <CustomerSalesCatalog 
                          osNumber={selectedOrder.os_number}
                          unitId={selectedOrder.unit_id}
                        />
                      </>
                    ) : (
                      <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] text-center opacity-60 flex flex-col items-center gap-3">
                        <Wrench size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-wider">Escolha uma Ordem de Serviço ao lado</p>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Secure Footer Badge */}
          <div className="mt-16 pt-8 border-t border-white/5 flex items-center justify-center gap-2 text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em]">
            <ShieldCheck size={14} className="text-primary" />
            <span>Painel com Criptografia Segura SSL</span>
          </div>

        </div>
      </main>

      <footer className="py-8 text-center text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.4em]">
        © 2026 MDR Informática & Celulares
      </footer>
    </div>
  );
}
