import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface ChannelStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'loading' | 'qrcode';
  qrCode: string | null;
  instanceName: string;
}

interface AutomationState {
  channelStatuses: Record<string, ChannelStatus>;
  
  setChannelStatus: (instance: string, status: Partial<ChannelStatus>) => void;
  syncAllChannels: () => Promise<void>;
  fetchConnectionStatus: (instance: string) => Promise<void>;
  fetchQRCode: (instance: string, friendlyName: string, unitId: string | null, type: 'whatsapp' | 'instagram', credentials?: { user?: string; pass?: string }, onCreated?: () => void) => Promise<void>;
  logout: (instance: string) => Promise<void>;
  deleteInstance: (instance: string) => Promise<void>;
  subscribeToChannels: (onUpdate: () => void) => () => void;
}

export const useAutomationStore = create<AutomationState>()((set, get) => ({
  channelStatuses: {},

  setChannelStatus: (instance, status) => set((state) => ({
    channelStatuses: {
      ...state.channelStatuses,
      [instance]: { 
        ...(state.channelStatuses[instance] || { status: 'loading', qrCode: null, instanceName: instance }), 
        ...status 
      }
    }
  })),

  syncAllChannels: async () => {
    try {
      const { data: channels } = await supabase.from('automation_channels').select('*');
      if (channels) {
        for (const channel of channels) {
          get().fetchConnectionStatus(channel.instance_name);
        }
      }
    } catch (error) {
      console.error('Error syncing channels:', error);
    }
  },

  fetchConnectionStatus: async (instance) => {
    get().setChannelStatus(instance, { status: 'loading' });
    try {
      const response = await fetch(`/api/evolution/instance/connectionState/${instance}`);
      const data = await response.json();
      const isConnected = data.instance?.state === 'open' || data.state === 'open';
      
      get().setChannelStatus(instance, { 
        status: isConnected ? 'connected' : 'disconnected',
        instanceName: instance
      });

      // Se conectou agora, atualiza no banco
      if (isConnected) {
        await supabase.from('automation_channels')
          .update({ status: 'connected' })
          .eq('instance_name', instance);
      }
    } catch (error) {
      console.error('Error fetching connection status:', error, instance);
      get().setChannelStatus(instance, { status: 'disconnected' });
    }
  },

  fetchQRCode: async (instance, friendlyName, unitId, type, credentials, onCreated) => {
    const finalInstanceName = instance.toLowerCase().replace(/\s+/g, '_');
    get().setChannelStatus(finalInstanceName, { status: 'connecting', qrCode: null });

    try {
      // 1. Criar a instância
      const createRes = await fetch(`/api/evolution/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: finalInstanceName,
          token: finalInstanceName,
          qrcode: type === 'whatsapp',
          integration: type === 'whatsapp' ? 'WHATSAPP-BAILEYS' : 'instagram'
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        if (!err.message?.includes('already exists')) {
          throw new Error(`Erro na criação: ${err.message || 'Erro desconhecido'}`);
        }
      }

      // 2. Se for Instagram e tiver credenciais, conectar agora
      if (type === 'instagram' && credentials?.user && credentials?.pass) {
        await fetch(`/api/evolution/instance/connect/${finalInstanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: credentials.user,
            password: credentials.pass
          })
        }).catch(err => console.warn('Erro ao conectar Instagram:', err));
      }

      // 3. Configurar Webhooks para o App Interno
      await fetch(`/api/evolution/webhook/set/${finalInstanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: {
            url: `http://app:3000/api/webhooks/evolution`,
            enabled: true,
            webhookByEvents: true,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
          }
        })
      }).catch(err => console.warn('Erro ao setar webhook (não fatal):', err));

      // 4. Salvar no Supabase (Unidade opcional agora)
      try {
        await supabase.from('automation_channels').upsert({
          unit_id: unitId || null,
          name: friendlyName,
          type: type,
          instance_name: finalInstanceName,
          status: 'connecting',
          updated_at: new Date().toISOString()
        }, { onConflict: 'instance_name' });
        
        // Avisar a UI que já pode carregar o card
        if (onCreated) onCreated();
      } catch (dbErr) {
        console.warn('DB Error:', dbErr);
      }

      await new Promise(r => setTimeout(r, 2000));

      // 5. Buscar QR Code com polling
      if (type === 'whatsapp') {
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
          const qrRes = await fetch(`/api/evolution/instance/connect/${finalInstanceName}`);
          const qrData = await qrRes.json();
          
          const base64 = qrData.base64 || qrData.qrcode?.base64;
          const state = qrData.instance?.state || qrData.state || qrData.status;

          if (state === 'open') {
            await supabase.from('automation_channels')
              .update({ status: 'connected' })
              .eq('instance_name', finalInstanceName);

            get().setChannelStatus(finalInstanceName, { status: 'connected', qrCode: null });
            return;
          }

          if (base64) {
            get().setChannelStatus(finalInstanceName, { qrCode: base64, status: 'qrcode' });
          }
          
          await new Promise(r => setTimeout(r, 2000));
          attempts++;
        }
        throw new Error('O QR Code demorou muito. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Error in instance setup:', error);
      get().setChannelStatus(instance, { status: 'disconnected' });
    }
  },

  logout: async (instance) => {
    try {
      await fetch(`/api/evolution/instance/logout/${instance}`, {
        method: 'DELETE'
      });
      get().setChannelStatus(instance, { status: 'disconnected', qrCode: null });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  deleteInstance: async (instance) => {
    try {
      await fetch(`/api/evolution/instance/delete/${instance}`, {
        method: 'DELETE'
      });
      set((state) => {
        const newStatuses = { ...state.channelStatuses };
        delete newStatuses[instance];
        return { channelStatuses: newStatuses };
      });
    } catch (error) {
      console.error('Error deleting instance:', error);
    }
  },

  subscribeToChannels: (onUpdate) => {
    const channel = supabase
      .channel('automation_channels_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'automation_channels' },
        (payload) => {
          console.log('[AutomationStore] Realtime update:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}));
