import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Smartphone, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  History,
  Barcode,
  Loader2,
  DollarSign,
  Package,
  Wrench,
  Monitor,
  Store,
  Building2
} from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../store/useInventoryStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import InventoryForm from '../components/inventory/InventoryForm';
import { cn } from '../lib/utils';

export default function Inventory() {
  const { inventory, deleteItem, fetchInventory, isLoading } = useInventoryStore();
  const { units: allStores, fetchAllUnits } = useUnitStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    // Admins load everything; others load only their store
    fetchInventory(isAdmin ? undefined : (profile?.unit_id || undefined));
  }, [profile?.unit_id, fetchInventory, isAdmin]);

  useEffect(() => {
    fetchAllUnits().catch(() => {});
  }, [fetchAllUnits]);

  // Use all configured stores for filter tabs
  const availableStores = allStores;

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.imei || '').includes(searchTerm) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStore = !isAdmin || selectedStore === 'all' || item.unit_id === selectedStore;
    return matchesSearch && matchesCategory && matchesStore;
  });

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'smartphone':
        return { label: 'Celular', color: 'border-blue-500/20 text-blue-400 bg-blue-500/5', icon: Smartphone };
      case 'accessory_mobile':
        return { label: 'Acessório Celular', color: 'border-purple-500/20 text-purple-400 bg-purple-500/5', icon: Smartphone };
      case 'accessory_it':
        return { label: 'Acessório TI', color: 'border-teal-500/20 text-teal-400 bg-teal-500/5', icon: Monitor };
      case 'part':
        return { label: 'Peça', color: 'border-amber-500/20 text-amber-400 bg-amber-500/5', icon: Wrench };
      case 'other':
        return { label: 'Outros', color: 'border-white/15 text-white/60 bg-white/5', icon: Package };
      default:
        return { label: 'Celular', color: 'border-blue-500/20 text-blue-400 bg-blue-500/5', icon: Smartphone };
    }
  };

  const handleAddItem = () => {
    showModal({
      title: 'Adicionar Produto ao Estoque',
      children: <InventoryForm onSuccess={() => {}} />,
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    showModal({
      title: 'Editar Produto',
      children: <InventoryForm item={item} onSuccess={() => {}} />,
    });
  };

  const handleDeleteItem = (id: string) => {
    showModal({
      title: 'Confirmar Exclusão',
      children: 'Você tem certeza que deseja remover este item permanentemente do estoque?',
      confirmText: 'Sim, Excluir',
      type: 'danger',
      onConfirm: async () => {
        await deleteItem(id);
        showNotification('success', 'Item Removido');
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-black text-white uppercase tracking-tight">Gestão de Estoque</h2>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Produtos e dispositivos</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAddItem}
            className="px-6 py-3 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            <Plus size={18} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Modelos Diferentes', value: filteredInventory.length.toString(), icon: Smartphone, color: 'text-primary' },
          { label: 'Quantidade em Estoque', value: filteredInventory.reduce((sum, item) => sum + (item.stock_quantity || 0), 0).toString(), icon: Package, color: 'text-success' },
          { label: 'Valor do Estoque (Venda)', value: `R$ ${filteredInventory.reduce((sum, item) => sum + (item.price * (item.stock_quantity || 0)), 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-warning' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-3xl border border-outline-variant/30 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} border border-white/10`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">{stat.label}</p>
                <p className="text-2xl font-black text-white leading-none mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Store Filter Tabs — visible to admins only */}
      {isAdmin && availableStores.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedStore('all')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
              selectedStore === 'all'
                ? 'bg-white text-black border-white shadow-lg'
                : 'bg-white/[0.01] border-white/10 text-on-surface-variant hover:bg-white/5'
            )}
          >
            <Building2 size={13} /> Todas as Empresas
          </button>
          {availableStores.map(store => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                selectedStore === store.id
                  ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20'
                  : 'bg-white/[0.01] border-white/10 text-on-surface-variant hover:bg-white/5'
              )}
            >
              <Store size={13} /> {store.name}
            </button>
          ))}
        </div>
      )}

      {/* Category Filters */}
      <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
        {[
          { id: 'all', label: 'Tudo', icon: Package },
          { id: 'smartphone', label: 'Celulares', icon: Smartphone },
          { id: 'accessory_mobile', label: 'Acessórios Celular', icon: Smartphone },
          { id: 'accessory_it', label: 'Acessórios TI', icon: Monitor },
          { id: 'part', label: 'Peças de Reposição', icon: Wrench },
          { id: 'other', label: 'Outros', icon: Package }
        ].map(cat => {
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all shrink-0",
                selectedCategory === cat.id
                  ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/10"
                  : "bg-white/[0.01] border-white/5 text-on-surface-variant hover:bg-white/5"
              )}
            >
              <CatIcon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-white transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por modelo, marca ou IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white transition-all font-display"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card h-64 rounded-[32px] border border-white/5 animate-pulse bg-white/5"></div>
          ))}
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50 bg-white/[0.02] border border-outline-variant/30 rounded-[40px]">
          <Smartphone size={48} className="text-on-surface-variant mb-2 opacity-20" />
          <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Estoque vazio</p>
          <p className="text-[10px] font-display text-on-surface-variant opacity-70">Nenhum aparelho encontrado no estoque atual.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => (
            <motion.div 
              layout
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden h-full flex flex-col border border-outline-variant/30 rounded-[32px] group hover:border-white/20 transition-all bg-white/[0.02]"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-white border border-white/10 shadow-sm group-hover:bg-white group-hover:text-black transition-all">
                    {(() => {
                      const catBadge = getCategoryBadge(item.category);
                      const CatIcon = catBadge.icon;
                      return <CatIcon size={24} />;
                    })()}
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    (item.stock_quantity || 0) > 5 ? 'border-success/20 text-success bg-success/5' :
                    (item.stock_quantity || 0) > 0 ? 'border-warning/20 text-warning bg-warning/5' :
                    'border-error/20 text-error bg-error/5'
                  )}>
                    {(item.stock_quantity || 0) > 0 ? `${item.stock_quantity} unidades` : 'Sem estoque'}
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">{item.model}</h3>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">
                    {item.brand} • {item.condition === 'new' ? 'Novo' : item.condition === 'used' ? 'Usado' : 'Vitrine'}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", getCategoryBadge(item.category).color)}>
                    {getCategoryBadge(item.category).label}
                  </span>
                </div>

                <div className="space-y-2 mt-6 pt-6 border-t border-white/5">
                  {item.imei && (
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-black">
                      <Barcode size={14} className="opacity-40" />
                      <span className="font-mono tracking-widest uppercase">{item.imei}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Preço Sugerido</span>
                    <span className="text-xl font-black text-white">R$ {item.price.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/5 flex items-center justify-end gap-2 border-t border-white/5">
                <button 
                  onClick={() => handleEditItem(item)}
                  className="p-2 text-on-surface-variant hover:text-white transition-colors"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 text-on-surface-variant hover:text-error transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
