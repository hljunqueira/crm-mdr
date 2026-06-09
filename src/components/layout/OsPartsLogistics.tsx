import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

interface OsPartsLogisticsProps {
  currentServiceOrder: any;
  inventory: any[];
  selectedPartId: string;
  setSelectedPartId: (id: string) => void;
  partQty: number;
  setPartQty: (qty: number) => void;
  addingPart: boolean;
  handleAddPart: () => void;
  handleDeletePart: (partId: string) => void;
  disabled?: boolean;
}

export default function OsPartsLogistics({
  currentServiceOrder,
  inventory,
  selectedPartId,
  setSelectedPartId,
  partQty,
  setPartQty,
  addingPart,
  handleAddPart,
  handleDeletePart,
  disabled = false
}: OsPartsLogisticsProps) {
  return (
    <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
      <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
        <PlusCircle size={16} /> Peças Consumidas do Estoque
      </h3>

      {/* Adicionar Peça */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Selecione a Peça (Estoque)</label>
          <select
            value={selectedPartId}
            onChange={(e) => setSelectedPartId(e.target.value)}
            disabled={disabled}
            className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-primary outline-none transition-all disabled:opacity-50"
          >
            <option value="">Nenhuma Peça Selecionada</option>
            {inventory.map(item => (
              <option key={item.id} value={item.id} disabled={item.stock_quantity <= 0}>
                {item.brand} {item.model} - R$ {item.price.toLocaleString('pt-BR')} (Estoque: {item.stock_quantity})
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Qtd</label>
          <input 
            type="number" 
            min={1}
            value={partQty}
            onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
            disabled={disabled}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-primary outline-none transition-all text-center disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleAddPart}
          disabled={disabled || addingPart || !selectedPartId}
          className="w-full bg-primary hover:scale-[1.01] text-on-primary font-black uppercase tracking-widest text-[9px] py-4 rounded-2xl transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {addingPart ? 'Inserindo...' : 'Adicionar Peça'}
        </button>
      </div>

      {/* Tabela de Peças Utilizadas */}
      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[9px] font-black uppercase text-on-surface-variant tracking-widest">
              <th className="pb-3">Descrição da Peça</th>
              <th className="pb-3 text-center">Quantidade</th>
              <th className="pb-3 text-right">Valor Unitário</th>
              <th className="pb-3 text-right">Subtotal</th>
              <th className="pb-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!currentServiceOrder.parts || currentServiceOrder.parts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[10px] text-on-surface-variant opacity-60">
                  Nenhuma peça registrada nesta Ordem de Serviço.
                </td>
              </tr>
            ) : (
              currentServiceOrder.parts.map((part: any) => (
                <tr key={part.id} className="border-b border-white/5 last:border-0">
                  <td className="py-3 font-bold">{part.part_name}</td>
                  <td className="py-3 text-center font-mono">{part.quantity}</td>
                  <td className="py-3 text-right font-mono">R$ {Number(part.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 text-right font-mono text-primary font-bold">R$ {Number(part.quantity * part.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 text-center">
                    {!disabled && (
                      <button 
                        onClick={() => handleDeletePart(part.id)}
                        className="text-on-surface-variant hover:text-error transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
