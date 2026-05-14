import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../store/useInventoryStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import InventoryForm from '../components/inventory/InventoryForm';
import { cn } from '../lib/utils';

export default function Inventory() {
  const { inventory, deleteItem, fetchInventory, isLoading } = useInventoryStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInventory(profile?.unit_id || undefined);
  }, [profile?.unit_id, fetchInventory]);

  const filteredInventory = inventory.filter(item => 
    item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.imei.includes(searchTerm) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          { label: 'Total em Estoque', value: inventory.length.toString(), icon: Smartphone, color: 'text-primary' },
          { label: 'Disponíveis', value: inventory.filter(i => i.status === 'available').length.toString(), icon: CheckCircle2, color: 'text-success' },
          { label: 'Em Reparo', value: inventory.filter(i => i.status === 'in_repair').length.toString(), icon: AlertTriangle, color: 'text-warning' },
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
                    <Smartphone size={24} />
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    item.status === 'available' ? 'border-success/20 text-success' :
                    item.status === 'sold' ? 'border-primary/20 text-primary' :
                    'border-warning/20 text-warning'
                  )}>
                    {item.status === 'available' ? 'Disponível' : 
                     item.status === 'sold' ? 'Vendido' : 
                     item.status === 'reserved' ? 'Reservado' : 'Em Reparo'}
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">{item.model}</h3>
                <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">
                  {item.brand} • {item.condition === 'new' ? 'Novo' : item.condition === 'used' ? 'Usado' : 'Vitrine'}
                </p>

                <div className="space-y-2 mt-6 pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-black">
                    <Barcode size={14} className="opacity-40" />
                    <span className="font-mono tracking-widest uppercase">{item.imei}</span>
                  </div>
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
