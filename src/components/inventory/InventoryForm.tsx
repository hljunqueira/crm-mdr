import React, { useState } from 'react';
import { useInventoryStore, InventoryItem } from '../../store/useInventoryStore';
import { useUI } from '../../context/UIContext';

interface InventoryFormProps {
  item?: InventoryItem;
  onSuccess: () => void;
}

export default function InventoryForm({ item, onSuccess }: InventoryFormProps) {
  const { addItem, updateItem } = useInventoryStore();
  const { closeModal, showNotification } = useUI();
  const [formData, setFormData] = useState({
    model: item?.model || '',
    brand: item?.brand || 'Apple',
    imei: item?.imei || '',
    price: item?.price || 0,
    condition: item?.condition || 'new',
    status: item?.status || 'available',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (item) {
        await updateItem(item.id, formData);
        showNotification('success', 'Produto Atualizado', `${formData.model} foi atualizado com sucesso.`);
      } else {
        await addItem(formData);
        showNotification('success', 'Produto Adicionado', `${formData.model} foi adicionado ao estoque.`);
      }
      onSuccess();
      closeModal();
    } catch (error) {
      showNotification('error', 'Erro', 'Não foi possível salvar o produto.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Modelo</label>
          <input 
            type="text" 
            required
            className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50"
            value={formData.model}
            onChange={e => setFormData({ ...formData, model: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Marca</label>
          <select 
            className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50"
            value={formData.brand}
            onChange={e => setFormData({ ...formData, brand: e.target.value })}
          >
            <option value="Apple">iPhone</option>
            <option value="Samsung">Samsung</option>
            <option value="Motorola">Motorola</option>
            <option value="Xiaomi">Xiaomi</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">IMEI</label>
          <input 
            type="text" 
            required
            className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50"
            value={formData.imei}
            onChange={e => setFormData({ ...formData, imei: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Preço (R$)</label>
          <input 
            type="number" 
            required
            step="0.01"
            className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Condição</label>
          <select 
            className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50"
            value={formData.condition}
            onChange={e => setFormData({ ...formData, condition: e.target.value as any })}
          >
            <option value="new">Novo</option>
            <option value="used">Usado</option>
            <option value="refurbished">Vitrine / Refurbished</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Status</label>
          <select 
            className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
          >
            <option value="available">Disponível</option>
            <option value="reserved">Reservado</option>
            <option value="in_repair">Em Reparo</option>
            <option value="sold">Vendido</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          type="button"
          onClick={closeModal}
          className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-on-surface-variant hover:bg-surface-container-highest transition-all"
        >
          Cancelar
        </button>
        <button 
          type="submit"
          className="flex-[2] bg-primary text-on-primary px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          {item ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
        </button>
      </div>
    </form>
  );
}
