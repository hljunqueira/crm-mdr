import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AutomationState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'loading' | 'qrcode';
  qrCode: string | null;
  instanceName: string | null;

  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting' | 'loading' | 'qrcode') => void;
  setQrCode: (qr: string | null) => void;

  fetchConnectionStatus: (instance: string) => Promise<void>;
  fetchQRCode: (instance: string, friendlyName: string, unitId: string, type: 'whatsapp' | 'instagram') => Promise<void>;
  logout: (instance: string) => Promise<void>;
  deleteInstance: (instance: string) => Promise<void>;
}

const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

export const useAutomationStore = create<AutomationState>()((set, get) => ({
  connectionStatus: 'loading',
  qrCode: null,
  instanceName: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setQrCode: (qr) => set({ qrCode: qr }),

  fetchConnectionStatus: async (instance) => {
    try {
      const response = await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/connectionState/${instance}`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
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

  fetchQRCode: async (instance, friendlyName, unitId, type) => {
    const finalInstanceName = instance.toLowerCase().replace(/\s+/g, '_');
    set({ connectionStatus: 'connecting', instanceName: finalInstanceName, qrCode: null });

    try {
      // 1. Criar a instância
      const createRes = await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          instanceName: finalInstanceName,
          token: EVOLUTION_API_KEY,
          qrcode: true
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        if (!err.message?.includes('already exists')) {
          throw new Error(`Erro na criação: ${err.message || 'Erro desconhecido'}`);
        }
      }

      // 2. Configurar Webhooks para o n8n
      await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/webhook/set/${finalInstanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          url: `https://n8n.mdrinformaticaecelulares.com.br/webhook/crm-automation`,
          enabled: true,
          webhook_by_events: true,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
        })
      }).catch(err => console.warn('Erro ao setar webhook (não fatal):', err));

      // 4. Salvar no Supabase
      try {
        await supabase.from('automation_channels').upsert({
          unit_id: unitId,
          name: friendlyName,
          type: type,
          instance_name: finalInstanceName,
          status: 'connecting',
          updated_at: new Date().toISOString()
        }, { onConflict: 'instance_name' });
      } catch (dbErr) {
        console.warn('DB Error:', dbErr);
      }

      await new Promise(r => setTimeout(r, 5000));

      // 5. Buscar QR Code com polling
      if (type === 'whatsapp') {
        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          console.log(`Buscando QR Code... Tentativa ${attempts + 1}/${maxAttempts}`);
          const qrRes = await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/connect/${finalInstanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
          });
          const qrData = await qrRes.json();
          console.log('Resposta Evolution:', JSON.stringify(qrData, null, 2));

          const base64 = qrData.base64 || qrData.qrcode?.base64;
          const state = qrData.instance?.state || qrData.state || qrData.status;

          if (state === 'open') {
            // Persistir no banco que está conectado
            await supabase.from('automation_channels')
              .update({ status: 'connected' })
              .eq('instance_name', finalInstanceName);

            set({ connectionStatus: 'connected', qrCode: null });
            console.log('Conexão estabelecida com sucesso!');
            return;
          }

          if (base64) {
            set({ qrCode: base64, connectionStatus: 'qrcode' });
            // Se já temos o QR, não precisamos correr tanto no loop
            await new Promise(r => setTimeout(r, 2000));
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }

          attempts++;
        }

        throw new Error('O QR Code demorou muito para ser gerado. Tente atualizar a página.');
      } else {
        set({ connectionStatus: 'disconnected' });
      }
    } catch (error: any) {
      console.error('Error in instance setup:', error);
      alert('Erro: ' + error.message);
      set({ connectionStatus: 'disconnected' });
    }
  },

  logout: async (instance) => {
    try {
      await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/logout/${instance}`, {
        method: 'DELETE',
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      set({ connectionStatus: 'disconnected', qrCode: null });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  deleteInstance: async (instance) => {
    try {
      await fetch(`https://mdrinformaticaecelulares.com.br/api/evolution/instance/delete/${instance}`, {
        method: 'DELETE',
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
    } catch (error) {
      console.error('Error deleting instance:', error);
    }
  }
}));
