import React, { useState } from 'react';
import { 
  KeyRound, Loader2, Send, ShieldCheck, 
  MessageSquareShare, CheckCircle2, Lock, Mail,
  Eye, EyeOff, AlertCircle, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PartnersLogin() {
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Autenticar com e-mail e senha no Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) {
        throw new Error(authError.message === 'Invalid login credentials' 
          ? 'E-mail ou senha incorretos.' 
          : authError.message
        );
      }

      if (!data.user) {
        throw new Error('Usuário não localizado após login.');
      }

      // 2. Buscar perfil correspondente no banco para validar o papel (role)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Perfil do investidor não localizado no banco.');
      }

      // 3. Validar se é investidor ou administrador
      if (profile.role !== 'investor' && profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Acesso restrito a investidores e administradores.');
      }

      // 4. Salvar dados de sessão específicos para a área de parceiros
      localStorage.setItem('partners_token', data.session.access_token);
      localStorage.setItem('partners_profile', JSON.stringify({ id: profile.id, role: profile.role, full_name: profile.full_name }));
      window.location.href = '/dashboard';

    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar a solicitação de recuperação.');
      }

      setSuccess('Código de recuperação enviado para o WhatsApp cadastrado!');
      setViewMode('reset');
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar código de redefinição.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao redefinir a senha.');
      }

      // Login automático após redefinição bem-sucedida
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword
      });

      if (authError || !authData.user) {
        setSuccess('Senha alterada! Volte para a tela anterior e faça o login.');
        setViewMode('login');
        return;
      }

      // Obter o perfil do banco
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', authData.user.id)
        .single();

      if (profile && (profile.role === 'investor' || profile.role === 'admin')) {
        localStorage.setItem('partners_token', authData.session.access_token);
        localStorage.setItem('partners_profile', JSON.stringify({ id: profile.id, role: profile.role, full_name: profile.full_name }));
        window.location.href = '/dashboard';
      } else {
        await supabase.auth.signOut();
        setViewMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans antialiased">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <div className="w-full max-w-[420px] z-10 space-y-8">
        {/* Brand Logo Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 p-0.5 shadow-xl shadow-emerald-500/10 items-center justify-center">
            <div className="h-full w-full bg-[#09090b] rounded-[14px] flex items-center justify-center">
              <Lock className="text-emerald-400" size={24} />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest text-white uppercase">PARCEIROS MDR</h1>
            <p className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-semibold mt-1">Plataforma de Investimentos SCP</p>
          </div>
        </div>

        {/* Card de Autenticação */}
        <div className="bg-[#121214]/60 border border-zinc-800/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">
              {viewMode === 'forgot' ? 'Recuperar Acesso' : viewMode === 'reset' ? 'Definir Nova Senha' : 'Acessar Conta'}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {viewMode === 'forgot' 
                ? 'Digite seu e-mail de investidor. Enviaremos um código de verificação para o WhatsApp cadastrado.' 
                : viewMode === 'reset' 
                  ? 'Insira o código de 6 dígitos que chegou em seu WhatsApp e configure sua nova senha.'
                  : 'Insira suas credenciais de investidor para acessar o painel de rendimentos.'}
            </p>
          </div>

          {/* Feedback de Notificações */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {viewMode === 'login' ? (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">E-mail do Investidor</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-zinc-800 rounded-2xl pl-11 pr-5 py-4 text-sm text-white focus:border-emerald-500 focus:bg-white/[0.07] outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Senha de Acesso</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setViewMode('forgot');
                        setError('');
                        setSuccess('');
                      }}
                      className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      Esqueci a senha
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-zinc-800 rounded-2xl pl-11 pr-12 py-4 text-sm text-white focus:border-emerald-500 focus:bg-white/[0.07] outline-none transition-all placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
                      title={showPassword ? "Ocultar senha" : "Exibir senha"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : viewMode === 'forgot' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">E-mail do Investidor</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-zinc-800 rounded-2xl pl-11 pr-5 py-4 text-sm text-white focus:border-emerald-500 focus:bg-white/[0.07] outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Código de Verificação</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                      <KeyRound size={16} />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="000000"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white/5 border border-zinc-800 rounded-2xl pl-11 pr-5 py-4 text-sm text-center font-mono tracking-[0.5em] text-white focus:border-emerald-500 focus:bg-white/[0.07] outline-none transition-all placeholder:text-zinc-600 placeholder:tracking-normal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Nova Senha</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-zinc-800 rounded-2xl pl-11 pr-12 py-4 text-sm text-white focus:border-emerald-500 focus:bg-white/[0.07] outline-none transition-all placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Confirmar Nova Senha</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/5 border border-zinc-800 rounded-2xl pl-11 pr-12 py-4 text-sm text-white focus:border-emerald-500 focus:bg-white/[0.07] outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[10px] rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {viewMode === 'forgot' ? (
                    <>
                      <Send size={12} />
                      Enviar Código
                    </>
                  ) : viewMode === 'reset' ? (
                    <>
                      <ShieldCheck size={14} />
                      Redefinir Senha e Entrar
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight size={14} />
                    </>
                  )}
                </>
              )}
            </button>

            {viewMode !== 'login' && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-center text-[9px] text-zinc-500 uppercase tracking-widest font-black hover:text-white transition-colors cursor-pointer border-0 bg-transparent mt-2"
              >
                ← Voltar para o Login
              </button>
            )}
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1.5">
          <MessageSquareShare size={12} className="text-zinc-500" />
          Dificuldades no acesso? Contate o suporte administrativo.
        </div>
      </div>
    </div>
  );
}
