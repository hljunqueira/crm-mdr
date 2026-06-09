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
  ArrowRightLeft
} from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../store/useInventoryStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
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
    const csvContent = "\uFEFFMarca;Modelo;Categoria;Condicao;PrecoCusto;PrecoVenda;Quantidade;IMEI;CodigoBarras\n" +
      "Samsung;Galaxy S23;Celulares;Novo;3500.00;4999.00;1;123456789012345;7891234567890\n" +
      "Apple;Carregador MagSafe 20W;Acessórios Celular;Novo;80.00;199.00;10;;888899992222\n";

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
                    <div className="flex items-center justify-between pt-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Preço Sugerido</span>
                      <span className="text-xl font-black text-white">R$ {item.price.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white/5 flex items-center justify-end gap-3 border-t border-white/5 flex-wrap">
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
  const [file, setFile] = useState<File | null>(null);
  const [targetUnit, setTargetUnit] = useState(profile?.unit_id || '');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) {
          setErrors(['O arquivo está vazio.']);
          return;
        }

        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

        const expected = ['marca', 'modelo', 'categoria', 'condicao', 'precocusto', 'precovenda', 'quantidade', 'imei', 'codigobarras'];
        const missing = expected.filter(exp => !headers.includes(exp));
        if (missing.length > 0) {
          setErrors([`Colunas ausentes no CSV: ${missing.join(', ')}`]);
          return;
        }

        const parsedRows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
          const rowData: any = {};
          headers.forEach((header, idx) => {
            rowData[header] = values[idx] || '';
          });

          const rowErrors: string[] = [];

          if (!rowData.marca) rowErrors.push('Marca é obrigatória.');
          if (!rowData.modelo) rowErrors.push('Modelo é obrigatório.');

          const cat = (rowData.categoria || '').toLowerCase();
          let mappedCategory = 'other';
          if (cat.includes('celular') || cat.includes('smartphone')) mappedCategory = 'smartphone';
          else if (cat.includes('acessório celular') || cat.includes('acessorio celular')) mappedCategory = 'accessory_mobile';
          else if (cat.includes('acessório ti') || cat.includes('acessorio ti')) mappedCategory = 'accessory_it';
          else if (cat.includes('peça') || cat.includes('peca')) mappedCategory = 'part';

          const cond = (rowData.condicao || '').toLowerCase();
          let mappedCondition = 'new';
          if (cond.includes('usado')) mappedCondition = 'used';
          else if (cond.includes('vitrine') || cond.includes('recondicionado')) mappedCondition = 'refurbished';

          const numCost = parseFloat((rowData.precocusto || '').replace(',', '.')) || 0;
          const numSale = parseFloat((rowData.precovenda || '').replace(',', '.')) || 0;
          const numQty = parseInt(rowData.quantidade, 10) || 0;

          if (numCost < 0) rowErrors.push('Preço de custo inválido.');
          if (numSale < 0) rowErrors.push('Preço de venda inválido.');
          if (numQty <= 0) rowErrors.push('Quantidade inválida.');

          if (mappedCategory === 'smartphone' && !rowData.imei) {
            rowErrors.push('IMEI é obrigatório para celulares.');
          }

          parsedRows.push({
            ...rowData,
            _line: i + 1,
            _errors: rowErrors,
            mappedCategory,
            mappedCondition,
            numCost,
            numSale,
            numQty
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

    setLoading(true);
    try {
      for (const row of validRows) {
        const isDevice = row.mappedCategory === 'smartphone';
        const hasBarcode = !!row.codigobarras;

        let merged = false;
        if (!isDevice && hasBarcode) {
          const existing = inventory.find(i => i.unit_id === targetUnit && i.barcode === row.codigobarras);
          if (existing) {
            await updateItem(existing.id, {
              stock_quantity: existing.stock_quantity + row.numQty,
              cost_price: row.numCost,
              price: row.numSale
            });
            merged = true;
          }
        }

        if (!merged) {
          await addItem({
            unit_id: targetUnit,
            brand: row.marca,
            model: row.modelo,
            category: row.mappedCategory,
            condition: row.mappedCondition,
            cost_price: row.numCost,
            price: row.numSale,
            stock_quantity: row.numQty,
            imei: row.imei || '',
            barcode: row.codigobarras || '',
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
                  <th className="p-3">Marca</th>
                  <th className="p-3">Modelo</th>
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
                      <td className="p-3 font-semibold">{row.marca}</td>
                      <td className="p-3">{row.modelo}</td>
                      <td className="p-3 font-mono">{row.quantidade}</td>
                      <td className="p-3 font-mono">R$ {row.precocusto}</td>
                      <td className="p-3 font-mono">R$ {row.precovenda}</td>
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
