import React from 'react';
import { Search, Wrench, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface OsSidebarProps {
  filteredOs: any[];
  selectedOsId: string | null;
  setSelectedOsId: (id: string | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  getStatusInfo: (status: string) => { label: string; color: string };
  osFilterTab: 'active' | 'canceled';
  setOsFilterTab: (tab: 'active' | 'canceled') => void;
}

export default function OsSidebar({
  filteredOs,
  selectedOsId,
  setSelectedOsId,
  searchTerm,
  setSearchTerm,
  isLoading,
  getStatusInfo,
  osFilterTab,
  setOsFilterTab
}: OsSidebarProps) {
  return (
    <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 h-[75vh] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <Wrench size={16} /> Fila de Serviços ({filteredOs.length})
        </h3>
      </div>
      
      {/* Seletor de Abas (Ativos / Cancelados) */}
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full shrink-0">
        <button
          type="button"
          onClick={() => setOsFilterTab('active')}
          className={cn(
            "flex-1 py-2.5 rounded-xl font-black uppercase tracking-wider text-[9px] transition-all",
            osFilterTab === 'active' 
              ? "bg-white text-black shadow-lg" 
              : "text-on-surface-variant hover:text-white"
          )}
        >
          Ativas
        </button>
        <button
          type="button"
          onClick={() => setOsFilterTab('canceled')}
          className={cn(
            "flex-1 py-2.5 rounded-xl font-black uppercase tracking-wider text-[9px] transition-all",
            osFilterTab === 'canceled' 
              ? "bg-white text-black shadow-lg" 
              : "text-on-surface-variant hover:text-white"
          )}
        >
          Canceladas
        </button>
      </div>
      
      {/* Campo de Busca */}
      <div className="relative group">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input 
          type="text" 
          placeholder="Buscar por OS, cliente, modelo ou N/S..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-white outline-none transition-all font-display"
        />
      </div>

      {/* Listagem */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {isLoading && filteredOs.length === 0 ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : filteredOs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-40 text-center gap-2">
            <CheckCircle2 size={32} className="text-success" />
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Tudo Organizado!</p>
            <p className="text-[9px] text-on-surface-variant max-w-[200px]">Nenhum conserto nesta categoria precisando de atenção.</p>
          </div>
        ) : (
          filteredOs.map(os => {
            const statusInfo = getStatusInfo(os.status);
            const numberStr = String(os.os_number).padStart(4, '0');
            const isSelected = selectedOsId === os.id;
            
            return (
              <button
                key={os.id}
                onClick={() => setSelectedOsId(os.id)}
                className={cn(
                  "w-full text-left p-4 rounded-3xl border transition-all flex flex-col gap-2",
                  isSelected 
                    ? 'bg-primary-container border-primary/40 text-on-primary-container shadow-lg' 
                    : 'bg-white/[0.01] border-white/5 text-on-surface hover:bg-white/[0.03]'
                )}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black font-mono leading-none tracking-widest opacity-60">OS #{numberStr}</span>
                    <span className="text-xs font-black uppercase truncate mt-1 max-w-[140px]">{os.customers?.name}</span>
                  </div>
                  <span className={cn("inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] font-medium border-t border-white/5 pt-2">
                  <span className="truncate max-w-[120px] opacity-75">
                    {os.device_brand === '-' && os.device_model === '-'
                      ? (os.device_category === 'notebook' ? 'Notebook' : 'Computador PC')
                      : `${os.device_brand} ${os.device_model}`}
                  </span>
                  <span className="font-bold font-mono text-primary">
                    R$ {Number(os.labor_value + os.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
