import React, { useState, useEffect } from 'react';
import { Smartphone, Barcode, Save, X, Loader2, Store, Layers, DollarSign, Plus } from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../../store/useInventoryStore';
import { useUnitStore } from '../../store/useUnitStore';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useSupplierStore } from '../../store/useSupplierStore';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface InventoryFormProps {
  item?: InventoryItem;
  onSuccess: () => void;
}

export default function InventoryForm({ item, onSuccess }: InventoryFormProps) {
  const { addItem, updateItem } = useInventoryStore();
  const { showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'photo' | 'notes'>('info');

  const [formData, setFormData] = useState({
    unit_id: item?.unit_id || profile?.unit_id || '',
    description: item?.description || item?.notes || '', // fallback to notes for legacy items
    model: item?.model || '', // Nome Curto
    price: item?.price !== undefined ? String(item.price) : '',
    trade_in_price: item?.trade_in_price !== undefined ? String(item.trade_in_price) : '',
    cost_price: item?.cost_price !== undefined ? String(item.cost_price) : '',
    condition: item?.condition || 'new',
    stock_quantity: item?.stock_quantity !== undefined ? String(item.stock_quantity) : '1',
    notes: item?.notes || '',
    category: item?.category || 'smartphone',
    image_url: item?.image_url || '',
    show_on_landing: item?.show_on_landing || false,
    barcode: item?.barcode || '',
    supplier: item?.supplier || '',
    purchase_date: item?.purchase_date || new Date().toISOString().split('T')[0],
    imei: item?.imei || '',
  });

  const [isShortNameManuallyEdited, setIsShortNameManuallyEdited] = useState(!!item);

  const { units: stores, fetchAllUnits } = useUnitStore();
  const { suppliers, fetchSuppliers, addSupplier } = useSupplierStore();
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  useEffect(() => {
    if (stores.length === 0) {
      fetchAllUnits().catch(() => { });
    }
  }, [stores.length, fetchAllUnits]);

  useEffect(() => {
    fetchSuppliers(undefined, false).catch(() => {});
  }, [fetchSuppliers]);

  const handleQuickAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      showNotification('error', 'Digite o nome do fornecedor');
      return;
    }
    setIsAddingSupplier(true);
    try {
      const created = await addSupplier({
        name: newSupplierName.trim(),
        unit_id: formData.unit_id || profile?.unit_id || undefined
      });
      setFormData(prev => ({ ...prev, supplier: created.name }));
      setNewSupplierName('');
      setShowQuickAddSupplier(false);
      showNotification('success', 'Fornecedor cadastrado com sucesso!');
    } catch (err) {
      showNotification('error', 'Falha ao cadastrar fornecedor.');
    } finally {
      setIsAddingSupplier(false);
    }
  };

  const generateBarcode = () => {
    const selectedStoreId = formData.unit_id || profile?.unit_id || '';
    const storeObj = stores.find(s => s.id === selectedStoreId);
    const storeName = storeObj ? storeObj.name.toUpperCase() : 'GERAL';

    let prefix = 'MDR-COD';
    if (storeName.includes('ARROIO')) prefix = 'MDR-ARROIO';
    if (storeName.includes('GAIVOTA')) prefix = 'MDR-GAIVOTA';

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const generated = `${prefix}-${randomNum}`;
    setFormData(prev => ({ ...prev, barcode: generated }));
  };

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

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const descValue = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, description: descValue };
      if (!isShortNameManuallyEdited) {
        updated.model = descValue.substring(0, 25);
      }
      return updated;
    });
  };

  const handleShortNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsShortNameManuallyEdited(true);
    setFormData(prev => ({ ...prev, model: e.target.value.substring(0, 25) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      showNotification('error', 'A descrição do item é obrigatória.');
      return;
    }

    const shortNameFinal = (formData.model || formData.description).substring(0, 25).trim();
    const firstWord = formData.description.trim().split(/\s+/)[0] || '-';
    const brandValue = firstWord.length > 20 ? firstWord.substring(0, 20) : firstWord;
    const priceNum = Number(formData.price) || 0;
    const tradeInPriceNum = formData.trade_in_price ? Number(formData.trade_in_price) : undefined;
    const costPriceNum = Number(formData.cost_price) || 0;
    const qtyNum = Math.max(1, Number(formData.stock_quantity) || 1);
 
    try {
      const payload = {
        brand: brandValue,
        model: shortNameFinal,
        description: formData.description,
        short_name: shortNameFinal,
        condition: formData.condition,
        status: (item?.status || 'available') as any,
        stock_quantity: qtyNum,
        notes: formData.notes || formData.description,
        price: priceNum,
        trade_in_price: tradeInPriceNum,
        cost_price: costPriceNum,
        imei: formData.imei.trim(),
        category: formData.category,
        image_url: formData.image_url,
        show_on_landing: formData.show_on_landing,
        unit_id: formData.unit_id || profile?.unit_id || undefined,
        barcode: formData.barcode,
        supplier: formData.supplier || null,
        purchase_date: formData.purchase_date || null,
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
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar text-white text-xs">
      {/* Bloco Superior: Código de Barras & Empresa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-3xl p-5">
        {profile?.role === 'admin' ? (
          <div className="space-y-2">
            <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Store size={11} /> Empresa / Loja
            </label>
            <select
              value={formData.unit_id}
              onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
              className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary outline-none text-white appearance-none"
            >
              <option value="" className="bg-[#121214] text-white">— Selecione a Loja —</option>
              {stores.map(s => (
                <option key={s.id} value={s.id} className="bg-[#121214] text-white">{s.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-on-surface-variant/60 py-3 pl-1">
            <Store size={14} />
            <span>Empresa: <strong className="text-white">{stores.find(s => s.id === formData.unit_id)?.name || 'Sua Loja'}</strong></span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1 flex items-center gap-1.5">
            <Barcode size={11} /> Código de Barras / Número
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="flex-1 bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary transition-all outline-none font-mono"
              placeholder="Bipe com o leitor ou digite"
            />
            <button
              type="button"
              onClick={generateBarcode}
              className="px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
            >
              Gerar
            </button>
          </div>
        </div>
      </div>

      {/* Bloco de Identificação: Descrição e Nome Curto */}
      <div className="space-y-4 bg-white/[0.01] border border-white/5 rounded-3xl p-5">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Descrição / Nome do Item *</label>
          <input
            type="text"
            required
            value={formData.description}
            onChange={handleDescriptionChange}
            className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs focus:border-primary transition-all outline-none"
            placeholder="Ex: CABO DE DADOS USB TIPO C H87-3 1 METRO PRETO"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">
            Nome Curto / Apelido (Máx. 25 caracteres)
          </label>
          <input
            type="text"
            maxLength={25}
            value={formData.model}
            onChange={handleShortNameChange}
            className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs focus:border-primary transition-all outline-none font-semibold text-warning"
            placeholder="Ex: CABO DE DADOS H87-3"
          />
          <p className="text-[8px] text-on-surface-variant opacity-60">Auto-preenchido e limitado a partir da Descrição.</p>
        </div>
      </div>

      {/* Navegação por Abas (Visual Estilo SHEstoque) */}
      <div className="flex border-b border-white/10 gap-2 mt-4 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={cn(
            "px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 shrink-0",
            activeTab === 'info' ? "border-primary text-primary" : "border-transparent text-on-surface-variant/60 hover:text-white"
          )}
        >
          📂 Informações principais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('photo')}
          className={cn(
            "px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 shrink-0",
            activeTab === 'photo' ? "border-primary text-primary" : "border-transparent text-on-surface-variant/60 hover:text-white"
          )}
        >
          🖼️ Foto
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={cn(
            "px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 shrink-0",
            activeTab === 'notes' ? "border-primary text-primary" : "border-transparent text-on-surface-variant/60 hover:text-white"
          )}
        >
          📝 Observações
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 min-h-[200px]">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço de Custo (R$)</label>
              <input
                type="number"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary transition-all outline-none"
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço de Venda (R$)</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary transition-all outline-none"
                placeholder="0,00"
              />
            </div>
 
            {formData.category === 'smartphone' && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço com Troca (R$)</label>
                <input
                  type="number"
                  value={formData.trade_in_price}
                  onChange={(e) => setFormData({ ...formData, trade_in_price: e.target.value })}
                  className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary transition-all outline-none text-white"
                  placeholder="0,00"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Qtd em Estoque</label>
              <input
                type="number"
                required
                min="1"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary transition-all outline-none"
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary outline-none text-white appearance-none"
              >
                <option value="smartphone" className="bg-[#121214] text-white">📱 Smartphone / Celular</option>
                <option value="accessory_mobile" className="bg-[#121214] text-white">🔌 Acessório Celular</option>
                <option value="accessory_it" className="bg-[#121214] text-white">💻 Acessório Informática</option>
                <option value="part" className="bg-[#121214] text-white">🔧 Peça de Reposição</option>
                <option value="other" className="bg-[#121214] text-white">📦 Outros</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Condição</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary outline-none appearance-none"
              >
                <option value="new" className="bg-[#121214] text-white">Novo (Lacre)</option>
                <option value="used" className="bg-[#121214] text-white">Usado (Seminovo)</option>
                <option value="vitrine" className="bg-[#121214] text-white">Vitrine</option>
              </select>
            </div>

            {['smartphone', 'notebook', 'desktop'].includes(formData.category) && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">IMEI / Serial (Opcional)</label>
                <input
                  type="text"
                  value={formData.imei}
                  onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                  className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary transition-all outline-none font-mono"
                  placeholder="Digite o IMEI ou Serial"
                />
              </div>
            )}

             <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Fornecedor</label>
              {!showQuickAddSupplier ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary outline-none text-white appearance-none"
                    >
                      <option value="" className="bg-[#121214] text-white">— Selecione o Fornecedor —</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name} className="bg-[#121214] text-white">{s.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant/50">
                      <Layers size={12} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddSupplier(true)}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                    title="Cadastrar fornecedor rápido"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2 bg-white/[0.02] border border-white/5 p-3 rounded-2xl animate-in slide-in-from-top-1 duration-200">
                  <span className="text-[8px] font-bold text-primary uppercase tracking-wider block">Novo Fornecedor Rápido</span>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      placeholder="Nome do fornecedor"
                      className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-2 text-xs focus:border-primary transition-all outline-none"
                      disabled={isAddingSupplier}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickAddSupplier(false);
                          setNewSupplierName('');
                        }}
                        disabled={isAddingSupplier}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickAddSupplier}
                        disabled={isAddingSupplier}
                        className="px-4 py-1.5 bg-primary text-on-primary rounded-2xl text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                      >
                        {isAddingSupplier ? '...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Data de Compra</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary transition-all outline-none text-white"
              />
            </div>
          </div>
        )}

        {activeTab === 'photo' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Smartphone size={28} className="opacity-20" />
                )}
              </div>

              <div className="flex-1 w-full space-y-3">
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary transition-all outline-none"
                  placeholder="Cole o link da foto (URL) ou envie um arquivo abaixo..."
                />

                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider py-3 rounded-2xl cursor-pointer transition-all active:scale-95">
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin" size={12} /> Enviando...
                      </>
                    ) : (
                      <>Fazer Upload de Foto</>
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
                      className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all border border-red-500/10"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Notas / Detalhes de Utilização</label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs focus:border-primary transition-all outline-none resize-none"
                placeholder="Observações de uso, detalhes adicionais ou avisos..."
              />
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between gap-4 mt-2">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest block leading-none">⚡ Destacar na Vitrine da Página Inicial</span>
                <p className="text-[8px] text-on-surface-variant/70 leading-normal">Exibir este produto no carrossel 3D giratório da página pública.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.show_on_landing}
                  onChange={(e) => setFormData({ ...formData, show_on_landing: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={() => hideModal()}
          className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="w-full sm:flex-[2] py-3.5 px-6 rounded-2xl bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save size={14} /> {item ? 'Gravar Alterações' : 'Gravar Item'}
        </button>
      </div>
    </form>
  );
}
