import React, { useState } from 'react';
import { Smartphone, Barcode, DollarSign, Save, X, Layers } from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../../store/useInventoryStore';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../store/useAuthStore';

interface InventoryFormProps {
  item?: InventoryItem;
  onSuccess: () => void;
}

export default function InventoryForm({ item, onSuccess }: InventoryFormProps) {
  const { addItem, updateItem } = useInventoryStore();
  const { showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();

  const [formData, setFormData] = useState({
    brand: item?.brand || '',
    model: item?.model || '',
    price: item?.price !== undefined ? String(item.price) : '',
    cost_price: item?.cost_price !== undefined ? String(item.cost_price) : '',
    condition: item?.condition || 'new',
    stock_quantity: item?.stock_quantity !== undefined ? String(item.stock_quantity) : '1',
    notes: item?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = Number(formData.price) || 0;
    const costPriceNum = Number(formData.cost_price) || 0;
    const qtyNum = Math.max(1, Number(formData.stock_quantity) || 1);

    try {
      const payload = {
        brand: formData.brand,
        model: formData.model,
        condition: formData.condition,
        status: (item?.status || 'available') as any,
        stock_quantity: qtyNum,
        notes: formData.notes,
        price: priceNum,
        cost_price: costPriceNum,
        imei: '', // No IMEI in inventory registration
      };

      if (item) {
        await updateItem(item.id, payload);
        showNotification('success', 'Item Atualizado');
      } else {
        await addItem({
          ...payload,
          unit_id: profile?.unit_id || undefined,
        });
        showNotification('success', 'Item Adicionado');
      }
      onSuccess();
      hideModal();
    } catch (error) {
      showNotification('error', 'Erro ao salvar item');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Marca</label>
          <input
            type="text"
            required
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none"
            placeholder="Ex: Apple, Samsung"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Modelo</label>
          <input
            type="text"
            required
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none"
            placeholder="Ex: iPhone 15 Pro"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Condição</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary outline-none appearance-none"
          >
            <option value="new" className="bg-[#121214] text-white">Novo (Lacre)</option>
            <option value="used" className="bg-[#121214] text-white">Usado (Seminovo)</option>
            <option value="vitrine" className="bg-[#121214] text-white">Vitrine</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço de Custo (R$)</label>
          <input
            type="number"
            required
            value={formData.cost_price}
            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none"
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço de Venda (R$)</label>
          <input
            type="number"
            required
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none"
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Quantidade em Estoque</label>
          <input
            type="number"
            required
            min="1"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none"
            placeholder="1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Notas / Detalhes</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary transition-all outline-none resize-none"
          placeholder="Cor, saúde da bateria, detalhes de uso..."
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={() => hideModal()}
          className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Save size={16} /> {item ? 'Atualizar Produto' : 'Cadastrar Produto'}
        </button>
      </div>
    </form>
  );
}
