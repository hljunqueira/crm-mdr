import React, { useState, useEffect } from 'react';
import { 
  Users, Search, ShieldCheck, DollarSign, Loader2, 
  AlertCircle, CheckCircle2, User, Phone, MapPin, 
  FileText, ExternalLink, ShieldAlert, Save, UserCheck
} from 'lucide-react';
import { useCustomerStore, Customer } from '../store/useCustomerStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { formatCPF, formatPhone } from '../lib/utils';
import { supabase } from '../lib/supabase';

export default function CreditAnalysis() {
  const { customers, fetchCustomers, updateCustomer } = useCustomerStore();
  const { showNotification } = useUI();
  const { profile } = useAuthStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Bacen Query States
  const [queryingBacen, setQueryingBacen] = useState(false);
  const [bacenData, setBacenData] = useState<any | null>(null);
  const [bacenError, setBacenError] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    classification: 'MEDIO' as 'BOM' | 'MEDIO' | 'RUIM',
    credit_limit: 0,
    suggested_down_payment: 0,
    credit_status: 'EM_ANALISE' as 'EM_ANALISE' | 'REPROVADO' | 'APROVADO_COM_ENTRADA' | 'APROVADO',
    approved_for_purchase: false,
    registration_status: 'PRE_CADASTRO' as 'PRE_CADASTRO' | 'APROVADO' | 'REPROVADO',
    responsible_analyst_id: '',
    notes: ''
  });

  const [admins, setAdmins] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
    
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
  }, [fetchCustomers]);

  const pendingCustomers = customers.filter(c => 
    c.registration_status === 'PRE_CADASTRO' || 
    c.credit_status === 'EM_ANALISE'
  );

  const filteredCustomers = pendingCustomers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Load customer data into form state when selected
  useEffect(() => {
    if (selectedCustomer) {
      setFormData({
        classification: selectedCustomer.classification || 'MEDIO',
        credit_limit: selectedCustomer.credit_limit || 0,
        suggested_down_payment: selectedCustomer.suggested_down_payment || 0,
        credit_status: selectedCustomer.credit_status || 'EM_ANALISE',
        approved_for_purchase: selectedCustomer.approved_for_purchase || false,
        registration_status: selectedCustomer.registration_status || 'PRE_CADASTRO',
        responsible_analyst_id: selectedCustomer.responsible_analyst_id || profile?.id || '',
        notes: selectedCustomer.notes || ''
      });
      setBacenData(null);
      setBacenError(null);
    }
  }, [selectedCustomer, profile?.id]);

  const handleQueryBacen = async () => {
    if (!selectedCustomerId) return;
    
    setQueryingBacen(true);
    setBacenError(null);
    setBacenData(null);

    try {
      const response = await fetch(`/api/customers/${selectedCustomerId}/bacen`);
      if (!response.ok) {
        throw new Error('Falha ao consultar API do Bacen');
      }
      const data = await response.json();
      
      if (data.error || data.status === false) {
        throw new Error(data.message || data.error || 'Erro retornado pela API Direct Data');
      }
      
      setBacenData(data);
      
      // Auto decision logic suggestion
      const resumo = data.retorno?.resumo || data.resumo || {};
      const vencido = Number(resumo.vencido || resumo.Vencido || 0);
      const prejuizo = Number(resumo.prejuizo || resumo.Prejuizo || 0);
      
      let suggestedClass: 'BOM' | 'MEDIO' | 'RUIM' = 'BOM';
      let suggestedStatus: typeof formData.credit_status = 'APROVADO';
      let suggestedLimit = 3000;
      let suggestedDownPayment = 0;
      
      if (prejuizo > 0 || vencido > 1000) {
        suggestedClass = 'RUIM';
        suggestedStatus = 'REPROVADO';
        suggestedLimit = 0;
        suggestedDownPayment = 0;
      } else if (vencido > 0 && vencido <= 1000) {
        suggestedClass = 'MEDIO';
        suggestedStatus = 'APROVADO_COM_ENTRADA';
        suggestedLimit = 1500;
        suggestedDownPayment = 300;
      }
      
      setFormData(prev => ({
        ...prev,
        classification: suggestedClass,
        credit_limit: suggestedLimit,
        suggested_down_payment: suggestedDownPayment,
        credit_status: suggestedStatus,
        approved_for_purchase: suggestedStatus !== 'REPROVADO',
        registration_status: suggestedStatus === 'REPROVADO' ? 'REPROVADO' : 'APROVADO'
      }));

      showNotification('success', 'Consulta ao Bacen concluída com sucesso!');
    } catch (err: any) {
      console.error('Bacen query error:', err);
      setBacenError(err.message || 'Erro de conexão com o servidor');
      showNotification('error', `Erro na consulta Bacen: ${err.message}`);
    } finally {
      setQueryingBacen(false);
    }
  };

  const sendWhatsAppNotification = async (analystId: string, customerName: string, status: string, limit: number) => {
    try {
      const selectedAnalyst = admins.find(a => a.id === analystId);
      if (!selectedAnalyst || !selectedAnalyst.phone) return;

      const { data: channels } = await supabase
        .from('automation_channels')
        .select('*')
        .eq('status', 'connected')
        .limit(1);

      if (!channels || channels.length === 0) return;

      const instance = channels[0].instance_name;
      const cleanPhone = selectedAnalyst.phone.replace(/\D/g, '');
      const remoteJid = `${cleanPhone}@s.whatsapp.net`;

      const limitStr = limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const statusLabel = status === 'APROVADO' ? '✅ APROVADO' :
                          status === 'APROVADO_COM_ENTRADA' ? '⚖️ APROVADO COM ENTRADA' : '❌ REPROVADO';

      const messageText = `📢 *ATUALIZAÇÃO DE ANÁLISE DE CRÉDITO*\n\n` +
        `Olá *${selectedAnalyst.full_name || 'Analista'}*!\n\n` +
        `A análise de crédito do cliente foi concluída.\n\n` +
        `👤 *Cliente:* ${customerName}\n` +
        `📊 *Resultado:* ${statusLabel}\n` +
        `💳 *Limite Liberado:* ${limitStr}\n` +
        `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n\n` +
        `O cliente já está com as permissões devidamente sincronizadas no PDV MDR.`;

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
    } catch (err) {
      console.error('Falha ao notificar via WhatsApp:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedCustomer) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        classification: formData.classification,
        credit_limit: formData.credit_limit,
        suggested_down_payment: formData.suggested_down_payment,
        credit_status: formData.credit_status,
        approved_for_purchase: formData.approved_for_purchase,
        registration_status: formData.registration_status,
        responsible_analyst_id: formData.responsible_analyst_id || null,
        notes: formData.notes
      };

      await updateCustomer(selectedCustomerId, submitData);
      showNotification('success', 'Decisão de crédito salva com sucesso!');
      
      // WhatsApp notification
      if (formData.responsible_analyst_id) {
        await sendWhatsAppNotification(
          formData.responsible_analyst_id,
          selectedCustomer.name,
          formData.credit_status,
          formData.credit_limit
        );
      }

      setSelectedCustomerId(null);
      setBacenData(null);
      await fetchCustomers();
    } catch (err) {
      showNotification('error', 'Erro ao salvar decisão de crédito');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper values for Bacen dashboard
  const resumo = bacenData?.retorno?.resumo || bacenData?.resumo;
  const totalBacen = resumo ? Number(resumo.total || resumo.Total || 0) : 0;
  const vencidoBacen = resumo ? Number(resumo.vencido || resumo.Vencido || 0) : 0;
  const prejuizoBacen = resumo ? Number(resumo.prejuizo || resumo.Prejuizo || 0) : 0;
  const aVencerBacen = resumo ? Number(resumo.aVencer || resumo.AVencer || 0) : 0;

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Esteira de Crédito</h1>
        <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Análise de Risco & SCR Bacen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: LISTAGEM DE PENDENTES */}
        <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 h-[75vh] flex flex-col gap-4">
          <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
            <Users size={16} /> Solicitações Pendentes ({pendingCustomers.length})
          </h3>
          
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-white outline-none transition-all font-display"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 opacity-40 text-center gap-2">
                <CheckCircle2 size={32} className="text-success" />
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Tudo Limpo!</p>
                <p className="text-[9px] text-on-surface-variant max-w-[200px]">Nenhum pré-cadastro aguardando análise de crédito no momento.</p>
              </div>
            ) : (
              filteredCustomers.map(cust => (
                <button
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`w-full text-left p-4 rounded-3xl border transition-all flex flex-col gap-1.5 ${
                    selectedCustomerId === cust.id 
                      ? 'bg-primary-container border-primary/40 text-on-primary-container shadow-lg' 
                      : 'bg-white/[0.01] border-white/5 text-on-surface hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-xs font-black uppercase truncate max-w-[150px]">{cust.name}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      cust.credit_status === 'EM_ANALISE' ? 'bg-warning/15 text-warning border border-warning/20' : 'bg-white/5 text-on-surface-variant'
                    }`}>
                      {cust.credit_status === 'EM_ANALISE' ? 'Em Análise' : 'Pré-Cadastro'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono opacity-70">
                    <span>CPF: {formatCPF(cust.cpf)}</span>
                    <span>{cust.phone ? formatPhone(cust.phone) : 'Sem Tel.'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* COLUNA 2 E 3: PAINEL DE ANÁLISE DETALHADA */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!selectedCustomer ? (
            <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-8 h-[75vh] flex flex-col items-center justify-center text-center gap-4 opacity-50">
              <ShieldCheck size={64} className="text-on-surface-variant opacity-20" />
              <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Nenhum Cliente Selecionado</h3>
              <p className="text-xs text-on-surface-variant max-w-sm">Escolha uma solicitação na lista lateral para iniciar a validação cadastral e consulta automatizada ao Banco Central.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Card Dados do Cliente */}
              <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary font-black uppercase text-lg border border-white/10">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-md font-black uppercase leading-tight">{selectedCustomer.name}</h2>
                      <p className="text-[10px] text-on-surface-variant font-mono uppercase mt-0.5">CPF: {formatCPF(selectedCustomer.cpf)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleQueryBacen}
                    disabled={queryingBacen}
                    className="w-full md:w-auto flex items-center justify-center gap-3 bg-primary text-on-primary font-black uppercase tracking-widest text-[10px] px-6 py-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {queryingBacen ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Consultando SCR Bacen...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} /> Consultar SCR Bacen
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                    <Phone size={14} className="opacity-40 text-primary" />
                    <div>
                      <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Celular WhatsApp</p>
                      <p className="font-bold font-mono mt-0.5">{formatPhone(selectedCustomer.phone)}</p>
                    </div>
                  </div>
                  
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                      <MapPin size={14} className="opacity-40 text-primary" />
                      <div className="min-w-0">
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Endereço Declarado</p>
                        <p className="font-bold truncate mt-0.5">
                          {selectedCustomer.address}
                          {selectedCustomer.address_number ? `, ${selectedCustomer.address_number}` : ''}
                          {selectedCustomer.city ? ` - ${selectedCustomer.city}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Arquivos do Cliente */}
                {(selectedCustomer.document_id_url || selectedCustomer.document_address_url || selectedCustomer.document_income_url) && (
                  <div className="pt-2">
                    <p className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest mb-3">Documentos Anexados</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'CNH / RG', key: 'document_id_url' as const },
                        { label: 'Comp. Residência', key: 'document_address_url' as const },
                        { label: 'Comp. Renda', key: 'document_income_url' as const }
                      ].map(doc => {
                        const url = selectedCustomer[doc.key];
                        if (!url) return null;
                        return (
                          <a
                            key={doc.key}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider hover:bg-white/10 hover:border-primary/30 transition-all text-on-surface hover:text-white"
                          >
                            <span className="flex items-center gap-2"><FileText size={14} className="text-primary" /> {doc.label}</span>
                            <ExternalLink size={12} className="opacity-60" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Painel do SCR Bacen (Direct Data) */}
              {queryingBacen && (
                <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-12 text-center flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-primary" size={40} />
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-widest">Consultando Banco Central (Direct Data)...</h4>
                  <p className="text-[10px] text-on-surface-variant max-w-xs leading-relaxed">Conectando ao barramento de APIs do BACEN para trazer o resumo de pendências de crédito consolidadas do mercado.</p>
                </div>
              )}

              {bacenError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-[40px] p-6 flex items-start gap-4 text-red-400">
                  <ShieldAlert size={24} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">Erro na Consulta da API</h4>
                    <p className="text-[10px] leading-relaxed mt-1">{bacenError}</p>
                    <button
                      onClick={handleQueryBacen}
                      className="mt-3 text-[9px] font-black uppercase bg-red-500/20 hover:bg-red-500/30 text-white px-4 py-2 rounded-xl transition-all border border-red-500/30"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              )}

              {bacenData && (
                <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-6 animate-in zoom-in duration-300">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
                    <ShieldCheck size={16} /> Relatório Analítico - SCR Bacen (Direct Data)
                  </h3>

                  {/* Cards de Resumo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col justify-between min-h-[100px]">
                      <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">A Vencer (Crédito Ativo)</span>
                      <h4 className="text-xl font-black text-white font-mono leading-none mt-2">
                        R$ {aVencerBacen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h4>
                    </div>

                    <div className={`border rounded-3xl p-5 flex flex-col justify-between min-h-[100px] ${
                      vencidoBacen > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-white/5 border-white/10 text-on-surface-variant'
                    }`}>
                      <span className="text-[8px] font-black uppercase tracking-widest">Dívida Vencida (Atraso)</span>
                      <h4 className={`text-xl font-black font-mono leading-none mt-2 ${vencidoBacen > 0 ? 'text-amber-400' : 'text-white'}`}>
                        R$ {vencidoBacen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h4>
                    </div>

                    <div className={`border rounded-3xl p-5 flex flex-col justify-between min-h-[100px] ${
                      prejuizoBacen > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-on-surface-variant'
                    }`}>
                      <span className="text-[8px] font-black uppercase tracking-widest">Prejuízos (Baixado pelas Financeiras)</span>
                      <h4 className={`text-xl font-black font-mono leading-none mt-2 ${prejuizoBacen > 0 ? 'text-red-400' : 'text-white'}`}>
                        R$ {prejuizoBacen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h4>
                    </div>
                  </div>

                  {/* Recommendation Alert Box */}
                  <div className={`p-5 rounded-3xl border flex items-start gap-4 ${
                    formData.classification === 'RUIM' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    formData.classification === 'MEDIO' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                    'bg-success/10 border-success/20 text-success'
                  }`}>
                    <div className="shrink-0 mt-0.5">
                      {formData.classification === 'RUIM' ? <ShieldAlert size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider leading-none">Recomendação do Motor de Decisão</h4>
                      <p className="text-[10px] leading-relaxed mt-1">
                        Com base no relatório do Banco Central, o cliente foi sugerido com a classificação **{formData.classification === 'BOM' ? 'Premium (5% a.m.)' : formData.classification === 'MEDIO' ? 'Standard (8% a.m.)' : 'Flex (12% a.m.)'}**.
                        {formData.classification === 'RUIM' && ' ❌ O cliente possui dívidas registradas como Prejuízo no mercado financeiro. Recomendamos rejeitar crédito.'}
                        {formData.classification === 'MEDIO' && ' ⚖️ O cliente possui parcelas de empréstimos em atraso (vencido). Recomendamos aprovar mediante entrada obrigatória de 20% a 50%.'}
                        {formData.classification === 'BOM' && ' 🌟 Nenhuma restrição ou atraso encontrado no SCR Bacen. Crédito elegível para aprovação padrão sem entrada obrigatória.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulário de Decisão de Crédito */}
              <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
                  <UserCheck size={16} /> Decisão e Homologação de Crédito
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Classificação Risco */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Classificação de Risco</label>
                    <select
                      value={formData.classification}
                      onChange={(e) => setFormData(p => ({ ...p, classification: e.target.value as any }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="BOM" className="bg-[#121214] text-success">🟢 Premium (5% a.m.)</option>
                      <option value="MEDIO" className="bg-[#121214] text-warning">🟡 Standard (8% a.m.)</option>
                      <option value="RUIM" className="bg-[#121214] text-error">🔴 Flex (12% a.m.)</option>
                    </select>
                  </div>

                  {/* Limite de Crédito Aprovado */}
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
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Status Análise de Crédito */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Status do Crédito</label>
                    <select
                      value={formData.credit_status}
                      onChange={(e) => setFormData(p => ({ ...p, credit_status: e.target.value as any }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="EM_ANALISE" className="bg-[#121214]">EM ANÁLISE</option>
                      <option value="APROVADO" className="bg-[#121214] text-success">APROVADO</option>
                      <option value="APROVADO_COM_ENTRADA" className="bg-[#121214] text-warning">APROVADO COM ENTRADA</option>
                      <option value="REPROVADO" className="bg-[#121214] text-error">REPROVADO</option>
                    </select>
                  </div>

                  {/* Valor de Entrada Sugerido */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Entrada Sugerida (R$)</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.suggested_down_payment}
                        onChange={(e) => setFormData(p => ({ ...p, suggested_down_payment: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Analista Notificado */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Notificar Analista Responsável</label>
                    <select
                      value={formData.responsible_analyst_id}
                      onChange={(e) => setFormData(p => ({ ...p, responsible_analyst_id: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="" className="bg-[#121214]">Nenhum Selecionado</option>
                      {admins.map(adm => (
                        <option key={adm.id} value={adm.id} className="bg-[#121214]">
                          {adm.full_name} {adm.phone ? `(${adm.phone})` : '(Sem Celular)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Geral do Cadastro */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Status Geral do Cadastro</label>
                    <select
                      value={formData.registration_status}
                      onChange={(e) => setFormData(p => ({ ...p, registration_status: e.target.value as any }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="PRE_CADASTRO" className="bg-[#121214]">PRÉ-CADASTRO (Aguardando Aprovação)</option>
                      <option value="APROVADO" className="bg-[#121214] text-success">APROVADO (Incluir como Cliente)</option>
                      <option value="REPROVADO" className="bg-[#121214] text-error">REPROVADO / REJEITADO</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Anotações / Justificativa da Decisão</label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Consultamos o SCR Bacen e constatamos dívida ativa baixa. Limite aprovado com base nas referências e CNH."
                      value={formData.notes}
                      onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>

                  {/* Liberado para Compra Switch */}
                  <div className="md:col-span-2 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase text-on-surface tracking-wider">Liberado para Compra no PDV</span>
                      <span className="text-[9px] text-on-surface-variant opacity-60">Se ativado, permite registrar vendas de aparelhos para este cliente</span>
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
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setBacenData(null);
                    }}
                    className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
                  >
                    Voltar
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
                        <Save size={16} /> Homologar Análise de Crédito
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
