import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ShieldCheck, 
  MessageCircle, 
  Smartphone, 
  Bell, 
  CreditCard,
  User,
  Building2,
  Key,
  Database,
  Save,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Trash2,
  Loader2,
  Edit2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUnitStore } from '../store/useUnitStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'motion/react';

import { usePermissionStore } from '../store/usePermissionStore';

type TabType = 'unit' | 'notifications' | 'users' | 'rbac';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('unit');
  const { profile } = useAuthStore();
  const { unit, units, fetchUnit, fetchAllUnits, updateUnit, isLoading } = useUnitStore();
  const { showNotification, showModal, hideModal } = useUI();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  
  // States e ações para Gestão Matricial de Permissões (RBAC)
  const { userPermissions, fetchUserPermissions, toggleUserPermission } = usePermissionStore();
  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'rbac') {
      fetchUserPermissions();
      fetchUsers(); // also fetch active users so we can display their names in the selector
    }
  }, [activeTab, fetchUserPermissions]);

  const handleToggleUserRbac = async (pageName: string) => {
    if (!selectedPermissionUserId) return;
    const perm = userPermissions.find(p => p.profile_id === selectedPermissionUserId && p.page_name === pageName);
    const currentVisible = perm ? perm.visible : true;
    const nextVisible = !currentVisible;
    try {
      await toggleUserPermission(selectedPermissionUserId, pageName, nextVisible);
      showNotification('success', 'Permissão Atualizada', `A visibilidade da página "${pageName}" foi atualizada.`);
    } catch (err) {
      showNotification('error', 'Erro', 'Não foi possível alterar a permissão.');
    }
  };

  const isPageVisibleForUser = (pageName: string) => {
    if (!selectedPermissionUserId) return true;
    const perm = userPermissions.find(p => p.profile_id === selectedPermissionUserId && p.page_name === pageName);
    return perm ? perm.visible : true;
  };

  // States para Controle de Usuários
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'attendant' as 'admin' | 'attendant' | 'technician',
    store_id: ''
  });

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setUserFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'attendant',
      store_id: ''
    });
    setShowUserModal(true);
  };

  const handleOpenEditModal = (usr: any) => {
    setEditingUser(usr);
    setUserFormData({
      email: usr.email || '',
      password: '', // Deixa vazio para manter a senha
      full_name: usr.full_name || '',
      role: usr.role || 'attendant',
      store_id: usr.store_id || ''
    });
    setShowUserModal(true);
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error('[Settings] Erro ao buscar usuários:', e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.email || !userFormData.full_name) return;
    if (!editingUser && !userFormData.password) return; // Senha obrigatória apenas na criação
    
    setIsSavingUser(true);
    try {
      if (editingUser) {
        // Modo Edição
        const body: any = {
          full_name: userFormData.full_name,
          role: userFormData.role,
          store_id: userFormData.store_id || null,
          email: userFormData.email
        };
        if (userFormData.password) {
          body.password = userFormData.password;
        }

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao atualizar colaborador');
        
        showNotification('success', 'Usuário Atualizado', 'Os dados do colaborador foram salvos!');
      } else {
        // Modo Criação
        const res = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao criar colaborador');
        
        showNotification('success', 'Usuário Criado', 'Novo colaborador cadastrado com sucesso!');
      }

      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'attendant',
        store_id: ''
      });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Erro ao Salvar', err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    showModal({
      title: 'Confirmar Exclusão',
      children: 'Deseja realmente remover a conta deste funcionário? A exclusão é permanente.',
      confirmText: 'Sim, Excluir',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            showNotification('success', 'Usuário Removido', 'A conta foi excluída com sucesso.');
            fetchUsers();
            hideModal();
          } else {
            throw new Error();
          }
        } catch (e) {
          showNotification('error', 'Erro ao Remover', 'Não foi possível excluir o usuário.');
        }
      }
    });
  };


  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    contract_terms: '',
    warranty_terms: '',
    pix_key: '',
    pix_key_type: 'cnpj' as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random',
    print_mode: 'thermal' as 'thermal' | 'a4'
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllUnits();
    } else if (profile?.unit_id) {
      fetchUnit(profile.unit_id);
    }
  }, [profile, fetchUnit, fetchAllUnits]);

  // Ao carregar a lista ou a unidade inicial, seleciona a primeira
  useEffect(() => {
    if (!selectedUnitId) {
      if (profile?.role === 'admin' && units.length > 0) {
        setSelectedUnitId(units[0].id);
      } else if (unit) {
        setSelectedUnitId(unit.id);
      }
    }
  }, [units, unit, profile, selectedUnitId]);

  // Carrega os dados da unidade selecionada no form
  useEffect(() => {
    const currentUnit = units.find(u => u.id === selectedUnitId) || unit;
    if (currentUnit && currentUnit.id === selectedUnitId) {
      setFormData({
        name: currentUnit.name || '',
        cnpj: currentUnit.cnpj || '',
        address: currentUnit.address || '',
        phone: currentUnit.phone || '',
        contract_terms: currentUnit.contract_terms || '',
        warranty_terms: currentUnit.warranty_terms || '',
        pix_key: currentUnit.pix_key || '',
        pix_key_type: (currentUnit.pix_key_type as any) || 'cnpj',
        print_mode: (currentUnit.print_mode as any) || 'thermal'
      });
    }
  }, [selectedUnitId, units, unit]);

  const handleSave = async () => {
    if (!selectedUnitId) return;
    try {
      await updateUnit(selectedUnitId, formData);
      showNotification('success', 'Configurações Salvas', 'Os dados da unidade foram atualizados com sucesso.');
    } catch (error) {
      showNotification('error', 'Erro ao Salvar', 'Não foi possível atualizar as configurações.');
    }
  };

  const menuItems = [
    { id: 'unit', label: 'Gerenciar Unidades', icon: Building2 },
    ...(profile?.role === 'admin' ? [
      { id: 'users', label: 'Colaboradores', icon: User },
      { id: 'rbac', label: 'Permissões do Menu (RBAC)', icon: ShieldCheck }
    ] : [])
  ];

  return (
    <div className="p-8 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Configurações</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gerencie sua rede e integrações</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={!selectedUnitId}
          className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50"
        >
          <Save size={18} />
          Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                activeTab === item.id 
                  ? "bg-white text-black border-white shadow-xl shadow-white/5" 
                  : "bg-white/[0.02] text-on-surface-variant border-transparent hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'unit' && (
              <motion.div 
                key="unit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-10 border border-white/5 rounded-[40px] space-y-8 bg-white/[0.02]"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Gerenciar Unidades</h2>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Selecione a loja para editar os dados</p>
                    </div>
                  </div>
                </div>

                {/* Lista de Unidades para Admin */}
                {profile?.role === 'admin' && units.length > 0 && (
                  <div className="flex flex-wrap gap-4 mb-10 p-2 bg-white/5 rounded-[32px] border border-white/10">
                    {units.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUnitId(u.id)}
                        className={cn(
                          "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                          selectedUnitId === u.id 
                            ? "bg-white text-black shadow-lg shadow-white/5" 
                            : "text-on-surface-variant hover:text-white"
                        )}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Nome da Loja</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">CNPJ</label>
                    <input 
                      type="text" 
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Endereço Completo</label>
                    <input 
                      type="text" 
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Telefone de Contato</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Formato de Impressão Padrão</label>
                    <select
                      value={formData.print_mode}
                      onChange={(e) => setFormData(prev => ({ ...prev, print_mode: e.target.value as any }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all appearance-none"
                    >
                      <option value="thermal" className="bg-surface-container-high">Cupom Térmico (80mm)</option>
                      <option value="a4" className="bg-surface-container-high">Papel A4</option>
                    </select>
                  </div>
                </div>

                {/* PIX Section */}
                <div className="pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Dados para Recebimento PIX</h3>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Usados no modal de cobrança e nas mensagens WhatsApp</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Tipo de Chave PIX</label>
                      <select
                        value={formData.pix_key_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, pix_key_type: e.target.value as any }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all appearance-none"
                      >
                        <option value="cnpj" className="bg-surface-container-high">CNPJ</option>
                        <option value="cpf" className="bg-surface-container-high">CPF</option>
                        <option value="email" className="bg-surface-container-high">E-mail</option>
                        <option value="phone" className="bg-surface-container-high">Telefone</option>
                        <option value="random" className="bg-surface-container-high">Chave Aleatória</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Chave PIX</label>
                      <input
                        type="text"
                        placeholder={
                          formData.pix_key_type === 'cnpj' ? '00.000.000/0001-00' :
                          formData.pix_key_type === 'cpf' ? '000.000.000-00' :
                          formData.pix_key_type === 'email' ? 'pagamentos@suaempresa.com' :
                          formData.pix_key_type === 'phone' ? '+55 (48) 99999-9999' :
                          'Chave aleatória UUID'
                        }
                        value={formData.pix_key}
                        onChange={(e) => setFormData(prev => ({ ...prev, pix_key: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-green-400 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {formData.pix_key && (
                    <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl flex items-center gap-4">
                      <QrCode size={32} className="text-green-400 shrink-0" />
                      <div>
                        <p className="text-[9px] text-green-400 uppercase tracking-widest font-black">Prévia — Como aparecerá nas cobranças</p>
                        <p className="text-sm text-white font-black font-mono mt-0.5">{formData.pix_key}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">Tipo: {formData.pix_key_type?.toUpperCase()} · Beneficiário: {formData.name || 'Nome da Loja'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-white/5 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary" />
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Termos de Garantia</label>
                    </div>
                    <textarea 
                      rows={4}
                      value={formData.warranty_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, warranty_terms: e.target.value }))}
                      placeholder="Descreva aqui os termos de garantia padrão para os aparelhos..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all resize-none font-sans leading-relaxed"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-primary" />
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Cláusulas do Contrato</label>
                    </div>
                    <textarea 
                      rows={6}
                      value={formData.contract_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_terms: e.target.value }))}
                      placeholder="Insira aqui as cláusulas do contrato de venda e financiamento..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all resize-none font-sans leading-relaxed text-xs opacity-80"
                    />
                  </div>
                </div>
              </motion.div>
            )}




            {activeTab === 'users' && profile?.role === 'admin' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-10 border border-white/5 rounded-[40px] space-y-8 bg-white/[0.02]"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Usuários e Permissões</h2>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Gerencie o acesso dos seus colaboradores</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/5"
                  >
                    Novo Usuário
                  </button>
                </div>

                {usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="animate-spin text-primary" size={24} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Carregando lista...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full border border-white/5 rounded-3xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Colaborador</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">E-mail</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Cargo</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Unidade</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {usersList.map((usr) => {
                          const userUnit = units.find(u => u.id === usr.store_id)?.name || 'Geral/Todas';
                          
                          return (
                            <tr key={usr.id} className="hover:bg-white/[0.01] transition-all">
                              <td className="px-6 py-4 font-display font-semibold text-white text-sm">
                                {usr.full_name}
                              </td>
                              <td className="px-6 py-4 text-xs text-on-surface-variant font-mono">
                                {usr.email}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                  usr.role === 'admin' 
                                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                                    : usr.role === 'technician'
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {usr.role === 'admin' ? 'Administrador' : usr.role === 'technician' ? 'Técnico' : 'Atendente'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-on-surface-variant">
                                {userUnit}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditModal(usr)}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 active:scale-95 transition-all inline-flex items-center justify-center text-on-surface-variant"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(usr.id)}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 hover:border-red-500/20 active:scale-95 transition-all inline-flex items-center justify-center text-on-surface-variant"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* MODAL CADASTRAR USUÁRIO */}
                <AnimatePresence>
                  {showUserModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-card w-full max-w-2xl border border-white/10 rounded-[40px] p-10 bg-[#121215] shadow-2xl relative text-left"
                      >
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6">
                          {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
                        </h3>
                        
                        <form onSubmit={handleSaveUser} className="space-y-6" autoComplete="off">
                          {/* Dummy hidden inputs to hijack Chrome credentials autofill */}
                          <input type="text" name="chrome_prevent_email" style={{ display: 'none' }} />
                          <input type="password" name="chrome_prevent_pass" style={{ display: 'none' }} />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Nome Completo</label>
                              <input 
                                type="text"
                                required
                                placeholder="Ex: João Silva"
                                value={userFormData.full_name}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                autoComplete="off"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-white outline-none transition-all"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">E-mail</label>
                              <input 
                                type="email"
                                required
                                placeholder="Ex: joao@suaempresa.com"
                                value={userFormData.email}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                                autoComplete="new-email"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-white outline-none transition-all font-mono"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">
                                {editingUser ? 'Senha (Deixe em branco para não alterar)' : 'Senha Provisória'}
                              </label>
                              <input 
                                type="password"
                                required={!editingUser}
                                placeholder={editingUser ? 'Manter senha atual' : 'Mínimo 6 caracteres'}
                                value={userFormData.password}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                                autoComplete="new-password"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-white outline-none transition-all"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Cargo / Função</label>
                              <select
                                value={userFormData.role}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value as any }))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-white outline-none transition-all appearance-none"
                              >
                                <option value="attendant" className="bg-surface-container-high">Atendente</option>
                                <option value="technician" className="bg-surface-container-high">Técnico de OS</option>
                                <option value="admin" className="bg-surface-container-high">Administrador Geral</option>
                              </select>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Unidade / Loja Vinculada</label>
                              <select
                                value={userFormData.store_id}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, store_id: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-white outline-none transition-all appearance-none"
                              >
                                <option value="" className="bg-surface-container-high">Geral/Todas as Unidades</option>
                                {units.map((u) => (
                                  <option key={u.id} value={u.id} className="bg-surface-container-high">{u.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowUserModal(false);
                                setEditingUser(null);
                              }}
                              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingUser}
                              className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/5"
                            >
                              {isSavingUser ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                editingUser ? 'Salvar' : 'Cadastrar'
                              )}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

              </motion.div>
            )}

            {activeTab === 'rbac' && profile?.role === 'admin' && (
              <motion.div 
                key="rbac"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-10 border border-white/5 rounded-[40px] space-y-8 bg-white/[0.02]"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Permissões de Acesso por Usuário</h2>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Escolha quais páginas cada colaborador pode visualizar no sistema</p>
                  </div>
                </div>

                <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl text-[11px] leading-relaxed text-on-surface-variant/80">
                  💡 <strong>Nota sobre Segurança Administrativa:</strong> Colaboradores com o cargo de <strong>Administrador (admin)</strong> possuem permissão implícita irrestrita e sempre visualizarão todas as telas do sistema, por segurança contra auto-bloqueios.
                </div>

                {/* Seleção do Colaborador */}
                <div className="space-y-2 bg-white/5 border border-white/10 p-5 rounded-3xl">
                  <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Selecione o Colaborador para Configurar</label>
                  <select
                    value={selectedPermissionUserId}
                    onChange={(e) => setSelectedPermissionUserId(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all appearance-none"
                  >
                    <option value="">-- Escolha um colaborador da lista --</option>
                    {usersList.map(usr => (
                      <option key={usr.id} value={usr.id}>
                        {usr.full_name} ({usr.role === 'admin' ? 'Administrador' : usr.role === 'technician' ? 'Técnico' : 'Atendente'}) - {usr.email}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPermissionUserId ? (
                  usersList.find(u => u.id === selectedPermissionUserId)?.role === 'admin' ? (
                    <div className="p-8 bg-primary/5 border border-primary/20 rounded-[32px] text-center text-primary">
                      <p className="font-bold text-xs uppercase tracking-wider">Este colaborador é Administrador</p>
                      <p className="text-[10px] leading-relaxed mt-2 opacity-80">Administradores possuem privilégios de acesso globais e irrestritos para gerenciar toda a assistência, lojas e usuários. Não há necessidade de configurar restrições de visibilidade.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full border border-white/5 rounded-3xl max-h-[600px] custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Funcionalidade / Permissão</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant text-center">Permissão de Acesso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[
                            {
                              title: 'Visibilidade de Páginas (Menu)',
                              items: [
                                { key: 'Dashboard', label: 'Dashboard' },
                                { key: 'Relatórios', label: 'Relatórios' },
                                { key: 'Leads', label: 'Leads' },
                                { key: 'Clientes', label: 'Clientes' },
                                { key: 'Vendas & Celulares', label: 'Vendas & Celulares' },
                                { key: 'Análise de Crédito', label: 'Análise de Crédito' },
                                { key: 'Estoque', label: 'Estoque' },
                                { key: 'Assistência Técnica (OS)', label: 'Assistência Técnica (OS)' },
                                { key: 'OS Terceirizadas', label: 'OS Terceirizadas' },
                                { key: 'WPP / Instagram', label: 'WPP / Instagram' },
                                { key: 'Gerenciar WPP/IG', label: 'Gerenciar WPP/IG' },
                                { key: 'Financeiro', label: 'Financeiro' },
                                { key: 'Controle de Bloqueio', label: 'Controle de Bloqueio' },
                                { key: 'Fiscal (NFe/NFSe)', label: 'Fiscal (NFe/NFSe)' },
                                { key: 'Configurações', label: 'Configurações' }
                              ]
                            },
                            {
                              title: 'Ações do Estoque',
                              items: [
                                { key: 'Estoque - Adicionar Produto', label: 'Cadastrar Novo Produto' },
                                { key: 'Estoque - Editar Produto', label: 'Editar Produto' },
                                { key: 'Estoque - Excluir Produto', label: 'Excluir Produto' },
                                { key: 'Estoque - Importar Planilha', label: 'Importar Planilha em Lote' },
                                { key: 'Estoque - Transferir Produto', label: 'Transferir entre Unidades' }
                              ]
                            },
                            {
                              title: 'Ações de Clientes',
                              items: [
                                { key: 'Clientes - Cadastrar', label: 'Cadastrar Novo Cliente' },
                                { key: 'Clientes - Editar', label: 'Editar Cliente' },
                                { key: 'Clientes - Excluir', label: 'Excluir Cliente' }
                              ]
                            },
                            {
                              title: 'Ações de Vendas & Celulares',
                              items: [
                                { key: 'Vendas - Registrar Nova Venda', label: 'Registrar Nova Venda' },
                                { key: 'Vendas - Cancelar Venda', label: 'Estornar/Cancelar Venda' },
                                { key: 'Vendas - Visualizar Contrato/Recibo', label: 'Visualizar/Reimprimir Contrato/Recibo' }
                              ]
                            },
                            {
                              title: 'Ações de Assistência Técnica (OS)',
                              items: [
                                { key: 'OS - Criar Nova OS', label: 'Abrir Nova OS' },
                                { key: 'OS - Editar OS', label: 'Editar OS / Orçamento' },
                                { key: 'OS - Excluir OS', label: 'Excluir OS' },
                                { key: 'OS - Mudar Status de Bancada', label: 'Mudar Status da Bancada Técnica' }
                              ]
                            },
                            {
                              title: 'Ações do Financeiro',
                              items: [
                                { key: 'Financeiro - Registrar Pagamento', label: 'Baixar Parcela de Crediário' },
                                { key: 'Financeiro - Lançar Caixa', label: 'Lançar Receita/Despesa Manual' },
                                { key: 'Financeiro - Excluir Lançamentos', label: 'Excluir Lançamentos de Caixa' }
                              ]
                            },
                            {
                              title: 'Ações de Leads / CRM',
                              items: [
                                { key: 'Leads - Criar Lead', label: 'Cadastrar Novo Lead' },
                                { key: 'Leads - Mover Kanban', label: 'Mover Kanban' },
                                { key: 'Leads - Excluir Lead', label: 'Excluir Lead' }
                              ]
                            }
                          ].map((group) => (
                            <React.Fragment key={group.title}>
                              <tr className="bg-white/[0.04]">
                                <td colSpan={2} className="px-6 py-2 text-[9px] font-black text-primary uppercase tracking-widest bg-white/[0.03] border-y border-white/5">
                                  {group.title}
                                </td>
                              </tr>
                              {group.items.map((item) => (
                                <tr key={item.key} className="hover:bg-white/[0.01] transition-all">
                                  <td className="px-8 py-3.5 font-display font-semibold text-white text-xs">
                                    {item.label}
                                  </td>
                                  <td className="px-6 py-3.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUserRbac(item.key)}
                                      className={cn(
                                        "mx-auto w-10 h-6 rounded-full p-1 transition-all duration-300 relative cursor-pointer flex items-center border border-white/5",
                                        isPageVisibleForUser(item.key) ? "bg-primary" : "bg-white/10"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-4 h-4 rounded-full bg-white transition-all duration-300 shadow",
                                        isPageVisibleForUser(item.key) ? "translate-x-4" : "translate-x-0"
                                      )} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] text-center opacity-60 flex flex-col items-center gap-3">
                    <ShieldCheck size={32} className="opacity-20 text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-wider">Aguardando Seleção de Colaborador</p>
                    <p className="text-[9px] text-on-surface-variant max-w-[280px]">Escolha um colaborador no seletor acima para auditar e editar suas permissões de tela reativas.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

