import React, { useState } from 'react';
import { 
  KeyRound, Phone, Loader2, Send, ArrowRight, ShieldCheck, 
  MessageSquareShare, CheckCircle2, Lock
} from 'lucide-react';

export default function PartnersLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formata o telefone automaticamente em tempo de digitação (ex: (48) 99903-5854)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.substring(0, 2)}) ${raw.substring(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.substring(0, 2)}) ${raw.substring(2, 7)}-${raw.substring(7, 11)}`;
    }
    setPhone(formatted.substring(0, 15));
  };

  // Dispara o código OTP para o WhatsApp do investidor via n8n
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Por favor, insira um número de WhatsApp válido.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Endpoint integrado do servidor (chamando o fluxo do n8n por debaixo dos panos)
      const res = await fetch('/api/auth/partners/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao solicitar código.');

      setSuccess('Código enviado para seu WhatsApp!');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar código. Verifique o número.');
    } finally {
      setLoading(false);
    }
  };

  // Valida o OTP recebido
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('O código de verificação deve conter 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await fetch('/api/auth/partners/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, code: otp })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido.');

      // Login bem sucedido! Salva token e redireciona para o Dashboard
      localStorage.setItem('partners_token', data.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Código incorreto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans antialiased">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

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
              {step === 'phone' ? 'Acessar Conta' : 'Verificar WhatsApp'}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {step === 'phone' 
                ? 'Insira seu celular/WhatsApp cadastrado para receber o link e código de acesso instantâneo.' 
                : `Enviamos um código de 6 dígitos no WhatsApp cadastrado.`}
            </p>
          </div>

          {/* Feedback de Notificações */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95">
              <CheckCircle2 size={16} className="text-emerald-400" />
              {success}
            </div>
          )}

          {step === 'phone' ? (
            /* Formulário: Inserir Telefone */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">WhatsApp do Investidor</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                    <Phone size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="(00) 99999-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl pl-11 pr-5 py-4 text-sm text-white focus:border-emerald-500 focus:bg-white/[0.07] outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[10px] rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    Solicitar Código por WhatsApp
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Formulário: Inserir Código OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Código de Confirmação</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound size={16} />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl pl-11 pr-5 py-4 text-sm text-center font-mono tracking-[0.5em] text-white focus:border-emerald-500 focus:bg-white/[0.07] outline-none transition-all placeholder:text-zinc-600 placeholder:tracking-normal"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold uppercase tracking-widest text-[10px] rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    Verificar e Entrar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setSuccess('');
                  setError('');
                }}
                className="w-full text-center text-[9px] text-zinc-500 uppercase tracking-widest font-black hover:text-white transition-colors"
              >
                Alterar Número de Telefone
              </button>
            </form>
          )}
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
