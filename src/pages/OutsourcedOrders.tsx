import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, Search, Loader2, AlertCircle, Wrench, ShieldAlert,
  ArrowLeft, Truck, DollarSign, Calendar, Edit, Trash2, CheckCircle2
} from 'lucide-react';
import { useServiceOrderStore } from '../store/useServiceOrderStore';
import { useUI } from '../context/UIContext';
import { formatCPF, formatPhone } from '../lib/utils';

export default function OutsourcedOrders() {
  const { fetchGlobalOutsourced, updateOutsourcedOs, removeOutsourceOs } = useServiceOrderStore();
  const { showNotification } = useUI();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form edit fields
  const [editForm, setEditForm] = useState({
    partner_shop_name: '',
    partner_technician_name: '',
    external_status: 'sent',
    external_cost: 0,
    tracking_code: '',
    notes: ''
  });

  const loadOutsourcedOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchGlobalOutsourced();
      setOrders(data || []);
    } catch (err) {
      showNotification('error', 'Falha ao buscar OS terceirizadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutsourcedOrders();
  }, []);

  const handleOpenEdit = (order: any) => {
    setSelectedOrder(order);
    setEditForm({
      partner_shop_name: order.partner_shop_name || '',
      partner_technician_name: order.partner_technician_name || '',
      external_status: order.external_status || 'sent',
      external_cost: Number(order.external_cost) || 0,
      tracking_code: order.tracking_code || '',
      notes: order.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await updateOutsourcedOs(selectedOrder.os_id, selectedOrder.id, editForm);
      showNotification('success', 'OS Terceirizada atualizada com sucesso!');
      setIsEditModalOpen(false);
      loadOutsourcedOrders();
    } catch (err) {
      showNotification('error', 'Erro ao atualizar dados externos.');
    }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    if (!confirm('Deseja realmente remover o vínculo terceirizado desta OS? A OS principal voltará ao fluxo normal.')) return;

    setIsDeleting(true);
    try {
      await removeOutsourceOs(selectedOrder.os_id, selectedOrder.id);
      showNotification('success', 'Vínculo de terceirização removido.');
      setIsEditModalOpen(false);
      loadOutsourcedOrders();
    } catch (err) {
      showNotification('error', 'Erro ao remover vínculo.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase();
    const matchSearch = 
      String(order.service_orders?.os_number).includes(search) ||
      (order.partner_shop_name || '').toLowerCase().includes(search) ||
      (order.service_orders?.customers?.name || '').toLowerCase().includes(search) ||
      (order.service_orders?.device_model || '').toLowerCase().includes(search);

    const matchStatus = statusFilter === 'all' || order.external_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return { label: 'Enviado p/ Parceiro', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' };
      case 'repairing':
        return { label: 'Em Análise Técnico', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
      case 'ready':
        return { label: 'Reparo Concluído', color: 'bg-green-500/10 border-green-500/20 text-green-400' };
      case 'returned':
        return { label: 'Retornado / Entregue', color: 'bg-white/10 border-white/20 text-white/60' };
      default:
        return { label: status, color: 'bg-white/5 border-white/10 text-white' };
    }
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight flex items-center gap-3">
          <ExternalLink className="text-primary" size={32} /> OS Terceirizadas
        </h1>
        <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">
          Gerenciamento e Rastreamento de Aparelhos Enviados para Laboratórios Parceiros
        </p>
      </div>

      {/* FILTROS & BARRA DE BUSCA */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.02] border border-outline-variant/30 rounded-[32px] p-5">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Buscar por OS, parceiro, cliente ou modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-primary outline-none transition-all text-white"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {['all', 'sent', 'repairing', 'ready', 'returned'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === status 
                  ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20' 
                  : 'bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/10'
              }`}
            >
              {status === 'all' ? 'Ver Todos' : getStatusLabel(status).label}
            </button>
          ))}
        </div>
      </div>

      {/* RESULTADOS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-xs text-on-surface-variant uppercase tracking-widest font-mono">Carregando remessas terceiras...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-8 py-20 text-center flex flex-col items-center justify-center gap-4 opacity-50">
          <Truck size={64} className="text-on-surface-variant opacity-25" />
          <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Nenhuma OS terceirizada encontrada</h3>
          <p className="text-xs text-on-surface-variant max-w-sm">Você pode terceirizar uma OS clicando no botão "Terceirizar OS" dentro dos detalhes de uma OS principal na tela de Assistência Técnica.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map(order => {
            const statusInfo = getStatusLabel(order.external_status);
            const mainOs = order.service_orders;
            const profitMargin = mainOs ? (Number(mainOs.labor_value + mainOs.parts_value) - Number(order.external_cost)) : 0;

            return (
              <div 
                key={order.id} 
                className="bg-white/[0.02] border border-outline-variant/30 rounded-[32px] p-6 flex flex-col justify-between space-y-4 hover:border-primary/30 transition-all hover:scale-[1.01] shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full uppercase tracking-wider font-mono">
                        OS #{String(mainOs?.os_number).padStart(4, '0')}
                      </span>
                      <h4 className="text-sm font-black text-white mt-1 uppercase leading-tight">
                        {mainOs?.device_brand} {mainOs?.device_model}
                      </h4>
                    </div>
                    <span className={`text-[8px] font-black px-2.5 py-1 border rounded-lg uppercase tracking-wider ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Laboratório Parceiro:</span>
                      <span className="font-bold text-white text-right">{order.partner_shop_name}</span>
                    </div>
                    {order.partner_technician_name && (
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Técnico Externo:</span>
                        <span className="font-semibold text-white text-right">{order.partner_technician_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Cliente MDR:</span>
                      <span className="font-semibold text-white text-right">{mainOs?.customers?.name}</span>
                    </div>
                    {order.tracking_code && (
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Cód. Rastreio:</span>
                        <span className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-white font-bold select-all">
                          {order.tracking_code}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                      <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Custo Terceiro</p>
                      <p className="font-mono text-sm font-black text-red-400 mt-0.5">
                        R$ {Number(order.external_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                      <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Margem Real OS</p>
                      <p className={`font-mono text-sm font-black mt-0.5 ${profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        R$ {profitMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleOpenEdit(order)}
                    className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <Edit size={12} /> Gerenciar Status e Remessa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO / EDIÇÃO DA OS TERCEIRIZADA */}
      {isEditModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-outline-variant/30 w-full max-w-lg rounded-[40px] p-6 md:p-8 space-y-6 animate-in zoom-in duration-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Gerenciar Envio Externo</h3>
                <p className="text-[8px] text-on-surface-variant uppercase tracking-widest">OS #{String(selectedOrder.service_orders?.os_number).padStart(4, '0')} - {selectedOrder.service_orders?.device_brand} {selectedOrder.service_orders?.device_model}</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-on-surface-variant hover:text-white transition-all text-lg font-black"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Loja/Laboratório Parceiro</label>
                  <input
                    type="text"
                    required
                    value={editForm.partner_shop_name}
                    onChange={(e) => setEditForm(p => ({ ...p, partner_shop_name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Técnico Externo Responsável</label>
                  <input
                    type="text"
                    value={editForm.partner_technician_name}
                    onChange={(e) => setEditForm(p => ({ ...p, partner_technician_name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Status Externo</label>
                  <select
                    value={editForm.external_status}
                    onChange={(e) => setEditForm(p => ({ ...p, external_status: e.target.value }))}
                    className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none"
                  >
                    <option value="sent">🔵 Enviado p/ Parceiro</option>
                    <option value="repairing">🟡 Em Análise Técnico</option>
                    <option value="ready">🟢 Reparo Concluído</option>
                    <option value="returned">⚪ Retornado / Entregue</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Custo Cobrado pelo Terceiro (R$)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.external_cost}
                      onChange={(e) => setEditForm(p => ({ ...p, external_cost: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-8 pr-4 py-3 text-xs text-white focus:border-primary outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Código de Rastreamento (Motoboy / Correios)</label>
                <div className="relative">
                  <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Ex: AR123456789BR, Motoboy João"
                    value={editForm.tracking_code}
                    onChange={(e) => setEditForm(p => ({ ...p, tracking_code: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-8 pr-4 py-3 text-xs text-white focus:border-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Notas / Laudo Técnico do Terceiro</label>
                <textarea
                  rows={3}
                  placeholder="Informações adicionais trazidas do laboratório externo..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> Remover Terceirização
                </button>
                
                <div className="flex-1 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="py-3.5 px-6 bg-white/5 border border-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="py-3.5 px-6 bg-primary text-on-primary rounded-2xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-primary/20 flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={12} /> Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
