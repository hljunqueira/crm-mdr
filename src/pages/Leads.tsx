import { Search, Filter, Plus, UserPlus, MoreVertical, Mail, Phone, Calendar } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Leads() {
  const leads = [
    { name: 'Bruno Henrique', email: 'bruno@email.com', phone: '(11) 98888-7777', source: 'Instagram', status: 'Novo', date: '10/05/2024' },
    { name: 'Carla Mendonça', email: 'carla.m@site.com', phone: '(11) 97777-6666', source: 'Google Ads', status: 'Em Contato', date: '09/05/2024' },
    { name: 'Daniel Oliveira', email: 'daniel@empresa.com', phone: '(11) 96666-5555', source: 'WhatsApp', status: 'Qualificado', date: '08/05/2024' },
    { name: 'Fernanda Costa', email: 'fe.costa@gmail.com', phone: '(11) 95555-4444', source: 'Indicação', status: 'Desqualificado', date: '07/05/2024' },
    { name: 'Gustavo Lima', email: 'gustavo@musica.com', phone: '(11) 94444-3333', source: 'Facebook', status: 'Novo', date: '06/05/2024' },
    { name: 'Juliana Pires', email: 'jupi@cloud.com', phone: '(11) 93333-2222', source: 'Instagram', status: 'Negociando', date: '05/05/2024' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Gestão de Leads</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Aquisição de Clientes</p>
        </div>
        <button className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-white/5 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all">
          <UserPlus size={18} /> Novo Lead
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 border border-outline-variant/30 rounded-[32px] flex flex-wrap items-center justify-between gap-6 bg-white/[0.02]">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl pl-14 pr-6 py-4 text-sm focus:border-white focus:ring-4 focus:ring-white/5 transition-all outline-none"
            />
          </div>
          <button className="p-4 bg-surface-container border border-outline-variant/50 text-on-surface rounded-2xl hover:bg-white/5 transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {leads.map((lead, i) => (
          <div 
            key={i} 
            className="glass-card p-10 border border-outline-variant/30 rounded-[40px] hover:border-white/30 transition-all group flex flex-col shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6">
              <button className="p-2 text-on-surface-variant hover:text-white transition-colors">
                <MoreVertical size={22} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-inner group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
                {lead.name.charAt(0)}
              </div>
              <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">{lead.name}</h3>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white px-3 py-1 bg-white/5 rounded-full mt-3 border border-white/10">{lead.source}</span>
            </div>

            <div className="space-y-4 mb-10 pt-10 border-t border-outline-variant/10">
              <div className="flex items-center gap-4 text-xs text-on-surface-variant justify-center">
                <Mail size={16} className="text-white/20" />
                <span className="font-bold">{lead.email}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-on-surface-variant justify-center">
                <Phone size={16} className="text-white/20" />
                <span className="font-bold">{lead.phone}</span>
              </div>
            </div>

            <div className="mt-auto pt-8 border-t border-outline-variant/10 flex items-center justify-between">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                lead.status === 'Novo' ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 text-on-surface-variant/40'
              }`}>
                {lead.status}
              </span>
              <button className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all flex items-center gap-3 group/btn">
                Perfil <Plus size={14} className="group-hover/btn:rotate-90 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between text-sm py-4 border-t border-outline-variant/20 font-display">
        <span className="text-on-surface-variant">Mostrando 6 de 142 leads</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-50" disabled>Anterior</button>
          <button className="w-8 h-8 flex items-center justify-center bg-primary text-on-primary rounded-lg font-bold">1</button>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-container rounded-lg">2</button>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-container rounded-lg">3</button>
          <button className="px-3 py-1 border border-outline-variant rounded-lg hover:bg-surface-container">Próximo</button>
        </div>
      </div>
    </div>
  );
}
