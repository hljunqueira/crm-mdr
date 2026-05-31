import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface UserPermission {
  id?: string;
  profile_id: string;
  page_name: string;
  visible: boolean;
  updated_at?: string;
}

interface PermissionState {
  userPermissions: UserPermission[];
  isLoading: boolean;
  fetchUserPermissions: () => Promise<void>;
  toggleUserPermission: (profileId: string, pageName: string, visible: boolean) => Promise<void>;
}

export const usePermissionStore = create<PermissionState>()((set, get) => ({
  userPermissions: [],
  isLoading: false,

  fetchUserPermissions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*');
      if (error) throw error;
      set({ userPermissions: data || [] });
    } catch (err) {
      console.error('Error fetching user permissions:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleUserPermission: async (profileId, pageName, visible) => {
    try {
      const existing = get().userPermissions.find(p => p.profile_id === profileId && p.page_name === pageName);
      
      const payload: Partial<UserPermission> = {
        profile_id: profileId,
        page_name: pageName,
        visible,
        updated_at: new Date().toISOString()
      };

      if (existing?.id) {
        payload.id = existing.id;
      }

      const { data, error } = await supabase
        .from('user_permissions')
        .upsert([payload], { onConflict: 'profile_id,page_name' })
        .select()
        .single();

      if (error) throw error;

      set(state => {
        const index = state.userPermissions.findIndex(p => p.profile_id === profileId && p.page_name === pageName);
        if (index > -1) {
          const nextPermissions = [...state.userPermissions];
          nextPermissions[index] = data;
          return { userPermissions: nextPermissions };
        } else {
          return { userPermissions: [data, ...state.userPermissions] };
        }
      });
    } catch (err) {
      console.error('Error toggling user permission:', err);
      throw err;
    }
  }
}));
