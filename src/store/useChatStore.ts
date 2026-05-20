import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Channel {
  id: string;
  unit_id: string;
  name: string;
  type: 'whatsapp' | 'instagram';
  status: 'connected' | 'disconnected' | 'connecting';
  instance_name: string;
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
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  media_url?: string;
  media_type?: 'image' | 'audio' | 'video' | 'document';
  created_at: string;
}

interface ChatState {
  channels: Channel[];
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  
  fetchChannels: (unitId?: string, role?: string) => Promise<void>;
  fetchConversations: (channelId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  sendMediaMessage: (conversationId: string, mediaUrl: string, mediaType: 'image' | 'audio' | 'video' | 'document', caption?: string) => Promise<void>;
  startNewConversation: (channelId: string, contactName: string, contactPhone: string) => Promise<void>;
  subscribeToMessages: (conversationId: string) => () => void;
  subscribeToConversations: (channelId: string, onUpdate: () => void) => () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  channels: [],
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,

  fetchChannels: async (unitId, role) => {
    set({ isLoading: true });
    try {
      let query = supabase.from('automation_channels').select('*');
      
      // Se não for admin e tiver unitId, filtra apenas canais da unidade do usuário
      if (role !== 'admin' && unitId) {
        query = query.eq('unit_id', unitId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      set({ channels: data || [] });
    } catch (error) {
      console.error('[ChatStore] Error fetching channels:', error);
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

  startNewConversation: async (channelId, contactName, contactPhone) => {
    set({ isLoading: true });
    try {
      // 1. Limpar telefone (remover caracteres não numéricos)
      const cleanPhone = contactPhone.replace(/\D/g, '');
      
      // 2. Verificar se já existe
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('channel_id', channelId)
        .eq('contact_phone', cleanPhone)
        .maybeSingle();

      if (existing) {
        get().setActiveConversation(existing);
        return;
      }

      // 3. Criar nova conversa
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert([{
          channel_id: channelId,
          contact_name: contactName,
          contact_phone: cleanPhone,
          unread_count: 0,
          last_message: 'Iniciando conversa...',
          last_message_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({ 
        conversations: [newConv, ...state.conversations],
        activeConversation: newConv,
        messages: []
      }));

    } catch (error) {
      console.error('Error starting new conversation:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationId, text) => {
    const conv = get().conversations.find(c => c.id === conversationId);
    const channel = get().channels.find(c => c.id === conv?.channel_id);
    
    if (!conv || !channel) return;

    try {
      // 1. Salvar localmente no Supabase
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
      set((state) => ({ messages: [...state.messages, data] }));

      // 2. Disparar via endpoint seguro do servidor (sem API key no frontend)
      const instance = channel.instance_name;
      const remoteJid = conv.contact_phone?.includes('@') 
        ? conv.contact_phone 
        : `${conv.contact_phone}@s.whatsapp.net`;

      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: instance,
          remoteJid: remoteJid,
          text: text
        })
      });

      // 3. Atualizar última mensagem
      await supabase
        .from('conversations')
        .update({ 
          last_message: text, 
          last_message_at: new Date().toISOString() 
        })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
    }
  },

  sendMediaMessage: async (conversationId, mediaUrl, mediaType, caption) => {
    const conv = get().conversations.find(c => c.id === conversationId);
    const channel = get().channels.find(c => c.id === conv?.channel_id);
    
    if (!conv || !channel) return;

    try {
      // 1. Salvar localmente no Supabase
      const newMessage = {
        conversation_id: conversationId,
        text: caption || `[Mídia: ${mediaType}]`,
        type: mediaType,
        direction: 'outbound' as const,
        status: 'sent' as const,
        media_url: mediaUrl,
        media_type: mediaType,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([newMessage])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ messages: [...state.messages, data] }));

      // 2. Disparar via endpoint seguro do servidor (sem API key no frontend)
      const instance = channel.instance_name;
      const remoteJid = conv.contact_phone?.includes('@') 
        ? conv.contact_phone 
        : `${conv.contact_phone}@s.whatsapp.net`;

      await fetch('/api/chat/send-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: instance,
          remoteJid: remoteJid,
          mediaUrl: mediaUrl,
          mediaType: mediaType,
          caption: caption
        })
      });

      // 3. Atualizar última mensagem
      await supabase
        .from('conversations')
        .update({ 
          last_message: caption || `📷 Foto`, 
          last_message_at: new Date().toISOString() 
        })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending media message:', error);
    }
  },

  subscribeToMessages: (conversationId) => {
    // Polling fallback to guarantee updates even without Supabase Realtime replication
    const pollInterval = setInterval(() => {
      get().fetchMessages(conversationId);
    }, 5000);

    const channel = supabase
      .channel(`public:messages:conversation_id=eq.${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            set((state) => {
              if (state.messages.some(m => m.id === newMessage.id)) return state;
              return { messages: [...state.messages, newMessage] };
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as Message;
            set((state) => ({
              messages: state.messages.map(m => m.id === updatedMessage.id ? updatedMessage : m)
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            set((state) => ({
              messages: state.messages.filter(m => m.id !== deletedId)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  },

  subscribeToConversations: (channelId, onUpdate) => {
    // Polling fallback to guarantee updates even without Supabase Realtime replication
    const pollInterval = setInterval(() => {
      onUpdate();
    }, 5000);

    const channel = supabase
      .channel(`public:conversations:channel_id=eq.${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  },
}));
