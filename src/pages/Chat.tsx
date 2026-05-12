import { useState, useEffect, useRef } from 'react';
import { 
  Search, Send, Paperclip, Smile, MoreVertical, 
  MessageCircle, Instagram, CheckCheck, Plus, 
  ChevronLeft, Loader2 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useChatStore, Conversation, Message } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

export default function Chat() {
  const { 
    channels, conversations, activeConversation, messages, isLoading,
    fetchChannels, fetchConversations, fetchMessages, setActiveConversation, 
    sendMessage, subscribeToMessages 
  } = useChatStore();
  const { profile } = useAuthStore();
  
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inicializar canais
  useEffect(() => {
    if (profile?.unit_id) {
      fetchChannels(profile.unit_id);
    }
  }, [profile?.unit_id, fetchChannels]);

  // Auto-selecionar primeiro canal
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  // Carregar conversas quando o canal muda
  useEffect(() => {
    if (selectedChannelId) {
      fetchConversations(selectedChannelId);
    }
  }, [selectedChannelId, fetchConversations]);

  // Increver em novas mensagens
  useEffect(() => {
    if (activeConversation) {
      const unsubscribe = subscribeToMessages(activeConversation.id);
      return () => unsubscribe();
    }
  }, [activeConversation, subscribeToMessages]);

  // Scroll para o fim das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const text = inputText;
    setInputText('');
    await sendMessage(activeConversation.id, text);
  };

  const activeChannel = channels.find(c => c.id === selectedChannelId);

  return (
    <div className="flex h-full overflow-hidden bg-surface">
      {/* Sidebar: Channels & Conversations */}
      <div className="w-[380px] border-r border-outline-variant flex flex-col shrink-0 bg-surface">
        {/* Header: Channel Selector */}
        <div className="p-4 border-b border-outline-variant space-y-4 bg-surface-container-low/50">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-on-surface uppercase tracking-tight text-xl">Mensagens</h2>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {channels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id)}
                  title={channel.name}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    selectedChannelId === channel.id 
                      ? "bg-white text-black shadow-lg" 
                      : "text-on-surface-variant hover:text-white"
                  )}
                >
                  {channel.type === 'whatsapp' ? <MessageCircle size={16} /> : <Instagram size={16} />}
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-outline-variant rounded-2xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-white transition-all font-display"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-40">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Carregando Conversas...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-40 text-center px-8">
              <MessageCircle size={40} className="mb-2" />
              <p className="text-xs font-bold uppercase tracking-tight">Nenhuma conversa encontrada neste canal.</p>
            </div>
          ) : (
            conversations
              .filter(c => c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((conv) => (
              <div 
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={cn(
                  "p-5 flex gap-4 cursor-pointer transition-all border-b border-outline-variant/10 relative group hover:bg-white/[0.02]",
                  activeConversation?.id === conv.id ? "bg-white/[0.05] border-l-4 border-l-white" : ""
                )}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-outline-variant overflow-hidden flex items-center justify-center text-xl font-black uppercase">
                    {conv.contact_avatar ? (
                      <img src={conv.contact_avatar} alt={conv.contact_name} className="w-full h-full object-cover" />
                    ) : (
                      conv.contact_name.charAt(0)
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-surface p-1 rounded-lg border border-outline-variant shadow-lg">
                    {activeChannel?.type === 'whatsapp' ? (
                      <MessageCircle size={10} className="text-[#25D366]" />
                    ) : (
                      <Instagram size={10} className="text-[#E4405F]" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={cn(
                      "font-black text-sm truncate uppercase tracking-tight",
                      conv.unread_count > 0 ? "text-white" : "text-on-surface"
                    )}>{conv.contact_name}</h3>
                    <span className="text-[9px] text-on-surface-variant font-bold uppercase">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className={cn(
                    "text-xs truncate font-display",
                    conv.unread_count > 0 ? "text-white font-bold" : "text-on-surface-variant"
                  )}>
                    {conv.last_message || 'Inicie uma conversa'}
                  </p>
                </div>

                {conv.unread_count > 0 && (
                  <div className="absolute right-5 bottom-6 bg-white text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-lg font-black shadow-xl">
                    {conv.unread_count}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-surface relative">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-20 flex items-center justify-between px-8 border-b border-outline-variant bg-surface/80 backdrop-blur-xl z-20 sticky top-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-outline-variant overflow-hidden flex items-center justify-center text-lg font-black uppercase">
                  {activeConversation.contact_avatar ? (
                    <img src={activeConversation.contact_avatar} alt={activeConversation.contact_name} className="w-full h-full object-cover" />
                  ) : (
                    activeConversation.contact_name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-black text-on-surface text-base uppercase tracking-tight">{activeConversation.contact_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest opacity-60">
                      Disponível via {activeChannel?.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-3 hover:bg-white/5 rounded-2xl text-on-surface-variant hover:text-white transition-all border border-transparent hover:border-white/10">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
              <div className="flex justify-center mb-8">
                <span className="bg-white/5 border border-white/10 backdrop-blur-md px-6 py-1.5 rounded-full text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Sessão de Atendimento Iniciada</span>
              </div>

              {messages.map((msg, i) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col gap-1 max-w-[80%]",
                    msg.direction === 'outbound' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-3xl text-sm leading-relaxed shadow-2xl relative group transition-all",
                    msg.direction === 'outbound' 
                      ? "bg-white text-black rounded-tr-none" 
                      : "bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-tl-none"
                  )}>
                    <p>{msg.text}</p>
                    <div className={cn(
                      "flex items-center gap-1.5 mt-2 opacity-40 text-[9px] font-black uppercase tracking-tighter",
                      msg.direction === 'outbound' ? "justify-end" : "justify-start"
                    )}>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.direction === 'outbound' && (
                        <CheckCheck size={12} className={cn(msg.status === 'read' ? "text-primary" : "")} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-surface border-t border-outline-variant">
              <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex items-end gap-4 glass-card p-3 border border-outline-variant/40 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-white/[0.02]">
                <button type="button" className="p-3 hover:bg-white/5 rounded-2xl text-on-surface-variant transition-all hover:text-white">
                  <Smile size={22} />
                </button>
                <button type="button" className="p-3 hover:bg-white/5 rounded-2xl text-on-surface-variant transition-all hover:text-white">
                  <Paperclip size={22} />
                </button>
                <textarea 
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Escreva sua resposta..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-display py-3 resize-none max-h-40 text-on-surface placeholder:opacity-30"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-white text-black p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 disabled:opacity-50 disabled:scale-100"
                >
                  <Send size={22} />
                </button>
              </form>
              <div className="flex items-center justify-center gap-4 mt-4 opacity-30">
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">Criptografia de Ponta-a-Ponta Ativa</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 gap-8">
            <div className="relative">
              <div className="w-32 h-32 bg-white/5 rounded-[40px] flex items-center justify-center border border-white/10 shadow-inner relative z-10">
                <MessageCircle size={48} className="text-white opacity-20" />
              </div>
              <div className="absolute inset-0 bg-white/5 blur-[80px] -z-10 rounded-full animate-pulse"></div>
            </div>
            <div className="space-y-3 max-w-sm">
              <h3 className="text-2xl font-black text-on-surface uppercase tracking-tight italic">Selecione uma Conversa</h3>
              <p className="text-sm text-on-surface-variant font-display leading-relaxed opacity-60 uppercase tracking-widest text-[10px]">
                Escolha um contato ao lado para iniciar o atendimento multi-canal via {activeChannel?.name || 'seu canal'}.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="px-6 py-2 bg-white/5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">4 Canais Online</div>
              <div className="px-6 py-2 bg-white/5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Sincronização Ativa</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
