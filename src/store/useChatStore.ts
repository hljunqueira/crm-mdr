import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Channel {
  id: string;
  unit_id: string;
  name: string;
  type: 'whatsapp' | 'instagram';
  status: 'connected' | 'disconnected' | 'connecting';
  last_sync?: string;
}

export interface Conversation {
  id: string;
  channel_id: string;
  contact_name: string;
  contact_phone?: string;
  contact_avatar?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id?: string;
  text: string;
  type: 'text' | 'image' | 'audio' | 'video';
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

interface ChatState {
  channels: Channel[];
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  
  fetchChannels: (unitId: string) => Promise<void>;
  fetchConversations: (channelId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  subscribeToMessages: (conversationId: string) => () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  channels: [],
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,

  fetchChannels: async (unitId) => {
    console.log('[ChatStore] Fetching channels for unitId:', unitId);
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('automation_channels')
        .select('*')
        .eq('unit_id', unitId);
      
      if (error) {
        console.error('[ChatStore] Error fetching channels:', error);
        throw error;
      }
      
      console.log('[ChatStore] Channels received:', data);
      set({ channels: data || [] });
    } catch (error) {
      console.error('[ChatStore] Catch error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchConversations: async (channelId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('channel_id', channelId)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      set({ conversations: data || [] });
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      set({ messages: data || [] });
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  },

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation });
    if (conversation) {
      get().fetchMessages(conversation.id);
    } else {
      set({ messages: [] });
    }
  },

  sendMessage: async (conversationId, text) => {
    try {
      const newMessage = {
        conversation_id: conversationId,
        text,
        type: 'text' as const,
        direction: 'outbound' as const,
        status: 'sent' as const,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([newMessage])
        .select()
        .single();

      if (error) throw error;
      
      // Update local messages state
      set((state) => ({ messages: [...state.messages, data] }));
      
      // Update last message in conversation
      const { error: convErr } = await supabase
        .from('conversations')
        .update({ 
          last_message: text, 
          last_message_at: new Date().toISOString() 
        })
        .eq('id', conversationId);
        
      if (convErr) console.error('Error updating conversation last message:', convErr);

    } catch (error) {
      console.error('Error sending message:', error);
    }
  },

  subscribeToMessages: (conversationId) => {
    const channel = supabase
      .channel(`public:messages:conversation_id=eq.${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          set((state) => {
            // Check if message already exists (to avoid duplicates from local insert)
            if (state.messages.find(m => m.id === newMessage.id)) return state;
            return { messages: [...state.messages, newMessage] };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
