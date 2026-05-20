import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Send, Paperclip, Smile, MoreVertical, 
  MessageCircle, Instagram, CheckCheck, Plus, 
  Loader2, Sparkles, Bot, FileText, Check, Image as ImageIcon,
  User, ShieldAlert, ArrowLeft
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useChatStore, Conversation, Message } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import EmojiPicker from '../components/chat/EmojiPicker';
import ImageLightbox from '../components/chat/ImageLightbox';
import AISettingsModal from '../components/chat/AISettingsModal';

export default function Chat() {
  const { 
    channels, conversations, activeConversation, messages, isLoading,
    fetchChannels, fetchConversations, fetchMessages, setActiveConversation, 
    sendMessage, sendMediaMessage, subscribeToMessages, startNewConversation, subscribeToConversations 
  } = useChatStore();
  const { profile } = useAuthStore();
  
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatPhone, setNewChatPhone] = useState('');

  // AI & Media Popups
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Inicializar canais
  useEffect(() => {
    if (profile) {
      fetchChannels(profile.unit_id, profile.role);
    }
  }, [fetchChannels, profile]);

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
      
      const unsubscribe = subscribeToConversations(selectedChannelId, () => {
        fetchConversations(selectedChannelId);
      });
      return () => unsubscribe();
    }
  }, [selectedChannelId, fetchConversations, subscribeToConversations]);

  // Inscrever em novas mensagens
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

  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || !newChatName || !newChatPhone) return;

    await startNewConversation(selectedChannelId, newChatName, newChatPhone);
    setShowNewChatModal(false);
    setNewChatName('');
    setNewChatPhone('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const text = inputText;
    setInputText('');
    setShowEmojiPicker(false);
    await sendMessage(activeConversation.id, text);
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    setIsUploadingMedia(true);
    try {
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      const { data, error } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(filePath);

      let mediaType: 'image' | 'audio' | 'video' | 'document' = 'document';
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt.toLowerCase())) {
        mediaType = 'image';
      } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt.toLowerCase())) {
        mediaType = 'audio';
      } else if (['mp4', 'mov', 'avi', 'webm'].includes(fileExt.toLowerCase())) {
        mediaType = 'video';
      }

      await sendMediaMessage(activeConversation.id, publicUrl, mediaType, file.name);
    } catch (err: any) {
      console.error('Erro ao fazer upload de mídia:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Auxiliar para agrupar mensagens por data
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    msgs.forEach(msg => {
      const date = new Date(msg.created_at);
      const dateStr = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      
      const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

      let key = dateStr;
      if (dateStr === today) key = 'Hoje';
      else if (dateStr === yesterdayStr) key = 'Ontem';

      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return groups;
  };

  const activeChannel = channels.find(c => c.id === selectedChannelId);
  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex h-full overflow-hidden bg-[#0c0c0e] text-on-surface">
      {/* Sidebar: Channels & Conversations */}
      <div className="w-[360px] md:w-[380px] border-r border-white/5 flex flex-col shrink-0 bg-[#121215] relative z-10">
        
        {/* Header & Channel selection */}
        <div className="p-4 space-y-4 bg-[#141418] border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="font-display font-black text-white uppercase tracking-tight text-xl flex items-center gap-2">
                Atendimento
              </h2>
              {profile?.role === 'admin' && (
                <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 mt-1 font-black w-max tracking-widest uppercase">
                  Todas as Unidades
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-black hover:scale-105 active:scale-95 transition-all border border-primary/20"
                title="Nova Conversa"
              >
                <Plus size={16} />
              </button>
              
              {/* Channel switcher inline tabs */}
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {channels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannelId(channel.id);
                      setActiveConversation(null);
                    }}
                    title={channel.name}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      selectedChannelId === channel.id 
                        ? "bg-primary text-black shadow-lg" 
                        : "text-on-surface-variant hover:text-white"
                    )}
                  >
                    {channel.type === 'whatsapp' ? <MessageCircle size={15} /> : <Instagram size={15} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Pesquisar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-4 py-3 text-xs focus:outline-none focus:border-white transition-all font-display placeholder:opacity-50 text-white"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-40">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Carregando Conversas...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-40 text-center px-8">
              <MessageCircle size={36} className="mb-2 text-primary" />
              <p className="text-xs font-bold uppercase tracking-tight text-white">Nenhum chat neste canal</p>
              <p className="text-[10px] opacity-70">Clique no botão "+" acima para iniciar um novo atendimento.</p>
            </div>
          ) : (
            conversations
              .filter(c => c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((conv) => (
                <div 
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={cn(
                    "p-4 flex gap-4 cursor-pointer transition-all border-b border-white/[0.03] relative group",
                    activeConversation?.id === conv.id 
                      ? "bg-white/[0.04] border-l-4 border-l-primary" 
                      : "hover:bg-white/[0.01]"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary/10 to-primary/30 border border-white/10 overflow-hidden flex items-center justify-center text-sm font-black text-white uppercase shadow-inner">
                      {conv.contact_avatar ? (
                        <img src={conv.contact_avatar} alt={conv.contact_name} className="w-full h-full object-cover" />
                      ) : (
                        conv.contact_name.charAt(0)
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#121215] p-1 rounded-lg border border-white/5 shadow-lg">
                      {activeChannel?.type === 'whatsapp' ? (
                        <MessageCircle size={10} className="text-emerald-500" />
                      ) : (
                        <Instagram size={10} className="text-pink-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={cn(
                        "font-black text-xs truncate uppercase tracking-tight",
                        conv.unread_count > 0 ? "text-primary font-black" : "text-white"
                      )}>{conv.contact_name}</h3>
                      <span className="text-[8px] text-on-surface-variant font-bold uppercase opacity-60">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className={cn(
                      "text-[11px] truncate font-display",
                      conv.unread_count > 0 ? "text-white font-bold" : "text-on-surface-variant opacity-75"
                    )}>
                      {conv.last_message || 'Inicie uma conversa'}
                    </p>
                  </div>

                  {conv.unread_count > 0 && (
                    <div className="absolute right-4 bottom-4 bg-primary text-black text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-lg font-black shadow-lg animate-bounce">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0e0e11] relative">
        {activeConversation ? (
          <>
            {/* Active Chat Header */}
            <div className="h-20 flex items-center justify-between px-6 md:px-8 border-b border-white/5 bg-[#121215]/80 backdrop-blur-xl z-20 sticky top-0">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary/10 to-primary/30 border border-white/10 overflow-hidden flex items-center justify-center text-sm font-black text-white uppercase">
                  {activeConversation.contact_avatar ? (
                    <img src={activeConversation.contact_avatar} alt={activeConversation.contact_name} className="w-full h-full object-cover" />
                  ) : (
                    activeConversation.contact_name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-black text-white text-sm md:text-base uppercase tracking-tight">{activeConversation.contact_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse"></span>
                    <span className="text-[9px] text-on-surface-variant uppercase font-black tracking-widest opacity-60">
                      Conectado via {activeChannel?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: AI & settings */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAISettings(true)}
                  className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                  title="Configurar IA"
                >
                  <Sparkles size={14} className="animate-spin duration-3000" />
                  <span className="text-[9px] font-black uppercase tracking-wider hidden md:inline">Auto-IA</span>
                </button>
              </div>
            </div>

            {/* Messages Area with premium backdrop */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-[radial-gradient(#1c1c24_1px,transparent_1px)] [background-size:16px_16px] bg-[#0c0c0f]">
              <div className="flex justify-center mb-8">
                <span className="bg-white/5 border border-white/5 backdrop-blur-md px-5 py-1.5 rounded-full text-[8px] font-black text-on-surface-variant uppercase tracking-[0.2em] shadow-lg">
                  Atendimento Criptografado & Ativo
                </span>
              </div>

              {Object.entries(messageGroups).map(([date, msgs]) => (
                <div key={date} className="space-y-4">
                  {/* Date Divider */}
                  <div className="flex justify-center my-4">
                    <span className="bg-white/5 border border-white/10 backdrop-blur-sm px-4 py-1 rounded-xl text-[9px] font-black text-on-surface-variant uppercase tracking-wider">
                      {date}
                    </span>
                  </div>

                  {msgs.map((msg, index) => {
                    const isOutbound = msg.direction === 'outbound';
                    const isAI = msg.sender_id === 'ai';
                    
                    return (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex flex-col gap-1 max-w-[75%]",
                          isOutbound ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        {/* Bubble container */}
                        <div className={cn(
                          "p-3.5 rounded-2xl text-xs leading-relaxed shadow-xl relative transition-all duration-150 animate-in slide-in-from-bottom-2",
                          isOutbound
                            ? isAI 
                              ? "bg-gradient-to-tr from-purple-600/90 to-indigo-600/90 text-white rounded-tr-none border border-purple-500/20"
                              : "bg-white text-black rounded-tr-none shadow-white/5"
                            : "bg-[#16161c] border border-white/[0.04] text-white rounded-tl-none shadow-black/5"
                        )}>
                          
                          {/* AI Robot Label */}
                          {isAI && (
                            <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-purple-200 mb-1">
                              <Bot size={10} />
                              <span>Assistente MDR</span>
                            </div>
                          )}

                          {/* Media message styling */}
                          {msg.type === 'image' && msg.media_url ? (
                            <div 
                              className="relative rounded-lg overflow-hidden cursor-zoom-in group mb-2 border border-white/5 bg-white/5"
                              onClick={() => setLightboxImage({ src: msg.media_url!, alt: msg.text })}
                            >
                              <img src={msg.media_url} alt="Imagem recebida" className="max-w-xs max-h-48 object-cover rounded-lg group-hover:scale-102 transition-transform duration-200" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white bg-black/60 px-3 py-1 rounded-full">Zoom</span>
                              </div>
                            </div>
                          ) : msg.type === 'document' && msg.media_url ? (
                            <a 
                              href={msg.media_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-3 p-2 rounded-xl bg-black/30 border border-white/5 hover:bg-black/45 transition-colors mb-2 text-white"
                            >
                              <div className="p-2.5 bg-primary/20 text-primary rounded-lg">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold truncate">{msg.text || 'Documento'}</p>
                                <span className="text-[8px] opacity-40 uppercase tracking-widest font-black">Visualizar</span>
                              </div>
                            </a>
                          ) : msg.type === 'audio' && msg.media_url ? (
                            <div className="mb-2">
                              <audio src={msg.media_url} controls className="max-w-[240px] md:max-w-[280px]" />
                            </div>
                          ) : null}

                          {/* Message content (only if not a caption-less media) */}
                          {(!msg.media_url || msg.type === 'image' || msg.text !== `[Mídia: ${msg.type}]`) && (
                            <p className="whitespace-pre-line font-display">{msg.text}</p>
                          )}

                          {/* Status and Time info */}
                          <div className={cn(
                            "flex items-center gap-1 mt-1.5 text-[8px] font-black uppercase tracking-wider select-none",
                            isOutbound 
                              ? isAI ? "text-purple-200 justify-end" : "text-black/50 justify-end"
                              : "text-on-surface-variant opacity-50 justify-start"
                          )}>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOutbound && (
                              <CheckCheck size={11} className={cn(msg.status === 'read' ? "text-primary" : "")} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 md:p-6 bg-[#121215] border-t border-white/5 relative">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <EmojiPicker 
                  onSelect={handleSelectEmoji} 
                  onClose={() => setShowEmojiPicker(false)} 
                />
              )}

              {/* Upload media input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleMediaUpload}
                className="hidden" 
              />

              <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex items-end gap-3 bg-white/[0.02] border border-white/5 rounded-3xl p-2 relative">
                
                {/* Emoji button */}
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "p-3 rounded-2xl text-on-surface-variant transition-all hover:bg-white/5 hover:text-white",
                    showEmojiPicker ? "text-primary bg-primary/10" : ""
                  )}
                >
                  <Smile size={20} />
                </button>

                {/* Paperclip upload button */}
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia}
                  className="p-3 rounded-2xl text-on-surface-variant transition-all hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  {isUploadingMedia ? <Loader2 className="animate-spin text-primary" size={20} /> : <Paperclip size={20} />}
                </button>

                {/* Main Textarea */}
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
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-xs py-3 resize-none max-h-32 text-white placeholder:opacity-30 outline-none"
                />

                {/* Send Button */}
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-primary text-black p-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                >
                  <Send size={18} />
                </button>
              </form>
              
              <div className="flex items-center justify-center gap-4 mt-3 opacity-25">
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">Criptografia ponta-a-ponta • MDR Informática</span>
              </div>
            </div>
          </>
        ) : (
          /* Empty Chat Area Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 md:p-20 gap-8 bg-[#0c0c0f]">
            <div className="relative">
              <div className="w-28 h-28 bg-[#121215] rounded-[36px] flex items-center justify-center border border-white/5 shadow-2xl relative z-10">
                <MessageCircle size={40} className="text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 bg-primary/5 blur-[80px] -z-10 rounded-full"></div>
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight italic">Selecione uma Conversa</h3>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-relaxed opacity-60">
                Selecione ou inicie uma conversa para fazer o gerenciamento de chat multi-canal de forma instantânea.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
              <div className="px-5 py-2 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                {channels.length} {channels.length === 1 ? 'Canal' : 'Canais'} Ativos
              </div>
              <div className="px-5 py-2 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                {channels.some(c => c.status === 'connected') ? 'Supabase Realtime Ativo' : 'Offline'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: NOVO CHAT */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-container-high p-8 rounded-[36px] border border-white/10 shadow-2xl relative">
            <button 
              onClick={() => setShowNewChatModal(false)} 
              className="absolute top-6 right-6 text-on-surface-variant hover:text-white transition-colors"
            >
              <Plus className="rotate-45" size={20} />
            </button>
            <h2 className="text-xl font-display font-black text-white uppercase mb-6 flex items-center gap-2">
              <MessageCircle size={20} className="text-primary" />
              Novo Atendimento
            </h2>
            <form onSubmit={handleStartNewChat} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-primary pl-1">Canal de Origem</label>
                <select 
                  value={selectedChannelId || ''} 
                  onChange={e => setSelectedChannelId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled className="bg-surface">Selecione o Canal</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id} className="bg-surface">
                      {c.type === 'whatsapp' ? '🟢' : '🟣'} {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-primary pl-1">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={newChatName} 
                  onChange={e => setNewChatName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-primary pl-1">WhatsApp (com DDD)</label>
                <input 
                  type="text" 
                  value={newChatPhone} 
                  onChange={e => setNewChatPhone(e.target.value)}
                  placeholder="Ex: 51988887777"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-102 active:scale-98 transition-all shadow-lg shadow-primary/10 mt-2"
              >
                Criar Canal & Iniciar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI CONFIGURATION MODAL */}
      {showAISettings && selectedChannelId && (
        <AISettingsModal
          channelId={selectedChannelId}
          channelName={activeChannel?.name || 'Canal'}
          onClose={() => setShowAISettings(false)}
        />
      )}

      {/* IMAGE LIGHTBOX */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
