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
  osFilterTab: 'active' | 'canceled' | 'completed';
  setOsFilterTab: (tab: 'active' | 'canceled' | 'completed') => void;
  updateServiceOrder: (id: string, updates: any) => Promise<void>;
  loggedInUnitId?: string;
  userRole?: string;
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
  setOsFilterTab,
  updateServiceOrder,
  loggedInUnitId,
  userRole
}: OsSidebarProps) {
  return (
    <div className="bg-white/2 border border-outline-variant/30 rounded-[40px] p-6 h-[75vh] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <Wrench size={16} /> Fila de Serviços ({filteredOs.length})
        </h3>
      </div>
      
      {/* Seletor de Abas (Ativas / Concluídas / Canceladas) */}
      <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 w-full shrink-0">
        <button
          type="button"
          onClick={() => setOsFilterTab('active')}
          className={cn(
            "flex-1 py-1.5 px-1 rounded-xl font-black uppercase tracking-wider text-[8px] sm:py-2.5 sm:text-[9px] transition-all",
            osFilterTab === 'active' 
              ? "bg-white text-black shadow-lg" 
              : "text-on-surface-variant hover:text-white"
          )}
        >
          Ativas
        </button>
        <button
          type="button"
          onClick={() => setOsFilterTab('completed')}
          className={cn(
            "flex-1 py-1.5 px-1 rounded-xl font-black uppercase tracking-wider text-[8px] sm:py-2.5 sm:text-[9px] transition-all",
            osFilterTab === 'completed' 
              ? "bg-white text-black shadow-lg" 
              : "text-on-surface-variant hover:text-white"
          )}
        >
          Concluídas
        </button>
        <button
          type="button"
          onClick={() => setOsFilterTab('canceled')}
          className={cn(
            "flex-1 py-1.5 px-1 rounded-xl font-black uppercase tracking-wider text-[8px] sm:py-2.5 sm:text-[9px] transition-all",
            osFilterTab === 'canceled' 
              ? "bg-white text-black shadow-lg" 
              : "text-on-surface-variant hover:text-white"
          )}
        >
          Canceladas
        </button>
      </div>
      
      <div className="relative group">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input 
          type="text" 
          autoComplete="one-time-code"
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
            <p className="text-[9px] text-on-surface-variant max-w-50">Nenhum conserto nesta categoria precisando de atenção.</p>
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
                  "w-full text-left p-4 rounded-3xl border transition-all flex flex-col gap-2 relative",
                  isSelected 
                    ? 'bg-primary-container border-primary/40 text-on-primary-container shadow-lg' 
                    : 'bg-white/1 border-white/5 text-on-surface hover:bg-white/3'
                )}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-black font-mono leading-none tracking-widest opacity-60">OS #{numberStr}</span>
                    <span className="text-xs font-black uppercase truncate mt-1 max-w-30">{os.customers?.name}</span>
                    <span className="text-[9.5px] font-medium text-on-surface-variant mt-0.5 truncate max-w-30 block">
                      Téc: {os.profiles?.full_name || 'Não designado'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <select
                      value={os.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateServiceOrder(os.id, { status: e.target.value as any });
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-[#121214] text-center cursor-pointer outline-none hover:scale-105 active:scale-95 transition-all max-w-27.5 truncate",
                        statusInfo.color
                      )}
                    >
                      <option value="budget_pending" className="bg-[#121214] text-red-400">🔴 Orçamento Pendente</option>
                      <option value="awaiting_approval" className="bg-[#121214] text-amber-400">🟡 Aguardando Cliente</option>
                      <option value="in_progress" className="bg-[#121214] text-blue-400">🔵 Em Execução</option>
                      <option value="ready" className="bg-[#121214] text-green-400">🟢 Pronto</option>
                      {(!loggedInUnitId || os.unit_id === loggedInUnitId || userRole === 'admin') && (
                        <option value="delivered" className="bg-[#121214] text-white">⚪ Entregue</option>
                      )}
                      <option value="returned_no_fix" className="bg-[#121214] text-neutral-400">❔ Sem Conserto</option>
                      <option value="canceled" className="bg-[#121214] text-red-500">❌ Cancelado</option>
                    </select>
                    {os.outsourced_orders && os.outsourced_orders.length > 0 && (() => {
                      const activeOutsource = os.outsourced_orders.find((o: any) => o.external_status === 'sent' || o.external_status === 'repairing');
                      if (activeOutsource) {
                        const isInternal = activeOutsource.partner_technician_name?.startsWith('INTERNAL_UNIT:');
                        if (isInternal) {
                          const shopParts = activeOutsource.partner_shop_name?.split(' ') || [];
                          const shopShortName = shopParts[shopParts.length - 1] || 'Interno';
                          return (
                            <span className="text-[7.5px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest text-center whitespace-nowrap">
                              Lab: {shopShortName.toUpperCase()}
                            </span>
                          );
                        }
                      }
                      return (
                        <span className="text-[7.5px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest text-center whitespace-nowrap">
                          Terceirizada
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-medium border-t border-white/5 pt-2">
                  <span className="truncate max-w-30 opacity-75">
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
