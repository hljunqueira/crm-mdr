import { 
  Palette, 
  Globe, 
  ShieldCheck, 
  MessageCircle, 
  Smartphone, 
  Bell, 
  CreditCard,
  User 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Settings() {
  return (
    <div className="p-8 space-y-8 max-w-[1000px] mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold text-on-surface">Configurações</h2>
        <p className="text-on-surface-variant font-display text-sm tracking-tight">Personalize sua plataforma e gerencie suas integrações.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-1">
          {[
            { label: 'Perfil & Conta', icon: User, active: false },
            { label: 'White-Label', icon: Palette, active: true },
            { label: 'Canais de Chat', icon: MessageCircle, active: false },
            { label: 'Notificações', icon: Bell, active: false },
            { label: 'Planos & Cobrança', icon: CreditCard, active: false },
            { label: 'Segurança', icon: ShieldCheck, active: false },
          ].map((item, i) => (
            <button 
              key={i}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-display font-medium transition-all",
                item.active ? "bg-primary text-on-primary shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <div className="md:col-span-2 space-y-8 pb-12">
          {/* White Label Section */}
          <section className="glass-card p-6 border border-outline-variant/30 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/30">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Palette size={20} />
              </div>
              <div>
                <h3 className="font-bold text-on-surface">Identidade Visual (White-Label)</h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Customização de Marca</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Logo da Empresa</label>
                <div className="border-2 border-dashed border-outline-variant rounded-2xl h-32 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low cursor-pointer transition-all">
                  <Smartphone className="text-on-surface-variant/40" size={24} />
                  <span className="text-[10px] font-bold text-on-surface-variant">Upload de Imagem</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary border-2 border-outline-variant shadow-lg group cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
                    </div>
                    <input type="text" value="#D1E0FF" readOnly className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Cor de Destaque</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary border-2 border-outline-variant shadow-lg cursor-pointer hover:scale-105 transition-transform"></div>
                    <input type="text" value="#7FB3D5" readOnly className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-xs font-bold text-on-surface-variant uppercase">Domínio Customizado</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="ex: crm.suaempresa.com.br"
                  className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
                <button className="px-6 py-2.5 bg-surface-container-highest border border-outline-variant rounded-xl text-xs font-bold hover:bg-outline-variant transition-colors">Vincular</button>
              </div>
            </div>
          </section>

          {/* Integrations */}
          <section className="glass-card p-6 border border-outline-variant/30 rounded-3xl space-y-6">
             <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/30">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold text-on-surface">Integrações de API</h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Conecte suas ferramentas</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { name: 'WhatsApp Web API', desc: 'Integração oficial para envio de mensagens.', connected: true },
                { name: 'Instagram Direct', desc: 'Sincronize mensagens do direct com o chat.', connected: false },
                { name: 'Webhooks', desc: 'Receba dados de outros sistemas em tempo real.', connected: false },
              ].map((integration, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low/50 border border-outline-variant/20 rounded-2xl hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", integration.connected ? "bg-emerald-500" : "bg-outline-variant")}></div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">{integration.name}</h4>
                      <p className="text-[10px] text-on-surface-variant">{integration.desc}</p>
                    </div>
                  </div>
                  <button className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                    integration.connected ? "bg-error/10 text-error hover:bg-error/20" : "bg-primary text-on-primary hover:opacity-90"
                  )}>
                    {integration.connected ? 'Desconectar' : 'Conectar'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-3">
              <button className="px-6 py-2.5 bg-surface-container-low text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container transition-all">Descartar</button>
              <button className="px-6 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Salvar Alterações</button>
          </div>
        </div>
      </div>
    </div>
  );
}
