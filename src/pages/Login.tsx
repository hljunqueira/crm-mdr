import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const signIn = useAuthStore(state => state.signIn);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError('E-mail ou senha incorretos.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden selection:bg-white selection:text-black">
      <div className="fixed inset-0 tech-grid-pattern opacity-5 pointer-events-none z-0"></div>
      
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 blur-[120px] -z-10 rounded-full animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 blur-[120px] -z-10 rounded-full animate-pulse-slow delay-1000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10 space-y-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-20 h-20 rounded-3xl bg-surface-container border border-outline-variant/30 flex items-center justify-center p-3 shadow-2xl">
              <img src="/logo-mdr.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-black text-on-surface text-2xl tracking-tighter uppercase">
              MDR <span className="text-white italic">Informática & Celulares</span>
            </span>
          </Link>
          <div className="pt-4">
            <h1 className="text-2xl font-black text-on-surface uppercase tracking-tight">Acesso Restrito</h1>
            <p className="text-on-surface-variant text-sm font-display uppercase tracking-widest mt-1 opacity-60">Painel de Administração</p>
          </div>
        </div>

        <div className="glass-card p-10 border border-outline-variant/40 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden backdrop-blur-2xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 blur-3xl -z-10"></div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
              >
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" 
                  className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl pl-14 pr-6 py-4 text-sm focus:border-white focus:ring-4 focus:ring-white/10 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center pl-1">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em]">Senha</label>
                <button type="button" className="text-[9px] font-black text-on-surface/40 hover:text-white uppercase tracking-widest transition-colors">Esqueci a senha</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl pl-14 pr-6 py-4 text-sm focus:border-white focus:ring-4 focus:ring-white/10 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-white text-black rounded-[24px] font-display font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-outline-variant/20">
            <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest justify-center">
              <Shield size={12} className="text-on-surface-variant/40" />
              <span>Conexão Segura Supabase SSL</span>
            </div>
          </div>
        </div>


        <p className="mt-10 text-center text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em]">
          © 2024 MDR Informática & Celulares • Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
}
