
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Smartphone, 
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Filter,
  DollarSign,
  Calendar,
  Layers,
  ShieldCheck,
  Tag,
  Package,
  ArrowRight,
  Edit,
  Trash2,
  TrendingUp,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSaleStore, Sale } from '../store/useSaleStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';
import SaleForm from '../components/sales/SaleForm';
import SaleContract from '../components/sales/SaleContract';

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState('');
  const { sales } = useSaleStore();
  const { customers } = useCustomerStore();
  const { installments } = useFinanceStore();
  const { showNotification, showModal, hideModal } = useUI();

  const filteredSales = sales.filter(s => 
    s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.deviceModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.imei.includes(searchTerm)
  );

  const handlePrintContract = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const saleInstallments = installments.filter(i => i.saleId === sale.id);

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
              sale={sale} 
              customer={customer} 
              installments={saleInstallments} 
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

  const handleNewSale = () => {
    showModal({
      title: 'Nova Venda - Registro Completo',
      children: (
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <SaleForm 
            onSuccess={() => hideModal()} 
            onCancel={() => hideModal()} 
          />
        </div>
      ),
    });
  };

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-display font-black text-on-surface uppercase tracking-tight">Vendas & Celulares</h1>
          <p className="text-on-surface-variant font-display tracking-tight mt-1 opacity-70">Aparelhos, estoque e novos contratos</p>
        </div>
        <button 
          onClick={handleNewSale}
          className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
        >
          <Smartphone size={18} />
          Nova Venda
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/20 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 blur-3xl -z-10 group-hover:bg-primary/20 transition-all duration-500"></div>
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-4">
            <ShoppingBag size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Total em Vendas</p>
          <h3 className="text-2xl font-display font-black text-on-surface leading-none tracking-tight">R$ {sales.reduce((acc, s) => acc + s.totalValue, 0).toLocaleString()}</h3>
          <p className="text-[10px] text-primary font-bold mt-2 flex items-center gap-1">
            <TrendingUp size={12} />
            Recibos e contratos ativos
          </p>
        </div>
        
        <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/30">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant mb-4">
            <Smartphone size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Aparelhos Vinculados</p>
          <h3 className="text-2xl font-display font-black text-on-surface leading-none tracking-tight">{sales.length}</h3>
          <p className="text-[10px] text-on-surface-variant/40 font-bold mt-2">Ativos no sistema de bloqueio</p>
        </div>

        <div className="bg-error/5 p-6 rounded-[32px] border border-error/20">
          <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error mb-4">
            <ShieldCheck size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Inadimplência</p>
          <h3 className="text-2xl font-display font-black text-on-surface leading-none tracking-tight">{sales.filter(s => s.status === 'overdue').length}</h3>
          <p className="text-[10px] text-error font-bold mt-2 flex items-center gap-1">
            Requer atenção imediata
          </p>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-[40px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, modelo ou IMEI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-highest/30 border border-outline-variant/30 rounded-2xl pl-12 pr-6 py-3 text-sm focus:border-white outline-none transition-all font-display tracking-tight"
            />
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-4 py-3 bg-surface-container-highest border border-outline-variant/30 rounded-2xl text-xs font-bold text-on-surface-variant">
              <Filter size={16} />
              Status
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-highest/20">
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Cód / Cliente</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Aparelho</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Condições</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Status Pagto</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredSales.map((sale) => (
                <motion.tr 
                  key={sale.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layout
                  className="hover:bg-surface-container-highest/30 transition-colors group"
                >
                  <td className="px-6 py-5">
                    <div>
                      <p className="text-[9px] font-mono text-primary font-bold uppercase tracking-widest">{sale.id}</p>
                      <p className="text-sm font-display font-black text-on-surface uppercase tracking-tight leading-none mt-1">{sale.customerName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant border border-outline-variant/20">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-display font-black text-on-surface uppercase tracking-tight">{sale.deviceModel}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">IMEI: {sale.imei}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-xs font-display font-black text-on-surface">R$ {sale.totalValue.toLocaleString()}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight">
                        {sale.installments}x de R$ {((sale.totalValue - sale.downPayment) / sale.installments).toFixed(2)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      sale.status === 'completed' ? 'bg-primary/10 text-primary border border-primary/20' :
                      sale.status === 'processing' ? 'bg-secondary/10 text-secondary border border-secondary/20' :
                      'bg-error/10 text-error border border-error/20'
                    }`}>
                      <div className={`w-1 h-1 rounded-full ${
                        sale.status === 'completed' ? 'bg-primary' : 
                        sale.status === 'processing' ? 'bg-secondary' : 'bg-error'
                      }`} />
                      {sale.status === 'completed' ? 'Em dia' : 
                       sale.status === 'processing' ? 'Processando' : 'Atrasado'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handlePrintContract(sale)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-on-surface-variant hover:text-white"
                        title="Imprimir Contrato"
                      >
                        <Printer size={16} />
                      </button>
                      <button className="p-2 hover:bg-white/10 rounded-xl transition-all text-on-surface-variant hover:text-white">
                        <Edit size={16} />
                      </button>
                      <button className="p-2 hover:bg-error/10 rounded-xl transition-all text-on-surface-variant hover:text-error">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
