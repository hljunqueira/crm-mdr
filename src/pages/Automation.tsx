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
  const [instaUser, setInstaUser] = React.useState('');
  const [instaPass, setInstaPass] = React.useState('');
  const [channels, setChannels] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showSetupModal, setShowSetupModal] = React.useState<false | 'whatsapp' | 'instagram'>(false);

  // Carregar dados iniciais e sincronizar status
  React.useEffect(() => {
    const init = async () => {
      await fetchAllUnits();
      await syncAllChannels();
      await fetchChannels();
      setLoading(false);
    };
    init();

    // Inscrição em tempo real para status
    const unsubscribe = subscribeToChannels(() => {
      fetchChannels();
    });
    
    return () => unsubscribe();
  }, []);

  const fetchChannels = async () => {
    const { data } = await supabase
      .from('automation_channels')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setChannels(data);
  };

  const handleSetup = async () => {
    if (!showSetupModal) return;
    const type = showSetupModal;
    const name = friendlyName || `${type === 'whatsapp' ? 'WhatsApp' : 'Instagram'} MDR`;
    const instance = instanceNameInput || `mdr_custom_${type}_${Math.random().toString(36).substring(7)}`;
    
    showNotification('info', 'Integração', `Iniciando conexão para ${type}...`);
    setShowSetupModal(false);
    
    const credentials = type === 'instagram' ? { user: instaUser, pass: instaPass } : undefined;
    
    await fetchQRCode(instance, name, null, type, credentials, () => {
      fetchChannels();
    });
    
    setFriendlyName('');
    setInstanceNameInput('');
    setInstaUser('');
    setInstaPass('');
    await fetchChannels();
  };

  const getStatusInfo = (instanceName: string) => {
    return channelStatuses[instanceName] || { status: 'disconnected', qrCode: null };
  };

  const IntegrationSection = ({ type }: { type: 'whatsapp' | 'instagram' }) => {
    const typeChannels = channels.filter(c => c.type === type);
    const Icon = type === 'whatsapp' ? MessageCircle : Instagram;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Icon size={24} />
            </div>
            <h2 className="text-2xl font-display font-black text-on-surface uppercase tracking-tight">
              {type === 'whatsapp' ? 'WhatsApp Business' : 'Instagram Direct'}
            </h2>
          </div>
          <button 
            onClick={() => {
              setFriendlyName('');
              setInstanceNameInput('');
              setShowSetupModal(type);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-primary hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
          >
            <Plus size={16} />
            Adicionar Novo
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {typeChannels.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-outline-variant/20 rounded-[32px] flex flex-col items-center text-center bg-white/[0.01]">
              <Icon size={48} className="text-on-surface-variant/10 mb-4" />
              <p className="text-on-surface-variant font-display text-xs uppercase tracking-[0.2em] font-black opacity-30">
                Nenhuma conta conectada
              </p>
            </div>
          ) : (
            typeChannels.map(channel => {
              const info = getStatusInfo(channel.instance_name);
              return (
                <div key={channel.id} className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/30 relative overflow-hidden group">
                  <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-40 h-40 bg-black/40 rounded-[30px] border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                      {info.status === 'connected' ? (
                        <div className="flex flex-col items-center text-primary">
                          <CheckCircle2 size={40} className="mb-2 shadow-2xl" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Ativo</span>
                        </div>
                      ) : info.status === 'qrcode' && info.qrCode ? (
                        <img 
                          src={info.qrCode.startsWith('data:image') ? info.qrCode : `data:image/png;base64,${info.qrCode}`} 
                          alt="QR Code" 
                          className="w-32 h-32 object-contain rounded-lg shadow-2xl"
                        />
                      ) : (
                        <div className="flex flex-col items-center opacity-40">
                          <RefreshCcw size={24} className="animate-spin mb-3" />
                          <span className="text-[8px] font-black uppercase tracking-widest italic">Sincronizando</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-display font-black text-on-surface uppercase tracking-tight leading-none mb-1">
                            {channel.name}
                          </h3>
                          <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest opacity-40">
                            Instância: {channel.instance_name}
                          </p>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full border flex items-center gap-2",
                          info.status === 'connected' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-on-surface-variant"
                        )}>
                          <div className={cn("w-1 h-1 rounded-full", info.status === 'connected' ? "bg-primary animate-pulse" : "bg-on-surface-variant")} />
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            {info.status === 'connected' ? 'Conectado' : info.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => logout(channel.instance_name)}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-on-surface-variant rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/10"
                        >
                          Reiniciar
                        </button>
                        <button 
                          onClick={async () => {
                            await deleteInstance(channel.instance_name);
                            await supabase.from('automation_channels').delete().eq('id', channel.id);
                            fetchChannels();
                          }}
                          className="px-5 py-3 bg-error/10 text-error hover:bg-error hover:text-white rounded-xl transition-all border border-error/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
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
    <div className="p-8 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-on-surface uppercase tracking-tighter leading-none mb-3">
            Automação de Canais
          </h1>
          <p className="text-on-surface-variant font-display text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">
            Gerencie múltiplos WhatsApp e Instagram MDR
          </p>
        </div>
        <div className="flex items-center gap-4 px-6 py-3 bg-primary/10 rounded-2xl border border-primary/20">
          <Zap size={16} className="text-primary" />
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">{channels.length} Canais Registrados</span>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <IntegrationSection type="whatsapp" />
        <IntegrationSection type="instagram" />
      </div>

      {/* Modal de Setup */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-surface-container-high p-10 rounded-[48px] border border-white/10 shadow-2xl relative"
          >
            <button 
              onClick={() => setShowSetupModal(false)}
              className="absolute top-8 right-8 text-on-surface-variant hover:text-white transition-all"
            >
              <Trash2 size={24} className="rotate-45" />
            </button>

            <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-8">
              Nova Conexão {showSetupModal === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Nome da Loja/Canal</label>
                <input 
                  type="text" 
                  value={friendlyName}
                  placeholder={showSetupModal === 'whatsapp' ? "Ex: WhatsApp Loja Gaivota" : "Ex: Instagram MDR"}
                  onChange={(e) => setFriendlyName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary outline-none transition-all"
                />
              </div>

              {showSetupModal === 'instagram' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Usuário Instagram</label>
                    <input 
                      type="text" 
                      value={instaUser}
                      placeholder="seu_usuario"
                      onChange={(e) => setInstaUser(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Senha Instagram</label>
                    <input 
                      type="password" 
                      value={instaPass}
                      placeholder="••••••••"
                      onChange={(e) => setInstaPass(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">ID Técnico (Opcional)</label>
                <input 
                  type="text" 
                  value={instanceNameInput}
                  placeholder="mdr_gaivota_zap"
                  onChange={(e) => setInstanceNameInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                />
              </div>
              <button 
                onClick={handleSetup}
                className="w-full py-5 bg-primary text-black rounded-2xl font-display font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 mt-4"
              >
                {showSetupModal === 'whatsapp' ? 'Gerar QR Code' : 'Conectar Instagram'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <footer className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
        <div className="flex items-center gap-3">
          <ShieldAlert size={16} />
          <p className="text-[9px] font-bold uppercase tracking-widest">Conexão Criptografada e Segura</p>
        </div>
      </footer>
    </div>
  );
}
