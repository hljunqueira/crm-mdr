import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Wrench, 
  ShoppingBag, 
  Send,
  Shield,
  Zap,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useLeadStore } from '../store/useLeadStore';
import { useUI } from '../context/UIContext';
import { formatPhone } from '../lib/utils';

export default function Atendimento() {
  const { addLead } = useLeadStore();
  const { showNotification } = useUI();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'assistencia',
    name: '',
    phone: '',
    unit: 'Arroio do Silva',
    item: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const typeLabel = formData.type === 'assistencia' ? 'REPAROS' : 'VENDAS';
      const itemLabel = formData.type === 'assistencia' ? 'Equipamento' : 'Produto/Interesse';
      
      await addLead({
        name: formData.name,
        phone: formData.phone,
        message: `[${typeLabel}] ${itemLabel}: ${formData.item} | Unidade: ${formData.unit} | Mensagem: ${formData.message}`,
        status: 'new'
      });
      
      showNotification('success', 'Solicitação Enviada', 'Em breve entraremos em contato via WhatsApp!');
      setFormData({
        type: 'assistencia',
        name: '',
        phone: '',
        unit: 'Arroio do Silva',
        item: '',
        message: ''
      });
    } catch (error) {
      showNotification('error', 'Erro ao Enviar', 'Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans overflow-x-hidden selection:bg-primary selection:text-on-primary relative">
      {/* Background Effects */}
      <div className="fixed inset-0 tech-grid-pattern opacity-5 pointer-events-none z-0"></div>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-logo-blue/5 blur-[150px] -z-10 rounded-full animate-pulse-slow"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-logo-green/3 blur-[150px] -z-10 rounded-full"></div>

      {/* Navigation */}
      <nav className="h-20 px-8 flex items-center justify-between backdrop-blur-xl sticky top-0 z-[100] border-b border-outline-variant/20">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-center text-on-surface group-hover:bg-primary group-hover:text-on-primary transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-[11px] uppercase font-black tracking-widest text-on-surface-variant group-hover:text-white transition-colors">Voltar</span>
        </Link>
        <div className="flex items-center gap-3">
          <img src="/logo-mdr.png" alt="MDR" className="h-10 w-auto" />
          <span className="font-display font-black text-on-surface text-lg tracking-tighter uppercase hidden sm:inline">
            MDR <span className="text-primary italic">Atendimento</span>
          </span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12 space-y-4"
          >
            <h1 className="text-4xl md:text-6xl font-display font-black text-on-surface uppercase tracking-tight leading-none">
              Atendimento <br />
              <span className="text-white italic">Online.</span>
            </h1>
            <p className="text-on-surface-variant font-display text-base md:text-lg max-w-md mx-auto leading-relaxed">
              Inicie seu atendimento de forma rápida. Preencha os campos abaixo e nossa equipe entrará em contato.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card border border-outline-variant/40 rounded-3xl md:rounded-[48px] p-5 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden"
          >
            {/* Form Background Accent */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-logo-blue/5 blur-[80px] -z-10"></div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service/Sale Choice - Dropdown */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">O que você precisa?</label>
                <div className="relative">
                  <select
                    name="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer text-white pr-12"
                  >
                    <option value="assistencia" className="bg-[#121214] text-white">Reparos e Assistência</option>
                    <option value="venda" className="bg-[#121214] text-white">Vendas em Geral</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface/60">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Como podemos te chamar?" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">WhatsApp</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="(00) 00000-0000" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Unidade mais próxima</label>
                  <div className="relative">
                    <select 
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer text-white pr-12"
                    >
                      <option value="Arroio do Silva" className="bg-[#121214] text-white">Arroio do Silva (Matriz)</option>
                      <option value="Gaivota" className="bg-[#121214] text-white">Balneário Gaivota (Filial)</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface/60">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Equipamento ou Produto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: iPhone 13, MacBook, Carregador..."
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Descrição / Relato</label>
                <textarea 
                  rows={4} 
                  required
                  placeholder="Conte-nos o que você precisa..." 
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary text-on-primary rounded-2xl font-display font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-lg flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Enviar Solicitação <Send size={20} /></>}
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 pt-8 border-t border-outline-variant/10 flex flex-wrap justify-center gap-8 text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em]"
          >
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-primary" />
              <span>Dados Protegidos</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-primary" />
              <span>Resposta Rápida</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-primary" />
              <span>Equipe Certificada</span>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="py-8 text-center text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.4em]">
        © 2026 MDR Informática & Celulares
      </footer>
    </div>
  );
}
