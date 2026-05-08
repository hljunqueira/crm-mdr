import { useState } from 'react';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video, 
  CheckCheck, 
  Plus,
  User,
  Instagram,
  MessageCircle,
  Mail
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Chat() {
  const [activeChat, setActiveChat] = useState(0);

  const contacts = [
    { id: 0, name: 'Alice Smith', message: 'Tudo bem, aguardo a tela.', time: '10:45', unread: 2, platform: 'WhatsApp', online: true },
    { id: 1, name: 'Bob Johnson', message: 'Enviei o comprovante.', time: 'Ontem', unread: 0, platform: 'Instagram', online: false },
    { id: 2, name: 'Carol Williams', message: 'O notebook já está pronto?', time: 'Seg', unread: 0, platform: 'WhatsApp', online: true },
    { id: 3, name: 'Tech Solutions', message: 'Cotação aprovada.', time: 'Ter', unread: 0, platform: 'Email', online: false },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Contact List */}
      <div className="w-80 border-r border-outline-variant bg-surface flex flex-col shrink-0">
        <div className="p-4 border-b border-outline-variant space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-on-surface">Conversas</h2>
            <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors">
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-primary transition-all font-sans"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.map((contact, i) => (
            <div 
              key={contact.id}
              onClick={() => setActiveChat(contact.id)}
              className={cn(
                "p-4 flex gap-3 cursor-pointer transition-all border-b border-outline-variant/20 hover:bg-surface-container-low relative group",
                activeChat === contact.id ? "bg-primary-container/30 border-l-4 border-l-primary" : ""
              )}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-highest border border-outline-variant overflow-hidden">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${contact.name}&background=random&color=fff`} 
                    alt={contact.name} 
                  />
                </div>
                {contact.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface rounded-full"></span>
                )}
                <div className="absolute -top-1 -right-1 bg-surface p-0.5 rounded-lg shadow-sm border border-outline-variant">
                   {contact.platform === 'WhatsApp' ? <MessageCircle size={10} className="text-[#25D366]" /> : 
                    contact.platform === 'Instagram' ? <Instagram size={10} className="text-[#E4405F]" /> : 
                    <Mail size={10} className="text-primary" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-sm text-on-surface truncate">{contact.name}</h3>
                  <span className="text-[10px] text-on-surface-variant font-display">{contact.time}</span>
                </div>
                <p className={cn(
                  "text-xs truncate font-display",
                  contact.unread > 0 ? "text-on-surface font-bold" : "text-on-surface-variant"
                )}>
                  {contact.message}
                </p>
              </div>
              {contact.unread > 0 && (
                <span className="absolute right-4 bottom-4 bg-primary text-on-primary text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-lg shadow-primary/30">
                  {contact.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-surface relative">
        {/* Chat Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-outline-variant bg-surface/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container-highest border border-outline-variant overflow-hidden">
              <img 
                src={`https://ui-avatars.com/api/?name=${contacts[activeChat].name}&background=random&color=fff`} 
                alt={contacts[activeChat].name} 
              />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-sm">{contacts[activeChat].name}</h3>
              <div className="flex items-center gap-1.5 ">
                <span className={cn("w-1.5 h-1.5 rounded-full", contacts[activeChat].online ? "bg-emerald-500" : "bg-on-surface-variant")}></span>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tight">
                  {contacts[activeChat].online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2.5 hover:bg-surface-container rounded-xl text-on-surface-variant hover:text-primary transition-all">
              <Phone size={18} />
            </button>
            <button className="p-2.5 hover:bg-surface-container rounded-xl text-on-surface-variant hover:text-primary transition-all">
              <Video size={18} />
            </button>
            <div className="w-px h-6 bg-outline-variant mx-1"></div>
            <button className="p-2.5 hover:bg-surface-container rounded-xl text-on-surface-variant hover:text-primary transition-all">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-surface-container-low/30">
          <div className="flex justify-center">
            <span className="bg-surface-container-highest/50 px-4 py-1 rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">HOJE</span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-start max-w-[70%]">
              <div className="bg-surface border border-outline-variant rounded-2xl rounded-tl-none p-4 shadow-sm group">
                <p className="text-sm text-on-surface leading-relaxed">Olá! Gostaria de saber se o orçamento para a troca da tela do MacBook Pro já está pronto?</p>
                <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                   <span className="text-[9px]">10:30</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end max-w-[70%] ml-auto">
              <div className="bg-primary text-on-primary rounded-2xl rounded-tr-none p-4 shadow-lg shadow-primary/10">
                <p className="text-sm leading-relaxed">Olá! Sim, já finalizamos a cotação. O valor total fica em R$ 2.450 com peça original e garantia de 1 ano.</p>
                <div className="flex items-center justify-end gap-1 mt-1 opacity-80">
                   <span className="text-[9px]">10:32</span>
                   <CheckCheck size={12} />
                </div>
              </div>
            </div>

            <div className="flex justify-start max-w-[70%]">
              <div className="bg-surface border border-outline-variant rounded-2xl rounded-tl-none p-4 shadow-sm">
                <p className="text-sm text-on-surface leading-relaxed">Tudo bem, aguardo a tela. Pode seguir com o serviço.</p>
                <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                   <span className="text-[9px]">10:45</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-surface border-t border-outline-variant">
          <div className="max-w-4xl mx-auto flex items-end gap-3 glass-card p-2 border border-outline-variant rounded-2xl">
            <button className="p-2.5 hover:bg-surface-container rounded-xl text-on-surface-variant transition-all">
              <Smile size={20} />
            </button>
            <button className="p-2.5 hover:bg-surface-container rounded-xl text-on-surface-variant transition-all">
              <Paperclip size={20} />
            </button>
            <textarea 
              rows={1}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-sans py-2 resize-none max-h-32 text-on-surface"
            ></textarea>
            <button className="bg-primary text-on-primary p-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20">
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-center mt-2 text-on-surface-variant/60 font-display">
            Canal de atendimento via {contacts[activeChat].platform}
          </p>
        </div>
      </div>

      {/* Right Info Panel (Optional) */}
      <div className="w-72 border-l border-outline-variant bg-surface hidden xl:flex flex-col p-6 overflow-y-auto custom-scrollbar shrink-0">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-3xl bg-surface-container-highest border-2 border-outline-variant p-1 mb-4">
             <img 
                src={`https://ui-avatars.com/api/?name=${contacts[activeChat].name}&background=random&color=fff`} 
                alt={contacts[activeChat].name} 
                className="w-full h-full rounded-2xl object-cover"
              />
          </div>
          <h3 className="font-bold text-on-surface text-lg">{contacts[activeChat].name}</h3>
          <p className="text-xs text-on-surface-variant font-display mb-6">Cliente desde Julho 2023</p>
          
          <div className="w-full flex gap-2 mb-8">
            <button className="flex-1 py-2 bg-surface-container hover:bg-surface-container-highest rounded-xl text-xs font-bold transition-all border border-outline-variant">Perfil</button>
            <button className="flex-1 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold transition-all border border-primary/20">Lead</button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Informações</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-display">Fone:</span>
                <span className="text-xs font-bold text-on-surface">(11) 98888-7777</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-display">Email:</span>
                <span className="text-xs font-bold text-on-surface truncate ml-4">alice@gmail.com</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Últimas Tags</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">ORÇAMENTO</span>
              <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-bold rounded">MACBOOK</span>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded">ALTA PRIORIDADE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
