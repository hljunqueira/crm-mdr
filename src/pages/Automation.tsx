import React from 'react';
import { 
  Bot, 
  MessageSquare, 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  Zap, 
  Settings, 
  RefreshCcw,
  Clock,
  Play,
  History,
  Lock,
  MessageCircle,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';

export default function Automation() {
  const { installments } = useFinanceStore();
  const { showNotification } = useUI();

  const blockedCount = installments.filter(i => i.status === 'blocked').length;

  const handleSetupInstance = () => {
    showNotification('info', 'Integração WhatsApp', 'O gerador de QR Code para conexão está sendo carregado...');
  };

  const automations = [
    {
      id: 1,
      name: 'Lembrete Antecipado',
      desc: 'Envia mensagem automática 3 dias antes do vencimento.',
      trigger: '3 dias antes',
      status: 'active',
      count: 142
    },
    {
      id: 2,
      name: 'Aviso de Vencimento',
      desc: 'Envia mensagem automática no dia do vencimento com link PIX.',
      trigger: 'No dia',
      status: 'active',
      count: 85
    },
    {
      id: 3,
      name: 'Alerta de Atraso',
      desc: 'Primeira cobrança após 5 dias de atraso.',
      trigger: '5 dias atrasado',
      status: 'active',
      count: 12
    },
    {
      id: 4,
      name: 'Bloqueio Automático',
      desc: 'Bloqueia o dispositivo remotamente após 10 dias de atraso.',
      trigger: '10 dias atrasado',
      status: 'paused',
      count: 5
    },
    {
      id: 5,
      name: 'Confirmação de Pagamento',
      desc: 'Agradecimento e envio do recibo digital.',
      trigger: 'Pagamento confirmado',
      status: 'active',
      count: 312
    }
  ];

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-display font-black text-on-surface uppercase tracking-tight">WhatsApp & Automação</h1>
          <p className="text-on-surface-variant font-display tracking-tight mt-1 opacity-70">Mensagens automáticas, lembretes e bloqueios</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-3 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
            <History size={18} />
            Logs de Envio
          </button>
          <button className="flex items-center gap-3 bg-primary text-on-primary px-6 py-3 rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
            <Plus size={18} />
            Nova Automação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/30">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-display font-black text-on-surface uppercase tracking-tight">Fluxos Ativos</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Motor de Automação Online</span>
              </div>
            </div>

            <div className="space-y-4">
              {automations.map((auto) => (
                <div key={auto.id} className="group p-6 bg-surface-container-highest/30 rounded-3xl border border-outline-variant/30 hover:border-primary/30 transition-all flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${
                    auto.status === 'active' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-surface-container-highest border-outline-variant text-on-surface-variant'
                  }`}>
                    {auto.id === 4 ? <Lock size={24} /> : <MessageCircle size={24} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display font-black text-on-surface uppercase tracking-tight leading-none">{auto.name}</h3>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                        auto.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        {auto.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant font-display tracking-tight leading-snug">{auto.desc}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-widest">
                        <Zap size={10} />
                        Gatilho: {auto.trigger}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                        <History size={10} />
                        {auto.count} envios no mês
                      </div>
                    </div>
                  </div>
                  <button className="p-3 bg-surface-container-low hover:bg-white/10 text-on-surface-variant hover:text-white rounded-2xl transition-all border border-outline-variant/30">
                    <Settings size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 p-8 rounded-[40px] border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 -mr-10 -mt-10 opacity-10">
              <MessageSquare size={200} className="text-primary rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-2xl font-display font-black text-primary uppercase tracking-tight mb-2 italic">Integração WhatsApp CRM</h2>
                <p className="text-on-surface font-display text-sm tracking-tight leading-relaxed opacity-80 max-w-md">
                  Conecte sua conta do WhatsApp para que o MDR Celulares possa gerenciar as cobranças por você. Utilizamos criptografia de ponta a ponta para garantir a segurança dos seus dados.
                </p>
                <div className="flex gap-4 mt-6">
                  <button 
                    onClick={handleSetupInstance}
                    className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-display font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                  >
                    Configurar Instância
                  </button>
                  <button className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-display font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                    Tutorial de Conexão
                  </button>
                </div>
              </div>
              <div className="w-48 h-48 bg-white/5 rounded-[40px] flex flex-col items-center justify-center border border-white/10 shadow-2xl relative">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary animate-bounce">
                  <Play size={14} fill="currentColor" />
                </div>
                <Zap size={64} className="text-primary mb-4 animate-pulse" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Escaneie o QR Code</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/30">
            <h2 className="text-xl font-display font-black text-on-surface uppercase tracking-tight mb-6 flex items-center gap-3">
              <History size={24} className="text-primary" />
              Atividade Recente
            </h2>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-display font-black text-on-surface uppercase tracking-tight">Lembrete enviado para Henrique</p>
                    <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">14:32 • Sucesso no envio</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-4 bg-surface-container-highest/50 hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface-variant hover:text-on-surface rounded-2xl text-[10px] font-black uppercase tracking-widest mt-8 transition-all">
              Ver Histórico Completo
            </button>
          </div>

          <div className="bg-error/5 p-8 rounded-[40px] border border-error/20">
            <h2 className="text-xl font-display font-black text-error uppercase tracking-tight mb-4 flex items-center gap-3">
              <Lock size={24} />
              Bloqueios
            </h2>
            <p className="text-xs text-on-surface/70 font-display tracking-tight leading-relaxed mb-6">
              Existem <span className="text-error font-black">{blockedCount} aparelhos</span> bloqueados por falta de pagamento no momento.
            </p>
            <div 
              onClick={() => showNotification('info', 'Gerenciamento de Bloqueio', 'Abrindo painel de controle remoto de dispositivos...')}
              className="p-4 bg-error text-on-surface rounded-2xl flex items-center justify-center gap-3 font-display font-black uppercase tracking-widest text-[10px] cursor-pointer hover:bg-error/90 transition-all shadow-lg shadow-error/10"
            >
              Gerenciar Dispositivos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
