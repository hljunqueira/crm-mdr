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
  Building2,
  Upload,
  Download,
  ArrowRightLeft,
  Printer
} from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../store/useInventoryStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { useSupplierStore } from '../store/useSupplierStore';
import InventoryForm from '../components/inventory/InventoryForm';
import { cn } from '../lib/utils';

export default function Inventory() {
  const { inventory, deleteItem, fetchInventory, isLoading } = useInventoryStore();
  const { units: allStores, fetchAllUnits } = useUnitStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const { hasPermission, fetchUserPermissions } = usePermissionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

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

  // Use all configured stores for filter tabs
  const availableStores = allStores;

  const filteredInventory = inventory.filter(item => {
    const matchesSearch =
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.imei || '').includes(searchTerm) ||
      (item.barcode || '').includes(searchTerm) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStore = !isAdmin || selectedStore === 'all' || item.unit_id === selectedStore;
    const matchesStatus = showPendingOnly
      ? item.status === 'pending_valuation'
      : item.status !== 'pending_valuation';
    return matchesSearch && matchesCategory && matchesStore && matchesStatus;
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
      case 'service':
        return { label: 'Serviço / Mão de Obra', color: 'border-green-500/20 text-green-400 bg-green-500/5', icon: Wrench };
      case 'other':
        return { label: 'Outros', color: 'border-white/15 text-white/60 bg-white/5', icon: Package };
      default:
        return { label: 'Celular', color: 'border-blue-500/20 text-blue-400 bg-blue-500/5', icon: Smartphone };
    }
  };

  const handleAddItem = () => {
    showModal({
      title: 'Adicionar Produto ao Estoque',
      children: <InventoryForm onSuccess={() => { }} />,
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    showModal({
      title: 'Editar Produto',
      children: <InventoryForm item={item} onSuccess={() => { }} />,
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

  const handleDownloadTemplate = () => {
    const csvContent = "\uFEFFDescrição;Nome Curto;Categoria;Condicao;PrecoCusto;PrecoVenda;Quantidade;IMEI;CodigoBarras;Fornecedor;DataCompra\n" +
      "Samsung Galaxy S23 128GB;Galaxy S23;Celulares;Novo;3500.00;4999.00;1;123456789012345;7891234567890;Samsung Brasil;2026-06-10\n" +
      "Apple Carregador USB-C 20W;Carregador;Acessório;Novo;80.00;199.00;10;;888899992222;Distribuidora ABC;2026-06-05\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_estoque_mdr.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenImportModal = () => {
    showModal({
      title: 'Importar Produtos em Lote (CSV)',
      children: (
        <CSVImporter
          onSuccess={() => {
            hideModal();
            showNotification('success', 'Importação Concluída', 'Os produtos válidos foram cadastrados com sucesso!');
            fetchInventory(isAdmin ? undefined : (profile?.unit_id || undefined));
          }}
        />
      ),
    });
  };

  const handleOpenTransferModal = (item: InventoryItem) => {
    showModal({
      title: 'Transferir Produto entre Unidades',
      children: (
        <InventoryTransfer
          item={item}
          onSuccess={() => {
            hideModal();
            showNotification('success', 'Item Transferido', 'O estoque foi movimentado com sucesso!');
            fetchInventory(isAdmin ? undefined : (profile?.unit_id || undefined));
          }}
        />
      ),
    });
  };

  const handleOpenLabelsModal = (item: InventoryItem) => {
    showModal({
      title: 'Imprimir Etiquetas Térmicas',
      children: (
        <LabelsModal
          item={item}
        />
      ),
    });
  };

  const handleOpenValuationModal = (item: InventoryItem) => {
    showModal({
      title: 'Avaliar Aparelho de Troca',
      children: (
        <ValuationModal
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
          <h2 className="font-display text-3xl font-black text-white uppercase tracking-tight">Gestão de Estoque</h2>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Produtos e dispositivos</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission(profile, 'Estoque - Importar Planilha') && (
            <>
              <button
                onClick={handleDownloadTemplate}
                className="px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                <Download size={15} />
                <span>Modelo CSV</span>
              </button>
              <button
                onClick={handleOpenImportModal}
                className="px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                <Upload size={15} />
                <span>Importar</span>
              </button>
            </>
          )}
          {hasPermission(profile, 'Estoque - Adicionar Produto') && (
            <button
              onClick={handleAddItem}
              className="px-6 py-3 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              <Plus size={18} />
              <span>Novo Produto</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Modelos Diferentes', value: filteredInventory.length.toString(), icon: Smartphone, color: 'text-primary' },
          { label: 'Quantidade em Estoque', value: filteredInventory.filter(item => item.category !== 'service').reduce((sum, item) => sum + (item.stock_quantity || 0), 0).toString(), icon: Package, color: 'text-success' },
          { label: 'Valor do Estoque (Venda)', value: `R$ ${filteredInventory.filter(item => item.category !== 'service').reduce((sum, item) => sum + (item.price * (item.stock_quantity || 0)), 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-warning' },
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
          {availableStores.map(store => (
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

      {/* Status Filter Tabs — visible to admins only */}
      {isAdmin && (
        <div className="flex gap-2 pb-1 border-b border-white/5">
          <button
            type="button"
            onClick={() => setShowPendingOnly(false)}
            className={cn(
              "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
              !showPendingOnly
                ? 'bg-white text-black border-white shadow-lg'
                : 'bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/5'
            )}
          >
            Estoque Ativo
          </button>
          <button
            type="button"
            onClick={() => setShowPendingOnly(true)}
            className={cn(
              "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border relative",
              showPendingOnly
                ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/5'
            )}
          >
            Avaliações Pendentes
            {inventory.some(i => i.status === 'pending_valuation') && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#121224] rounded-full animate-pulse" />
            )}
          </button>
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
          { id: 'service', label: 'Serviços / Mão de Obra', icon: Wrench },
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-white transition-colors" size={20} />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Buscar por modelo, marca ou IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white transition-all font-display"
          />
        </div>
        <button
          onClick={() => {
            const input = document.getElementById('inventory-search-input');
            if (input) {
              input.focus();
              setSearchTerm('');
              showNotification('info', 'Leitor de Código Ativo', 'Bipe o código de barras ou IMEI para buscar.');
            }
          }}
          className="px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shrink-0"
          title="Bipar Código de Barras"
        >
          <Barcode size={18} className="text-primary animate-pulse" />
          <span>Bipar Código</span>
        </button>
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
                    item.status === 'pending_valuation' ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' :
                      (item.stock_quantity || 0) > 5 ? 'border-success/20 text-success bg-success/5' :
                        (item.stock_quantity || 0) > 0 ? 'border-warning/20 text-warning bg-warning/5' :
                          'border-error/20 text-error bg-error/5'
                  )}>
                    {item.status === 'pending_valuation' ? 'Aguardando Avaliação' :
                      (item.stock_quantity || 0) > 0 ? `${item.stock_quantity} unidades` : 'Sem estoque'}
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
                  <div className="space-y-2 mt-6 pt-6 border-t border-white/5">
                    {item.imei && (
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-black">
                        <Smartphone size={13} className="opacity-40" />
                        <span className="font-mono tracking-widest uppercase">IMEI: {item.imei}</span>
                      </div>
                    )}
                    {item.barcode && (
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-black">
                        <Barcode size={13} className="opacity-40 text-primary" />
                        <span className="font-mono tracking-widest uppercase">Cód: {item.barcode}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 pt-4 border-t border-white/5">
                      {item.status === 'pending_valuation' ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400/80">Valor do Abatimento (Custo)</span>
                            <span className="text-sm font-bold text-white font-mono">R$ {item.cost_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="text-[9px] text-on-surface-variant/60 uppercase tracking-wider mt-1 text-right">Aparelho ainda não precificado</div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Preço Venda Direta</span>
                            <span className="text-sm font-bold text-white">R$ {item.price.toLocaleString('pt-BR')}</span>
                          </div>
                          {item.trade_in_price !== undefined && item.trade_in_price !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Preço com Troca</span>
                              <span className="text-sm font-bold text-primary">R$ {Number(item.trade_in_price).toLocaleString('pt-BR')}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white/5 flex items-center justify-end gap-3 border-t border-white/5 flex-wrap">
                  {item.status === 'pending_valuation' ? (
                    <>
                      {hasPermission(profile, 'Estoque - Editar Produto') && (
                        <button
                          type="button"
                          onClick={() => handleOpenValuationModal(item)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/10 transition-all hover:scale-102"
                        >
                          <CheckCircle2 size={13} />
                          <span>Avaliar e Ativar</span>
                        </button>
                      )}
                      {hasPermission(profile, 'Estoque - Excluir Produto') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-error hover:bg-error/5 transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                          <span>Excluir</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {hasPermission(profile, 'Estoque - Transferir Produto') && (
                        <button
                          onClick={() => handleOpenTransferModal(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-primary hover:bg-primary/5 transition-all"
                          title="Transferir Unidade"
                        >
                          <ArrowRightLeft size={13} />
                          <span>Transferir</span>
                        </button>
                      )}
                      {item.barcode && (
                        <button
                          onClick={() => handleOpenLabelsModal(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-warning hover:bg-warning/5 transition-all"
                          title="Etiquetas de Código de Barras"
                        >
                          <Printer size={13} />
                          <span>Etiquetas</span>
                        </button>
                      )}
                      {hasPermission(profile, 'Estoque - Editar Produto') && (
                        <button
                          onClick={() => handleEditItem(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/5 transition-all"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>
                      )}
                      {hasPermission(profile, 'Estoque - Excluir Produto') && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-error hover:bg-error/5 transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                          <span>Excluir</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function CSVImporter({ onSuccess }: { onSuccess: () => void }) {
  const { profile } = useAuthStore();
  const { units } = useUnitStore();
  const { addItem, updateItem, inventory } = useInventoryStore();
  const { suppliers, fetchSuppliers, addSupplier } = useSupplierStore();
  const [file, setFile] = useState<File | null>(null);
  const [targetUnit, setTargetUnit] = useState(profile?.unit_id || '');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers(undefined, false).catch(() => {});
  }, [fetchSuppliers]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrors([]);
    setPreviewRows([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        // 1. Clean Byte Order Mark (BOM)
        const cleanText = text.replace(/^\uFEFF/, '');
        const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) {
          setErrors(['O arquivo está vazio.']);
          return;
        }

        // Helper to normalize strings for robust matching
        const normalizeString = (str: string): string => {
          return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, ''); // Keep only alphanumeric
        };

        // 2. Delimiter detection
        let separator = ',';
        const candidateLine = lines.find(l => l.includes(';') || l.includes(',') || l.includes('\t')) || lines[0];
        if (candidateLine) {
          if (candidateLine.includes(';')) separator = ';';
          else if (candidateLine.includes('\t')) separator = '\t';
          else if (candidateLine.includes(',')) separator = ',';
        }

        // Synonym lists mapped to keys
        const synonymsMap = {
          desc: ['descrição', 'descricao', 'description', 'nome', 'item', 'modelo', 'model', 'produto', 'desc', 'titulo', 'título', 'nome do produto', 'descrica', 'descricã', 'descriçã', 'descriça', 'descri'],
          shortName: ['nome curto', 'nome_curto', 'apelido', 'short_name', 'shortname', 'nome simplificado', 'nome_simplificado'],
          brand: ['marca', 'brand', 'fabricante', 'brand_name'],
          category: ['categoria', 'category', 'grupo', 'tipo'],
          condition: ['condicao', 'condição', 'condition', 'estado'],
          costPrice: ['precocusto', 'preço custo', 'custo_compra', 'custo', 'cost_price', 'preco_custo', 'valor_custo', 'valor custo'],
          salePrice: ['precovenda', 'preço venda', 'valor', 'preco', 'preço', 'price', 'sale_price', 'preco_venda', 'valor_venda', 'valor venda'],
          qty: ['quantidade', 'qtd', 'estoque', 'stock_quantity', 'quantity', 'quant', 'estoque_atual', 'disponiv', 'disponivel', 'disponiv', 'disponível'],
          imei: ['imei', 'serial', 'serial_number', 'n_serie', 'num_serie', 'série'],
          barcode: ['codigobarras', 'código barras', 'barcode', 'codigo_barras', 'cod_barras', 'ean', 'codigo'],
          supplier: ['fornecedor', 'supplier', 'distribuidor'],
          purchaseDate: ['datacompra', 'data_compra', 'purchase_date', 'data']
        };

        // 3. Find the best header row (first 5 rows check)
        let bestHeaderIdx = 0;
        let maxScore = -1;
        const rowsToAnalyze = Math.min(5, lines.length);

        for (let i = 0; i < rowsToAnalyze; i++) {
          const cells = lines[i].split(separator).map(c => normalizeString(c.trim().replace(/^["']|["']$/g, '')));
          let score = 0;
          
          Object.values(synonymsMap).forEach(syns => {
            const normalizedSyns = syns.map(s => normalizeString(s));
            if (cells.some(cell => normalizedSyns.includes(cell) || normalizedSyns.some(syn => cell.includes(syn) || syn.includes(cell)))) {
              score++;
            }
          });

          if (score > maxScore) {
            maxScore = score;
            bestHeaderIdx = i;
          }
        }

        const headers = lines[bestHeaderIdx].split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));

        // Robust two-pass fuzzy match helper
        const getHeaderIndex = (synonyms: string[]) => {
          const normalizedSynonyms = synonyms.map(s => normalizeString(s));
          
          // Pass 1: Exact match
          const exactIdx = headers.findIndex(h => {
            const normH = normalizeString(h);
            return normalizedSynonyms.includes(normH);
          });
          if (exactIdx !== -1) return exactIdx;

          // Pass 2: Fuzzy match (inclusion)
          return headers.findIndex(h => {
            const normH = normalizeString(h);
            if (!normH) return false;
            return normalizedSynonyms.some(syn => normH.includes(syn) || syn.includes(normH));
          });
        };

        const descIdx = getHeaderIndex(synonymsMap.desc);
        const shortNameIdx = getHeaderIndex(synonymsMap.shortName);
        const brandIdx = getHeaderIndex(synonymsMap.brand);
        const categoryIdx = getHeaderIndex(synonymsMap.category);
        const conditionIdx = getHeaderIndex(synonymsMap.condition);
        const costPriceIdx = getHeaderIndex(synonymsMap.costPrice);
        const salePriceIdx = getHeaderIndex(synonymsMap.salePrice);
        const qtyIdx = getHeaderIndex(synonymsMap.qty);
        const imeiIdx = getHeaderIndex(synonymsMap.imei);
        const barcodeIdx = getHeaderIndex(synonymsMap.barcode);
        const supplierIdx = getHeaderIndex(synonymsMap.supplier);
        const purchaseDateIdx = getHeaderIndex(synonymsMap.purchaseDate);

        // Helpers to parse prices and quantities robustly
        const parseNumber = (val: string): number => {
          if (!val) return 0;
          const clean = val.replace(/[R$\s]/g, '').trim();
          if (clean.includes('.') && clean.includes(',')) {
            return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
          }
          if (clean.includes(',')) {
            return parseFloat(clean.replace(',', '.')) || 0;
          }
          return parseFloat(clean) || 0;
        };

        const parseInteger = (val: string): number => {
          if (!val) return 1;
          const clean = val.replace(/\D/g, '');
          if (clean === '') return 1;
          return parseInt(clean, 10);
        };

        const parsedRows = [];
        for (let i = bestHeaderIdx + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
          
          const rawDescription = descIdx !== -1 ? (values[descIdx] || '') : '';
          const rawShortName = shortNameIdx !== -1 ? (values[shortNameIdx] || '') : '';
          const rawBrand = brandIdx !== -1 ? (values[brandIdx] || '') : '';
          const rawCategory = categoryIdx !== -1 ? (values[categoryIdx] || '') : '';
          const rawCondition = conditionIdx !== -1 ? (values[conditionIdx] || '') : '';
          const rawCostPrice = costPriceIdx !== -1 ? (values[costPriceIdx] || '') : '';
          const rawSalePrice = salePriceIdx !== -1 ? (values[salePriceIdx] || '') : '';
          const rawQty = qtyIdx !== -1 ? (values[qtyIdx] || '') : '';
          const rawImei = imeiIdx !== -1 ? (values[imeiIdx] || '') : '';
          const rawBarcode = barcodeIdx !== -1 ? (values[barcodeIdx] || '') : '';
          const rawSupplier = supplierIdx !== -1 ? (values[supplierIdx] || '') : '';
          const rawPurchaseDate = purchaseDateIdx !== -1 ? (values[purchaseDateIdx] || '') : '';

          let description = rawDescription || 'Produto Importado';
          let short_name = rawShortName;

          // If the sheet used Marca and Modelo columns instead of Descrição/Nome Curto
          const isLegacyModel = descIdx !== -1 && (headers[descIdx].toLowerCase().includes('model') || headers[descIdx].toLowerCase().includes('modelo'));
          if (rawBrand && rawDescription && !rawShortName && isLegacyModel) {
            description = `${rawBrand} ${rawDescription}`;
            short_name = rawDescription;
          }

          if (!short_name) {
            short_name = description.substring(0, 25);
          }
          if (short_name.length > 25) {
            short_name = short_name.substring(0, 25);
          }

          const firstWord = description.trim().split(/\s+/)[0] || '-';
          const brand = rawBrand || (firstWord.length > 20 ? firstWord.substring(0, 20) : firstWord);

          const cat = rawCategory.toLowerCase();
          let mappedCategory: 'smartphone' | 'accessory_mobile' | 'accessory_it' | 'part' | 'service' | 'other' = 'other';
          if (cat.includes('celular') || cat.includes('smartphone')) mappedCategory = 'smartphone';
          else if (cat.includes('acessório celular') || cat.includes('acessorio celular')) mappedCategory = 'accessory_mobile';
          else if (cat.includes('acessório ti') || cat.includes('acessorio ti')) mappedCategory = 'accessory_it';
          else if (cat.includes('acessório') || cat.includes('acessorio') || cat.includes('accessory')) mappedCategory = 'accessory_mobile';
          else if (cat.includes('peça') || cat.includes('peca')) mappedCategory = 'part';
          else if (cat.includes('serviço') || cat.includes('servico') || cat.includes('mão de obra') || cat.includes('mao de obra') || cat.includes('labor')) mappedCategory = 'service';

          const cond = rawCondition.toLowerCase();
          let mappedCondition: 'new' | 'used' | 'refurbished' | 'vitrine' = 'new';
          if (cond.includes('usado')) mappedCondition = 'used';
          else if (cond.includes('vitrine')) mappedCondition = 'vitrine';
          else if (cond.includes('recondicionado')) mappedCondition = 'refurbished';

          const numCost = parseNumber(rawCostPrice);
          const numSale = parseNumber(rawSalePrice);
          const numQty = parseInteger(rawQty);

          const rowErrors: string[] = [];
          if (numCost < 0) rowErrors.push('Preço de custo inválido.');
          if (numSale < 0) rowErrors.push('Preço de venda inválido.');
          if (numQty < 0) rowErrors.push('Quantidade inválida.');

          parsedRows.push({
            _line: i + 1,
            _errors: rowErrors,
            brand,
            model: short_name,
            description,
            short_name,
            mappedCategory,
            mappedCondition,
            numCost,
            numSale,
            numQty,
            imei: rawImei,
            barcode: rawBarcode,
            supplierVal: rawSupplier,
            purchaseDateVal: rawPurchaseDate
          });
        }

        setPreviewRows(parsedRows);
      } catch (err: any) {
        setErrors([`Erro ao processar arquivo: ${err.message}`]);
      }
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleImport = async () => {
    if (!targetUnit) {
      alert('Por favor, selecione a unidade.');
      return;
    }
    const invalidRows = previewRows.filter(r => r._errors.length > 0);
    if (invalidRows.length > 0) {
      if (!confirm(`Existem ${invalidRows.length} linhas com erros que serão ignoradas. Confirmar importação das demais?`)) {
        return;
      }
    }

    const validRows = previewRows.filter(r => r._errors.length === 0);
    if (validRows.length === 0) {
      alert('Nenhuma linha válida para importar.');
      return;
    }

    // Security check: non-admins cannot update existing items
    const hasExistingUpdates = validRows.some(row => {
      const isDevice = row.mappedCategory === 'smartphone';
      const hasBarcode = !!row.barcode;
      if (!isDevice && hasBarcode) {
        const existing = inventory.find(i => i.unit_id === targetUnit && i.barcode === row.barcode);
        return !!existing;
      }
      return false;
    });

    if (hasExistingUpdates && profile?.role !== 'admin') {
      alert('Apenas administradores podem atualizar quantidades ou preços de produtos já existentes via planilha.');
      return;
    }

    setLoading(true);
    try {
      const activeSuppliers = [...suppliers];

      for (const row of validRows) {
        const isDevice = row.mappedCategory === 'smartphone';
        const hasBarcode = !!row.barcode;
        const supplierName = (row.supplierVal || '').trim();

        if (supplierName) {
          const exists = activeSuppliers.some(s => s.name.trim().toLowerCase() === supplierName.toLowerCase());
          if (!exists) {
            try {
              const created = await addSupplier({
                name: supplierName,
                unit_id: targetUnit || profile?.unit_id || undefined
              });
              activeSuppliers.push(created);
            } catch (err) {
              console.error('Error auto-creating supplier during CSV import:', err);
            }
          }
        }

        let merged = false;
        if (!isDevice && hasBarcode) {
          const existing = inventory.find(i => i.unit_id === targetUnit && i.barcode === row.barcode);
          if (existing) {
            await updateItem(existing.id, {
              stock_quantity: existing.stock_quantity + row.numQty,
              cost_price: row.numCost,
              price: row.numSale,
              supplier: row.supplierVal || undefined,
              purchase_date: row.purchaseDateVal || undefined,
              description: row.description,
              short_name: row.short_name
            });
            merged = true;
          }
        }

        if (!merged) {
          await addItem({
            unit_id: targetUnit,
            brand: row.brand,
            model: row.model,
            category: row.mappedCategory,
            condition: row.mappedCondition,
            cost_price: row.numCost,
            price: row.numSale,
            stock_quantity: row.numQty,
            imei: row.imei || '',
            barcode: row.barcode || '',
            supplier: row.supplierVal || '',
            purchase_date: row.purchaseDateVal || '',
            description: row.description,
            short_name: row.short_name,
            status: 'available'
          });
        }
      }
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Erro ao importar itens.');
    } finally {
      setLoading(false);
    }
  };

  const hasAdminRole = profile?.role === 'admin';

  return (
    <div className="space-y-6 text-white text-xs max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      {hasAdminRole && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Unidade de Destino</label>
          <select
            value={targetUnit}
            onChange={(e) => setTargetUnit(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-white outline-none transition-all appearance-none"
          >
            <option value="" className="bg-surface-container-high">-- Selecione a Unidade --</option>
            {units.map(u => (
              <option key={u.id} value={u.id} className="bg-surface-container-high">{u.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Selecionar Arquivo CSV</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-white outline-none transition-all"
        />
      </div>

      {errors.map((err, i) => (
        <div key={i} className="p-4 bg-error/10 border border-error/20 rounded-2xl text-error font-bold flex items-center gap-3">
          <AlertTriangle size={16} />
          {err}
        </div>
      ))}

      {previewRows.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Pré-visualização</h4>
          <div className="border border-white/5 rounded-2xl overflow-x-auto max-h-60">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                  <th className="p-3 text-center">Linha</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Nome Curto</th>
                  <th className="p-3">Qtd</th>
                  <th className="p-3">Custo</th>
                  <th className="p-3">Venda</th>
                  <th className="p-3">Status / Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {previewRows.map((row, idx) => {
                  const hasRowErrors = row._errors.length > 0;
                  return (
                    <tr key={idx} className={cn("hover:bg-white/5 transition-all text-[11px]", hasRowErrors ? "bg-error/5 text-error" : "")}>
                      <td className="p-3 text-center font-bold text-on-surface-variant">{row._line}</td>
                      <td className="p-3 font-semibold">{row.description}</td>
                      <td className="p-3">{row.short_name}</td>
                      <td className="p-3 font-mono">{row.numQty}</td>
                      <td className="p-3 font-mono">R$ {row.numCost.toFixed(2)}</td>
                      <td className="p-3 font-mono">R$ {row.numSale.toFixed(2)}</td>
                      <td className="p-3 font-semibold max-w-[200px] truncate">
                        {hasRowErrors ? (
                          <span className="text-error" title={row._errors.join(' | ')}>{row._errors[0]}</span>
                        ) : (
                          <span className="text-success">Válido</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={15} /> : 'Confirmar Importação'}
          </button>
        </div>
      )}
    </div>
  );
}

function InventoryTransfer({ item, onSuccess }: { item: InventoryItem; onSuccess: () => void }) {
  const { units } = useUnitStore();
  const { updateItem, addItem, inventory } = useInventoryStore();
  const [targetUnit, setTargetUnit] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const maxQty = item.stock_quantity || 1;
  const isDevice = item.category === 'smartphone';

  const handleTransfer = async () => {
    if (!targetUnit) {
      alert('Selecione a unidade de destino.');
      return;
    }
    if (qty <= 0 || qty > maxQty) {
      alert('Quantidade inválida.');
      return;
    }

    setLoading(true);
    try {
      if (qty === maxQty) {
        // Move the entire record
        await updateItem(item.id, { unit_id: targetUnit });
      } else {
        // Partial transfer
        // 1. Subtract qty from source item
        await updateItem(item.id, { stock_quantity: maxQty - qty });

        // 2. Find if matching item already exists in target unit to merge
        const existing = isDevice
          ? inventory.find(
              (i) =>
                i.unit_id === targetUnit &&
                i.model.toLowerCase() === item.model.toLowerCase() &&
                i.brand.toLowerCase() === item.brand.toLowerCase() &&
                i.condition === item.condition &&
                i.imei === item.imei
            )
          : inventory.find((i) => i.unit_id === targetUnit && i.barcode === item.barcode);

        if (existing) {
          await updateItem(existing.id, { stock_quantity: existing.stock_quantity + qty });
        } else {
          await addItem({
            unit_id: targetUnit,
            brand: item.brand,
            model: item.model,
            category: item.category,
            condition: item.condition,
            cost_price: item.cost_price,
            price: item.price,
            stock_quantity: qty,
            imei: item.imei || '',
            barcode: item.barcode || '',
            status: 'available'
          });
        }
      }
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Erro na transferência.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = units.filter(u => u.id !== item.unit_id);

  return (
    <div className="space-y-6 text-white text-xs">
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Produto a ser Transferido</p>
        <p className="text-sm font-black uppercase text-white">{item.brand} {item.model}</p>
        <p className="text-[10px] text-on-surface-variant opacity-60">Unidade Origem: {item.store_name || 'Geral'}</p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Unidade Destino</label>
        <select
          value={targetUnit}
          onChange={(e) => setTargetUnit(e.target.value)}
          className="w-full bg-[#121215] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-white outline-none transition-all appearance-none"
        >
          <option value="" className="bg-surface-container-high">-- Selecione a Unidade --</option>
          {filteredUnits.map(u => (
            <option key={u.id} value={u.id} className="bg-surface-container-high">{u.name}</option>
          ))}
        </select>
      </div>

      {maxQty > 1 && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Quantidade a Transferir (Max: {maxQty})</label>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            className="w-full bg-[#121215] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-white outline-none transition-all font-mono"
          />
        </div>
      )}

      <button
        onClick={handleTransfer}
        disabled={loading}
        className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all shadow-xl disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={15} /> : 'Transferir Agora'}
      </button>
    </div>
  );
}

function LabelsModal({ item }: { item: InventoryItem }) {
  const [quantity, setQuantity] = useState(item.stock_quantity || 1);
  const [showModel, setShowModel] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const displayName = (item.short_name || item.model || `${item.brand} ${item.model}`).trim();

    const barcodeHtml = Array.from({ length: quantity }, () => `
      <div class="label-card">
        ${showModel ? `<div class="model">${displayName}</div>` : ''}
        <div class="barcode">${item.barcode}</div>
        <div class="barcode-text">${item.barcode}</div>
        ${showPrice ? '<div class="price">R$ ' + item.price.toFixed(2) + '</div>' : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Etiquetas</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&family=Inter:wght@400;700;900&display=swap');
            @page {
              size: 40mm 25mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Inter', sans-serif;
              background: white;
              color: black;
              -webkit-print-color-adjust: exact;
            }
            .label-card {
              width: 40mm;
              height: 25mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              padding: 1mm 2mm;
              page-break-after: always;
              overflow: hidden;
            }
            .logo {
              font-family: 'Inter', Arial, sans-serif !important;
              color: black !important;
              font-size: 8px;
              font-weight: 900;
              margin-bottom: 0.5mm;
              letter-spacing: 0.5px;
            }
            .model {
              font-family: 'Inter', Arial, sans-serif !important;
              color: black !important;
              font-size: 8px;
              font-weight: 800;
              max-width: 36mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 0.5mm;
              text-transform: uppercase;
            }
            .barcode {
              font-family: 'Libre Barcode 128', sans-serif !important;
              font-size: 24px;
              line-height: 1;
              margin: 0.5mm 0;
            }
            .barcode-text {
              font-family: monospace !important;
              color: black !important;
              font-size: 6px;
              letter-spacing: 1px;
              margin-bottom: 0.5mm;
            }
            .price {
              font-family: 'Inter', Arial, sans-serif !important;
              color: black !important;
              font-size: 8px;
              font-weight: 900;
            }
          </style>
        </head>
        <body>
          ${barcodeHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-white text-xs">
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
        <p className="font-bold text-sm text-white">{item.model}</p>
        <p className="text-[10px] text-on-surface-variant font-mono">Código: {item.barcode}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Quantidade de Etiquetas</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-white outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showModel}
              onChange={(e) => setShowModel(e.target.checked)}
              className="w-4 h-4 rounded bg-white/5 border border-white/10 text-primary focus:ring-0"
            />
            <span>Exibir nome do produto</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
              className="w-4 h-4 rounded bg-white/5 border border-white/10 text-primary focus:ring-0"
            />
            <span>Exibir preço de venda</span>
          </label>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all shadow-xl"
      >
        <Printer size={15} /> Imprimir Etiquetas
      </button>
    </div>
  );
}

function ValuationModal({ item, onSuccess }: { item: InventoryItem; onSuccess: () => void }) {
  const { updateItem } = useInventoryStore();
  const [salePrice, setSalePrice] = useState(item.price || 0);
  const [costPrice, setCostPrice] = useState(item.cost_price || 0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateItem(item.id, {
        price: salePrice,
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

      <div className="grid grid-cols-2 gap-4">
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
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço de Revenda Estimado</label>
          <input
            type="number"
            required
            autoFocus
            value={salePrice === 0 ? '' : salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
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
        Aprovar e Ativar no Estoque
      </button>
    </form>
  );
}
