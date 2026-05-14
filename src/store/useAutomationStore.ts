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

  fetchConnectionStatus: async (url, key, instance) => {
    const apiUrl = url || 'https://whatsapp.mdrinformaticaecelulares.com.br';
    const apiKey = key || 'MDR_SECRET_TOKEN_2024';

    try {
      const response = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
        headers: { 'apikey': apiKey }
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

  fetchQRCode: async (url, key, instance, friendlyName, unitId, type) => {
    const apiUrl = (url || 'https://whatsapp.mdrinformaticaecelulares.com.br').replace(/\/$/, '');
    const apiKey = key || 'MDR_SECRET_TOKEN_2024';
    const finalInstanceName = instance.toLowerCase().replace(/\s+/g, '_');

    set({ connectionStatus: 'connecting', instanceName: finalInstanceName, qrCode: null });
    
    try {
      console.log(`Starting connection for ${finalInstanceName} at ${apiUrl}`);
      
      // 1. Criar a instância
      const createRes = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': apiKey 
        },
        body: JSON.stringify({
          instanceName: finalInstanceName,
          token: apiKey,
          qrcode: type === 'whatsapp'
        })
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        console.warn('Instance creation notice:', errData.message);
        // Prosseguimos mesmo se já existir
      }

      // 2. Configurar Webhooks
      const webhookUrl = `https://api.mdrinformaticaecelulares.com.br/api/webhooks/evolution`;
      await fetch(`${apiUrl}/webhook/set/${finalInstanceName}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': apiKey 
        },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          events: ["MESSAGES_UPSERT"]
        })
      });

      // 3. Salvar Canal no Banco de Dados
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('instance_name', finalInstanceName)
        .single();

      if (!existingChannel) {
        await supabase.from('channels').insert([{
          unit_id: unitId,
          name: friendlyName,
          type: type,
          instance_name: finalInstanceName,
          status: 'connecting'
        }]);
      }

      // 4. Obter QR Code (Apenas se for WhatsApp)
      if (type === 'whatsapp') {
        const response = await fetch(`${apiUrl}/instance/connect/${finalInstanceName}`, {
          headers: { 'apikey': apiKey }
        });
        const data = await response.json();
        
        if (data.base64) {
          set({ qrCode: data.base64, connectionStatus: 'disconnected' });
        } else if (data.instance?.state === 'open') {
          set({ connectionStatus: 'connected', qrCode: null });
        }
      } else {
        // Fluxo Instagram (Geralmente login direto no Manager por enquanto)
        set({ connectionStatus: 'disconnected' });
      }
    } catch (error) {
      console.error('Error in instance setup:', error);
      set({ connectionStatus: 'disconnected' });
    }
  },

  logout: async (url, key, instance) => {
    const apiUrl = url || 'https://whatsapp.mdrinformaticaecelulares.com.br';
    const apiKey = key || 'MDR_SECRET_TOKEN_2024';

    try {
      await fetch(`${apiUrl}/instance/logout/${instance}`, {
        method: 'DELETE',
        headers: { 'apikey': apiKey }
      });
      set({ connectionStatus: 'disconnected', qrCode: null });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}));
