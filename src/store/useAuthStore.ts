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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const profile = profileData ? {
      ...profileData,
      unit_id: profileData.store_id // Mapear store_id para unit_id
    } : null;

    set({ session: data.session, user: data.user, profile });
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[AuthStore] Initializing session:', session?.user?.email);
    
    if (session) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      console.log('[AuthStore] Profile data from DB:', profileData);

      const profile = profileData ? {
        ...profileData,
        unit_id: profileData.store_id // Mapear store_id para unit_id
      } : null;

      console.log('[AuthStore] Final mapped profile:', profile);

      set({ session, user: session.user, profile, isLoading: false });
    } else {
      set({ session: null, user: null, profile: null, isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const profile = profileData ? {
          ...profileData,
          unit_id: profileData.store_id // Mapear store_id para unit_id
        } : null;

        set({ session, user: session.user, profile });
      } else {
        set({ session: null, user: null, profile: null });
      }
    });
  },
}));
