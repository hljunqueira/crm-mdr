import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  User, CreditCard, Phone, MapPin, Upload, FileText, Check, Loader2, Landmark, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { formatCPF, formatPhone, validateCPF, validateCNPJ, cn } from '../lib/utils';
import { useUI } from '../context/UIContext';

export default function PublicCustomerRegistration() {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [documentType, setDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [selectedDocType, setSelectedDocType] = useState<'RG' | 'CNH'>('RG');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    parent_contact_phone: '',
    reference1_name: '',
    reference1_phone: '',
    reference2_name: '',
    reference2_phone: '',
    notes: '',
    address: '',
    address_number: '',
    neighborhood: '',
    city: '',
    state: '',
    document_address_url: '',
    document_id_url: '',
    document_income_url: '',
    rg_frente_url: '',
    rg_verso_url: '',
    cnh_frente_url: '',
    cnh_verso_url: '',
    self_photo_url: '',
    registration_status: 'PRE_CADASTRO',
    credit_status: 'EM_ANALISE',
    approved_for_purchase: false,
    status: 'active'
  });

  // Pre-fill fields from query string
  useEffect(() => {
    const queryPhone = searchParams.get('phone') || '';
    const queryName = searchParams.get('name') || '';
    
    setFormData(prev => ({
      ...prev,
      phone: queryPhone ? formatPhone(queryPhone) : '',
      name: queryName || ''
    }));
  }, [searchParams]);

  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    setNotification({ type, title, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setNotification(null), 5000);
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
          showNotification('success', 'CEP Encontrado', 'Endereço preenchido automaticamente.');
        } else {
          showNotification('error', 'Erro no CEP', 'CEP não encontrado.');
        }
      } catch (err) {
        console.error('Erro ao consultar ViaCEP:', err);
        showNotification('error', 'Erro', 'Erro ao consultar o serviço de CEP.');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: 'document_address_url' | 'document_id_url' | 'document_income_url' | 'self_photo_url' | 'rg_frente_url' | 'rg_verso_url' | 'cnh_frente_url' | 'cnh_verso_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(p => ({ ...p, [fieldName]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(filePath);

      setFormData(p => ({ ...p, [fieldName]: publicUrl }));
      showNotification('success', 'Upload Concluído', 'Documento anexado com sucesso!');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      showNotification('error', 'Falha no Upload', `Erro ao fazer upload: ${error.message}`);
    } finally {
      setUploading(p => ({ ...p, [fieldName]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (!cleanCpf) {
      showNotification('error', 'Campo Obrigatório', `O ${documentType} é obrigatório.`);
      return;
    }

    if (documentType === 'CPF' && !validateCPF(cleanCpf)) {
      showNotification('error', 'CPF Inválido', 'O CPF informado não é válido.');
      return;
    }
    if (documentType === 'CNPJ' && !validateCNPJ(cleanCpf)) {
      showNotification('error', 'CNPJ Inválido', 'O CNPJ informado não é válido.');
      return;
    }

    if (selectedDocType === 'RG') {
      if (!formData.rg_frente_url || !formData.rg_verso_url) {
        showNotification('error', 'Documento Faltando', 'Por favor, anexe a foto do RG Frente e do RG Verso.');
        return;
      }
    } else {
      if (!formData.cnh_frente_url || !formData.cnh_verso_url) {
        showNotification('error', 'Documento Faltando', 'Por favor, anexe a foto da CNH Frente e da CNH Verso.');
        return;
      }
    }

    if (!formData.self_photo_url) {
      showNotification('error', 'Selfie Faltando', 'Por favor, anexe ou tire uma selfie segurando seu documento para validação.');
      return;
    }

    // Preenche o campo legado com a frente do documento selecionado para compatibilidade
    const documentIdUrl = selectedDocType === 'RG' ? formData.rg_frente_url : formData.cnh_frente_url;
    const finalFormData = {
      ...formData,
      document_id_url: documentIdUrl
    };

    setIsSubmitting(true);
    try {
      // Salva no banco de dados via API endpoint de criação de cliente
      await api.post('/customers', finalFormData);
      setSubmitted(true);
    } catch (error: any) {
      showNotification('error', 'Erro ao Enviar', error.message || 'Erro ao salvar os dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#07070c] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0f0f1a] border border-white/5 rounded-[32px] p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight">Cadastro Recebido!</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Obrigado, <strong>{formData.name}</strong>! Seus dados e comprovantes foram enviados com sucesso e nossa equipe já está realizando a sua análise de crédito.
            </p>
            <p className="text-[10px] text-on-surface-variant/60 leading-relaxed mt-2">
              Você será notificado no WhatsApp assim que a análise for concluída. Pode fechar esta página.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070c] text-white py-12 px-4 flex flex-col justify-center items-center">
      
      {/* HEADER LOGO */}
      <div className="w-full max-w-xl text-center mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase">MDR INFORMÁTICA & CELULARES</h1>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold opacity-60 mt-1">Formulário de Auto-Cadastro e Análise de Crédito</p>
      </div>

      {/* NOTIFICAÇÃO */}
      {notification && (
        <div className={cn(
          "w-full max-w-xl p-4 mb-6 rounded-2xl border text-xs leading-relaxed animate-in fade-in slide-in-from-top-4 duration-300",
          notification.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        )}>
          <strong className="block font-black uppercase mb-0.5">{notification.title}</strong>
          {notification.message}
        </div>
      )}

      {/* FORMULÁRIO */}
      <form onSubmit={handleSubmit} className="w-full max-w-xl bg-[#0f0f1a] border border-white/5 rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl">
        
        {/* DADOS PESSOAIS */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
            <User size={14} /> 1. Dados Cadastrais
          </h3>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Nome Completo</label>
            <input 
              type="text" 
              required
              placeholder="Digite seu nome completo"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-display"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Tipo de Documento</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDocumentType('CPF');
                    setFormData(p => ({ ...p, cpf: '' }));
                  }}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all",
                    documentType === 'CPF'
                      ? "bg-white border-white text-black font-black"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  CPF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentType('CNPJ');
                    setFormData(p => ({ ...p, cpf: '' }));
                  }}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all",
                    documentType === 'CNPJ'
                      ? "bg-white border-white text-black font-black"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  CNPJ
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">{documentType}</label>
              <input 
                type="text" 
                required
                placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                value={formData.cpf}
                onChange={(e) => setFormData(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">WhatsApp (com DDD)</label>
            <input 
              type="text" 
              required
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-mono"
            />
          </div>
        </div>

        {/* CONTATOS ADICIONAIS */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
            <Phone size={14} /> 2. Referências de Contato
          </h3>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Telefone de Contato dos Pais (com DDD)</label>
            <input 
              type="text" 
              required
              placeholder="(00) 00000-0000"
              value={formData.parent_contact_phone}
              onChange={(e) => setFormData(p => ({ ...p, parent_contact_phone: formatPhone(e.target.value) }))}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Referência 1 (Nome)</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Nome do amigo/parente"
                value={formData.reference1_name}
                onChange={(e) => setFormData(p => ({ ...p, reference1_name: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-display"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Referência 1 (WhatsApp)</label>
              <input 
                type="text" 
                required
                placeholder="(00) 00000-0000"
                value={formData.reference1_phone}
                onChange={(e) => setFormData(p => ({ ...p, reference1_phone: formatPhone(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Referência 2 (Nome)</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Outra referência"
                value={formData.reference2_name}
                onChange={(e) => setFormData(p => ({ ...p, reference2_name: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-display"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Referência 2 (WhatsApp)</label>
              <input 
                type="text" 
                required
                placeholder="(00) 00000-0000"
                value={formData.reference2_phone}
                onChange={(e) => setFormData(p => ({ ...p, reference2_phone: formatPhone(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* ENDEREÇO */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
            <MapPin size={14} /> 3. Endereço Residencial
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">
                CEP {loadingCep && <Loader2 className="inline animate-spin ml-1 text-primary" size={10} />}
              </label>
              <input 
                type="text" 
                required
                placeholder="00000-000"
                maxLength={9}
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-mono"
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Rua / Logradouro</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Av. Principal"
                value={formData.address}
                onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-display"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Bairro</label>
              <input 
                type="text" 
                required
                placeholder="Bairro"
                value={formData.neighborhood}
                onChange={(e) => setFormData(p => ({ ...p, neighborhood: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-display"
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Número</label>
              <input 
                type="text" 
                required
                placeholder="Nº"
                value={formData.address_number}
                onChange={(e) => setFormData(p => ({ ...p, address_number: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-mono"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Cidade</label>
              <input 
                type="text" 
                required
                placeholder="Cidade"
                value={formData.city}
                onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white transition-all font-display"
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">UF</label>
              <input 
                type="text" 
                required
                maxLength={2}
                placeholder="SC"
                value={formData.state}
                onChange={(e) => setFormData(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-white text-center transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* COMPROVANTES (UPLOADS) */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
            <Upload size={14} /> 4. Envio de Documentos
          </h3>
          <p className="text-[10px] text-on-surface-variant leading-relaxed">
            * Por favor, tire fotos nítidas dos comprovantes (ou anexe em PDF/Imagem). É obrigatório o envio do Documento de Identidade para prosseguir.
          </p>

          <div className="bg-black/20 border border-white/5 p-4 rounded-2xl space-y-3">
            <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Selecione o Documento para Enviar</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDocType('RG')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all",
                  selectedDocType === 'RG'
                    ? "bg-white border-white text-black font-black"
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                )}
              >
                RG (Frente e Verso)
              </button>
              <button
                type="button"
                onClick={() => setSelectedDocType('CNH')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all",
                  selectedDocType === 'CNH'
                    ? "bg-white border-white text-black font-black"
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                )}
              >
                CNH (Frente e Verso)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ...(selectedDocType === 'RG' ? [
                { label: 'RG Frente *', key: 'rg_frente_url' as const },
                { label: 'RG Verso *', key: 'rg_verso_url' as const }
              ] : [
                { label: 'CNH Frente *', key: 'cnh_frente_url' as const },
                { label: 'CNH Verso *', key: 'cnh_verso_url' as const }
              ]),
              { label: 'Comp. Residência', key: 'document_address_url' as const },
              { label: 'Comp. Renda', key: 'document_income_url' as const },
              { label: 'Sua Selfie *', key: 'self_photo_url' as const, isSelfie: true }
            ].map((doc, idx) => (
              <div key={idx} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-between text-center gap-3">
                <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider">{doc.label}</span>
                
                {formData[doc.key] ? (
                  <div className="flex flex-col items-center gap-2 py-1 w-full">
                    {doc.isSelfie ? (
                      <img 
                        src={formData[doc.key]} 
                        alt="Selfie Preview" 
                        className="w-12 h-12 rounded-full object-cover border border-white/20"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                        <Check size={12} /> Pronto
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-on-surface-variant/40 py-2 font-medium">Nenhum arquivo</div>
                )}

                <label className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-1.5">
                  {uploading[doc.key] ? (
                    <Loader2 className="animate-spin text-white" size={12} />
                  ) : (
                    <>
                      <Upload size={11} /> {formData[doc.key] ? 'Alterar' : 'Anexar'}
                    </>
                  )}
                  <input 
                    type="file" 
                    accept={doc.isSelfie ? "image/*" : "image/*,application/pdf"}
                    capture={doc.isSelfie ? "user" : undefined}
                    onChange={(e) => handleFileUpload(e, doc.key)}
                    className="hidden" 
                    disabled={uploading[doc.key]}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* BOTÃO DE CONFIRMAÇÃO */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-white/5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enviando Cadastro...
              </>
            ) : (
              <>
                Enviar Cadastro para Análise
              </>
            )}
          </button>
        </div>

      </form>
      
    </div>
  );
}
