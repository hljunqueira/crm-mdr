import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Smartphone, 
  Search, 
  CheckCircle2, 
  DollarSign, 
  Package, 
  Loader2, 
  Building2, 
  Store,
  Tag
} from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../store/useInventoryStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { cn } from '../lib/utils';

export default function DeviceValuations() {
  const { inventory, fetchInventory, updateItem, isLoading } = useInventoryStore();
  const { units: allStores, fetchAllUnits } = useUnitStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const { hasPermission, fetchUserPermissions } = usePermissionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  useEffect(() => {
    // Admins load everything; others load only their store
    fetchInventory(isAdmin ? undefined : (profile?.unit_id || undefined));
  }, [profile?.unit_id, fetchInventory, isAdmin]);

  useEffect(() => {
    fetchAllUnits().catch(() => { });
  }, [fetchAllUnits]);

  // Filter items that are pending valuation
  const pendingItems = inventory.filter(item => {
    if (item.status !== 'pending_valuation') return false;

    const matchesSearch =
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.imei || '').includes(searchTerm) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStore = !isAdmin || selectedStore === 'all' || item.unit_id === selectedStore;

    return matchesSearch && matchesStore;
  });

  const handleOpenValuationModal = (item: InventoryItem) => {
    showModal({
      title: 'Ativar Aparelho de Troca',
      children: (
        <ValuationForm
          item={item}
          onSuccess={() => {
            hideModal();
            showNotification('success', 'Aparelho Avaliado!', 'O produto agora está disponível em estoque.');
            fetchInventory(isAdmin ? undefined : (profile?.unit_id || undefined));
          }}
        />
      ),
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-black text-white uppercase tracking-tight">Avaliação de Celulares</h2>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Aparelhos aguardando precificação</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[
          { label: 'Aparelhos Pendentes', value: pendingItems.length.toString(), icon: Smartphone, color: 'text-warning' },
          { label: 'Total em Créditos (Custos)', value: `R$ ${pendingItems.reduce((sum, item) => sum + (item.cost_price || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-primary' },
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
      {isAdmin && allStores.length > 0 && (
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
          <button
            onClick={() => setSelectedStore('all')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all shrink-0",
              selectedStore === 'all'
                ? 'bg-white text-black border-white shadow-lg'
                : 'bg-white/[0.01] border-white/10 text-on-surface-variant hover:bg-white/5'
            )}
          >
            <Building2 size={13} /> Todas as Empresas
          </button>
          {allStores.map(store => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all shrink-0",
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

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={16} />
          <input
            type="text"
            placeholder="Buscar por marca, modelo ou IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#121214] border border-white/5 rounded-2xl pl-12 pr-5 py-4 text-xs text-white focus:border-primary focus:bg-white/[0.02] outline-none transition-all placeholder:text-on-surface-variant/30"
          />
        </div>
      </div>

      {/* Pending Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-primary" size={36} />
          <p className="text-xs text-on-surface-variant font-display uppercase tracking-widest">Carregando Avaliações...</p>
        </div>
      ) : pendingItems.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/5 bg-white/[0.01]">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-on-surface-variant/40 mx-auto mb-4 border border-white/5">
            <Smartphone size={28} />
          </div>
          <p className="text-sm font-bold text-white">Nenhum aparelho aguardando avaliação</p>
          <p className="text-xs text-on-surface-variant mt-1">Todas as trocas recebidas já foram avaliadas e ativadas no estoque.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="glass-card rounded-3xl border border-white/5 bg-white/[0.01] p-6 hover:border-white/10 transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-1 bg-warning/10 border border-warning/20 text-warning text-[8px] font-black uppercase tracking-widest rounded-full">
                      Aguardando Avaliação
                    </span>
                    <h3 className="text-base font-black text-white mt-2 leading-tight">
                      {item.brand} {item.model}
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-on-surface-variant">
                    <Smartphone size={18} />
                  </div>
                </div>

                <div className="space-y-2 text-xs text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>IMEI/Serial:</span>
                    <span className="font-mono text-white">{item.imei || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Empresa de Origem:</span>
                    <span className="text-white font-medium flex items-center gap-1">
                      <Store size={12} className="opacity-60" /> {item.store_name || 'N/A'}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="pt-2 border-t border-white/5 text-[10px] italic leading-normal">
                      {item.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Valor de Custo (Abatimento)</p>
                  <p className="text-base font-black text-white font-mono">
                    R$ {(item.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenValuationModal(item)}
                  className="px-4 py-2.5 bg-primary hover:bg-primary/80 text-on-primary rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 shadow-md shadow-primary/20"
                >
                  <CheckCircle2 size={13} />
                  <span>Avaliar e Ativar</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ValuationForm({ item, onSuccess }: { item: InventoryItem; onSuccess: () => void }) {
  const { updateItem } = useInventoryStore();
  const [salePrice, setSalePrice] = useState(item.price || 0);
  const [tradeInPrice, setTradeInPrice] = useState(item.trade_in_price || 0);
  const [costPrice, setCostPrice] = useState(item.cost_price || 0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateItem(item.id, {
        price: salePrice,
        trade_in_price: tradeInPrice,
        cost_price: costPrice,
        status: 'available'
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left p-2">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Aparelho</label>
        <p className="text-sm font-black text-white">{item.brand} {item.model}</p>
        <p className="text-[10px] text-on-surface-variant font-mono">IMEI: {item.imei || 'N/A'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Valor de Custo (Abatimento)</label>
          <input
            type="number"
            required
            value={costPrice === 0 ? '' : costPrice}
            onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço à Vista</label>
          <input
            type="number"
            required
            autoFocus
            value={salePrice === 0 ? '' : salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço com Troca</label>
          <input
            type="number"
            required
            value={tradeInPrice === 0 ? '' : tradeInPrice}
            onChange={(e) => setTradeInPrice(Number(e.target.value) || 0)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-primary hover:bg-primary/80 text-on-primary rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-102 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="animate-spin" size={16} />}
        Ativar Aparelho de Troca
      </button>
    </form>
  );
}
