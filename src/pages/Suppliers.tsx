import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, CheckCircle2, XCircle, Trash2, Edit, 
  Loader2, Phone, Mail, MapPin, Building, ToggleLeft, ToggleRight
} from 'lucide-react';

import { useSupplierStore, Supplier } from '../store/useSupplierStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { formatPhone } from '../lib/utils';

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState('');
  const { suppliers, fetchSuppliers, addSupplier, updateSupplier, deleteSupplier, isLoading } = useSupplierStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const { hasPermission, fetchUserPermissions } = usePermissionStore();

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  useEffect(() => {
    const isAdmin = profile?.role === 'admin';
    fetchSuppliers(isAdmin ? undefined : (profile?.unit_id || undefined), isAdmin);
  }, [fetchSuppliers, profile]);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.cnpj && s.cnpj.includes(searchTerm)) ||
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = (supplier: Supplier) => {
    showModal({
      title: 'Confirmar Exclusão',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm">Tem certeza que deseja excluir o fornecedor <span className="text-white font-black">{supplier.name}</span>?</p>
          <p className="text-[10px] text-error/80 bg-error/10 p-4 rounded-xl border border-error/20 font-black uppercase tracking-widest">
            Esta ação é irreversível e removerá este fornecedor do sistema.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Excluir Agora',
      onConfirm: async () => {
        try {
          await deleteSupplier(supplier.id);
          showNotification('success', 'Fornecedor Removido');
        } catch (err) {
          showNotification('error', 'Falha ao remover fornecedor');
        }
      }
    });
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      await updateSupplier(supplier.id, { active: !supplier.active });
      showNotification('success', `Fornecedor ${!supplier.active ? 'Ativado' : 'Desativado'}`);
    } catch (err) {
      showNotification('error', 'Falha ao atualizar status');
    }
  };

  const handleOpenForm = (supplier?: Supplier) => {
    let name = supplier?.name || '';
    let phone = supplier?.phone || '';
    let email = supplier?.email || '';
    let cnpj = supplier?.cnpj || '';
    let address = supplier?.address || '';
    let active = supplier ? supplier.active : true;

    showModal({
      title: supplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor',
      children: (
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) {
              showNotification('error', 'Nome é obrigatório');
              return;
            }
            try {
              const payload = {
                name: name.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                cnpj: cnpj.trim() || undefined,
                address: address.trim() || undefined,
                unit_id: profile?.unit_id || undefined
              };

              if (supplier) {
                await updateSupplier(supplier.id, { ...payload, active });
                showNotification('success', 'Fornecedor Atualizado');
              } else {
                await addSupplier(payload);
                showNotification('success', 'Fornecedor Cadastrado');
              }
              hideModal();
            } catch (err) {
              showNotification('error', 'Erro ao salvar fornecedor');
            }
          }}
          className="space-y-6 text-white text-xs max-h-[85vh] overflow-y-auto pr-1"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome do Fornecedor *</label>
              <input 
                type="text" 
                required
                defaultValue={name}
                onChange={(e) => { name = e.target.value; }}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs focus:border-primary outline-none transition-all"
                placeholder="Ex: Distribuidora XYZ Ltda"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">CNPJ</label>
                <input 
                  type="text" 
                  defaultValue={cnpj}
                  onChange={(e) => { cnpj = e.target.value; }}
                  className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary outline-none transition-all"
                  placeholder="Ex: 00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Telefone</label>
                <input 
                  type="text" 
                  defaultValue={phone}
                  onChange={(e) => { phone = e.target.value; }}
                  className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3 text-xs focus:border-primary outline-none transition-all"
                  placeholder="Ex: (48) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">E-mail</label>
              <input 
                type="email" 
                defaultValue={email}
                onChange={(e) => { email = e.target.value; }}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs focus:border-primary outline-none transition-all"
                placeholder="Ex: contato@fornecedor.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Endereço Completo</label>
              <input 
                type="text" 
                defaultValue={address}
                onChange={(e) => { address = e.target.value; }}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs focus:border-primary outline-none transition-all"
                placeholder="Ex: Rua das Flores, 123 - Centro"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button 
              type="button" 
              onClick={() => hideModal()}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3.5 px-6 rounded-2xl bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Gravar Cadastro
            </button>
          </div>
        </form>
      )
    });
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Gestão de Fornecedores</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Cadastro de Fornecimento & Distribuição</p>
        </div>
        {hasPermission(profile, 'Fornecedores - Cadastrar') && (
          <button 
            onClick={() => handleOpenForm()}
            className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            <Truck size={18} />
            Novo Fornecedor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Fornecedores', value: suppliers.length.toString(), icon: Truck, color: 'text-primary' },
          { label: 'Fornecedores Ativos', value: suppliers.filter(s => s.active).length.toString(), icon: CheckCircle2, color: 'text-success' },
          { label: 'Fornecedores Inativos', value: suppliers.filter(s => !s.active).length.toString(), icon: XCircle, color: 'text-error' },
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
              placeholder="Buscar por nome, CNPJ, e-mail ou telefone..." 
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
              <span className="text-[10px] font-black uppercase tracking-widest">Carregando Fornecedores...</span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
              <Truck size={48} className="text-on-surface-variant mb-2 opacity-20" />
              <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhum fornecedor encontrado</p>
              <p className="text-[10px] font-display text-on-surface-variant opacity-70">Tente buscar por outro termo ou adicione um novo fornecedor.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Fornecedor</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Contato</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Endereço</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSuppliers.map((supplier) => (
                  <tr 
                    key={supplier.id}
                    className="hover:bg-white/[0.02] transition-colors group animate-in fade-in duration-300"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black uppercase group-hover:bg-white group-hover:text-black transition-all">
                          {supplier.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none mb-1 group-hover:text-white transition-colors">{supplier.name}</p>
                          {supplier.cnpj && (
                            <p className="text-[10px] text-on-surface-variant font-mono tracking-widest opacity-60 uppercase">{supplier.cnpj}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-xs text-on-surface font-bold tracking-tight">
                            <Phone size={12} className="text-white opacity-20" />
                            {formatPhone(supplier.phone)}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-display opacity-60">
                            <Mail size={12} className="flex-shrink-0 text-white opacity-40" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-[10px] text-on-surface-variant opacity-40 italic">Sem contato cadastrado</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {supplier.address ? (
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-display max-w-xs truncate">
                          <MapPin size={12} className="flex-shrink-0 text-white opacity-40" />
                          <span>{supplier.address}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant opacity-40 italic">Sem endereço</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => hasPermission(profile, 'Fornecedores - Editar') && handleToggleStatus(supplier)}
                        disabled={!hasPermission(profile, 'Fornecedores - Editar')}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                          supplier.active 
                            ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' 
                            : 'bg-error/10 text-error border-error/20 hover:bg-error/20'
                        }`}
                      >
                        <div className="w-1 h-1 rounded-full bg-current" />
                        {supplier.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission(profile, 'Fornecedores - Editar') && (
                          <button 
                            onClick={() => handleOpenForm(supplier)}
                            className="p-2 hover:bg-white/10 text-on-surface-variant hover:text-white rounded-xl transition-all"
                            title="Editar Fornecedor"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {hasPermission(profile, 'Fornecedores - Excluir') && (
                          <button 
                            onClick={() => handleDelete(supplier)}
                            className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-xl transition-all"
                            title="Excluir Fornecedor"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
