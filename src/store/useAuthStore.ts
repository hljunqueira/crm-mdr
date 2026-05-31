import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  unit_id: string | null;
  full_name: string;
  role: 'admin' | 'attendant' | 'technician';
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      
      let profile = null;
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profileError && profileData) {
          profile = {
            ...profileData,
            unit_id: profileData.store_id // Mapear store_id para unit_id
          };
        }
      } catch (profileErr) {
        console.error('Error fetching profile during sign in:', profileErr);
      }

      set({ session: data.session, user: data.user, profile });
      return { error: null };
    } catch (err) {
      console.error('Unexpected sign in error:', err);
      return { error: err };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AuthStore] Initializing session:', session?.user?.email);
      
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
              unit_id: profileData.store_id // Mapear store_id para unit_id
            };
          }
          console.log('[AuthStore] Profile data from DB:', profileData);
        } catch (profileErr) {
          console.error('[AuthStore] Error fetching profile during initialization:', profileErr);
        }

        console.log('[AuthStore] Final mapped profile:', profile);
        set({ session, user: session.user, profile, isLoading: false });
      } else {
        set({ session: null, user: null, profile: null, isLoading: false });
      }
    } catch (err) {
      console.error('[AuthStore] Initialization error:', err);
      set({ session: null, user: null, profile: null, isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthStore] onAuthStateChange event:', event);
      if (session) {
        // Defer user query using setTimeout to prevent Supabase JS deadlock
        setTimeout(async () => {
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
                unit_id: profileData.store_id // Mapear store_id para unit_id
              };
            }
          } catch (profileErr) {
            console.error('[AuthStore] Error fetching profile in onAuthStateChange:', profileErr);
          }

          set({ session, user: session.user, profile });
        }, 0);
      } else {
        set({ session: null, user: null, profile: null });
      }
    });
  },
}));
