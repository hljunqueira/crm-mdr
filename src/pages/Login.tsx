import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowRight, Lock, Mail, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useNetworkStore } from '../store/useNetworkStore';

const isElectronApp = typeof window !== 'undefined' && 
                      window.navigator && 
                      window.navigator.userAgent && 
                      window.navigator.userAgent.toLowerCase().includes('electron');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Estados para Recuperação de Senha (Esqueci a senha)
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const navigate = useNavigate();
  const signIn = useAuthStore(state => state.signIn);
  const { isOfflineMode, setOfflineMode } = useNetworkStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState('');

  useEffect(() => {
    if (!isElectronApp) {
      setOfflineMode(false);
    }
  }, [setOfflineMode]);

  const handleSync = async () => {
    setIsSyncing(true);
    setError('');
    setSyncSuccess('');
    try {
      const response = await fetch('http://localhost:3009/api/users/sync-pull', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Falha ao sincronizar dados com o servidor local.');
      }
      setSyncSuccess('Sincronização de tabelas e usuários concluída!');
    } catch (err: any) {
      setError(err.message || 'Erro ao sincronizar. Verifique se o servidor local está ativo.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setIsSubmitting(true);

    try {
      if (isOfflineMode) {
        const { error: authError } = await signIn(email, password);
        if (authError) {
          setError(authError.message || 'E-mail ou senha incorretos no modo offline.');
        } else {
          navigate('/dashboard');
        }
        setIsSubmitting(false);
        return;
      }

      if (!twoFactorRequired) {
        // Passo 1: Pré-login para verificar credenciais e checar 2FA
        const res = await fetch('/api/users/pre-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'E-mail ou senha incorretos.');
          setIsSubmitting(false);
          return;
        }

        if (data.twoFactorRequired) {
          setTwoFactorRequired(true);
        } else {
          // 2FA desativado ou usuário sem telefone (login direto)
          if (data.warning === 'missing_phone') {
            // Guarda aviso temporário para mostrar depois
            sessionStorage.setItem('login_warning', 'missing_phone');
          }
          const { error: authError } = await signIn(email, password);
          if (authError) {
            setError('E-mail ou senha incorretos.');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        // Passo 2: Verificação do código OTP
        const res = await fetch('/api/users/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: otpCode })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Código de verificação inválido.');
          setIsSubmitting(false);
          return;
        }

        // OTP válido, concluir login final
        const { error: authError } = await signIn(email, password);
        if (authError) {
          setError('Erro na sessão de autenticação. Reinicie o login.');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao processar solicitação.');
      } else {
        setViewMode('reset');
        setError('');
      }
    } catch (err) {
      setError('Erro ao enviar código por WhatsApp. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao redefinir a senha.');
      } else {
        // Redefinido com sucesso! Fazer login imediato
        const { error: authError } = await signIn(email, newPassword);
        if (authError) {
          setError('Senha alterada, mas falha ao entrar automaticamente. Volte e faça o login.');
          setViewMode('login');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    if (viewMode === 'forgot') {
      handleForgotPassword(e);
    } else if (viewMode === 'reset') {
      handleResetPassword(e);
    } else {
      handleLogin(e);
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
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              {viewMode === 'forgot' ? 'Recuperar Acesso' : viewMode === 'reset' ? 'Definir Nova Senha' : 'Acesso Restrito'}
            </h1>
            <p className="text-on-surface-variant text-sm font-display tracking-widest mt-1 opacity-60">Painel de Administração</p>
          </div>
        </div>

        <div className="glass-card p-6 sm:p-10 border border-primary/10 rounded-[30px] sm:rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden backdrop-blur-2xl focus-within:border-primary/20 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 blur-3xl -z-10"></div>
          
          <form onSubmit={handleFormSubmit} className="space-y-6">
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

            {viewMode === 'login' ? (
              !twoFactorRequired ? (
                <>
                  {/* Seletor Online / Offline */}
                  {isElectronApp && (
                    <div className="flex bg-[#1a1b24] p-1.5 rounded-2xl border border-white/5 gap-2 mb-6 shadow-inner">
                      <button
                        type="button"
                        onClick={() => {
                          setOfflineMode(false);
                          setError('');
                          setSyncSuccess('');
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                          !isOfflineMode 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${!isOfflineMode ? 'bg-white animate-pulse' : 'bg-green-500'}`} />
                        Online (Nuvem)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOfflineMode(true);
                          setError('');
                          setSyncSuccess('');
                          if (typeof navigator !== 'undefined' && navigator.onLine) {
                            handleSync();
                          }
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                          isOfflineMode 
                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-white animate-pulse' : 'bg-amber-500'}`} />
                        Offline (Local)
                      </button>
                    </div>
                  )}

                  {syncSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl mb-4"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                      <p className="text-[11px] font-bold text-green-500 tracking-wider">{syncSuccess}</p>
                    </motion.div>
                  )}

                  {isOfflineMode && (
                    <div className="flex justify-end mb-4">
                      <button
                        type="button"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar Banco Local'}
                      </button>
                    </div>
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
                      <button 
                        type="button" 
                        onClick={() => {
                          setViewMode('forgot');
                          setError('');
                        }}
                        className="text-[9px] font-black text-on-surface/40 hover:text-white tracking-widest transition-colors"
                      >
                        Esqueci a senha
                      </button>
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
                </>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 text-center"
                >
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 text-primary mb-4">
                    <Shield size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Código de Verificação</h3>
                    <p className="text-[10px] text-on-surface-variant/80 mt-2 leading-relaxed">
                      Insira o código de 6 dígitos que enviamos para o seu WhatsApp corporativo.
                    </p>
                  </div>

                  <div className="space-y-2 text-left pt-4">
                    <label className="text-[10px] font-black text-on-surface/60 tracking-[0.2em] pl-1">Código de Segurança</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Digite os 6 números" 
                      className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-4 text-center text-lg font-bold tracking-[0.5em] focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      required
                      autoFocus
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      setTwoFactorRequired(false);
                      setOtpCode('');
                      setError('');
                    }}
                    className="text-[9px] font-black text-primary hover:text-white tracking-widest transition-colors block mx-auto mt-4 uppercase"
                  >
                    ← Voltar para e-mail/senha
                  </button>
                </motion.div>
              )
            ) : viewMode === 'forgot' ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-xs text-on-surface-variant/80 pl-1 leading-relaxed">
                  Digite seu e-mail cadastrado. Enviaremos um código de verificação para o WhatsApp registrado no seu perfil.
                </p>

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

                <button 
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setError('');
                  }}
                  className="text-[9px] font-black text-on-surface/40 hover:text-white tracking-widest transition-colors block mx-auto mt-4 uppercase"
                >
                  ← Voltar para o login
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                    Código enviado! Digite o código de 6 dígitos que chegou em seu WhatsApp e configure sua nova senha de acesso.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 tracking-[0.2em] pl-1 font-sans">Código de Verificação</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Digite os 6 números" 
                    className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-4 text-center text-lg font-bold tracking-[0.5em] focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 tracking-[0.2em] pl-1">Nova Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres" 
                      className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl pl-14 pr-14 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 tracking-[0.2em] pl-1">Confirmar Nova Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite a senha novamente" 
                      className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl pl-14 pr-14 py-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    setViewMode('forgot');
                    setResetCode('');
                    setError('');
                  }}
                  className="text-[9px] font-black text-primary hover:text-white tracking-widest transition-colors block mx-auto mt-4 uppercase"
                >
                  ← Reenviar código para o WhatsApp
                </button>
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-primary text-white rounded-[24px] font-display font-black tracking-[0.2em] shadow-[0_15px_40px_rgba(59,130,246,0.15)] hover:scale-[1.02] active:scale-95 transition-all text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? 'Processando...' : viewMode === 'forgot' ? 'Enviar Código' : viewMode === 'reset' ? 'Redefinir Senha & Entrar' : twoFactorRequired ? 'Confirmar Código' : 'Entrar'} <ArrowRight size={18} />
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
