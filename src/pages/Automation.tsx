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
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export default function Automation() {
  const { installments } = useFinanceStore();
  const { showNotification } = useUI();
  const { unit } = useUnitStore();
  const { 
    connectionStatus, qrCode, fetchConnectionStatus, fetchQRCode, logout 
  } = useAutomationStore();
  const [friendlyName, setFriendlyName] = React.useState('Whatsapp Loja MDR - ARROIO');
  const [instanceNameInput, setInstanceNameInput] = React.useState('mdr_arroio_zap');
  const [channelType, setChannelType] = React.useState<'whatsapp' | 'instagram'>('whatsapp');

  React.useEffect(() => {
    if (unit?.evolution_api_url && unit?.evolution_api_key && unit?.evolution_instance) {
      fetchConnectionStatus(unit.evolution_api_url, unit.evolution_api_key, unit.evolution_instance);
    }
  }, [unit, fetchConnectionStatus]);

  const handleSetupInstance = () => {
    if (!unit?.id) return;
    
    // Usar credenciais globais se não estiverem na unit
    const apiUrl = unit.evolution_api_url || 'https://whatsapp.mdrinformaticaecelulares.com.br';
    const apiKey = unit.evolution_api_key || 'MDR_SECRET_TOKEN_2024';

    fetchQRCode(apiUrl, apiKey, instanceNameInput, friendlyName, unit.id, channelType);
    showNotification('info', 'Integração', `Gerando conexão para ${channelType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}...`);
  };

  const handleLogout = () => {
    if (unit?.evolution_api_url && unit?.evolution_api_key && unit?.evolution_instance) {
      logout(unit.evolution_api_url, unit.evolution_api_key, unit.evolution_instance);
      showNotification('info', 'WhatsApp', 'Desconectando instância...');
    }
  };

  const [channels, setChannels] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (unit?.id) {
      fetchChannels();
    }
  }, [unit?.id]);

  const fetchChannels = async () => {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('unit_id', unit?.id);
    if (data) setChannels(data);
  };

  const handleDeleteChannel = async (id: string) => {
    if (confirm('Deseja realmente remover este canal?')) {
      await supabase.from('channels').delete().eq('id', id);
      fetchChannels();
      showNotification('success', 'Canal Removido', 'O canal foi removido com sucesso.');
    }
  };

  const blockedCount = installments.filter(i => i.status === 'blocked').length;

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

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-6">
          <div className="bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/30">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-display font-black text-on-surface uppercase tracking-tight">Canais Integrados</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">
                  {channels.length} {channels.length === 1 ? 'Canal Ativo' : 'Canais Ativos'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {channels.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-outline-variant/30 rounded-[32px] flex flex-col items-center text-center">
                  <MessageSquare size={48} className="text-on-surface-variant/20 mb-4" />
                  <p className="text-on-surface-variant font-display text-sm uppercase tracking-widest font-black opacity-40">Nenhum canal conectado ainda</p>
                </div>
              ) : channels.map((channel) => (
                <div key={channel.id} className="group p-6 bg-surface-container-highest/30 rounded-3xl border border-outline-variant/30 hover:border-primary/30 transition-all flex items-center gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors",
                    channel.status === 'connected' ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface-container-highest border-outline-variant text-on-surface-variant"
                  )}>
                    {channel.type === 'instagram' ? <Instagram size={24} /> : <MessageCircle size={24} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display font-black text-on-surface uppercase tracking-tight leading-none">{channel.name}</h3>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                        channel.status === 'connected' ? "bg-primary/20 text-primary" : "bg-surface-container-highest text-on-surface-variant"
                      )}>
                        {channel.status === 'connected' ? 'Conectado' : 'Aguardando'}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant font-display tracking-tight leading-snug">
                      ID da Instância: {channel.instance_name}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                        <Smartphone size={10} />
                        {channel.type === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open('https://whatsapp.mdrinformaticaecelulares.com.br/manager/', '_blank')}
                      className="p-3 bg-surface-container-low hover:bg-white/10 text-on-surface-variant hover:text-white rounded-2xl transition-all border border-outline-variant/30"
                      title="Abrir Gerenciador"
                    >
                      <ExternalLink size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="p-3 bg-surface-container-low hover:bg-error/10 text-on-surface-variant hover:text-error rounded-2xl transition-all border border-outline-variant/30"
                      title="Excluir Canal"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
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
                
                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setChannelType('whatsapp')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all",
                      channelType === 'whatsapp' ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/10 text-on-surface-variant opacity-60"
                    )}
                  >
                    <MessageCircle size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => setChannelType('instagram')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all",
                      channelType === 'instagram' ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/10 text-on-surface-variant opacity-60"
                    )}
                  >
                    <Instagram size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Instagram</span>
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Nome do Canal no Chat</label>
                    <input 
                      type="text" 
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                      placeholder="Ex: WhatsApp Vendas"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all text-white font-sans"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">ID da Instância (Técnico)</label>
                    <input 
                      type="text" 
                      value={instanceNameInput}
                      onChange={(e) => setInstanceNameInput(e.target.value)}
                      placeholder="Ex: loja_arroio"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all text-white font-sans"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  {connectionStatus === 'connected' ? (
                    <button 
                      onClick={handleLogout}
                      className="px-8 py-3 bg-error text-white rounded-2xl font-display font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                    >
                      Desconectar WhatsApp
                    </button>
                  ) : (
                    <button 
                      onClick={handleSetupInstance}
                      className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-display font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                    >
                      {qrCode ? 'Gerar Novo QR Code' : 'Conectar WhatsApp'}
                    </button>
                  )}
                  <button className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-display font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                    Tutorial de Conexão
                  </button>
                </div>
              </div>
              <div className="w-48 h-48 bg-white/5 rounded-[40px] flex flex-col items-center justify-center border border-white/10 shadow-2xl relative overflow-hidden group">
                {connectionStatus === 'connected' ? (
                  <div className="flex flex-col items-center text-center p-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Conectado</p>
                  </div>
                ) : qrCode ? (
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-full h-full p-4" />
                ) : (
                  <>
                    <Zap size={64} className="text-primary mb-4 animate-pulse" />
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Aguardando...</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
