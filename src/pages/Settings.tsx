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
  Edit2,
  X,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUnitStore } from '../store/useUnitStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'motion/react';

import { usePermissionStore } from '../store/usePermissionStore';

type TabType = 'unit' | 'notifications' | 'users' | 'rbac' | 'android-enterprise';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('unit');
  const { profile } = useAuthStore();
  const { unit, units, fetchUnit, fetchAllUnits, updateUnit, isLoading } = useUnitStore();
  const { showNotification, showModal, hideModal } = useUI();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  
  // States para Android Enterprise
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [isEnterpriseLoading, setIsEnterpriseLoading] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const fetchEnterpriseId = async () => {
    try {
      setIsEnterpriseLoading(true);
      const res = await fetch('/api/device-locks/enterprise');
      if (res.ok) {
        const data = await res.json();
        setEnterpriseId(data.enterpriseId);
      }
    } catch (e) {
      console.error('[Settings] Erro ao buscar Enterprise ID:', e);
    } finally {
      setIsEnterpriseLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'android-enterprise') {
      fetchEnterpriseId();
    }
  }, [activeTab]);

  const handleGenerateSignupUrl = async () => {
    try {
      setIsGeneratingLink(true);
      const res = await fetch('/api/device-locks/enterprise/signup-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackUrl: window.location.origin + '/api/device-locks/callback'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
          showNotification('info', 'Inscrição Iniciada', 'Complete o fluxo na janela do Google que foi aberta.');
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      showNotification('error', 'Erro', 'Não foi possível gerar a URL de inscrição.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleUnlinkEnterprise = async () => {
    if (!window.confirm('Tem certeza que deseja desvincular o Google Enterprise ID? Isso removerá as configurações de provisionamento.')) return;
    try {
      const res = await fetch('/api/device-locks/enterprise', {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification('success', 'Vínculo Removido', 'A conta Google Enterprise foi desvinculada com sucesso.');
        setEnterpriseId(null);
      } else {
        throw new Error();
      }
    } catch (e) {
      showNotification('error', 'Erro', 'Não foi possível desvincular a conta.');
    }
  };

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


  const DEFAULT_ENTRY_TEMPLATE = `🛠️ *MDR Informática & Celulares - Ordem de Serviço #{numero_os}* 🛠️

Olá *{nome_cliente}*!

Registramos com sucesso a entrada do seu equipamento em nossa assistência técnica.

💻 *Aparelho:* {aparelho}
📝 *Problema Relatado:* {problema_relatado}
📋 *Acessórios:* {acessorios}

Nosso técnico já está avaliando seu dispositivo. Enviaremos o orçamento completo por aqui em breve!`;

  const DEFAULT_BUDGET_TEMPLATE = `📊 *MDR Informática & Celulares - Orçamento OS #{numero_os}* 📊

Olá *{nome_cliente}*!

O diagnóstico técnico do seu *{aparelho}* foi concluído.

🔧 *Peças necessárias:* {valor_pecas}
👨‍🔧 *Mão de obra:* {valor_mao_de_obra}
💰 *Valor Total:* *{valor_total}*

*Garantia:* {prazo_garantia} dias após a conclusão.

Responda a esta mensagem aprovando o conserto para iniciarmos a execução imediata!`;

  const DEFAULT_READY_TEMPLATE = `🎉 *SEU EQUIPAMENTO ESTÁ PRONTO! - OS #{numero_os}* 🎉

Olá *{nome_cliente}*!

Temos ótimas notícias! O conserto do seu *{aparelho}* foi finalizado e todos os testes de qualidade foram aprovados.

💵 *Valor Final:* *{valor_total}*

O aparelho já está pronto para retirada em nossa loja. Agradecemos a preferência!`;

  const DEFAULT_RECEIPT_TERMS = `1. Orçamento: Validade de 10 dias. Início após aprovação.
2. Backup de Dados: A loja NÃO se responsabiliza por perdas de dados ou arquivos. Faça backup prévio.
3. Prazo de Descarte: Aparelhos deixados por mais de 90 dias após conclusão serão abandonados e poderão ser vendidos para cobrir despesas operacionais.
4. Avarias: A assistência não se responsabiliza por danos decorrentes de defeitos ocultos ou desgaste prévio constatados durante o processo de desmontagem e reparo.`;

  const DEFAULT_BILLING_REMINDER_TEMPLATE = `🔔 *Lembrete de Vencimento - {nome_loja}*

Olá, {nome_cliente}! Tudo bem? 😊

Passando para lembrar que a sua parcela *{parcela_atual}/{total_parcelas}* está próxima do vencimento:

📱 *Aparelho:* {aparelho}
💵 *Valor:* *{valor_parcela}*
📅 *Vencimento:* *{data_vencimento}*

🔗 *Link de Pagamento (Boleto/PIX):* {link_pagamento}

Para sua comodidade, você pode realizar o pagamento pelo link acima, via *PIX* ou diretamente em nossa loja física. 

⚠️ *Atenção:* O pagamento em dia evita multas adicionais ou bloqueios no dispositivo.

Se você já efetuou o pagamento, por favor desconsidere esta mensagem.

Agradecemos a sua parceria! 🤝
*{nome_loja}*`;

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    contract_terms: '',
    warranty_terms: '',
    pix_key: '',
    pix_key_type: 'cnpj' as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random',
    print_mode: 'thermal' as 'thermal' | 'a4',
    os_entry_template: '',
    os_budget_template: '',
    os_ready_template: '',
    os_receipt_terms: '',
    billing_reminder_template: '',
    billing_cron_hour: 9,
    billing_reminder_days_before: 3,
    billing_reminder_days_after: 5,
    grace_period_days: 30
  });

  const [focusedField, setFocusedField] = useState<'os_entry_template' | 'os_budget_template' | 'os_ready_template' | 'os_receipt_terms' | 'billing_reminder_template' | null>(null);
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);

  const updateSelection = (
    field: 'os_entry_template' | 'os_budget_template' | 'os_ready_template' | 'os_receipt_terms' | 'billing_reminder_template',
    e: React.SyntheticEvent<HTMLTextAreaElement>
  ) => {
    setFocusedField(field);
    setSelectionStart(e.currentTarget.selectionStart || 0);
    setSelectionEnd(e.currentTarget.selectionEnd || 0);
  };

  const insertVariable = (variable: string) => {
    const targetField = focusedField || 'os_entry_template';
    const currentValue = formData[targetField] || '';
    const start = selectionStart;
    const end = selectionEnd;
    const newValue = currentValue.slice(0, start) + variable + currentValue.slice(end);
    
    setFormData(prev => ({
      ...prev,
      [targetField]: newValue
    }));

    const newCursorPos = start + variable.length;
    setSelectionStart(newCursorPos);
    setSelectionEnd(newCursorPos);

    setTimeout(() => {
      const textarea = document.getElementById(targetField) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

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
        print_mode: (currentUnit.print_mode as any) || 'thermal',
        os_entry_template: currentUnit.os_entry_template || DEFAULT_ENTRY_TEMPLATE,
        os_budget_template: currentUnit.os_budget_template || DEFAULT_BUDGET_TEMPLATE,
        os_ready_template: currentUnit.os_ready_template || DEFAULT_READY_TEMPLATE,
        os_receipt_terms: currentUnit.os_receipt_terms || DEFAULT_RECEIPT_TERMS,
        billing_reminder_template: currentUnit.billing_reminder_template || DEFAULT_BILLING_REMINDER_TEMPLATE,
        billing_cron_hour: currentUnit.billing_cron_hour ?? 9,
        billing_reminder_days_before: currentUnit.billing_reminder_days_before ?? 3,
        billing_reminder_days_after: currentUnit.billing_reminder_days_after ?? 5,
        grace_period_days: currentUnit.grace_period_days ?? 30
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
      { id: 'notifications', label: 'Alertas e Termos de OS', icon: MessageCircle },
      { id: 'users', label: 'Colaboradores', icon: User },
      { id: 'rbac', label: 'Permissões do Menu (RBAC)', icon: ShieldCheck },
      { id: 'android-enterprise', label: 'Android Enterprise (EMM)', icon: Smartphone }
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




            {activeTab === 'notifications' && profile?.role === 'admin' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-10 border border-white/5 rounded-[40px] space-y-8 bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Alertas e Termos da OS</h2>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Personalize as mensagens automáticas de WhatsApp (n8n) e o termo impresso da OS</p>
                  </div>
                </div>

                {/* Loja selector for alerts */}
                {profile?.role === 'admin' && units.length > 0 && (
                  <div className="flex flex-wrap gap-4 p-2 bg-white/5 rounded-[32px] border border-white/10">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Editor Textareas */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Modelo: Entrada de OS (WhatsApp)</label>
                      <textarea 
                        id="os_entry_template"
                        rows={7}
                        value={formData.os_entry_template}
                        onChange={(e) => setFormData(prev => ({ ...prev, os_entry_template: e.target.value }))}
                        onFocus={(e) => updateSelection('os_entry_template', e)}
                        onSelect={(e) => updateSelection('os_entry_template', e)}
                        onKeyUp={(e) => updateSelection('os_entry_template', e)}
                        onMouseUp={(e) => updateSelection('os_entry_template', e)}
                        placeholder="🛠️ *MDR Informática & Celulares - Ordem de Serviço #{numero_os}* 🛠️&#10;&#10;Olá *{nome_cliente}*!&#10;&#10;Registramos com sucesso a entrada do seu equipamento em nossa assistência técnica.&#10;&#10;💻 *Aparelho:* {aparelho}&#10;📝 *Problema Relatado:* {problema_relatado}&#10;📋 *Acessórios:* {acessorios}&#10;&#10;Nosso técnico já está avaliando seu dispositivo. Enviaremos o orçamento completo por aqui em breve!"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono text-on-surface focus:border-white outline-none transition-all resize-y leading-relaxed"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Modelo: Orçamento de OS (WhatsApp)</label>
                      <textarea 
                        id="os_budget_template"
                        rows={7}
                        value={formData.os_budget_template}
                        onChange={(e) => setFormData(prev => ({ ...prev, os_budget_template: e.target.value }))}
                        onFocus={(e) => updateSelection('os_budget_template', e)}
                        onSelect={(e) => updateSelection('os_budget_template', e)}
                        onKeyUp={(e) => updateSelection('os_budget_template', e)}
                        onMouseUp={(e) => updateSelection('os_budget_template', e)}
                        placeholder="📊 *MDR Informática & Celulares - Orçamento OS #{numero_os}* 📊&#10;&#10;Olá *{nome_cliente}*!&#10;&#10;O diagnóstico técnico do seu *${aparelho}* foi concluído.&#10;&#10;🔧 *Peças necessárias:* {valor_pecas}&#10;👨‍🔧 *Mão de obra:* {valor_mao_de_obra}&#10;💰 *Valor Total:* *{valor_total}*&#10;&#10;*Garantia:* {prazo_garantia} dias após a conclusão.&#10;&#10;Responda a esta mensagem aprovando o conserto para iniciarmos a execução imediata!"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono text-on-surface focus:border-white outline-none transition-all resize-y leading-relaxed"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Modelo: OS Pronta para Retirada (WhatsApp)</label>
                      <textarea 
                        id="os_ready_template"
                        rows={7}
                        value={formData.os_ready_template}
                        onChange={(e) => setFormData(prev => ({ ...prev, os_ready_template: e.target.value }))}
                        onFocus={(e) => updateSelection('os_ready_template', e)}
                        onSelect={(e) => updateSelection('os_ready_template', e)}
                        onKeyUp={(e) => updateSelection('os_ready_template', e)}
                        onMouseUp={(e) => updateSelection('os_ready_template', e)}
                        placeholder="🎉 *SEU EQUIPAMENTO ESTÁ PRONTO! - OS #{numero_os}* 🎉&#10;&#10;Olá *{nome_cliente}*!&#10;&#10;Temos ótimas notícias! O conserto do seu *${aparelho}* foi finalizado e todos os testes de qualidade foram aprovados.&#10;&#10;💵 *Valor Final:* *{valor_total}*&#10;&#10;O aparelho já está pronto para retirada em nossa loja. Agradecemos a preferência!"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono text-on-surface focus:border-white outline-none transition-all resize-y leading-relaxed"
                      />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Termos de Recebimento da OS (Impresso - Canhoto)</label>
                      <textarea 
                        id="os_receipt_terms"
                        rows={6}
                        value={formData.os_receipt_terms}
                        onChange={(e) => setFormData(prev => ({ ...prev, os_receipt_terms: e.target.value }))}
                        onFocus={(e) => updateSelection('os_receipt_terms', e)}
                        onSelect={(e) => updateSelection('os_receipt_terms', e)}
                        onKeyUp={(e) => updateSelection('os_receipt_terms', e)}
                        onMouseUp={(e) => updateSelection('os_receipt_terms', e)}
                        placeholder="1. Orçamento: Validade de 10 dias. Início após aprovação.&#10;2. Backup de Dados: A loja NÃO se responsabiliza por perdas de dados ou arquivos. Faça backup prévio.&#10;3. Prazo de Descarte: Aparelhos deixados por mais de 90 dias após conclusão serão abandonados e poderão ser vendidos para cobrir despesas operacionais.&#10;4. Avarias: A assistência não se responsabiliza por danos decorrentes de defeitos ocultos ou desgaste prévio constatados durante o processo de desmontagem e reparo."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono text-on-surface focus:border-white outline-none transition-all resize-y leading-relaxed"
                      />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Modelo: Lembrete de Cobrança (WhatsApp)</label>
                      <textarea 
                        id="billing_reminder_template"
                        rows={7}
                        value={formData.billing_reminder_template}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_reminder_template: e.target.value }))}
                        onFocus={(e) => updateSelection('billing_reminder_template', e)}
                        onSelect={(e) => updateSelection('billing_reminder_template', e)}
                        onKeyUp={(e) => updateSelection('billing_reminder_template', e)}
                        onMouseUp={(e) => updateSelection('billing_reminder_template', e)}
                        placeholder="🔔 *Lembrete de Vencimento - {nome_loja}*&#10;&#10;Olá, {nome_cliente}! Tudo bem? 😊&#10;&#10;Passando para lembrar que a sua parcela *{parcela_atual}/{total_parcelas}* está próxima do vencimento:&#10;&#10;📱 *Aparelho:* {aparelho}&#10;💵 *Valor:* *{valor_parcela}*&#10;📅 *Vencimento:* *{data_vencimento}*&#10;&#10;🔗 *Link de Pagamento (Boleto/PIX):* {link_pagamento}&#10;&#10;Para sua comodidade, você pode realizar o pagamento pelo link acima, via *PIX* ou diretamente em nossa loja física.&#10;&#10;⚠️ *Atenção:* O pagamento em dia evita multas adicionais ou bloqueios no dispositivo.&#10;&#10;Se você já efetuou o pagamento, por favor desconsidere esta mensagem.&#10;&#10;Agradecemos a sua parceria! 🤝&#10;*{nome_loja}*"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono text-on-surface focus:border-white outline-none transition-all resize-y leading-relaxed"
                      />
                    </div>

                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">Agendamento de Cobranças</h3>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60 mt-0.5">Defina as regras de disparo automático para cobrança no crediário</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Horário do Disparo (Cron)</label>
                          <select
                            value={formData.billing_cron_hour}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_cron_hour: Number(e.target.value) }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all appearance-none"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i} className="bg-surface-container-high">
                                {String(i).padStart(2, '0')}:00
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Dias Antes (Aviso Amigável)</label>
                          <input 
                            type="number" 
                            min={0}
                            max={30}
                            value={formData.billing_reminder_days_before}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_reminder_days_before: Number(e.target.value) }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Dias Depois (Cobrança Atraso)</label>
                          <input 
                            type="number" 
                            min={0}
                            max={30}
                            value={formData.billing_reminder_days_after}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_reminder_days_after: Number(e.target.value) }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Dias de Carência (1ª Parcela)</label>
                          <input 
                            type="number" 
                            min={0}
                            max={90}
                            value={formData.grace_period_days}
                            onChange={(e) => setFormData(prev => ({ ...prev, grace_period_days: Number(e.target.value) }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Help variables */}
                  <div className="lg:col-span-1 glass-card p-6 border border-white/5 rounded-3xl bg-white/[0.01] h-fit space-y-6">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider text-primary">Variáveis Disponíveis</h3>
                      <p className="text-[10px] text-on-surface-variant leading-relaxed mt-1">Clique nas tags abaixo para inseri-las na posição do cursor do campo ativo:</p>
                    </div>

                    {/* OS Section */}
                    <div className="space-y-3">
                      <div className="text-[9px] font-black text-white uppercase tracking-widest bg-white/5 px-2 py-1 rounded">Para Ordens de Serviço (OS)</div>
                      {[
                        { label: 'Nome do Cliente', tag: '{nome_cliente}' },
                        { label: 'Nº da OS formatado', tag: '{numero_os}' },
                        { label: 'Aparelho (Marca/Modelo)', tag: '{aparelho}' },
                        { label: 'Defeito Relatado', tag: '{problema_relatado}' },
                        { label: 'Acessórios Deixados', tag: '{acessorios}' },
                        { label: 'Valor Peças', tag: '{valor_pecas}' },
                        { label: 'Mão de Obra', tag: '{valor_mao_de_obra}' },
                        { label: 'Valor Total', tag: '{valor_total}' },
                        { label: 'Garantia (Dias)', tag: '{prazo_garantia}' },
                      ].map((item) => (
                        <button
                          key={'os-' + item.tag}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertVariable(item.tag);
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 hover:scale-[1.01] active:scale-95 transition-all group flex flex-col gap-0.5 cursor-pointer"
                        >
                          <span className="text-[9px] text-on-surface-variant group-hover:text-white uppercase tracking-widest font-black transition-colors">
                            {item.label}
                          </span>
                          <span className="font-mono text-[11px] text-primary font-bold">
                            {item.tag}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Billing Section */}
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="text-[9px] font-black text-white uppercase tracking-widest bg-white/5 px-2 py-1 rounded">Para Cobranças</div>
                      {[
                        { label: 'Nome do Cliente', tag: '{nome_cliente}' },
                        { label: 'Parcela Atual', tag: '{parcela_atual}' },
                        { label: 'Total Parcelas', tag: '{total_parcelas}' },
                        { label: 'Valor Parcela', tag: '{valor_parcela}' },
                        { label: 'Aparelho (Modelo)', tag: '{aparelho}' },
                        { label: 'Data Vencimento', tag: '{data_vencimento}' },
                        { label: 'Nome da Loja', tag: '{nome_loja}' },
                        { label: 'Telefone da Loja', tag: '{telefone_loja}' },
                        { label: 'Link de Pagamento', tag: '{link_pagamento}' },
                      ].map((item) => (
                        <button
                          key={'billing-' + item.tag}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertVariable(item.tag);
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 hover:scale-[1.01] active:scale-95 transition-all group flex flex-col gap-0.5 cursor-pointer"
                        >
                          <span className="text-[9px] text-on-surface-variant group-hover:text-white uppercase tracking-widest font-black transition-colors">
                            {item.label}
                          </span>
                          <span className="font-mono text-[11px] text-primary font-bold">
                            {item.tag}
                          </span>
                        </button>
                      ))}
                    </div>
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
                        {/* Botão de Fechar */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserModal(false);
                            setEditingUser(null);
                          }}
                          className="absolute top-6 right-8 p-2 rounded-full text-on-surface-variant hover:text-white hover:bg-white/5 transition-all z-10"
                          aria-label="Fechar"
                        >
                          <X size={20} />
                        </button>

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
                                { key: 'Fornecedores', label: 'Fornecedores' },
                                { key: 'Parceiros', label: 'Parceiros' },
                                { key: 'Assistência Técnica (OS)', label: 'Assistência Técnica (OS)' },
                                { key: 'OS Terceirizadas', label: 'OS Terceirizadas' },
                                { key: 'WPP / Instagram', label: 'WPP / Instagram' },
                                { key: 'Gerenciar WPP/IG', label: 'Gerenciar WPP/IG' },
                                { key: 'Financeiro', label: 'Recebíveis' },
                                { key: 'Controle de Caixa', label: 'Controle de Caixa' },
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
                              title: 'Ações de Fornecedores',
                              items: [
                                { key: 'Fornecedores - Cadastrar', label: 'Cadastrar Fornecedor' },
                                { key: 'Fornecedores - Editar', label: 'Editar Fornecedor' },
                                { key: 'Fornecedores - Excluir', label: 'Excluir Fornecedor' }
                              ]
                            },
                            {
                              title: 'Ações de Parceiros',
                              items: [
                                { key: 'Parceiros - Cadastrar', label: 'Cadastrar Parceiro' },
                                { key: 'Parceiros - Editar', label: 'Editar Parceiro' },
                                { key: 'Parceiros - Excluir', label: 'Excluir Parceiro' }
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

            {activeTab === 'android-enterprise' && profile?.role === 'admin' && (
              <motion.div 
                key="android-enterprise"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-10 border border-white/5 rounded-[40px] space-y-8 bg-white/[0.02]"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Android Enterprise (EMM)</h2>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Vincule o Google Device Lock Controller para bloqueio remoto de Androids</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {isEnterpriseLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Verificando status do vínculo...</span>
                    </div>
                  ) : enterpriseId ? (
                    <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] space-y-6">
                      <div className="flex items-center gap-4 text-emerald-400">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Conta Vinculada com Sucesso</p>
                          <h3 className="font-mono text-sm text-white font-black mt-0.5">{enterpriseId}</h3>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Seu CRM MDR já está conectado à Android Management API. O provisionamento via QR Code e os comandos de bloqueio e desbloqueio estão ativos para todos os aparelhos Android vinculados ao sistema.
                      </p>

                      <div className="flex gap-4 pt-2">
                        <button
                          onClick={fetchEnterpriseId}
                          className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <RefreshCw size={14} /> Atualizar Status
                        </button>
                        <button
                          onClick={handleUnlinkEnterprise}
                          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Desvincular Conta
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[32px] space-y-6">
                      <div className="flex items-center gap-4 text-amber-500">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Aguardando Vínculo</p>
                          <h3 className="text-xs text-white font-black mt-0.5">Google Enterprise ID não cadastrado</h3>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Para habilitar a integração com o Google Device Lock Controller e bloquear celulares Android de clientes inadimplentes, você precisa primeiro registrar sua empresa na Android Management API do Google.
                      </p>

                      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Instruções Passo a Passo</h4>
                        <ol className="text-[11px] text-on-surface-variant/90 space-y-2.5 list-decimal pl-4 leading-relaxed">
                          <li>Prepare uma conta de e-mail do Google (Gmail comum ou Workspace) que <strong>não seja</strong> a mesma conta que você usa no Google Play Console pessoal e que <strong>não pertença</strong> a nenhuma outra organização Enterprise.</li>
                          <li>Clique no botão <strong>"Iniciar Registro no Google"</strong> abaixo. Uma nova aba se abrirá com o fluxo de registro oficial do Google Android Enterprise.</li>
                          <li>Siga as telas do Google, inserindo o nome da sua empresa e aceitando os termos de EMM.</li>
                          <li>Na última etapa, confirme o vínculo. O Google redirecionará você automaticamente de volta para este CRM e salvará o seu <strong>Enterprise ID</strong>.</li>
                        </ol>
                      </div>

                      <button
                        onClick={handleGenerateSignupUrl}
                        disabled={isGeneratingLink}
                        className="w-full md:w-auto flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50"
                      >
                        {isGeneratingLink ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Gerando Link...
                          </>
                        ) : (
                          <>
                            <QrCode size={16} />
                            Iniciar Registro no Google
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

