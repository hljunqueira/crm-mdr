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
import { formatPhone } from '../lib/utils';
import RepairTimeline from '../components/layout/RepairTimeline';
import CustomerSalesCatalog from '../components/layout/CustomerSalesCatalog';



export default function CustomerOSPortal() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCompletedOpen, setShowCompletedOpen] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setError(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      setError('Por favor, digite seu telefone celular completo com DDD.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(false);
    setSelectedOrder(null);
    setServiceOrders([]);
    setCustomerName(null);

    try {
      const cleanPhoneWithout55 = cleanPhone.startsWith('55') && cleanPhone.length > 10 ? cleanPhone.substring(2) : cleanPhone;
      const cleanPhoneWith55 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      // Create filter variations and wrap values in double quotes to escape PostgREST special characters (parentheses, spaces, dashes)
      const filters = [
        `phone.eq."${phone}"`,
        `phone.eq."${cleanPhone}"`,
        `phone.eq."${cleanPhoneWithout55}"`,
        `phone.eq."${cleanPhoneWith55}"`
      ];

      const standardFormatted = formatPhone(cleanPhoneWithout55);
      if (standardFormatted && standardFormatted !== phone) {
        filters.push(`phone.eq."${standardFormatted}"`);
      }

      // 1. Buscar todos os clientes que possuem este telefone (limpo ou formatado)
      const { data: matchedCustomers, error: customerErr } = await supabase
        .from('customers')
        .select('id, name')
        .or(filters.join(','));

      if (customerErr) throw customerErr;

      if (!matchedCustomers || matchedCustomers.length === 0) {
        setError('Nenhum cadastro ou ordem de serviço encontrado para este telefone.');
        setLoading(false);
        return;
      }

      setCustomerName(matchedCustomers[0].name);
      const customerIds = matchedCustomers.map(c => c.id);

      // 2. Buscar ordens de serviço desses clientes
      const { data: orders, error: ordersErr } = await supabase
        .from('service_orders')
        .select('*')
        .in('customer_id', customerIds)
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
      <div className="fixed top-0 right-0 w-125 h-125 bg-primary/10 blur-[150px] -z-10 rounded-full animate-pulse-slow"></div>
      <div className="fixed bottom-0 left-0 w-125 h-125 bg-primary/5 blur-[150px] -z-10 rounded-full"></div>

      {/* Navigation Header */}
      <nav className="h-20 px-8 flex items-center justify-between backdrop-blur-xl sticky top-0 z-100 border-b border-white/5">
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
        <div className={hasSearched ? "w-full max-w-350" : "w-full max-w-3xl"}>
          
          <AnimatePresence mode="wait">
            {!hasSearched ? (
              /* PHONE INPUT PORTAL BOARD */
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

                <div className="glass-card border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl relative overflow-hidden bg-white/1 max-w-xl mx-auto">
                  <form onSubmit={handleSearch} className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.15em] pl-1">Digite seu Celular / WhatsApp cadastrado (DDD + 9 dígitos)</label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          required
                          placeholder="(00) 99999-9999" 
                          value={phone}
                          onChange={handlePhoneChange}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-lg text-center text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-mono" 
                        />
                      </div>
                      <p className="text-[9px] text-on-surface-variant/60 mt-1">Exemplo: (48) 99101-3293</p>
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
                  <div className="text-left">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Olá, {customerName?.split(' ')[0]}!</h2>
                    <p className="text-[10px] text-on-surface-variant font-display uppercase tracking-widest opacity-60 mt-0.5">
                      Encontramos {serviceOrders.length === 1 ? '1 Ordem de Serviço' : `${serviceOrders.length} Ordens de Serviço`} no seu cadastro
                    </p>
                  </div>
                  <button 
                    onClick={() => setHasSearched(false)}
                    className="self-start sm:self-auto flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-wider hover:bg-white/10 transition-all text-white"
                  >
                    Consultar outro Telefone
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  
                  {/* Select Order Sidebar if multiple exist */}
                  <div className="space-y-3 md:col-span-3 text-left">
                    <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest block mb-2 opacity-60">Selecione o Serviço</span>
                    
                    {(() => {
                      const activeOrders = serviceOrders.filter(os => 
                        !['delivered', 'returned_no_fix', 'canceled'].includes(os.status)
                      );
                      const completedOrCanceledOrders = serviceOrders.filter(os => 
                        ['delivered', 'returned_no_fix', 'canceled'].includes(os.status)
                      );

                      const getDeviceDisplayName = (os: any) => {
                        const brand = os.device_brand?.trim();
                        const model = os.device_model?.trim();
                        if ((!brand || brand === '-') && (!model || model === '-')) {
                          const cat = os.device_category?.toLowerCase();
                          switch (cat) {
                            case 'notebook': return 'Notebook';
                            case 'desktop': return 'Computador PC';
                            case 'smartphone': return 'Smartphone';
                            case 'tablet': return 'Tablet';
                            case 'printer': return 'Impressora';
                            case 'console': return 'Console';
                            default: return 'Equipamento';
                          }
                        }
                        return `${brand || ''} ${model || ''}`.trim();
                      };

                      return (
                        <>
                          <div className="space-y-2">
                            {activeOrders.map(os => {
                              const numberStr = String(os.os_number).padStart(4, '0');
                              const isSelected = selectedOrder?.id === os.id;
                              
                              return (
                                <button
                                  key={os.id}
                                  onClick={() => setSelectedOrder(os)}
                                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                                    isSelected 
                                      ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/10' 
                                      : 'bg-white/2 border-white/5 text-white hover:bg-white/4'
                                  }`}
                                >
                                  <span className="text-[9px] font-black font-mono leading-none tracking-widest opacity-70">OS #{numberStr}</span>
                                  <span className="text-xs font-black uppercase truncate mt-0.5">{getDeviceDisplayName(os)}</span>
                                </button>
                              );
                            })}
                          </div>

                          {completedOrCanceledOrders.length > 0 && (
                            <div className="mt-4 border-t border-white/5 pt-4">
                              <button
                                type="button"
                                onClick={() => setShowCompletedOpen(!showCompletedOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/1 hover:bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest transition-all"
                              >
                                <span>Concluídas / Canceladas ({completedOrCanceledOrders.length})</span>
                                <span className="text-primary">{showCompletedOpen ? '▼' : '▶'}</span>
                              </button>
                              
                              {showCompletedOpen && (
                                <div className="space-y-2 mt-2 pl-1 animate-in slide-in-from-top-1 duration-200">
                                  {completedOrCanceledOrders.map(os => {
                                    const numberStr = String(os.os_number).padStart(4, '0');
                                    const isSelected = selectedOrder?.id === os.id;
                                    
                                    return (
                                      <button
                                        key={os.id}
                                        onClick={() => setSelectedOrder(os)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                                          isSelected 
                                            ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/10' 
                                            : 'bg-white/2 border-white/5 text-white hover:bg-white/4'
                                        }`}
                                      >
                                        <span className="text-[8px] font-black font-mono leading-none tracking-widest opacity-70">OS #{numberStr}</span>
                                        <span className="text-[11px] font-black uppercase truncate mt-0.5">{getDeviceDisplayName(os)}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Render Selected Timeline Detail */}
                  <div className="md:col-span-5 space-y-6">
                    {selectedOrder ? (
                      <RepairTimeline 
                        status={selectedOrder.status}
                        deviceModel={selectedOrder.device_model}
                        deviceBrand={selectedOrder.device_brand}
                        deviceCategory={selectedOrder.device_category}
                        estimatedDelivery={selectedOrder.estimated_delivery}
                        warrantyPeriod={selectedOrder.warranty_period}
                        osNumber={selectedOrder.os_number}
                      />
                    ) : (
                      <div className="p-8 bg-white/2 border border-white/5 rounded-[40px] text-center opacity-60 flex flex-col items-center gap-3">
                        <Wrench size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-wider">Escolha uma Ordem de Serviço ao lado</p>
                      </div>
                    )}
                  </div>

                  {/* Render Sales Catalog on the right */}
                  <div className="md:col-span-4 mt-0">
                    {selectedOrder && (
                      <CustomerSalesCatalog 
                        osNumber={selectedOrder.os_number}
                        unitId={selectedOrder.unit_id}
                      />
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
