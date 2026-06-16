import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowRight, Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] -z-10 rounded-full animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-logo-green/5 blur-[120px] -z-10 rounded-full animate-pulse-slow delay-1000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-10 space-y-4">
          <a href="https://mdrinformaticaecelulares.com.br" className="inline-flex justify-center w-full">
            <img src="/logo-mdr.png" alt="Logo" className="h-32 w-auto object-contain drop-shadow-2xl" />
          </a>
          <div className="pt-4">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">Acesso Restrito</h1>
            <p className="text-on-surface-variant text-sm font-display tracking-widest mt-1 opacity-60">Painel de Administração</p>
          </div>
        </div>

        <div className="glass-card p-6 sm:p-10 border border-primary/10 rounded-[30px] sm:rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden backdrop-blur-2xl focus-within:border-primary/20 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 blur-3xl -z-10"></div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
              >
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-[11px] font-bold text-red-500 tracking-wider">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-on-surface/60 tracking-[0.2em] pl-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" 
                  className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl pl-14 pr-6 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center pl-1">
                <label className="text-[10px] font-black text-on-surface/60 tracking-[0.2em]">Senha</label>
                <button type="button" className="text-[9px] font-black text-on-surface/40 hover:text-white tracking-widest transition-colors">Esqueci a senha</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl pl-14 pr-14 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white transition-colors"
                  title={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-primary text-white rounded-[24px] font-display font-black tracking-[0.2em] shadow-[0_15px_40px_rgba(59,130,246,0.15)] hover:scale-[1.02] active:scale-95 transition-all text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-outline-variant/20">
            <a href="https://mdrinformaticaecelulares.com.br" className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant/40 hover:text-white tracking-widest justify-center transition-colors">
              <span>← Voltar ao site</span>
            </a>
          </div>
        </div>


        <p className="mt-10 text-center text-[10px] font-black text-on-surface-variant/40 tracking-[0.3em]">
          ©2026 MDR Informática & Celulares • Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
}
