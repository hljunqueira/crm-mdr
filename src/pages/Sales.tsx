
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Smartphone, ShoppingBag, Clock,
  CheckCircle2, AlertCircle, MoreVertical, Filter,
  DollarSign, Calendar, Layers, ShieldCheck, Tag,
  Package, ArrowRight, Edit, Trash2, TrendingUp,
  Printer, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSaleStore, Sale } from '../store/useSaleStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import SaleForm from '../components/sales/SaleForm';
import SaleContract from '../components/sales/SaleContract';

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState('');
  const { sales, fetchSales, deleteSale, isLoading } = useSaleStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { profile } = useAuthStore();
  const { showNotification, showModal, hideModal } = useUI();

  useEffect(() => {
    fetchSales(profile?.unit_id || undefined);
    fetchCustomers(profile?.unit_id || undefined);
  }, [profile?.unit_id, fetchSales, fetchCustomers]);

  const filteredSales = sales.filter(s => 
    (s.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    s.device_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.imei.includes(searchTerm)
  );

  const handlePrintContract = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customer_id);
    
    if (!customer) {
      showNotification('error', 'Erro', 'Cliente não encontrado para esta venda.');
      return;
    }

    showModal({
      title: 'Contrato de Venda',
      children: (
        <div className="space-y-6">
          <div className="max-h-[60vh] overflow-y-auto bg-white rounded-xl">
            <SaleContract 
              sale={sale as any} 
              customer={customer} 
              installments={[]} 
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => hideModal()}
              className="px-6 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-white/5 transition-all"
            >
              Fechar
            </button>
            <button 
              onClick={() => window.print()}
              className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <Printer size={18} />
              Imprimir Agora
            </button>
          </div>
        </div>
      ),
    });
  };

  const handleDeleteSale = (sale: Sale) => {
    showModal({
      title: 'Excluir Venda',
      children: `Tem certeza que deseja excluir a venda de ${sale.device_model} para ${sale.customer_name}?`,
      type: 'danger',
      confirmText: 'Excluir',
      onConfirm: async () => {
        await deleteSale(sale.id);
        showNotification('success', 'Venda Removida');
      }
    });
  };

  const handleEditSale = (sale: Sale) => {
    showModal({
      title: 'Editar Venda',
      children: (
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <SaleForm 
            initialData={sale}
            onSuccess={() => {
              hideModal();
              fetchSales(profile?.unit_id || undefined);
            }} 
            onCancel={() => hideModal()} 
          />
        </div>
      ),
    });
  };

  const handleNewSale = () => {
    showModal({
      title: 'Registrar Nova Venda',
      children: (
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <SaleForm 
            onSuccess={() => {
              hideModal();
              fetchSales(profile?.unit_id || undefined);
            }} 
            onCancel={() => hideModal()} 
          />
        </div>
      ),
    });
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Vendas & Contratos</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Aparelhos e Financeiro</p>
        </div>
        <button 
          onClick={handleNewSale}
          className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
        >
          <Smartphone size={18} />
          Nova Venda
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary mb-4 border border-white/10">
            <ShoppingBag size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Volume de Vendas</p>
          <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">R$ {sales.reduce((acc, s) => acc + s.total_value, 0).toLocaleString('pt-BR')}</h3>
        </div>
        
        <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white mb-4 border border-white/10">
            <Smartphone size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Aparelhos Vendidos</p>
          <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{sales.length}</h3>
        </div>

        <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-error mb-4 border border-white/10">
            <ShieldCheck size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Contratos Atrasados</p>
          <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{sales.filter(s => s.status === 'overdue').length}</h3>
        </div>
      </div>

      <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, modelo ou IMEI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-12 pr-6 py-4 text-sm focus:border-white outline-none transition-all font-display"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
              <Loader2 className="animate-spin" size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Vendas...</span>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
              <ShoppingBag size={48} className="text-on-surface-variant mb-2 opacity-20" />
              <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhuma venda encontrada</p>
              <p className="text-[10px] font-display text-on-surface-variant opacity-70">Nenhuma venda corresponde aos seus critérios de busca ou sua lista está vazia.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Cliente</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Aparelho</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Condições</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSales.map((sale) => (
                  <motion.tr 
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none group-hover:text-white transition-colors">{sale.customer_name}</p>
                        <p className="text-[9px] font-mono text-primary font-black uppercase tracking-widest mt-1 opacity-60">ID: {sale.id.split('-')[0]}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-on-surface-variant border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-on-surface uppercase tracking-tight">{sale.device_model}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono uppercase opacity-60">{sale.imei}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-on-surface">R$ {sale.total_value.toLocaleString('pt-BR')}</p>
                        <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-tight opacity-60">
                          {sale.installments}x de R$ {(sale.total_value / sale.installments).toFixed(2)}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        sale.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                        sale.status === 'processing' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                        'bg-error/10 text-error border-error/20'
                      }`}>
                        <div className="w-1 h-1 rounded-full bg-current" />
                        {sale.status === 'completed' ? 'Em dia' : 
                         sale.status === 'processing' ? 'Pendente' : 'Atrasado'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handlePrintContract(sale)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-all text-on-surface-variant hover:text-white"
                          title="Imprimir Contrato"
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          onClick={() => handleEditSale(sale)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-all text-on-surface-variant hover:text-primary"
                          title="Editar Venda"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSale(sale)}
                          className="p-2 hover:bg-error/10 rounded-xl transition-all text-on-surface-variant hover:text-error"
                          title="Excluir Venda"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
