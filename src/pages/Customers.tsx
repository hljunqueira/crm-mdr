import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Filter, Phone, MapPin, 
  ShieldAlert, CheckCircle2, Trash2, Edit, UserPlus,
  Loader2
} from 'lucide-react';

import { useCustomerStore, Customer } from '../store/useCustomerStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import CustomerForm from '../components/customers/CustomerForm';

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const { customers, deleteCustomer, fetchCustomers, isLoading } = useCustomerStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();

  useEffect(() => {
    fetchCustomers(profile?.unit_id || undefined);
  }, [profile?.unit_id, fetchCustomers]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  );

  const handleDelete = (customer: Customer) => {
    showModal({
      title: 'Confirmar Exclusão',
      children: (
        <div className="space-y-4">
          <p className="text-sm">Tem certeza que deseja excluir o cliente <span className="text-white font-black">{customer.name}</span>?</p>
          <p className="text-[10px] text-error/80 bg-error/10 p-4 rounded-xl border border-error/20 font-black uppercase tracking-widest">
            Esta ação é irreversível e removerá todos os vínculos deste cliente no sistema.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Excluir Agora',
      onConfirm: async () => {
        await deleteCustomer(customer.id);
        showNotification('success', 'Cliente Removido');
      }
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

  const handleEditClient = (customer: Customer) => {
    showModal({
      title: 'Editar Cliente',
      children: (
        <CustomerForm 
          initialData={customer}
          onSuccess={() => hideModal()} 
          onCancel={() => hideModal()} 
        />
      )
    });
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Gestão de Clientes</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Base de Compradores</p>
        </div>
        <button 
          onClick={handleAddClient}
          className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
        >
          <UserPlus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Clientes', value: customers.length.toString(), icon: Users, color: 'text-primary' },
          { label: 'Ativos', value: customers.filter(c => c.status === 'active').length.toString(), icon: CheckCircle2, color: 'text-success' },
          { label: 'Inadimplentes', value: customers.filter(c => c.status === 'overdue').length.toString(), icon: ShieldAlert, color: 'text-error' },
          { label: 'Bloqueados', value: customers.filter(c => c.status === 'blocked').length.toString(), icon: ShieldAlert, color: 'text-error' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/[0.02] p-6 rounded-[32px] border border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} border border-white/10`}>
                <stat.icon size={24} />
              </div>
            </div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
            <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF ou telefone..." 
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
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Clientes...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
              <Users size={48} className="text-on-surface-variant mb-2 opacity-20" />
              <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhum cliente encontrado</p>
              <p className="text-[10px] font-display text-on-surface-variant opacity-70">Tente buscar por outro termo ou adicione um novo cliente.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Cliente</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Contato / Endereço</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Crédito</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Cadastro / Compra</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Status Geral</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id}
                    className="hover:bg-white/[0.02] transition-colors group animate-in fade-in duration-300"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black uppercase group-hover:bg-white group-hover:text-black transition-all">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none mb-1 group-hover:text-white transition-colors">{customer.name}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono tracking-widest opacity-60 uppercase">{customer.cpf}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-on-surface font-bold tracking-tight">
                          <Phone size={12} className="text-white opacity-20" />
                          {customer.phone}
                        </div>
                        {(customer.address || customer.city) && (
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-display opacity-60 max-w-xs truncate">
                            <MapPin size={12} className="flex-shrink-0 text-white opacity-40" />
                            <span>
                              {customer.address}
                              {customer.address_number ? `, ${customer.address_number}` : ''}
                              {customer.neighborhood ? ` - ${customer.neighborhood}` : ''}
                              {customer.city ? ` - ${customer.city}` : ''}
                              {customer.state ? `/${customer.state}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            customer.classification === 'BOM' ? 'bg-success/10 text-success' :
                            customer.classification === 'RUIM' ? 'bg-error/10 text-error' :
                            'bg-warning/10 text-warning'
                          }`}>
                            {customer.classification === 'BOM' ? 'Premium (5% a.m.)' :
                             customer.classification === 'RUIM' ? 'Flex (12% a.m.)' :
                             'Standard (8% a.m.)'}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white/5 text-on-surface-variant`}>
                            {customer.credit_status === 'EM_ANALISE' ? 'EM ANÁLISE' :
                             customer.credit_status === 'APROVADO' ? 'APROVADO' :
                             customer.credit_status === 'APROVADO_COM_ENTRADA' ? 'APROVADO C/ ENTRADA' : 'REPROVADO'}
                          </span>
                        </div>
                        <div className="text-[10px] text-on-surface font-mono font-bold">
                          Limite: R$ {(customer.credit_limit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            customer.registration_status === 'APROVADO' ? 'bg-success/10 text-success border border-success/20' :
                            customer.registration_status === 'REPROVADO' ? 'bg-error/10 text-error border border-error/20' :
                            'bg-warning/10 text-warning border border-warning/20'
                          }`}>
                            {customer.registration_status === 'APROVADO' ? 'Aprovado' :
                             customer.registration_status === 'REPROVADO' ? 'Rejeitado' : 'Pré-Cadastro'}
                          </span>
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-wider">
                          {customer.approved_for_purchase ? (
                            <span className="text-success flex items-center gap-1">✔ Compra Liberada</span>
                          ) : (
                            <span className="text-error flex items-center gap-1">❌ Compra Bloqueada</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        customer.status === 'active' ? 'bg-success/10 text-success border-success/20' :
                        customer.status === 'overdue' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-error/10 text-error border-error/20'
                      }`}>
                        <div className="w-1 h-1 rounded-full bg-current" />
                        {customer.status === 'active' ? 'Ativo' : 
                         customer.status === 'overdue' ? 'Em Atraso' : 'Bloqueado'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditClient(customer)}
                          className="p-2 hover:bg-white/10 text-on-surface-variant hover:text-white rounded-xl transition-all"
                        >
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
