
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, CreditCard, AlertCircle, CheckCircle2, Filter, 
  Search, Download, Calendar, DollarSign, ArrowUpRight, 
  ArrowDownRight, Smartphone, ShieldAlert, MessageSquare, 
  FileText, Plus, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, Installment } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';

export default function Finance() {
  const [activeTab, setActiveTab] = useState<'receivables' | 'overdue'>('receivables');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { installments, markAsPaid, markAsBlocked, fetchInstallments, isLoading } = useFinanceStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();

  useEffect(() => {
    fetchInstallments(profile?.unit_id || undefined);
  }, [profile?.unit_id, fetchInstallments]);

  const filteredInstallments = installments.filter(item => {
    const matchesSearch = (item.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'overdue') {
      return (item.status === 'overdue' || item.status === 'blocked') && matchesSearch;
    }
    return matchesSearch;
  });

  const totalReceivable = installments.reduce((acc, current) => acc + current.value, 0);
  const totalPaid = installments.filter(i => i.status === 'paid').reduce((acc, current) => acc + current.value, 0);
  const totalOverdue = installments.filter(i => i.status === 'overdue' || i.status === 'blocked').reduce((acc, current) => acc + current.value, 0);

  const handlePayment = (item: Installment) => {
    showModal({
      title: 'Confirmar Pagamento',
      children: (
        <div className="space-y-4">
          <p className="text-sm">Deseja confirmar o recebimento da parcela <span className="text-white font-black">{item.number}/{item.total}</span> de <span className="text-white font-black">{item.customer_name}</span>?</p>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-on-surface-variant uppercase tracking-widest font-black">Valor Total</span>
              <span className="text-white font-mono font-black text-sm">R$ {item.value.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ),
      confirmText: 'Confirmar Recebimento',
      onConfirm: async () => {
        try {
          await markAsPaid(item.id);
          showNotification('success', 'Pagamento Confirmado');
          hideModal();
        } catch (error) {
          showNotification('error', 'Erro no Servidor');
        }
      }
    });
  };

  const handleBlock = (item: Installment) => {
    showModal({
      title: 'Bloquear Aparelho',
      children: (
        <div className="space-y-4">
          <p className="text-sm">O aparelho de <span className="text-white font-black">{item.customer_name}</span> será bloqueado remotamente.</p>
          <p className="text-[10px] text-error font-black uppercase tracking-widest bg-error/10 p-4 rounded-xl border border-error/20">Esta ação impedirá o uso do dispositivo até que o pagamento seja regularizado.</p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Confirmar Bloqueio',
      onConfirm: async () => {
        try {
          await markAsBlocked(item.id);
          showNotification('warning', 'Aparelho Bloqueado');
          hideModal();
        } catch (error) {
          showNotification('error', 'Erro no Servidor');
        }
      }
    });
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Painel Financeiro</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gestão de Recebíveis</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-3 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
            <CreditCard size={18} className="text-primary" />
            PIX Integrado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total a Receber', value: `R$ ${totalReceivable.toLocaleString('pt-BR')}`, icon: ArrowUpRight, color: 'text-primary' },
          { label: 'Recebido (Total)', value: `R$ ${totalPaid.toLocaleString('pt-BR')}`, icon: CheckCircle2, color: 'text-success' },
          { label: 'Em Atraso', value: `R$ ${totalOverdue.toLocaleString('pt-BR')}`, icon: AlertCircle, color: 'text-error' },
          { label: 'Bloqueados', value: installments.filter(i => i.status === 'blocked').length.toString(), icon: ShieldAlert, color: 'text-error' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color} mb-4 border border-white/10`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
            <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex p-1 bg-white/[0.02] rounded-[24px] mb-8 gap-1 border border-white/5 max-w-sm">
        <button 
          onClick={() => setActiveTab('receivables')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'receivables' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-on-surface-variant hover:text-white'}`}
        >
          Recebíveis
        </button>
        <button 
          onClick={() => setActiveTab('overdue')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overdue' ? 'bg-error text-white shadow-xl shadow-error/20' : 'text-on-surface-variant hover:text-white'}`}
        >
          Inadimplência
        </button>
      </div>

      <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por cliente ou código da parcela..." 
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
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Financeiro...</span>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Parcela / Cliente</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Vencimento</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Valor</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInstallments.map((inst) => (
                  <motion.tr 
                    key={inst.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono text-primary font-black tracking-widest leading-none bg-primary/10 px-1.5 py-0.5 rounded uppercase border border-primary/20">#{inst.id.split('-')[0]}</span>
                        </div>
                        <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none mb-1 group-hover:text-white transition-colors">{inst.customer_name}</p>
                        <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">Parcela {inst.number} de {inst.total}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <p className={`text-xs font-black tracking-tight ${
                          inst.status === 'overdue' || inst.status === 'blocked' ? 'text-error' : 'text-on-surface'
                        }`}>
                          {new Date(inst.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-on-surface uppercase tracking-tight">R$ {inst.value.toFixed(2)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        inst.status === 'paid' ? 'bg-success/10 text-success border-success/20' :
                        inst.status === 'pending' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                        inst.status === 'overdue' ? 'bg-error/10 text-error border-error/20' :
                        'bg-error/20 text-white border-error/50'
                      }`}>
                        <div className="w-1 h-1 rounded-full bg-current" />
                        {inst.status === 'paid' ? 'Pago' : 
                         inst.status === 'pending' ? 'Pendente' : 
                         inst.status === 'overdue' ? 'Atrasado' : 'Bloqueado'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {inst.status !== 'paid' && (
                          <>
                            <button 
                              onClick={() => handlePayment(inst)}
                              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10"
                              title="Confirmar Pagamento"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleBlock(inst)}
                              className="p-2 bg-error/10 hover:bg-error/20 text-error rounded-xl transition-all border border-error/20"
                              title="Bloquear Aparelho"
                            >
                              <ShieldAlert size={16} />
                            </button>
                          </>
                        )}
                        <button title="Notificar WhatsApp" className="p-2 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white rounded-xl transition-all border border-white/10">
                          <MessageSquare size={16} />
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
