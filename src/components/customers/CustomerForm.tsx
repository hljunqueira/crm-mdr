import React, { useState, useEffect } from 'react';
import { 
  User, CreditCard, Phone, MapPin, Save, X, 
  Upload, FileText, Check, Loader2, DollarSign, 
  ShieldAlert, UserCheck
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
    address: initialData?.address || '',
    address_number: initialData?.address_number || '',
    neighborhood: initialData?.neighborhood || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    document_address_url: initialData?.document_address_url || '',
    document_id_url: initialData?.document_id_url || '',
    document_income_url: initialData?.document_income_url || '',
    classification: initialData?.classification || 'MEDIO',
    credit_limit: initialData?.credit_limit || 0,
    credit_status: initialData?.credit_status || 'EM_ANALISE',
    approved_for_purchase: initialData?.approved_for_purchase || false,
    registration_status: initialData?.registration_status || 'PRE_CADASTRO',
    responsible_analyst_id: initialData?.responsible_analyst_id || '',
    status: (initialData?.status || 'active') as any
  });

  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [admins, setAdmins] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Garantir o status correto se for pré-cadastro ou aprovado
      const submitData = { 
        ...formData,
        responsible_analyst_id: formData.responsible_analyst_id || null as any
      };

      if (initialData) {
        await updateCustomer(initialData.id, submitData);
        showNotification('success', 'Cliente Atualizado com Sucesso!');
      } else {
        await addCustomer(submitData);

        showNotification('success', 'Cliente Cadastrado com Sucesso!');

        // Disparar WhatsApp se for um pré-cadastro novo com analista selecionado
        if (submitData.responsible_analyst_id) {
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

      {/* SEÇÃO 2: ENDEREÇO ESTRUTURADO */}
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <MapPin size={14} /> Endereço Residencial
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Logradouro / Rua</label>
            <input 
              type="text" 
              placeholder="Ex: Av. Brasil"
              value={formData.address}
              onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
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
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Bairro</label>
            <input 
              type="text" 
              placeholder="Bairro"
              value={formData.neighborhood}
              onChange={(e) => setFormData(p => ({ ...p, neighborhood: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="md:col-span-3 space-y-2">
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

      {/* SEÇÃO 4: ANÁLISE DE CRÉDITO & ADMINISTRAÇÃO */}
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <ShieldAlert size={14} /> Análise de Crédito & Controle
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Classificação Risco */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Classificação do Cliente</label>
            <select
              value={formData.classification}
              onChange={(e) => setFormData(p => ({ ...p, classification: e.target.value as any }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
            >
              <option value="BOM" className="bg-[#121214] text-success">BOM</option>
              <option value="MEDIO" className="bg-[#121214] text-warning">MEDIO</option>
              <option value="RUIM" className="bg-[#121214] text-error">RUIM</option>
            </select>
          </div>

          {/* Limite Pré-Aprovado */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Limite Pré-Aprovado (R$)</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.credit_limit}
                onChange={(e) => setFormData(p => ({ ...p, credit_limit: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Status Análise de Crédito */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Status da Análise de Crédito</label>
            <select
              value={formData.credit_status}
              onChange={(e) => setFormData(p => ({ ...p, credit_status: e.target.value as any }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
            >
              <option value="EM_ANALISE" className="bg-[#121214]">EM ANÁLISE</option>
              <option value="APROVADO" className="bg-[#121214] text-success">APROVADO</option>
              <option value="APROVADO_COM_ENTRADA" className="bg-[#121214] text-warning">APROVADO COM ENTRADA</option>
              <option value="REPROVADO" className="bg-[#121214] text-error">REPROVADO</option>
            </select>
          </div>

          {/* Analista Responsável (WhatsApp) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Responsável pela Análise (Notificação)</label>
            <select
              value={formData.responsible_analyst_id}
              onChange={(e) => setFormData(p => ({ ...p, responsible_analyst_id: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
            >
              <option value="" className="bg-[#121214]">Nenhum Selecionado</option>
              {admins.map((adm) => (
                <option key={adm.id} value={adm.id} className="bg-[#121214]">
                  {adm.full_name} {adm.phone ? `(${adm.phone})` : '(Sem Celular)'}
                </option>
              ))}
            </select>
          </div>

          {/* CONTROLES DE LIBERAÇÃO DE CRÉDITO E COMPRA */}
          <div className="md:col-span-2 bg-primary/5 border border-primary/20 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase text-on-surface tracking-wider">Liberado para Compra</span>
                <span className="text-[9px] text-on-surface-variant opacity-60">Permite registrar vendas para este cliente</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.approved_for_purchase}
                  onChange={(e) => setFormData(p => ({ ...p, approved_for_purchase: e.target.checked }))}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Status do Cadastro</span>
              <select
                value={formData.registration_status}
                onChange={(e) => setFormData(p => ({ ...p, registration_status: e.target.value as any }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary outline-none transition-all appearance-none"
              >
                <option value="PRE_CADASTRO" className="bg-[#121214]">PRÉ-CADASTRO (Aguardando Aprovação)</option>
                <option value="APROVADO" className="bg-[#121214] text-success">APROVADO (Incluir como Cliente)</option>
                <option value="REPROVADO" className="bg-[#121214] text-error">REPROVADO / REJEITADO</option>
              </select>
            </div>
          </div>

        </div>
      </div>

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
