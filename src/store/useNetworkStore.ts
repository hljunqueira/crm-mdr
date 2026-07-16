import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NetworkState {
  isOfflineMode: boolean;
  isOnline: boolean;
  setOfflineMode: (value: boolean) => void;
  setOnlineStatus: (value: boolean) => void;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set) => ({
      isOfflineMode: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      setOfflineMode: (value) => set({ isOfflineMode: value }),
      setOnlineStatus: (value) => set({ isOnline: value }),
    }),
    {
      name: 'network-mode-storage',
      partialize: (state) => ({ isOfflineMode: state.isOfflineMode }),
    }
  )
);
