import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AutomationState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'loading';
  qrCode: string | null;
  instanceName: string | null;
  
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting' | 'loading') => void;
  setQrCode: (qr: string | null) => void;
  
  fetchConnectionStatus: (url: string, key: string, instance: string) => Promise<void>;
  fetchQRCode: (url: string, key: string, instance: string, friendlyName: string, unitId: string) => Promise<void>;
  logout: (url: string, key: string, instance: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>()((set, get) => ({
  connectionStatus: 'loading',
  qrCode: null,
  instanceName: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setQrCode: (qr) => set({ qrCode: qr }),

  fetchConnectionStatus: async (url, key, instance) => {
    try {
      const response = await fetch(`${url}/instance/connectionState/${instance}`, {
        headers: { 'apikey': key }
      });
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

  fetchQRCode: async (url, key, instance, friendlyName, unitId) => {
    set({ connectionStatus: 'connecting' });
    try {
      // 1. Criar a instância com Webhook configurado
      const webhookUrl = `https://api.mdrinformaticaecelulares.com.br/api/webhooks/evolution`;
      
      const createResponse = await fetch(`${url}/instance/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': key 
        },
        body: JSON.stringify({
          instanceName: instance,
          token: key,
          qrcode: true
        })
      });
      
      // 2. Configurar Webhooks
      await fetch(`${url}/webhook/set/${instance}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': key 
        },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          events: ["MESSAGES_UPSERT"]
        })
      });

      // 3. Salvar Canal no Banco de Dados se não existir
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('instance_name', instance)
        .single();

      if (!existingChannel) {
        await supabase.from('channels').insert([{
          unit_id: unitId,
          name: friendlyName,
          type: 'whatsapp',
          instance_name: instance,
          status: 'connecting'
        }]);
      }

      // 4. Obter QR Code
      const response = await fetch(`${url}/instance/connect/${instance}`, {
        headers: { 'apikey': key }
      });
      const data = await response.json();
      if (data.base64) {
        set({ qrCode: data.base64, connectionStatus: 'disconnected', instanceName: instance });
      }
    } catch (error) {
      console.error('Error in instance setup:', error);
      set({ connectionStatus: 'disconnected' });
    }
  },

  logout: async (url, key, instance) => {
    try {
      await fetch(`${url}/instance/logout/${instance}`, {
        method: 'DELETE',
        headers: { 'apikey': key }
      });
      set({ connectionStatus: 'disconnected', qrCode: null });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}));
