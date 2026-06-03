import React, { useState, useEffect } from 'react';
import { Smartphone, Barcode, DollarSign, Save, X, Layers, Loader2, Store } from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../../store/useInventoryStore';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';

interface InventoryFormProps {
  item?: InventoryItem;
  onSuccess: () => void;
}

export default function InventoryForm({ item, onSuccess }: InventoryFormProps) {
  const { addItem, updateItem } = useInventoryStore();
  const { showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    unit_id: item?.unit_id || profile?.unit_id || '',
    brand: item?.brand || '',
    model: item?.model || '',
    price: item?.price !== undefined ? String(item.price) : '',
    cost_price: item?.cost_price !== undefined ? String(item.cost_price) : '',
    condition: item?.condition || 'new',
    stock_quantity: item?.stock_quantity !== undefined ? String(item.stock_quantity) : '1',
    notes: item?.notes || '',
    category: item?.category || 'smartphone',
    image_url: item?.image_url || '',
    show_on_landing: item?.show_on_landing || false,
  });

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/units').then((data: any[]) => {
      setStores(data || []);
    }).catch(() => {});
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `devices/${fileName}`;

      const { data, error } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      showNotification('success', 'Imagem enviada com sucesso!');
    } catch (err) {
      console.error('Error uploading image:', err);
      showNotification('error', 'Falha ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

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
        imei: '',
        category: formData.category,
        image_url: formData.image_url,
        show_on_landing: formData.show_on_landing,
        unit_id: formData.unit_id || profile?.unit_id || undefined,
      };

      if (item) {
        await updateItem(item.id, payload);
        showNotification('success', 'Item Atualizado');
      } else {
        await addItem(payload);
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
        {/* Empresa / Loja */}
        {profile?.role === 'admin' ? (
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Store size={12} /> Empresa / Loja
            </label>
            <select
              value={formData.unit_id}
              onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary outline-none appearance-none text-white"
            >
              <option value="" className="bg-[#121214] text-white">— Selecione a Empresa —</option>
              {stores.map(s => (
                <option key={s.id} value={s.id} className="bg-[#121214] text-white">{s.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="md:col-span-2 p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-2 text-xs text-on-surface-variant/60">
            <Store size={14} />
            <span>Empresa: <strong className="text-white">{stores.find(s => s.id === formData.unit_id)?.name || 'Sua Loja'}</strong></span>
          </div>
        )}

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
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Categoria</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-primary outline-none appearance-none text-white"
          >
            <option value="smartphone" className="bg-[#121214] text-white">📱 Smartphone / Celular</option>
            <option value="accessory_mobile" className="bg-[#121214] text-white">🔌 Acessório Celular</option>
            <option value="accessory_it" className="bg-[#121214] text-white">💻 Acessório Informática</option>
            <option value="part" className="bg-[#121214] text-white">🔧 Peça de Reposição</option>
            <option value="other" className="bg-[#121214] text-white">📦 Outros</option>
          </select>
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

      {/* Opção de Destaque na Vitrine */}
      {formData.category === 'smartphone' && (
        <div className="p-5 bg-primary/5 border border-primary/20 rounded-3xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest block leading-none">⚡ Destacar na Vitrine da Página Inicial</span>
            <p className="text-[9px] text-on-surface-variant/70 leading-normal">Exibir este celular no carrossel 3D giratório da página pública principal.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={formData.show_on_landing}
              onChange={(e) => setFormData({ ...formData, show_on_landing: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      )}

      {/* Imagem do Aparelho (Upload ou Link) */}
      <div className="space-y-3 p-5 bg-white/[0.02] border border-white/5 rounded-3xl">
        <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest block pl-1">Foto do Aparelho (Vitrine)</label>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Preview da foto se existir */}
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {formData.image_url ? (
              <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Smartphone size={24} className="opacity-20" />
            )}
          </div>
          
          <div className="flex-1 w-full space-y-3">
            {/* Input de URL */}
            <input
              type="text"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs focus:border-primary transition-all outline-none"
              placeholder="Cole o link da foto (URL) ou selecione um arquivo abaixo..."
            />
            
            {/* Botão de Upload */}
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider py-3.5 rounded-2xl cursor-pointer transition-all active:scale-95">
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={12} /> Enviando...
                  </>
                ) : (
                  <>
                    Fazer Upload de Foto
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              
              {formData.image_url && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image_url: '' })}
                  className="px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all border border-red-500/10"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
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
