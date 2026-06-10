import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Plus, 
  Trash2, 
  LogOut, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  Smartphone,
  ExternalLink,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface ConnectionChannel {
  id: string;
  name: string;
  type: 'whatsapp' | 'instagram';
  instance_name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qrcode' | 'loading';
  store_id?: string | null;
  unit_id?: string | null;
}

export default function Connections() {
  const { profile } = useAuthStore();
  const { units, fetchAllUnits } = useUnitStore();
  const { showNotification, showModal, hideModal } = useUI();
  
  const [channels, setChannels] = useState<ConnectionChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeInstance, setActiveInstance] = useState<string | null>(null);
  const [activeQR, setActiveQR] = useState<string | null>(null);
  const [qrPollingInterval, setQrPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Form state
  const [newConnName, setNewConnName] = useState('');
  const [newConnStoreId, setNewConnStoreId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    fetchAllUnits();
    fetchChannels();
    
    // Subscrição em tempo real para atualizações na tabela (apenas INSERT e DELETE)
    const subscription = supabase
      .channel('automation_channels_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'automation_channels' },
        () => {
          fetchChannels();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'automation_channels' },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      if (qrPollingInterval) clearInterval(qrPollingInterval);
    };
  }, []);

  // Buscar canais do banco e checar status ao vivo na Evolution
  const fetchChannels = async () => {
    try {
      setLoading(true);
      const { data: dbChannels, error } = await supabase
        .from('automation_channels')
        .select('*');

      if (error) throw error;

      if (!dbChannels) {
        setChannels([]);
        return;
      }

      // Filtrar por loja se o usuário logado for gerente de unidade
      let filtered = dbChannels;
      const userStoreId = profile?.unit_id;
      if (profile?.role !== 'admin' && userStoreId) {
        filtered = dbChannels.filter(c => c.store_id === userStoreId || c.unit_id === userStoreId);
      }

      const formatted: ConnectionChannel[] = filtered.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type || 'whatsapp',
        instance_name: c.instance_name,
        status: (c.status as any) || 'loading', // Inicializa com o status salvo para evitar piscar em "loading"
        store_id: c.store_id || c.unit_id
      }));

      setChannels(formatted);

      // Consulta de status assíncrona ao vivo para cada instância
      for (const channel of filtered) {
        checkLiveStatus(channel.instance_name, channel.status);
      }
    } catch (err: any) {
      console.error('Erro ao buscar canais:', err);
      showNotification('error', 'Erro ao Carregar', 'Não foi possível carregar as conexões.');
    } finally {
      setLoading(false);
    }
  };

  // Checa status de conexão na Evolution
  const checkLiveStatus = async (instanceName: string, currentDbStatus?: string) => {
    try {
      const response = await fetch(`/api/evolution/instance/connectionState/${instanceName}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      const isConnected = data.instance?.state === 'open' || data.state === 'open' || data.status === 'open';
      const liveStatus = isConnected ? 'connected' : 'disconnected';
      
      setChannels(prev => prev.map(c => 
        c.instance_name === instanceName 
          ? { ...c, status: liveStatus }
          : c
      ));

      // SÓ atualiza o banco se o status realmente mudou! Isso previne loops infinitos com a subscrição do Supabase
      if (currentDbStatus !== liveStatus) {
        await supabase
          .from('automation_channels')
          .update({ status: liveStatus })
          .eq('instance_name', instanceName);
      }

    } catch (e) {
      // Se a instância não existir ou der erro, assume desconectado
      setChannels(prev => prev.map(c => 
        c.instance_name === instanceName ? { ...c, status: 'disconnected' } : c
      ));
      
      if (currentDbStatus !== 'disconnected') {
        await supabase
          .from('automation_channels')
          .update({ status: 'disconnected' })
          .eq('instance_name', instanceName);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchChannels();
    setIsRefreshing(false);
    showNotification('success', 'Status Atualizado', 'O status das conexões foi atualizado com sucesso.');
  };

  // Cadastrar nova conexão: Cria Chatwoot Inbox -> Cria Evolution Instance -> Configura tudo
  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnName.trim()) return;

    setIsCreating(true);
    const instanceName = newConnName.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const targetStoreId = profile?.role === 'admin' ? newConnStoreId || null : (profile?.unit_id || null);

    try {
      // Passo 1: Criar Caixa de Entrada do tipo API no Chatwoot
      showNotification('info', 'Passo 1/4', 'Criando Caixa de Entrada no Chatwoot...');
      const chatwootRes = await fetch('/api/chat/inbox/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newConnName, instance_name: instanceName })
      });

      if (!chatwootRes.ok) {
        const cwErr = await chatwootRes.json();
        throw new Error(`Erro Chatwoot: ${cwErr.message || 'Falha ao criar inbox'}`);
      }

      const chatwootData = await chatwootRes.json();
      const inboxToken = chatwootData.webhook_helper_token;
      const chatwootInboxId = chatwootData.inbox_id;

      // Passo 2: Criar a Instância na Evolution API
      showNotification('info', 'Passo 2/4', 'Criando Instância de WhatsApp na Evolution...');
      const createRes = await fetch('/api/evolution/instance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: instanceName,
          token: instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        if (!err.message?.includes('already exists')) {
          throw new Error(`Erro Evolution: ${err.message || 'Falha ao criar instância'}`);
        }
      }

      // Passo 3: Configurar a integração do Chatwoot na Evolution de forma segura pelo backend
      showNotification('info', 'Passo 3/4', 'Vinculando WhatsApp ao Chatwoot...');
      const chatwootConfigRes = await fetch(`/api/evolution/chatwoot/set/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameInbox: newConnName // Nome exato do inbox do Chatwoot para vincular na Evolution
        })
      });

      if (!chatwootConfigRes.ok) {
        console.warn('Erro ao configurar Chatwoot na Evolution (não fatal)');
      }

      // Passo 4: Configurar o Webhook global da Evolution para o CRM
      showNotification('info', 'Passo 4/4', 'Finalizando parametrização de segurança...');
      await fetch(`/api/evolution/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook: {
            url: 'http://app:3000/api/webhooks/evolution',
            enabled: true,
            webhookByEvents: true,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
          }
        })
      }).catch(e => console.warn('Erro ao setar webhook global:', e));

      // Passo 5: Salvar registro da conexão no Supabase (Canais de Automação e Canal Legado)
      const generatedId = crypto.randomUUID();
      
      const { error: dbError } = await supabase
        .from('automation_channels')
        .insert([{
          id: generatedId,
          name: newConnName,
          type: 'whatsapp',
          instance_name: instanceName,
          status: 'connecting',
          unit_id: targetStoreId, // Compatibilidade com nomes antigos
          updated_at: new Date().toISOString()
        }]);

      if (dbError) throw dbError;

      // Inserir canal legado para manter compatibilidade com tabelas antigas (FKs)
      const { error: legacyErr } = await supabase.from('channels').insert([{
        id: generatedId,
        name: newConnName,
        type: 'whatsapp',
        instance_name: instanceName,
        status: 'connecting',
        unit_id: targetStoreId
      }]);
      
      if (legacyErr) {
        console.warn('Erro ao inserir canal legado (não fatal):', legacyErr);
      }

      showNotification('success', 'Conexão Criada', 'Canal parametrizado! Iniciando QR Code...');
      setShowAddModal(false);
      setNewConnName('');
      setNewConnStoreId('');
      
      // Abrir modal de QR Code imediatamente
      openQRModal(instanceName);

    } catch (err: any) {
      console.error('Erro na criação de conexão:', err);
      showNotification('error', 'Falha na Criação', err.message || 'Erro inesperado.');
    } finally {
      setIsCreating(false);
    }
  };

  // Abrir modal de QR Code e iniciar polling do status
  const openQRModal = async (instanceName: string) => {
    setActiveInstance(instanceName);
    setShowQRModal(true);
    setActiveQR(null);

    try {
      // Primeira busca do QR Code
      const res = await fetch(`/api/evolution/instance/connect/${instanceName}`);
      const data = await res.json();
      const base64 = data.base64 || data.qrcode?.base64;
      if (base64) {
        setActiveQR(base64);
      }

      // Polling a cada 2.5 segundos para checar se o usuário escaneou
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/evolution/instance/connectionState/${instanceName}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            const state = statusData.instance?.state || statusData.state || statusData.status;
            
            if (state === 'open') {
              clearInterval(interval);
              showNotification('success', 'WhatsApp Conectado!', 'Seu celular foi pareado com sucesso.');
              setShowQRModal(false);
              fetchChannels();
            }
          }

          // Atualiza QR Code se a Evolution gerar outro
          const qrRes = await fetch(`/api/evolution/instance/connect/${instanceName}`);
          const qrData = await qrRes.json();
          const newBase64 = qrData.base64 || qrData.qrcode?.base64;
          if (newBase64) {
            setActiveQR(newBase64);
          }
        } catch (e) {
          console.warn('Erro no polling do QR Code:', e);
        }
      }, 2500);

      setQrPollingInterval(interval);

    } catch (e) {
      console.error('Erro ao conectar instância:', e);
      showNotification('error', 'Erro do QR Code', 'Não foi possível obter o QR Code.');
    }
  };

  const closeQRModal = () => {
    setShowQRModal(false);
    if (qrPollingInterval) {
      clearInterval(qrPollingInterval);
      setQrPollingInterval(null);
    }
    setActiveInstance(null);
    setActiveQR(null);
    fetchChannels();
  };

  // Desconectar sessão do celular na Evolution API
  const handleDisconnect = (instanceName: string) => {
    showModal({
      title: 'Confirmar Desconexão',
      children: 'Deseja realmente desconectar este celular do WhatsApp? Ele parará de receber mensagens.',
      confirmText: 'Sim, Desconectar',
      type: 'danger',
      onConfirm: async () => {
        try {
          showNotification('info', 'Desconectando...', 'Enviando comando de desconexão à Evolution...');
          const res = await fetch(`/api/evolution/instance/logout/${instanceName}`, {
            method: 'DELETE'
          });

          if (!res.ok) throw new Error('Falha ao desconectar');

          showNotification('success', 'Sessão Encerrada', 'O celular foi desconectado com sucesso.');
          fetchChannels();
          hideModal();
        } catch (err) {
          console.error(err);
          showNotification('error', 'Erro ao Desconectar', 'Ocorreu um erro ao deslogar o dispositivo.');
        }
      }
    });
  };

  // Deletar conexão completamente da Evolution, Chatwoot e do Supabase
  const handleDeleteConnection = (id: string, instanceName: string) => {
    showModal({
      title: 'Confirmar Exclusão',
      children: 'ATENÇÃO: Isso excluirá permanentemente a instância física do WhatsApp, a Caixa de Entrada correspondente no Chatwoot e todo o histórico do banco de dados. Confirmar?',
      confirmText: 'Sim, Excluir Tudo',
      type: 'danger',
      onConfirm: async () => {
        try {
          showNotification('info', 'Excluindo...', 'Removendo canal do sistema...');

          // 1. Deletar instância na Evolution API
          await fetch(`/api/evolution/instance/delete/${instanceName}`, {
            method: 'DELETE'
          }).catch(e => console.warn('Erro ao deletar na Evolution (não fatal):', e));

          // 2. Remover do Supabase (remover das duas tabelas)
          await supabase.from('automation_channels').delete().eq('id', id);
          await supabase.from('channels').delete().eq('id', id);

          showNotification('success', 'Conexão Excluída', 'O canal foi totalmente removido do sistema.');
          fetchChannels();
          hideModal();
        } catch (err: any) {
          console.error(err);
          showNotification('error', 'Erro ao Excluir', 'Não foi possível deletar a conexão.');
        }
      }
    });
  };

  return (
    <div className="p-8 pb-24 animate-in fade-in duration-700 w-full h-full bg-[#0c0c0e]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <QrCode className="text-primary" size={32} />
            Gerenciar WhatsApps
          </h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">
            Controle de Instâncias Físicas e Pareamentos por Loja
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 bg-white text-black px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            <Plus size={18} />
            Nova Conexão
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant animate-pulse">
            Consultando conexões ativas...
          </span>
        </div>
      ) : channels.length === 0 ? (
        /* Empty State */
        <div className="glass-card border border-white/5 rounded-[40px] p-16 text-center max-w-xl mx-auto mt-12 bg-white/[0.02]">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 text-on-surface-variant">
            <WifiOff size={28} />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Nenhum WhatsApp Conectado</h2>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed opacity-80">
            Adicione uma nova conexão para começar a sincronizar mensagens do WhatsApp das suas filiais diretamente na Central Multicanal.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="mt-8 inline-flex items-center gap-3 bg-white text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={16} />
            Configurar Primeiro WhatsApp
          </button>
        </div>
      ) : (
        /* Connections Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {channels.map((channel) => {
            const unitName = units.find(u => u.id === channel.store_id)?.name || 'Unidade Geral';
            
            return (
              <motion.div
                key={channel.id}
                layout
                className="glass-card border border-white/5 rounded-[32px] p-6 bg-white/[0.01] hover:bg-white/[0.03] transition-all flex flex-col relative overflow-hidden group"
              >
                {/* Background glow base */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Card Header */}
                <div className="flex items-start justify-between mb-6 z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                      channel.status === 'connected' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : channel.status === 'loading'
                        ? 'bg-primary/10 border-primary/20 text-primary animate-pulse'
                        : 'bg-white/5 border-white/10 text-on-surface-variant'
                    }`}>
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <h3 className="font-black text-white uppercase tracking-tight text-md">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Building2 size={12} className="text-on-surface-variant opacity-60" />
                        <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-80">
                          {unitName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                    channel.status === 'connected'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : channel.status === 'connecting' || channel.status === 'loading'
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {channel.status === 'connected' && (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Conectado
                      </>
                    )}
                    {channel.status === 'loading' && (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Verificando
                      </>
                    )}
                    {channel.status === 'connecting' && (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Pareando
                      </>
                    )}
                    {channel.status === 'disconnected' && (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Desconectado
                      </>
                    )}
                  </span>
                </div>

                {/* Instance Name Info */}
                <div className="mb-6 p-4 bg-white/5 border border-white/5 rounded-2xl z-10">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    <span>Instância Técnica:</span>
                    <span className="font-mono text-white font-normal lowercase">{channel.instance_name}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto flex items-center gap-3 z-10">
                  {channel.status !== 'connected' ? (
                    <button
                      onClick={() => openQRModal(channel.instance_name)}
                      className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/95 active:scale-95 transition-all"
                    >
                      <QrCode size={14} />
                      Conectar Celular
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisconnect(channel.instance_name)}
                      className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      <LogOut size={14} />
                      Desconectar Celular
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteConnection(channel.id, channel.instance_name)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 active:scale-95 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: NOVA CONEXÃO */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-lg border border-white/10 rounded-[40px] p-10 bg-[#121215] shadow-2xl relative overflow-hidden"
            >
              {/* Botão de Fechar */}
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-8 p-2 rounded-full text-on-surface-variant hover:text-white hover:bg-white/5 transition-all z-10"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Nova Conexão WhatsApp</h2>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Configuração física integrada em 1-clique</p>
                </div>
              </div>

              <form onSubmit={handleCreateConnection} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Nome Amigável da Conexão</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: WhatsApp Balcão Loja 2"
                    value={newConnName}
                    onChange={(e) => setNewConnName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all"
                  />
                </div>

                {/* Seletor de Loja (Unidade) - Apenas Administradores Gerais */}
                {profile?.role === 'admin' && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Unidade / Loja Correspondente</label>
                    <select
                      required
                      value={newConnStoreId}
                      onChange={(e) => setNewConnStoreId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all appearance-none"
                    >
                      <option value="" className="bg-surface-container-high">Selecione uma loja...</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id} className="bg-surface-container-high">{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Alerta de Automação */}
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] text-on-surface-variant leading-relaxed opacity-90">
                    <strong>Processamento Automático:</strong> Ao criar, o sistema gerará a Caixa de Entrada API no Chatwoot, criará a instância na Evolution API, configurará a criptografia e o pareamento das mensagens de forma invisível.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Configurando...
                      </>
                    ) : (
                      'Criar Conexão'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: QR CODE DE CONEXÃO */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md border border-white/10 rounded-[40px] p-10 bg-[#121215] shadow-2xl text-center relative overflow-hidden"
            >
              {/* Botão de Fechar */}
              <button
                type="button"
                onClick={closeQRModal}
                className="absolute top-6 right-8 p-2 rounded-full text-on-surface-variant hover:text-white hover:bg-white/5 transition-all z-10"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">Escaneie o QR Code</h2>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-60 mb-8">Abra o WhatsApp no celular e selecione Aparelhos Conectados</p>

              {/* QR Image Container */}
              <div className="w-64 h-64 mx-auto bg-white rounded-3xl p-4 flex items-center justify-center border border-white/10 shadow-inner relative">
                {activeQR ? (
                  <img src={activeQR} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-black" size={28} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-black/60 animate-pulse">
                      Obtendo QR Code...
                    </span>
                  </div>
                )}
              </div>

              {/* Polling Indicator */}
              <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-primary uppercase font-black tracking-widest animate-pulse">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Aguardando leitura do celular...
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeQRModal}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Fechar Modal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
