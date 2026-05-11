import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2,
  Camera,
  Trash2,
  Edit,
  UserPlus
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCustomerStore, Customer } from '../store/useCustomerStore';
import { useUI } from '../context/UIContext';
import CustomerForm from '../components/customers/CustomerForm';

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const { customers, deleteCustomer } = useCustomerStore();
  const { showModal, showNotification, hideModal } = useUI();

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  );

  const handleDelete = (customer: Customer) => {
    showModal({
      title: 'Excluir Cliente',
      children: (
        <div className="space-y-4">
          <p>Tem certeza que deseja excluir o cliente <span className="text-white font-black">{customer.name}</span>?</p>
          <p className="text-xs text-error/80 bg-error/10 p-4 rounded-xl border border-error/20">
            Esta ação é irreversível e removerá todos os vínculos deste cliente no sistema.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Excluir Agora',
      onConfirm: () => {
        deleteCustomer(customer.id);
        showNotification('success', 'Cliente Removido', `O cliente ${customer.name} foi removido com sucesso.`);
      },
      onCancel: () => {}
    });
  };

  const handleAddClient = () => {
    showModal({
      title: 'Cadastrar Novo Cliente',
      children: (
        <CustomerForm 
          onSuccess={() => hideModal()} 
          onCancel={() => hideModal()} 
        />
      )
    });
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-display font-black text-on-surface uppercase tracking-tight">Clientes</h1>
          <p className="text-on-surface-variant font-display tracking-tight mt-1 opacity-70">Gestão e acompanhamento de compradores</p>
        </div>
        <button 
          onClick={handleAddClient}
          className="flex items-center gap-3 bg-primary text-on-primary px-6 py-3 rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <UserPlus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Clientes', value: customers.length.toString(), icon: Users, color: 'primary' },
          { label: 'Ativos', value: customers.filter(c => c.status === 'active').length.toString(), icon: CheckCircle2, color: 'primary' },
          { label: 'Inadimplentes', value: customers.filter(c => c.status === 'overdue').length.toString(), icon: ShieldAlert, color: 'error' },
          { label: 'Bloqueados', value: customers.filter(c => c.status === 'blocked').length.toString(), icon: ShieldAlert, color: 'error' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-${stat.color === 'primary' ? 'primary' : 'error'}/10 flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : 'error'}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-display font-black text-on-surface leading-none tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-low rounded-[40px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF ou telefone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-highest/30 border border-outline-variant/30 rounded-2xl pl-12 pr-6 py-3 text-sm focus:border-primary outline-none transition-all font-display tracking-tight"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-3 bg-surface-container-highest border border-outline-variant/30 rounded-2xl text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
            <Filter size={16} />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-highest/20">
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Cliente</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Contato</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Último Pagamento</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredCustomers.map((customer) => (
                <motion.tr 
                  key={customer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layout
                  className="hover:bg-surface-container-highest/30 transition-colors group"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center border border-outline-variant/20 overflow-hidden relative">
                        {customer.avatar ? (
                          <img src={customer.avatar} alt={customer.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users size={20} className="text-on-surface-variant" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                          <Camera size={14} className="text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-display font-black text-on-surface uppercase tracking-tight leading-none mb-1">{customer.name}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono tracking-widest">{customer.cpf}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-on-surface tracking-tight">
                        <Phone size={12} className="text-primary" />
                        {customer.phone}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant tracking-tight">
                        <MapPin size={12} />
                        {customer.address}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      customer.status === 'active' ? 'bg-primary/10 text-primary border border-primary/20' :
                      customer.status === 'overdue' ? 'bg-error/10 text-error border border-error/20' :
                      'bg-error text-on-surface border border-error/50'
                    }`}>
                      <div className={`w-1 h-1 rounded-full ${
                        customer.status === 'active' ? 'bg-primary' : 'bg-error'
                      }`} />
                      {customer.status === 'active' ? 'Em dia' : 
                       customer.status === 'overdue' ? 'Atrasado' : 'Bloqueado'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-display font-bold text-on-surface tracking-tight">
                      {customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-white/10 text-on-surface-variant hover:text-white rounded-xl transition-all">
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer)}
                        className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-xl transition-all"
                      >
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
