import React, { useState, useEffect } from 'react';
import { 
  User, CreditCard, Phone, MapPin, Save, X, 
  Upload, FileText, Check, Loader2, DollarSign, Smartphone
} from 'lucide-react';
import { useCustomerStore, Customer } from '../../store/useCustomerStore';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCPF, formatPhone } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface CustomerFormProps {
  initialData?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomerForm({ initialData, onSuccess, onCancel }: CustomerFormProps) {
  const { addCustomer, updateCustomer } = useCustomerStore();
  const { showNotification } = useUI();
  const { profile } = useAuthStore();

  const isAdmin = profile?.role === 'admin';

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cpf: initialData?.cpf || '',
    phone: initialData?.phone || '',
    parent_contact_phone: initialData?.parent_contact_phone || '',
    reference1_name: initialData?.reference1_name || '',
    reference1_phone: initialData?.reference1_phone || '',
    reference2_name: initialData?.reference2_name || '',
    reference2_phone: initialData?.reference2_phone || '',
    notes: initialData?.notes || '',
    address: initialData?.address || '',
    address_number: initialData?.address_number || '',
    neighborhood: initialData?.neighborhood || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    document_address_url: initialData?.document_address_url || '',
    document_id_url: initialData?.document_id_url || '',
    document_income_url: initialData?.document_income_url || '',
    desired_device: initialData?.desired_device || '',
    needed_credit: initialData?.needed_credit || 0,
    desired_installment_value: initialData?.desired_installment_value || 0,
    classification: initialData?.classification || 'MEDIO',
    credit_limit: initialData?.credit_limit || 0,
    suggested_down_payment: initialData?.suggested_down_payment || 0,
    credit_status: initialData?.credit_status || 'EM_ANALISE',
    approved_for_purchase: initialData?.approved_for_purchase || false,
    registration_status: initialData?.registration_status || 'PRE_CADASTRO',
    responsible_analyst_id: initialData?.responsible_analyst_id || '',
    status: (initialData?.status || 'active') as any
  });

  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [admins, setAdmins] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formType, setFormType] = useState<'simple' | 'complete'>(() => {
    if (initialData) {
      const hasCompleteInfo = 
        !!initialData.address || 
        !!initialData.parent_contact_phone || 
        !!initialData.reference1_name || 
        !!initialData.document_id_url || 
        !!initialData.desired_device;
      return hasCompleteInfo ? 'complete' : 'simple';
    }
    return 'simple';
  });

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, phone')
          .eq('role', 'admin')
          .eq('active', true);
        if (data && !error) {
          setAdmins(data);
        }
      } catch (err) {
        console.error('Error fetching admins:', err);
      }
    };
    fetchAdmins();
  }, []);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: 'document_address_url' | 'document_id_url' | 'document_income_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(p => ({ ...p, [fieldName]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { data, error } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(filePath);

      setFormData(p => ({ ...p, [fieldName]: publicUrl }));
      showNotification('success', 'Documento anexado com sucesso!');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      showNotification('error', `Erro ao fazer upload: ${error.message}`);
    } finally {
      setUploading(p => ({ ...p, [fieldName]: false }));
    }
  };

  const sendWhatsAppNotification = async (analystId: string, customerName: string, customerCPF: string) => {
    try {
      const selectedAnalyst = admins.find(a => a.id === analystId);
      if (!selectedAnalyst || !selectedAnalyst.phone) {
        console.warn('Analista não possui telefone de contato cadastrado.');
        return;
      }

      // Encontrar canal conectado
      const { data: channels } = await supabase
        .from('automation_channels')
        .select('*')
        .eq('status', 'connected')
        .limit(1);

      if (!channels || channels.length === 0) {
        console.warn('Nenhum canal ativo do WhatsApp configurado para disparar mensagens.');
        return;
      }

      const instance = channels[0].instance_name;
      const cleanPhone = selectedAnalyst.phone.replace(/\D/g, '');
      const remoteJid = `${cleanPhone}@s.whatsapp.net`;

      const messageText = `📢 *NOVO PRÉ-CADASTRO RECEBIDO*\n\n` +
        `Olá *${selectedAnalyst.full_name || 'Analista'}*!\n\n` +
        `Um novo pré-cadastro de cliente foi enviado e está aguardando sua análise de crédito.\n\n` +
        `👤 *Cliente:* ${customerName}\n` +
        `📄 *CPF:* ${customerCPF}\n` +
        `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n\n` +
        `Por favor, acesse o painel MDR para realizar a análise dos documentos e liberação de crédito.`;

      await fetch(`/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: instance,
          remoteJid: remoteJid,
          text: messageText
        })
      });
      console.log('Notificação enviada com sucesso para o analista responsável.');
    } catch (err) {
      console.error('Falha ao enviar notificação de WhatsApp:', err);
    }
  };

  const handleCepChange = async (value: string) => {
    const clean = value.replace(/\D/g, '');
    let formatted = clean;
    if (clean.length > 5) {
      formatted = `${clean.substring(0, 5)}-${clean.substring(5, 8)}`;
    }
    setCep(formatted);

    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
            address: data.logradouro || '',
            neighborhood: data.bairro || ''
          }));
          
          if (!data.logradouro) {
            showNotification('info', 'CEP Único/Geral detectado. Digite a rua e o bairro manualmente.');
            setTimeout(() => {
              document.getElementById('customer-address-input')?.focus();
            }, 100);
          } else {
            showNotification('success', 'Endereço preenchido automaticamente!');
          }
        } else {
          showNotification('error', 'CEP não encontrado.');
        }
      } catch (err) {
        console.error('Erro ao consultar ViaCEP:', err);
        showNotification('error', 'Erro ao consultar o serviço de CEP.');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = { 
        ...formData,
        responsible_analyst_id: formData.responsible_analyst_id || null as any
      };

      if (formType === 'simple') {
        // Limpar campos não utilizados para o cadastro simples
        submitData.parent_contact_phone = '';
        submitData.reference1_name = '';
        submitData.reference1_phone = '';
        submitData.reference2_name = '';
        submitData.reference2_phone = '';
        submitData.address = '';
        submitData.address_number = '';
        submitData.neighborhood = '';
        submitData.city = '';
        submitData.state = '';
        submitData.document_address_url = '';
        submitData.document_id_url = '';
        submitData.document_income_url = '';
        submitData.desired_device = '';
        submitData.needed_credit = 0;
        submitData.desired_installment_value = 0;

        if (!initialData) {
          submitData.registration_status = 'APROVADO';
          submitData.credit_status = 'APROVADO';
          submitData.approved_for_purchase = true;
        }
      } else {
        // Se for cadastro completo novo
        if (!initialData) {
          submitData.registration_status = 'PRE_CADASTRO';
          submitData.credit_status = 'EM_ANALISE';
          submitData.approved_for_purchase = false;
        } else if (initialData.registration_status === 'APROVADO' && (formData.desired_device || formData.needed_credit > 0)) {
          // Se o cliente simples já estava aprovado mas agora foi atualizado para completo com simulação de crédito
          submitData.registration_status = 'PRE_CADASTRO';
          submitData.credit_status = 'EM_ANALISE';
          submitData.approved_for_purchase = false;
        }
      }

      if (initialData) {
        await updateCustomer(initialData.id, submitData);
        showNotification('success', 'Cliente Atualizado com Sucesso!');
      } else {
        await addCustomer(submitData);
        showNotification('success', 'Cliente Cadastrado com Sucesso!');

        // Disparar WhatsApp se for um cadastro completo novo com analista selecionado
        if (formType === 'complete' && submitData.responsible_analyst_id) {
          await sendWhatsAppNotification(
            submitData.responsible_analyst_id,
            submitData.name,
            submitData.cpf
          );
        }
      }
      onSuccess();
    } catch (error) {
      showNotification('error', 'Erro ao salvar os dados do cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2 pr-4 custom-scrollbar">
      
      {/* SELETOR TIPO DE CADASTRO */}
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 max-w-md mx-auto mb-2">
        <button
          type="button"
          onClick={() => setFormType('simple')}
          className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            formType === 'simple' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-on-surface-variant hover:text-white'
          }`}
        >
          Cadastro Simples
        </button>
        <button
          type="button"
          onClick={() => setFormType('complete')}
          className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            formType === 'complete' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-on-surface-variant hover:text-white'
          }`}
        >
          Cadastro c/ Análise de Crédito
        </button>
      </div>

      {/* SEÇÃO 1: INFORMAÇÕES PESSOAIS */}
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <User size={14} /> Dados Pessoais
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome Completo</label>
            <input 
              type="text" 
              required
              placeholder="Ex: João da Silva"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">CPF</label>
            <input 
              type="text" 
              required
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => setFormData(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">WhatsApp</label>
            <input 
              type="text" 
              required
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {formType === 'complete' && (
        <>
          {/* SEÇÃO 2: CONTATOS COMPLEMENTARES */}
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <Phone size={14} /> Contatos Complementares
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Telefone de Contato dos Pais</label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={formData.parent_contact_phone}
              onChange={(e) => setFormData(p => ({ ...p, parent_contact_phone: formatPhone(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Referência 1 - Nome</label>
            <input
              type="text"
              placeholder="Nome da referência"
              value={formData.reference1_name}
              onChange={(e) => setFormData(p => ({ ...p, reference1_name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Referência 1 - Telefone</label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={formData.reference1_phone}
              onChange={(e) => setFormData(p => ({ ...p, reference1_phone: formatPhone(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Referência 2 - Nome</label>
            <input
              type="text"
              placeholder="Nome da referência"
              value={formData.reference2_name}
              onChange={(e) => setFormData(p => ({ ...p, reference2_name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Referência 2 - Telefone</label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={formData.reference2_phone}
              onChange={(e) => setFormData(p => ({ ...p, reference2_phone: formatPhone(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: ENDEREÇO ESTRUTURADO */}
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <MapPin size={14} /> Endereço Residencial
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">
              CEP {loadingCep && <Loader2 className="inline animate-spin ml-1 text-primary" size={10} />}
            </label>
            <input 
              type="text" 
              placeholder="00000-000"
              maxLength={9}
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Logradouro / Rua</label>
            <input 
              type="text" 
              id="customer-address-input"
              placeholder="Ex: Av. Brasil"
              value={formData.address}
              onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Bairro</label>
            <input 
              type="text" 
              placeholder="Bairro"
              value={formData.neighborhood}
              onChange={(e) => setFormData(p => ({ ...p, neighborhood: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="md:col-span-1 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Número</label>
            <input 
              type="text" 
              placeholder="Nº"
              value={formData.address_number}
              onChange={(e) => setFormData(p => ({ ...p, address_number: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Cidade</label>
            <input 
              type="text" 
              placeholder="Cidade"
              value={formData.city}
              onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="md:col-span-1 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">UF</label>
            <input 
              type="text" 
              maxLength={2}
              placeholder="SP"
              value={formData.state}
              onChange={(e) => setFormData(p => ({ ...p, state: e.target.value.toUpperCase() }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none text-center transition-all"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: ANEXOS & DOCUMENTOS */}
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <Upload size={14} /> Documentos Comprobatórios
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Comp. Endereço', key: 'document_address_url' as const },
            { label: 'CNH ou RG', key: 'document_id_url' as const },
            { label: 'Comp. Renda', key: 'document_income_url' as const }
          ].map((doc, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-between text-center gap-3">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">{doc.label}</span>
              
              {formData[doc.key] ? (
                <a 
                  href={formData[doc.key]} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-black text-success hover:underline py-2"
                >
                  <FileText size={16} /> Anexo Pronto <Check size={14} />
                </a>
              ) : (
                <div className="text-xs text-on-surface-variant/40 py-2">Nenhum Arquivo</div>
              )}

              <label className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2">
                {uploading[doc.key] ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <>
                    <Upload size={12} /> {formData[doc.key] ? 'Alterar' : 'Anexar'}
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, doc.key)}
                  className="hidden" 
                  disabled={uploading[doc.key]}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 5: SIMULAÇÃO DE PRÉ-VENDA */}
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <Smartphone size={14} /> Simulação de Pré-venda (Sujeita a Aprovação)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Aparelho Desejado */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Aparelho Procurado</label>
            <input 
              type="text" 
              placeholder="Ex: iPhone 13 128GB"
              value={formData.desired_device}
              onChange={(e) => setFormData(p => ({ ...p, desired_device: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Crédito Necessário */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Crédito Necessário (R$)</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.needed_credit === 0 ? '' : formData.needed_credit}
                onChange={(e) => setFormData(p => ({ ...p, needed_credit: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Entrada Sugerida */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Valor de Entrada Sugerido (R$)</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.suggested_down_payment === 0 ? '' : formData.suggested_down_payment}
                onChange={(e) => setFormData(p => ({ ...p, suggested_down_payment: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Valor da Parcela Desejada */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Valor Ideal da Parcela (R$)</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.desired_installment_value === 0 ? '' : formData.desired_installment_value}
                onChange={(e) => setFormData(p => ({ ...p, desired_installment_value: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>
        </>
      )}


      {/* BOTÕES DE AÇÃO */}
      <div className="flex gap-4 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all disabled:opacity-50"
        >
          Cancelar
        </button>
        <button 
          type="submit"
          disabled={isSubmitting}
          className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Salvando...
            </>
          ) : (
            <>
              <Save size={16} /> {initialData ? 'Atualizar Cadastro' : 'Enviar Cadastro'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
