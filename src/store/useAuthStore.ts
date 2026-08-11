import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  unit_id: string | null;
  full_name: string;
  role: 'admin' | 'attendant' | 'technician' | 'investor';
  avatar_url?: string | null;
  phone?: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  signIn: async (email, password) => {
    try {
      const { useNetworkStore } = await import('./useNetworkStore');
      const isOffline = useNetworkStore.getState().isOfflineMode;

      if (isOffline) {
        // Login Offline contra o SQLite Local
        const response = await fetch('http://localhost:3009/api/users/login-offline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
          const errorData = await response.json();
          return { error: new Error(errorData.error || 'Erro ao realizar login offline.') };
        }

        const { session, user, profile } = await response.json();

        localStorage.setItem('crm_offline_session', JSON.stringify({ session, user, profile }));
        set({ session, user, profile });
        return { error: null };
      }

      // Login Online normal
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.error || 'Erro ao realizar login.') };
      }

      const { session, user, profile } = await response.json();

      // Salva sessão localmente para inicialização offline imediata
      localStorage.setItem('crm_offline_session', JSON.stringify({ session, user, profile }));

      // Criptografa e salva as credenciais locais no SQLite para uso offline futuro
      try {
        await fetch('/api/users/cache-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: user.email, password })
        });
      } catch (cacheErr) {
        console.warn('[AuthStore] Erro ao salvar cache de credenciais local:', cacheErr);
      }

      if (session) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        }).catch(e => console.warn('[AuthStore] Error syncing supabase session:', e));
      }

      set({ session, user, profile });
      return { error: null };
    } catch (err: any) {
      console.error('Unexpected sign in error:', err);
      return { error: err };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Falha silenciosa ao deslogar da nuvem (offline):', e);
    }
    localStorage.removeItem('crm_offline_session');
    set({ session: null, user: null, profile: null });
  },

  initialize: async () => {
    try {
      // 1. Tentar restaurar sessão do localStorage (funciona offline-first instantaneamente)
      const cached = localStorage.getItem('crm_offline_session');
      if (cached) {
        const { session, user, profile } = JSON.parse(cached);
        console.log('[AuthStore] Restaurando sessão local offline:', user?.email);
        
        if (session) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          }).catch(e => console.warn('[AuthStore] Error syncing cached supabase session:', e));
        }

        set({ session, user, profile, isLoading: false });
        return;
      }

      // 2. Se não houver cache local, tenta buscar sessão do Supabase online
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        let profile = null;
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (!profileError && profileData) {
            profile = {
              ...profileData,
              unit_id: profileData.store_id
            };
          }
        } catch (profileErr) {
          console.error('[AuthStore] Error fetching profile during initialization:', profileErr);
        }

        // Cacheia a sessão obtida online
        localStorage.setItem('crm_offline_session', JSON.stringify({ session, user: session.user, profile }));
        set({ session, user: session.user, profile, isLoading: false });
      } else {
        set({ session: null, user: null, profile: null, isLoading: false });
      }
    } catch (err) {
      console.error('[AuthStore] Initialization error:', err);
      set({ session: null, user: null, profile: null, isLoading: false });
    }
  },
}));
