import React, { useState } from 'react';
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
  Barcode
} from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../store/useInventoryStore';
import { useUI } from '../context/UIContext';
import InventoryForm from '../components/inventory/InventoryForm';

export default function Inventory() {
  const { inventory, deleteItem } = useInventoryStore();
  const { showModal, showNotification } = useUI();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInventory = inventory.filter(item => 
    item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.imei.includes(searchTerm) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = () => {
    showModal({
      title: 'Adicionar Produto ao Estoque',
      content: <InventoryForm onSuccess={() => {}} />,
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    showModal({
      title: 'Editar Produto',
      content: <InventoryForm item={item} onSuccess={() => {}} />,
    });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item do estoque?')) {
      deleteItem(id);
      showNotification('success', 'Item Removido', 'Produto excluído com sucesso.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-white tracking-tight">Gestão de Estoque</h2>
          <p className="text-on-surface-variant font-medium mt-1">Produtos e dispositivos para venda.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="glass-button flex items-center gap-2 group">
            <History size={18} className="group-hover:rotate-[-45deg] transition-transform" />
            <span>Histórico</span>
          </button>
          <button 
            onClick={handleAddItem}
            className="px-6 py-3 bg-primary text-on-primary rounded-2xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
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
          <div key={i} className="glass-card p-6 rounded-3xl border border-outline-variant/30">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-surface flex items-center justify-center ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60">{stat.label}</p>
                <p className="text-2xl font-black text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por modelo, marca ou IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
        <button className="glass-button flex items-center gap-2 px-6">
          <Filter size={20} />
          <span>Filtros</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((item) => (
          <motion.div 
            layout
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden h-full flex flex-col border border-outline-variant/30 rounded-[32px] group hover:border-white/20 transition-all"
          >
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-surface rounded-2xl text-primary border border-outline-variant/20 shadow-sm">
                  <Smartphone size={24} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  item.status === 'available' ? 'border-success/20 text-success' :
                  item.status === 'sold' ? 'border-primary/20 text-primary' :
                  'border-warning/20 text-warning'
                }`}>
                  {item.status === 'available' ? 'Disponível' : 
                   item.status === 'sold' ? 'Vendido' : 
                   item.status === 'reserved' ? 'Reservado' : 'Em Reparo'}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{item.model}</h3>
              <p className="text-sm text-on-surface-variant font-medium mb-4">{item.brand} • {item.condition === 'new' ? 'Novo' : item.condition === 'used' ? 'Usado' : 'Vitrine'}</p>

              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <Barcode size={14} />
                  <span className="font-mono">IMEI: {item.imei}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
                  <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Preço</span>
                  <span className="text-xl font-black text-white">R$ {item.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-surface-container-highest/30 flex items-center justify-end gap-2">
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
    </div>
  );
}
