import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AutomationState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'loading';
  qrCode: string | null;
  instanceName: string | null;
  
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting' | 'loading') => void;
  setQrCode: (qr: string | null) => void;
  
  fetchConnectionStatus: (url: string, key: string, instance: string) => Promise<void>;
  fetchQRCode: (url: string, key: string, instance: string, friendlyName: string, unitId: string, type: 'whatsapp' | 'instagram') => Promise<void>;
  logout: (url: string, key: string, instance: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>()((set, get) => ({
  connectionStatus: 'loading',
  qrCode: null,
  instanceName: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setQrCode: (qr) => set({ qrCode: qr }),

  fetchConnectionStatus: async (_url, _key, instance) => {
    try {
      const response = await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/connectionState/${instance}`);
      const data = await response.json();
      set({ 
        connectionStatus: data.instance?.state === 'open' ? 'connected' : 'disconnected',
        instanceName: instance
      });
    } catch (error) {
      console.error('Error fetching connection status:', error);
      set({ connectionStatus: 'disconnected' });
    }
  },

  fetchQRCode: async (_url, _key, instance, friendlyName, unitId, type) => {
    const finalInstanceName = instance.toLowerCase().replace(/\s+/g, '_');
    set({ connectionStatus: 'connecting', instanceName: finalInstanceName, qrCode: null });
    
    try {
      const payload = {
        instanceName: finalInstanceName,
        token: finalInstanceName,
        qrcode: type === 'whatsapp',
        integration: type === 'whatsapp' ? 'WHATSAPP-BAILEYS' : 'INSTAGRAM'
      };

      console.log('Enviando payload para criação de instância:', payload);

      // 1. Criar a instância
      const createRes = await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Erro na criação: ${err}`);
      }

      // 2. Configurar Webhooks
      const webhookUrl = `https://api.mdrinformaticaecelulares.com.br/api/webhooks/evolution`;
      await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/webhook/set/${finalInstanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          events: ["MESSAGES_UPSERT"]
        })
      });

      // 3. Salvar Canal no Banco de Dados
      const { data: existingChannel } = await supabase
        .from('automation_channels')
        .select('id')
        .eq('instance_name', finalInstanceName)
        .single();
      
      if (!existingChannel) {
        await supabase.from('automation_channels').insert([{
          unit_id: unitId,
          name: friendlyName,
          type: type,
          instance_name: finalInstanceName,
          status: 'connecting'
        }]);
      }

      // 4. Obter QR Code (Apenas se for WhatsApp)
      if (type === 'whatsapp') {
        const response = await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/connect/${finalInstanceName}`);
        const data = await response.json();
        
        if (data.base64) {
          set({ qrCode: data.base64, connectionStatus: 'disconnected' });
        } else if (data.instance?.state === 'open') {
          set({ connectionStatus: 'connected', qrCode: null });
        }
      } else {
        set({ connectionStatus: 'disconnected' });
      }
    } catch (error: any) {
      console.error('Error in instance setup:', error);
      alert('Erro na conexão: ' + error.message);
      set({ connectionStatus: 'disconnected' });
    }
  },

  logout: async (_url, _key, instance) => {
    try {
      await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/logout/${instance}`, {
        method: 'DELETE'
      });
      set({ connectionStatus: 'disconnected', qrCode: null });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}));
