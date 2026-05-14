import { create } from 'zustand';

interface AutomationState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'loading';
  qrCode: string | null;
  instanceName: string | null;
  
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting' | 'loading') => void;
  setQrCode: (qr: string | null) => void;
  
  fetchConnectionStatus: (url: string, key: string, instance: string) => Promise<void>;
  fetchQRCode: (url: string, key: string, instance: string) => Promise<void>;
  logout: (url: string, key: string, instance: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>()((set) => ({
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
        connectionStatus: data.instance.state === 'open' ? 'connected' : 'disconnected',
        instanceName: instance
      });
    } catch (error) {
      console.error('Error fetching connection status:', error);
      set({ connectionStatus: 'disconnected' });
    }
  },

  fetchQRCode: async (url, key, instance) => {
    set({ connectionStatus: 'connecting' });
    try {
      const response = await fetch(`${url}/instance/connect/${instance}`, {
        headers: { 'apikey': key }
      });
      const data = await response.json();
      if (data.base64) {
        set({ qrCode: data.base64, connectionStatus: 'disconnected' });
      }
    } catch (error) {
      console.error('Error fetching QR Code:', error);
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
