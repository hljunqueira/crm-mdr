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
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] -z-10 rounded-full animate-pulse-slow"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 blur-[150px] -z-10 rounded-full"></div>

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
            className="glass-card border border-outline-variant/40 rounded-[48px] p-8 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden"
          >
            {/* Form Background Accent */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[80px] -z-10"></div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Type Selection - Integrated into Form */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">O que você deseja?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'assistencia' })}
                    className={`flex items-center gap-4 p-5 rounded-3xl border transition-all ${
                      formData.type === 'assistencia' 
                      ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(75,226,119,0.15)] text-primary' 
                      : 'bg-white/5 border-white/10 text-on-surface-variant hover:border-white/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.type === 'assistencia' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                      <Wrench size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-widest">Reparos</p>
                      <p className="text-[10px] opacity-60">Assistência Técnica</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'venda' })}
                    className={`flex items-center gap-4 p-5 rounded-3xl border transition-all ${
                      formData.type === 'venda' 
                      ? 'bg-secondary/10 border-secondary shadow-[0_0_20px_rgba(255,255,255,0.05)] text-secondary' 
                      : 'bg-white/5 border-white/10 text-on-surface-variant hover:border-white/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.type === 'venda' ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'}`}>
                      <ShoppingBag size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-widest">Vendas</p>
                      <p className="text-[10px] opacity-60">Produtos em Geral</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Identificação</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Seu nome" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">WhatsApp</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="(00) 00000-0000" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Unidade</label>
                  <select 
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="Arroio do Silva">Arroio do Silva (Matriz)</option>
                    <option value="Gaivota">Balneário Gaivota (Filial)</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">
                    {formData.type === 'assistencia' ? 'Equipamento' : 'Produto de Interesse'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.type === 'assistencia' ? 'Ex: iPhone 13, Notebook Dell...' : 'Ex: iPhone 15, MacBook, Carregador...'}
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">
                  {formData.type === 'assistencia' ? 'Relato do Problema' : 'Dúvidas ou Observações'}
                </label>
                <textarea 
                  rows={4} 
                  placeholder={formData.type === 'assistencia' ? 'Descreva o que está acontecendo...' : 'Como podemos te ajudar com esta compra?'} 
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary text-on-primary rounded-[24px] font-display font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(75,226,119,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Iniciar Atendimento
                    <Send size={20} />
                  </>
                )}
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
