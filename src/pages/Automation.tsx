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
  const { unit, units, fetchUnit, fetchAllUnits } = useUnitStore();
  const { 
    connectionStatus, qrCode, fetchConnectionStatus, fetchQRCode, logout, deleteInstance
  } = useAutomationStore();
  
  const [selectedUnitId, setSelectedUnitId] = React.useState<string | null>(null);
  const [friendlyName, setFriendlyName] = React.useState('');
  const [instanceNameInput, setInstanceNameInput] = React.useState('');
  const [channelType, setChannelType] = React.useState<'whatsapp' | 'instagram'>('whatsapp');
  const [channels, setChannels] = React.useState<any[]>([]);

  // Carregar unidades iniciais
  React.useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllUnits();
    } else if (profile?.unit_id) {
      fetchUnit(profile.unit_id);
    }
  }, [profile, fetchUnit, fetchAllUnits]);

  // Definir unidade selecionada inicial
  React.useEffect(() => {
    if (!selectedUnitId) {
      if (profile?.role === 'admin' && units.length > 0) {
        setSelectedUnitId(units[0].id);
      } else if (unit) {
        setSelectedUnitId(unit.id);
      }
    }
  }, [units, unit, profile, selectedUnitId]);

  // Atualizar nomes sugeridos quando a unidade ou o tipo muda
  React.useEffect(() => {
    const currentUnit = units.find(u => u.id === selectedUnitId) || unit;
    if (currentUnit) {
      const suffix = channelType === 'whatsapp' ? 'zap' : 'insta';
      const unitSlug = currentUnit.name.toLowerCase().includes('arroio') ? 'arroio' : 'gaivota';
      
      setFriendlyName(`${channelType === 'whatsapp' ? 'Whatsapp' : 'Instagram'} Loja MDR - ${unitSlug.toUpperCase()}`);
      setInstanceNameInput(`mdr_${unitSlug}_${suffix}`);
      
      // Buscar canais da unidade selecionada
      fetchChannels(currentUnit.id);
      
      // Buscar status da conexão se houver instância técnica (mock ou real)
      if (currentUnit.evolution_instance) {
        fetchConnectionStatus(currentUnit.evolution_instance);
      }
    }
  }, [selectedUnitId, units, unit, channelType, fetchConnectionStatus]);

  const fetchChannels = async (unitId: string) => {
    const { data } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('unit_id', unitId);
    if (data) setChannels(data);
  };

  const handleSetupInstance = () => {
    const currentUnitId = selectedUnitId || unit?.id;
    if (!currentUnitId) {
      showNotification('error', 'Erro', 'Selecione uma unidade primeiro.');
      return;
    }

    fetchQRCode(instanceNameInput, friendlyName, currentUnitId, channelType);
    showNotification('info', 'Integração', `Gerando conexão para ${channelType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}...`);
  };

  const handleLogout = () => {
    const currentUnit = units.find(u => u.id === selectedUnitId) || unit;
    if (currentUnit?.evolution_instance) {
      logout(currentUnit.evolution_instance);
      showNotification('info', 'WhatsApp', 'Desconectando instância...');
    }
  };

  const handleDeleteChannel = async (channel: any) => {
    if (confirm(`Deseja realmente remover o canal "${channel.name}"?`)) {
      // 1. Deletar na Evolution
      await deleteInstance(channel.instance_name);
      
      // 2. Deletar no Supabase
      await supabase.from('automation_channels').delete().eq('id', channel.id);
      
      const currentUnitId = selectedUnitId || unit?.id;
      if (currentUnitId) fetchChannels(currentUnitId);
      showNotification('success', 'Canal Removido', 'O canal foi removido do CRM e da Evolution.');
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-display font-black text-on-surface uppercase tracking-tight leading-none">WhatsApp & Automação</h1>
          <p className="text-on-surface-variant font-display tracking-tight mt-2 opacity-70 uppercase text-[10px] font-bold tracking-[0.2em]">Gestão centralizada de canais e mensagens</p>
        </div>

        {/* Seletor de Unidade para Admin */}
        {profile?.role === 'admin' && units.length > 0 && (
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-2xl">
            {units.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUnitId(u.id)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedUnitId === u.id 
                    ? "bg-white text-black shadow-lg" 
                    : "text-on-surface-variant hover:text-white"
                )}
              >
                {u.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-6">
          <div className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Bot size={240} className="text-white rotate-12" />
            </div>
            
            <div className="relative z-10 flex items-center justify-between mb-10">
              <div>
                <h2 className="text-xl font-display font-black text-on-surface uppercase tracking-tight">Canais Integrados</h2>
                <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60 mt-1">Lista de conexões ativas na unidade</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">
                  {channels.length} {channels.length === 1 ? 'Canal Ativo' : 'Canais Ativos'}
                </span>
              </div>
            </div>

            <div className="relative z-10 space-y-4">
              {channels.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-outline-variant/20 rounded-[32px] flex flex-col items-center text-center bg-white/[0.01]">
                  <MessageSquare size={48} className="text-on-surface-variant/10 mb-4" />
                  <p className="text-on-surface-variant font-display text-xs uppercase tracking-[0.2em] font-black opacity-30">Nenhum canal conectado nesta unidade</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {channels.map((channel) => (
                    <div key={channel.id} className="group p-6 bg-white/[0.02] rounded-[32px] border border-white/5 hover:border-primary/30 transition-all flex items-center gap-6">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 shadow-2xl",
                        channel.status === 'connected' || channel.status === 'connecting'
                          ? "bg-primary/20 border-primary/30 text-primary scale-105" 
                          : "bg-white/5 border-white/10 text-on-surface-variant opacity-60"
                      )}>
                        {channel.type === 'instagram' ? <Instagram size={28} /> : <MessageCircle size={28} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="font-display font-black text-on-surface uppercase tracking-tight leading-none text-sm">{channel.name}</h3>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm",
                            channel.status === 'connected' || channel.status === 'connecting' ? "bg-primary text-black" : "bg-white/10 text-on-surface-variant"
                          )}>
                            {channel.status === 'connected' ? 'Ativo' : 'Pendente'}
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant font-display tracking-widest uppercase opacity-40 font-bold">
                          ID: {channel.instance_name}
                        </p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => window.open('https://whatsapp.mdrinformaticaecelulares.com.br/manager/', '_blank')}
                          className="p-3 bg-white/5 hover:bg-primary hover:text-black text-white rounded-xl transition-all border border-white/10"
                          title="Gerenciar"
                        >
                          <ExternalLink size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteChannel(channel)}
                          className="p-3 bg-white/5 hover:bg-error hover:text-white text-white rounded-xl transition-all border border-white/10"
                          title="Remover"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/[0.02] p-10 rounded-[50px] border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 opacity-5 transition-transform duration-1000 group-hover:scale-110">
              <Zap size={280} className="text-primary rotate-12" />
            </div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-8">
                <div>
                  <h2 className="text-3xl font-display font-black text-primary uppercase tracking-tighter mb-3 italic">
                    Nova Conexão {channelType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                  </h2>
                  <p className="text-on-surface font-display text-sm tracking-tight leading-relaxed opacity-60 max-w-lg">
                    {channelType === 'whatsapp' 
                      ? 'Conecte sua conta do WhatsApp para que o MDR Celulares possa gerenciar as cobranças por você de forma 100% automatizada.'
                      : 'Centralize seu atendimento do Instagram e responda seus clientes diretamente pelo nosso Chat unificado.'}
                  </p>
                </div>
                
                <div className="flex gap-4 max-w-md">
                  <button 
                    onClick={() => setChannelType('whatsapp')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-3 p-5 rounded-[24px] border transition-all duration-300",
                      channelType === 'whatsapp' 
                        ? "bg-primary text-black border-primary shadow-2xl shadow-primary/20 scale-105" 
                        : "bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/10"
                    )}
                  >
                    <MessageCircle size={22} />
                    <span className="text-[11px] font-black uppercase tracking-widest">WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => setChannelType('instagram')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-3 p-5 rounded-[24px] border transition-all duration-300",
                      channelType === 'instagram' 
                        ? "bg-primary text-black border-primary shadow-2xl shadow-primary/20 scale-105" 
                        : "bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/10"
                    )}
                  >
                    <Instagram size={22} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Instagram</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl bg-black/20 p-8 rounded-[32px] border border-white/5">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] pl-1">Nome no Chat</label>
                    <input 
                      type="text" 
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] pl-1">ID da Instância</label>
                    <input 
                      type="text" 
                      value={instanceNameInput}
                      onChange={(e) => setInstanceNameInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none transition-all font-mono shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  {connectionStatus === 'connected' ? (
                    <button 
                      onClick={handleLogout}
                      className="px-10 py-4 bg-error text-white rounded-[20px] font-display font-black uppercase tracking-widest text-[11px] hover:bg-error/80 shadow-2xl shadow-error/20 transition-all hover:-translate-y-1"
                    >
                      Desconectar Canal
                    </button>
                  ) : (
                    <button 
                      onClick={handleSetupInstance}
                      className="px-10 py-4 bg-primary text-black rounded-[20px] font-display font-black uppercase tracking-widest text-[11px] hover:scale-105 shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1"
                    >
                      {qrCode ? 'Gerar Novo QR Code' : `Conectar ${channelType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}`}
                    </button>
                  )}
                  <button className="px-10 py-4 bg-white/5 border border-white/10 text-white rounded-[20px] font-display font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all">
                    Tutorial Completo
                  </button>
                </div>
              </div>

              <div className="w-64 h-64 bg-black/40 rounded-[60px] flex flex-col items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)] relative overflow-hidden group/qr">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/qr:opacity-100 transition-opacity duration-700" />
                {connectionStatus === 'connected' ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center text-center p-6 relative z-10"
                  >
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-4 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      <CheckCircle2 size={40} />
                    </div>
                    <p className="text-[12px] font-black text-primary uppercase tracking-[0.3em]">Conectado</p>
                    <p className="text-[9px] text-on-surface-variant uppercase mt-2 opacity-60">Pronto para uso</p>
                  </motion.div>
                ) : qrCode ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full h-full p-6 relative z-10"
                  >
                    <img src={qrCode} alt="QR Code WhatsApp" className="w-full h-full object-contain rounded-2xl bg-white p-2" />
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center relative z-10">
                    <div className="relative">
                      <Zap size={80} className="text-primary mb-6 animate-pulse" />
                      <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse -z-10" />
                    </div>
                    <p className="text-[11px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Aguardando...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
