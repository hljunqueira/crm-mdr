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
  Plus,
  Trash2,
  ExternalLink,
  Instagram,
  Smartphone
} from 'lucide-react';
import { motion } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';
import { useUnitStore } from '../store/useUnitStore';
import { useAutomationStore } from '../store/useAutomationStore';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export default function Automation() {
  const { profile } = useAuthStore();
  const { showNotification } = useUI();
  const { units, fetchAllUnits } = useUnitStore();
  const {
    channelStatuses, syncAllChannels, fetchQRCode, logout, deleteInstance
  } = useAutomationStore();

  const [friendlyName, setFriendlyName] = React.useState('');
  const [instanceNameInput, setInstanceNameInput] = React.useState('');
  const [channels, setChannels] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Carregar dados iniciais e sincronizar status
  React.useEffect(() => {
    const init = async () => {
      await fetchAllUnits();
      await syncAllChannels();
      await fetchChannels();
      setLoading(false);
    };
    init();
  }, []);

  const fetchChannels = async () => {
    const { data } = await supabase
      .from('automation_channels')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setChannels(data);
  };

  const handleSetup = async (type: 'whatsapp' | 'instagram') => {
    const name = friendlyName || `${type === 'whatsapp' ? 'WhatsApp' : 'Instagram'} MDR`;
    const instance = instanceNameInput || `mdr_custom_${type}_${Math.random().toString(36).substring(7)}`;

    showNotification('info', 'Integração', `Iniciando conexão para ${type}...`);
    await fetchQRCode(instance, name, null, type);
    await fetchChannels();
  };

  const getStatusInfo = (instanceName: string) => {
    return channelStatuses[instanceName] || { status: 'disconnected', qrCode: null };
  };

  const IntegrationCard = ({ type }: { type: 'whatsapp' | 'instagram' }) => {
    const channel = channels.find(c => c.type === type);
    const info = channel ? getStatusInfo(channel.instance_name) : { status: 'disconnected', qrCode: null };
    const Icon = type === 'whatsapp' ? MessageCircle : Instagram;

    return (
      <div className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/30 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transition-transform duration-700 group-hover:scale-110">
          <Icon size={240} className="text-white rotate-12" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-display font-black text-on-surface uppercase tracking-tight">
                {type === 'whatsapp' ? 'WhatsApp Business' : 'Instagram Direct'}
              </h2>
              <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60 mt-1">
                {channel ? `ID: ${channel.instance_name}` : 'Nenhuma conexão ativa'}
              </p>
            </div>
            {channel && (
              <div className={cn(
                "px-4 py-2 rounded-full border flex items-center gap-2",
                info.status === 'connected' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-on-surface-variant"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", info.status === 'connected' ? "bg-primary" : "bg-on-surface-variant")} />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {info.status === 'connected' ? 'Conectado' : info.status === 'loading' ? 'Verificando...' : 'Desconectado'}
                </span>
              </div>
            )}
          </div>

          {!channel ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Nome de Exibição</label>
                  <input
                    type="text"
                    placeholder={type === 'whatsapp' ? 'Ex: WhatsApp Loja Arroio' : 'Ex: Instagram MDR'}
                    onChange={(e) => setFriendlyName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">ID da Instância (Opcional)</label>
                  <input
                    type="text"
                    placeholder="mdr_arroio_zap"
                    onChange={(e) => setInstanceNameInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSetup(type)}
                className="w-full py-5 bg-primary text-black rounded-2xl font-display font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-3"
              >
                <Zap size={18} />
                Iniciar Nova Conexão
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-center bg-black/20 p-8 rounded-[32px] border border-white/5">
              <div className="w-48 h-48 bg-black/40 rounded-[40px] border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group/qr">
                {info.status === 'connected' ? (
                  <div className="flex flex-col items-center text-primary">
                    <CheckCircle2 size={48} className="mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ativo</span>
                  </div>
                ) : info.status === 'qrcode' && info.qrCode ? (
                  <img
                    src={info.qrCode.startsWith('data:image') ? info.qrCode : `data:image/png;base64,${info.qrCode}`}
                    alt="QR Code"
                    className="w-40 h-40 object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="flex flex-col items-center opacity-40">
                    <RefreshCcw size={32} className="animate-spin mb-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Aguardando...</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Status</p>
                    <p className="text-xs font-bold text-white uppercase">{info.status}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Tipo</p>
                    <p className="text-xs font-bold text-white uppercase">{channel.type}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => logout(channel.instance_name)}
                    className="flex-1 py-3 bg-white/5 hover:bg-error/20 hover:text-error text-on-surface-variant rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                  >
                    Desconectar
                  </button>
                  <button
                    onClick={async () => {
                      await deleteInstance(channel.instance_name);
                      await supabase.from('automation_channels').delete().eq('id', channel.id);
                      fetchChannels();
                    }}
                    className="px-6 py-3 bg-error/10 text-error hover:bg-error hover:text-white rounded-xl transition-all border border-error/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="animate-spin text-primary" size={48} />
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Sincronizando Canais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10">
      <header>
        <h1 className="text-4xl font-display font-black text-on-surface uppercase tracking-tighter leading-none mb-3">
          Automação de Canais
        </h1>
        <p className="text-on-surface-variant font-display text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">
          Gerencie suas conexões
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <IntegrationCard type="whatsapp" />
        <IntegrationCard type="instagram" />
      </div>

      <footer className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
        <div className="flex items-center gap-3">
          <ShieldAlert size={16} />
          <p className="text-[9px] font-bold uppercase tracking-widest">Ambiente de Conexão</p>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-[9px] font-black uppercase tracking-widest hover:text-primary transition-all">Documentação API</button>
          <button className="text-[9px] font-black uppercase tracking-widest hover:text-primary transition-all">Suporte Técnico</button>
        </div>
      </footer>
    </div>
  );
}
