import React from 'react';
import { Wrench, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface OsTechWorkbenchProps {
  currentServiceOrder: any;
  activeChecklist: any[];
  isChecklistItemOk: (itemId: string) => boolean;
  handleToggleChecklist: (itemId: string) => void;
  disabled?: boolean;
}

export default function OsTechWorkbench({
  currentServiceOrder,
  activeChecklist,
  isChecklistItemOk,
  handleToggleChecklist,
  disabled = false
}: OsTechWorkbenchProps) {
  return (
    <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
      <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
        <Wrench size={16} /> Bancada de Testes de Qualidade
      </h3>
      
      <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
        Marque os testes aprovados do equipamento para atestar na garantia:
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {activeChecklist.map(item => {
          const isOk = isChecklistItemOk(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleToggleChecklist(item.id)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:pointer-events-none",
                isOk 
                  ? "bg-success/10 border-success/30 text-success" 
                  : "bg-white/[0.01] border-white/5 text-on-surface-variant/70 hover:bg-white/5"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded flex items-center justify-center border transition-all",
                isOk ? "bg-success border-success text-on-success" : "border-white/20"
              )}>
                {isOk && <Check size={10} strokeWidth={4} />}
              </div>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
