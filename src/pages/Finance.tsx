
import React, { useState } from 'react';
import { 
  TrendingUp, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Search, 
  Download,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  ShieldAlert,
  MessageSquare,
  FileText,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, Installment } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';

export default function Finance() {
  const [activeTab, setActiveTab] = useState<'receivables' | 'overdue'>('receivables');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { installments, markAsPaid, markAsBlocked } = useFinanceStore();
  const { showModal, showNotification } = useUI();

  const filteredInstallments = installments.filter(item => {
    const matchesSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
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
          <p>Deseja confirmar o recebimento da parcela <span className="text-white font-black">{item.number}/{item.total}</span> de <span className="text-white font-black">{item.customerName}</span>?</p>
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
          showNotification('success', 'Pagamento Confirmado', `Parcela de ${item.customerName} marcada como paga.`);
        } catch (error) {
          showNotification('error', 'Erro no Servidor', 'Não foi possível processar o pagamento.');
        }
      }
    });
  };

  const handleBlock = (item: Installment) => {
    showModal({
      title: 'Bloquear Aparelho',
      children: (
        <div className="space-y-4">
          <p>O aparelho de <span className="text-white font-black">{item.customerName}</span> será bloqueado remotamente.</p>
          <p className="text-xs text-error font-medium">Esta ação impedirá o uso do dispositivo até que o pagamento seja regularizado.</p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Confirmar Bloqueio',
      onConfirm: async () => {
        try {
          await markAsBlocked(item.id);
          showNotification('warning', 'Aparelho Bloqueado', `Comando de bloqueio enviado para o dispositivo de ${item.customerName}.`);
        } catch (error) {
          showNotification('error', 'Erro no Servidor', 'Não foi possível enviar o comando de bloqueio.');
        }
      }
    });
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-display font-black text-on-surface uppercase tracking-tight">Painel Financeiro</h1>
          <p className="text-on-surface-variant font-display tracking-tight mt-1 opacity-70">Controle de parcelas, juros e cobranças</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-3 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
            <CreditCard size={18} className="text-primary" />
            PIX Integrado
          </button>
          <button className="flex items-center gap-3 bg-primary text-on-primary px-6 py-3 rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
            <Plus size={18} />
            Nova Cobrança
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total a Receber', value: `R$ ${totalReceivable.toLocaleString()}`, icon: ArrowUpRight, color: 'primary' },
          { label: 'Recebido (Total)', value: `R$ ${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'primary' },
          { label: 'Em Atraso', value: `R$ ${totalOverdue.toLocaleString()}`, icon: AlertCircle, color: 'error' },
          { label: 'Bloqueados', value: installments.filter(i => i.status === 'blocked').length.toString(), icon: ShieldAlert, color: 'error' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/30 relative overflow-hidden">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color === 'primary' ? 'primary' : 'error'}/10 flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : 'error'} mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-display font-black text-on-surface leading-none tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex p-1 bg-surface-container-low rounded-[24px] mb-8 gap-1 border border-outline-variant/30 max-w-sm">
        <button 
          onClick={() => setActiveTab('receivables')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'receivables' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Contas a Receber
        </button>
        <button 
          onClick={() => setActiveTab('overdue')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overdue' ? 'bg-error text-on-surface shadow-lg shadow-error/20' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Inadimplência
        </button>
      </div>

      <div className="bg-surface-container-low rounded-[40px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar por cliente ou código da parcela..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-highest/30 border border-outline-variant/30 rounded-2xl pl-12 pr-6 py-3 text-sm focus:border-primary outline-none transition-all font-display tracking-tight"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-surface-container-highest border border-outline-variant/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-colors">
            <Filter size={14} />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-highest/20">
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Parcela / Cliente</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Vencimento</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Valor</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredInstallments.map((inst) => (
                <motion.tr 
                  key={inst.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layout
                  className="hover:bg-surface-container-highest/30 transition-colors group"
                >
                  <td className="px-6 py-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono text-primary font-bold tracking-widest leading-none bg-primary/10 px-1.5 py-0.5 rounded uppercase">#{inst.id}</span>
                        <span className="text-[9px] font-mono text-on-surface-variant font-bold tracking-widest leading-none uppercase">{inst.saleId}</span>
                      </div>
                      <p className="text-sm font-display font-black text-on-surface uppercase tracking-tight leading-none mb-1">{inst.customerName}</p>
                      <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tight opacity-60">Parcela {inst.number} de {inst.total}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <p className={`text-xs font-display font-black tracking-tight ${
                        inst.status === 'overdue' || inst.status === 'blocked' ? 'text-error' : 'text-on-surface'
                      }`}>
                        {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-display font-black text-on-surface uppercase tracking-tight">R$ {inst.value.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      inst.status === 'paid' ? 'bg-primary/10 text-primary border border-primary/20' :
                      inst.status === 'pending' ? 'bg-secondary/10 text-secondary border border-secondary/20' :
                      inst.status === 'overdue' ? 'bg-error/10 text-error border border-error/20' :
                      'bg-error text-on-surface border border-error/50'
                    }`}>
                      <div className={`w-1 h-1 rounded-full ${
                        inst.status === 'paid' ? 'bg-primary' : 
                        inst.status === 'pending' ? 'bg-secondary' : 'bg-error'
                      }`} />
                      {inst.status === 'paid' ? 'Pago' : 
                       inst.status === 'pending' ? 'Pendente' : 
                       inst.status === 'overdue' ? 'Atrasado' : 'Bloqueado'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {inst.status !== 'paid' && (
                        <>
                          <button 
                            onClick={() => handlePayment(inst)}
                            className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all"
                            title="Confirmar Pagamento"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleBlock(inst)}
                            className="p-2 bg-error/10 hover:bg-error/20 text-error rounded-xl transition-all"
                            title="Bloquear Aparelho"
                          >
                            <ShieldAlert size={16} />
                          </button>
                        </>
                      )}
                      <button title="Notificar WhatsApp" className="p-2 bg-surface-container-highest hover:bg-surface-container-highest/80 text-on-surface-variant hover:text-white rounded-xl transition-all">
                        <MessageSquare size={16} />
                      </button>
                      <button title="Gerar Recibo" className="p-2 bg-surface-container-highest hover:bg-surface-container-highest/80 text-on-surface-variant hover:text-white rounded-xl transition-all">
                        <FileText size={16} />
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
