import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, ShieldCheck, DollarSign, Loader2, 
  AlertCircle, CheckCircle2, User, Phone, MapPin, 
  FileText, ExternalLink, ShieldAlert, Save, UserCheck, Smartphone, CheckSquare, Square, CreditCard, AlertTriangle, Trash2
} from 'lucide-react';
import { useCustomerStore } from '../store/useCustomerStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { formatCPF, formatPhone } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useInventoryStore } from '../store/useInventoryStore';
import { formatWhatsAppJid } from '../utils/phone';

const parseDesiredDevices = (desired_device: string | undefined | null): any[] | null => {
  if (!desired_device) return null;
  try {
    const parsed = JSON.parse(desired_device);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // ignore
  }
  return null;
};

export default function CreditAnalysis() {
  const { customers, fetchCustomers, updateCustomer, deleteCustomer } = useCustomerStore();
  const { showNotification } = useUI();
  const { profile } = useAuthStore();
  const { inventory, fetchInventory } = useInventoryStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Selection of services
  const [selectedServices, setSelectedServices] = useState<string[]>(['cadastro', 'score', 'bacen', 'protesto', 'boavista']);
  
  // Query results and states
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<any | null>(null);
  const [queryErrors, setQueryErrors] = useState<Record<string, string>>({});
  
  // History States
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteQueryId, setDeleteQueryId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [deleteCustomerIdToConfirm, setDeleteCustomerIdToConfirm] = useState<string | null>(null);
  
  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('cadastro');

  // Form States
  const [formData, setFormData] = useState({
    classification: 'MEDIO' as 'BOM' | 'MEDIO' | 'RUIM' | 'A_VISTA',
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

  const serviceDetails = [
    { id: 'cadastro', name: 'Cadastro PF Plus', price: 0.36, desc: 'Dados cadastrais e familiares' },
    { id: 'score', name: 'Score Crédito - QUOD', price: 1.98, desc: 'Perfil e pontuação de risco' },
    { id: 'bacen', name: 'SCR Resumo - BACEN', price: 3.90, desc: 'Registros e pendências financeiras' },
    { id: 'protesto', name: 'Protesto Nacional - IEPTB', price: 3.50, desc: 'Pesquisa de protestos em cartórios' },
    { id: 'boavista', name: 'Boa Vista Acerta PF', price: 14.03, desc: 'Completo com pendências e restrições' }
  ];

  useEffect(() => {
    const unitId = profile?.role === 'admin' ? undefined : (profile?.unit_id || undefined);
    fetchCustomers(unitId);
    fetchInventory(unitId);
    
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
  }, [fetchCustomers, fetchInventory, profile?.unit_id, profile?.role]);

  const [listFilter, setListFilter] = useState<'pending' | 'history'>('pending');

  const creditAnalysisCustomers = useMemo(() => {
    return customers.filter(c => {
      return c.registration_status === 'PRE_CADASTRO' || 
             c.credit_status === 'EM_ANALISE' ||
             c.credit_status === 'APROVADO' ||
             c.credit_status === 'APROVADO_COM_ENTRADA' ||
             c.credit_status === 'REPROVADO';
    });
  }, [customers]);

  const pendingCount = useMemo(() => {
    return creditAnalysisCustomers.filter(c => c.registration_status === 'PRE_CADASTRO' || c.credit_status === 'EM_ANALISE').length;
  }, [creditAnalysisCustomers]);

  const historyCount = useMemo(() => {
    return creditAnalysisCustomers.filter(c => c.registration_status !== 'PRE_CADASTRO' && c.credit_status !== 'EM_ANALISE').length;
  }, [creditAnalysisCustomers]);

  const displayCustomers = useMemo(() => {
    return creditAnalysisCustomers.filter(c => {
      const isPending = c.registration_status === 'PRE_CADASTRO' || c.credit_status === 'EM_ANALISE';
      return listFilter === 'pending' ? isPending : !isPending;
    });
  }, [creditAnalysisCustomers, listFilter]);

  const filteredCustomers = useMemo(() => {
    return displayCustomers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf.includes(searchTerm) ||
      (c.phone && c.phone.includes(searchTerm))
    );
  }, [displayCustomers, searchTerm]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const dynamicNeededCredit = useMemo(() => {
    if (!selectedCustomer) return 0;
    const devices = parseDesiredDevices(selectedCustomer.desired_device);
    if (!devices || devices.length === 0) {
      return selectedCustomer.needed_credit || 0;
    }
    
    return devices.reduce((sum, dev) => {
      const stockItem = inventory.find(i => i.id === dev.id);
      const priceToUse = stockItem
        ? (stockItem.trade_in_price || stockItem.price)
        : (dev.price || 0);
      return sum + (priceToUse * (dev.quantity || 1));
    }, 0);
  }, [selectedCustomer, inventory]);

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
      setQueryResults(null);
      setQueryErrors({});
      setSelectedHistoryId(null);
    }
  }, [selectedCustomer, profile?.id]);

  const fetchQueryHistory = async (customerId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/credit-queries`);
      if (response.ok) {
        const data = await response.json();
        setQueryHistory(data);
      }
    } catch (err) {
      console.error('Error fetching query history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteQuery = async () => {
    if (!deleteQueryId) return;
    try {
      const response = await fetch(`/api/customers/credit-queries/${deleteQueryId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showNotification('success', 'Consulta excluída do histórico!');
        if (selectedHistoryId === deleteQueryId) {
          setQueryResults(null);
          setSelectedHistoryId(null);
        }
        if (selectedCustomerId) {
          fetchQueryHistory(selectedCustomerId);
        }
      } else {
        showNotification('error', 'Falha ao excluir consulta');
      }
    } catch (err) {
      console.error('Delete query error:', err);
      showNotification('error', 'Erro ao excluir consulta');
    } finally {
      setDeleteQueryId(null);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerIdToConfirm) return;
    try {
      await deleteCustomer(deleteCustomerIdToConfirm);
      showNotification('success', 'Cliente removido com sucesso!');
      setSelectedCustomerId(null);
    } catch (err) {
      console.error('Delete customer error:', err);
      showNotification('error', 'Erro ao excluir cliente');
    } finally {
      setDeleteCustomerIdToConfirm(null);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchQueryHistory(selectedCustomerId);
    } else {
      setQueryHistory([]);
    }
  }, [selectedCustomerId]);

  const isCompany = useMemo(() => {
    if (!selectedCustomer) return false;
    const clean = selectedCustomer.cpf?.replace(/\D/g, '') || '';
    return clean.length === 14;
  }, [selectedCustomer]);

  const cleanDoc = useMemo(() => {
    return selectedCustomer?.cpf?.replace(/\D/g, '') || '';
  }, [selectedCustomer]);

  const hasValidDoc = useMemo(() => {
    return cleanDoc.length === 11 || cleanDoc.length === 14;
  }, [cleanDoc]);

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const totalCost = useMemo(() => {
    if (isCompany) return 0;
    return selectedServices.reduce((sum, s) => {
      const srv = serviceDetails.find(d => d.id === s);
      return sum + (srv?.price || 0);
    }, 0);
  }, [selectedServices, isCompany]);

  const handleExecuteQueries = async () => {
    if (!selectedCustomerId) return;
    if (!isCompany && selectedServices.length === 0) {
      showNotification('error', 'Selecione pelo menos uma consulta');
      return;
    }
    
    setIsQuerying(true);
    setQueryErrors({});
    setQueryResults(null);

    try {
      const response = await fetch(`/api/customers/${selectedCustomerId}/query-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: isCompany ? [] : selectedServices, performed_by: profile?.id })
      });
      if (!response.ok) {
        throw new Error('Falha ao executar consultas na API');
      }
      const data = await response.json();
      
      setQueryResults(data);
      setSelectedHistoryId(null);

      if (data.isCNPJ) {
        setActiveTab('cnpj');
        
        // Auto decision logic for CNPJ based on WDAPI
        const cnpjData = data.cnpj_data || {};
        const isAtiva = cnpjData.situacao === 'ATIVA';
        
        setFormData(prev => ({
          ...prev,
          classification: isAtiva ? 'BOM' : 'RUIM',
          credit_limit: isAtiva ? 5000 : 0,
          suggested_down_payment: 0,
          credit_status: isAtiva ? 'APROVADO' : 'REPROVADO',
          approved_for_purchase: isAtiva,
          registration_status: isAtiva ? 'APROVADO' : 'REPROVADO'
        }));
      } else {
        // Collect errors
        const errors: Record<string, string> = {};
        selectedServices.forEach(s => {
          if (data[s]?.error) {
            errors[s] = data[s].error;
          }
        });
        setQueryErrors(errors);

        // Set active tab to first non-error service
        const firstActive = selectedServices.find(s => !data[s]?.error);
        if (firstActive) {
          setActiveTab(firstActive);
        } else {
          setActiveTab(selectedServices[0]);
        }

        // Auto decision logic based on results
        let suggestedClass: 'BOM' | 'MEDIO' | 'RUIM' = 'BOM';
        let suggestedStatus: typeof formData.credit_status = 'APROVADO';
        let suggestedLimit = 3000;
        let suggestedDownPayment = 0;

        // Bacen parsing
        const bacenRes = data.bacen?.retorno?.resumo || data.bacen?.resumo || {};
        const vencido = Number(bacenRes.vencido || bacenRes.Vencido || 0);
        const prejuizo = Number(bacenRes.prejuizo || bacenRes.Prejuizo || 0);

        // Score QUOD parsing
        const scoreRes = data.score?.retorno?.scores?.ocorrencias?.[0] || data.score?.scores?.ocorrencias?.[0] || {};
        const scoreNum = Number(scoreRes.score) || 1000;

        // Boa Vista parsing
        const boavistaRes = data.boavista?.retorno || {};
        const bvRestricoes = boavistaRes.restricoes?.ocorrencias || [];
        const bvPendencias = boavistaRes.pendenciasFinanceiras?.ocorrencias || [];
        const bvProtestos = boavistaRes.protestos?.ocorrencias || [];

        if (
          prejuizo > 0 || 
          vencido > 1000 || 
          scoreNum < 300 || 
          bvRestricoes.length > 5 || 
          bvPendencias.length > 5
        ) {
          suggestedClass = 'RUIM';
          suggestedStatus = 'REPROVADO';
          suggestedLimit = 0;
          suggestedDownPayment = 0;
        } else if (
          vencido > 0 || 
          scoreNum < 600 || 
          bvRestricoes.length > 0 || 
          bvPendencias.length > 0 || 
          bvProtestos.length > 0
        ) {
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
          approved_for_purchase: suggestedStatus === 'APROVADO' || suggestedStatus === 'APROVADO_COM_ENTRADA',
          registration_status: suggestedStatus === 'REPROVADO' ? 'REPROVADO' : 'APROVADO'
        }));
      }

      showNotification('success', 'Consultas de crédito concluídas com sucesso!');
      fetchQueryHistory(selectedCustomerId);
    } catch (err: any) {
      console.error('Execute queries error:', err);
      showNotification('error', `Erro ao executar consultas: ${err.message}`);
    } finally {
      setIsQuerying(false);
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
      const remoteJid = formatWhatsAppJid(selectedAnalyst.phone);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: instance, remoteJid, text: messageText })
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
      let autoRegistrationStatus: 'PRE_CADASTRO' | 'APROVADO' | 'REPROVADO' = 'PRE_CADASTRO';
      if (formData.credit_status === 'APROVADO' || formData.credit_status === 'APROVADO_COM_ENTRADA') {
        autoRegistrationStatus = 'APROVADO';
      } else if (formData.credit_status === 'REPROVADO') {
        autoRegistrationStatus = 'REPROVADO';
      }

      // Update desired_device array to have the resolved trade-in prices
      const devices = parseDesiredDevices(selectedCustomer.desired_device);
      let updatedDesiredDevice = selectedCustomer.desired_device;
      if (devices && devices.length > 0) {
        const updatedDevices = devices.map(dev => {
          const stockItem = inventory.find(i => i.id === dev.id);
          const priceToUse = stockItem
            ? (stockItem.trade_in_price || stockItem.price)
            : (dev.price || 0);
          return {
            ...dev,
            price: priceToUse
          };
        });
        updatedDesiredDevice = JSON.stringify(updatedDevices);
      }

      const submitData = {
        classification: formData.classification,
        credit_limit: formData.credit_limit,
        suggested_down_payment: formData.suggested_down_payment,
        credit_status: formData.credit_status,
        approved_for_purchase: formData.approved_for_purchase,
        registration_status: autoRegistrationStatus,
        responsible_analyst_id: formData.responsible_analyst_id || null,
        notes: formData.notes,
        needed_credit: dynamicNeededCredit,
        desired_device: updatedDesiredDevice
      };

      await updateCustomer(selectedCustomerId, submitData);
      showNotification('success', 'Decisão de crédito salva com sucesso!');
      
      if (formData.responsible_analyst_id) {
        await sendWhatsAppNotification(
          formData.responsible_analyst_id,
          selectedCustomer.name,
          formData.credit_status,
          formData.credit_limit
        );
      }

      setSelectedCustomerId(null);
      setQueryResults(null);
      setQueryErrors({});
      await fetchCustomers();
    } catch (err) {
      showNotification('error', 'Erro ao salvar decisão de crédito');
    } finally {
      setIsSubmitting(false);
    }
  };



  // Helper renderers for active query tabs
  const renderTabContent = () => {
    if (!queryResults) return null;

    const data = queryResults[activeTab];
    if (!data) return <div className="text-center py-10 opacity-60">Nenhum dado selecionado ou pendente de consulta.</div>;
    
    if (queryErrors[activeTab]) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-400 flex items-start gap-3">
          <ShieldAlert size={20} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm uppercase">Falha na consulta</h4>
            <p className="text-[11px] leading-relaxed mt-1">{queryErrors[activeTab]}</p>
          </div>
        </div>
      );
    }

    const retorno = data.retorno || data;

    switch (activeTab) {
      case 'cadastro':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest pl-1">Informações Cadastrais (Plus)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                <span className="text-[8px] text-on-surface-variant uppercase tracking-widest font-black block">Nome Completo</span>
                <span className="text-xs font-bold text-white uppercase">{retorno.nome || selectedCustomer?.name}</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                <span className="text-[8px] text-on-surface-variant uppercase tracking-widest font-black block">Nome da Mãe</span>
                <span className="text-xs font-bold text-white uppercase">{retorno.mae || 'NÃO INFORMADO'}</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                <span className="text-[8px] text-on-surface-variant uppercase tracking-widest font-black block">Data de Nascimento</span>
                <span className="text-xs font-bold text-white">{retorno.nascimento ? new Date(retorno.nascimento).toLocaleDateString('pt-BR') : '—'}</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                <span className="text-[8px] text-on-surface-variant uppercase tracking-widest font-black block">Situação Receita Federal</span>
                <span className="text-xs font-bold text-green-400 uppercase">{retorno.cPFSituacao || retorno.cpfSituacao || 'REGULAR'}</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                <span className="text-[8px] text-on-surface-variant uppercase tracking-widest font-black block">Estado Civil</span>
                <span className="text-xs font-bold text-white uppercase">{retorno.estadoCivil || '—'}</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                <span className="text-[8px] text-on-surface-variant uppercase tracking-widest font-black block">Sexo</span>
                <span className="text-xs font-bold text-white uppercase">{retorno.sexo || '—'}</span>
              </div>
            </div>
            {retorno.enderecos && retorno.enderecos.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1 mt-4">Endereços Vinculados</h5>
                <div className="space-y-2">
                  {retorno.enderecos.map((addr: any, idx: number) => (
                    <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-3 items-center">
                      <MapPin size={16} className="text-primary shrink-0" />
                      <span className="text-xs text-white">
                        {addr.logradouro}, {addr.numero} {addr.complemento ? `- ${addr.complemento}` : ''} - {addr.bairro}, {addr.cidade}/{addr.uf} - CEP: {addr.cep}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'score':
        const scoreVal = Number(retorno.scores?.ocorrencias?.[0]?.score || retorno.scores?.[0]?.score || 0);
        const riskLabel = retorno.scores?.ocorrencias?.[0]?.risco || retorno.scores?.[0]?.risco || 'MÉDIO';
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest pl-1">Score de Crédito (QUOD)</h4>
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/5 border border-white/5 rounded-3xl p-6">
              <div className="relative w-28 h-28 rounded-full border-4 border-white/5 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Score</span>
                <span className={cn(
                  "text-3xl font-black font-mono mt-1",
                  scoreVal >= 700 ? "text-green-400" : scoreVal >= 400 ? "text-amber-400" : "text-red-400"
                )}>
                  {scoreVal}
                </span>
              </div>
              <div className="space-y-2 flex-1 text-center sm:text-left">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none">Classificação de Risco</span>
                <h4 className={cn(
                  "text-lg font-black uppercase leading-tight",
                  scoreVal >= 700 ? "text-green-400" : scoreVal >= 400 ? "text-amber-400" : "text-red-400"
                )}>
                  Risco {riskLabel}
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {retorno.scores?.ocorrencias?.[0]?.texto || 'Pontuação de crédito calculada com base no comportamento de consumo e adimplência.'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'bacen':
        const resumoBacen = retorno.resumo || {};
        const aVencer = Number(resumoBacen.aVencer || resumoBacen.AVencer || resumoBacen.a_vencer || 0);
        const vencido = Number(resumoBacen.vencido || resumoBacen.Vencido || 0);
        const prejuizo = Number(resumoBacen.prejuizo || resumoBacen.Prejuizo || 0);
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest pl-1">SCR Resumo Analítico (BACEN)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col justify-between min-h-[100px]">
                <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">A Vencer (Crédito Ativo)</span>
                <h4 className="text-xl font-black text-white font-mono leading-none mt-2">
                  R$ {aVencer.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
              </div>
              <div className={`border rounded-3xl p-5 flex flex-col justify-between min-h-[100px] ${
                vencido > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-white/5 border-white/5 text-on-surface-variant'
              }`}>
                <span className="text-[8px] font-black uppercase tracking-widest">Dívida Vencida (Atraso)</span>
                <h4 className={`text-xl font-black font-mono leading-none mt-2 ${vencido > 0 ? 'text-amber-400' : 'text-white'}`}>
                  R$ {vencido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
              </div>
              <div className={`border rounded-3xl p-5 flex flex-col justify-between min-h-[100px] ${
                prejuizo > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/5 text-on-surface-variant'
              }`}>
                <span className="text-[8px] font-black uppercase tracking-widest">Prejuízos (Financeiras)</span>
                <h4 className={`text-xl font-black font-mono leading-none mt-2 ${prejuizo > 0 ? 'text-red-400' : 'text-white'}`}>
                  R$ {prejuizo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
              </div>
            </div>
          </div>
        );

      case 'protesto':
        const constam = retorno.constamProtestos;
        const totalProtestos = retorno.numeroTotalProtestos || 0;
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest pl-1">Protestos Nacionais (IEPTB)</h4>
            {constam ? (
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-400 flex items-start gap-4">
                <AlertTriangle size={24} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm uppercase leading-none">Protestos Encontrados</h4>
                  <p className="text-xs leading-relaxed text-on-surface-variant">
                    Foram identificados um total de <strong className="text-red-400 font-mono">{totalProtestos}</strong> protestos ativos no banco de dados do IEPTB.
                  </p>
                  {retorno.valorTotalProtestos && (
                    <p className="text-xs font-mono text-white font-bold mt-1">Valor Total: R$ {retorno.valorTotalProtestos}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-3xl text-green-400 flex items-start gap-4">
                <CheckCircle2 size={24} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm uppercase leading-none">Nada Consta</h4>
                  <p className="text-xs leading-relaxed text-on-surface-variant">Nenhum protesto ativo foi localizado nos cartórios integrados ao IEPTB Online.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'boavista':
        const restricoes = retorno.restricoes?.ocorrencias || [];
        const pendencias = retorno.pendenciasFinanceiras?.ocorrencias || [];
        const protestosBv = retorno.protestos?.ocorrencias || [];
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest pl-1">Acerta Completo (Boa Vista)</h4>
            
            {/* Resumo Rápido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={cn(
                "p-4 border rounded-2xl flex flex-col justify-between min-h-[80px]",
                restricoes.length > 0 ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/5 text-on-surface-variant"
              )}>
                <span className="text-[8px] font-black uppercase tracking-widest">Restrições Comerciais</span>
                <h4 className="text-lg font-black font-mono leading-none mt-1.5">{restricoes.length} ocorrências</h4>
              </div>
              <div className={cn(
                "p-4 border rounded-2xl flex flex-col justify-between min-h-[80px]",
                pendencias.length > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-white/5 border-white/5 text-on-surface-variant"
              )}>
                <span className="text-[8px] font-black uppercase tracking-widest">Pendências Financeiras</span>
                <h4 className="text-lg font-black font-mono leading-none mt-1.5">{pendencias.length} ocorrências</h4>
              </div>
              <div className={cn(
                "p-4 border rounded-2xl flex flex-col justify-between min-h-[80px]",
                protestosBv.length > 0 ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/5 text-on-surface-variant"
              )}>
                <span className="text-[8px] font-black uppercase tracking-widest">Protestos Declarados</span>
                <h4 className="text-lg font-black font-mono leading-none mt-1.5">{protestosBv.length} ocorrências</h4>
              </div>
            </div>

            {/* Pendências detalhadas */}
            {pendencias.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Detalhes das Pendências</h5>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {pendencias.map((pend: any, idx: number) => (
                    <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white uppercase">{pend.credor || 'Credor Não Informado'}</p>
                        <p className="text-[9px] text-on-surface-variant mt-0.5 font-mono">Contrato: {pend.contrato || '—'} | Origem: {pend.origem || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-400 font-mono">R$ {Number(pend.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-on-surface-variant mt-0.5 font-mono">Vencimento: {pend.dataVencimento || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Esteira de Crédito</h1>
        <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Análise de Risco & SCR Bacen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA 1: LISTAGEM DE CLIENTES E FILTRO */}
        <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 h-[75vh] flex flex-col gap-4">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 shrink-0">
            <button
              type="button"
              onClick={() => { setListFilter('pending'); setSelectedCustomerId(null); }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center",
                listFilter === 'pending'
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:text-white"
              )}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => { setListFilter('history'); setSelectedCustomerId(null); }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center",
                listFilter === 'history'
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:text-white"
              )}
            >
              Histórico ({historyCount})
            </button>
          </div>
          
          <div className="relative group shrink-0">
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
                <p className="text-[9px] text-on-surface-variant max-w-[200px]">
                  {listFilter === 'pending' 
                    ? 'Nenhum pré-cadastro aguardando análise de crédito no momento.' 
                    : 'Nenhum registro no histórico de análises de crédito.'}
                </p>
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
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                      cust.credit_status === 'APROVADO' ? 'bg-success/15 text-success border border-success/20' :
                      cust.credit_status === 'APROVADO_COM_ENTRADA' ? 'bg-warning/15 text-warning border border-warning/20' :
                      cust.credit_status === 'REPROVADO' ? 'bg-error/15 text-error border border-error/20' :
                      cust.credit_status === 'EM_ANALISE' ? 'bg-warning/15 text-warning border border-warning/20' : 
                      'bg-white/5 text-on-surface-variant'
                    )}>
                      {cust.credit_status === 'APROVADO' ? 'Aprovado' :
                       cust.credit_status === 'APROVADO_COM_ENTRADA' ? 'Entrada' :
                       cust.credit_status === 'REPROVADO' ? 'Reprovado' :
                       cust.credit_status === 'EM_ANALISE' ? 'Em Análise' : 'Pré-Cadastro'}
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

              {/* Card Dados do Cliente & Seletor de Consultas */}
              <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary font-black uppercase text-lg border border-white/10">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-md font-black uppercase leading-tight">{selectedCustomer.name}</h2>
                      <p className="text-[10px] text-on-surface-variant font-mono uppercase mt-0.5">
                        {isCompany ? `CNPJ: ${formatCPF(selectedCustomer.cpf)}` : `CPF: ${formatCPF(selectedCustomer.cpf)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateCustomer(selectedCustomer.id, {
                            credit_status: undefined,
                            registration_status: 'APROVADO',
                            approved_for_purchase: false
                          });
                          showNotification('success', 'Cliente revertido para cadastro simples!');
                          setSelectedCustomerId(null);
                          await fetchCustomers();
                        } catch (err) {
                          showNotification('error', 'Falha ao reverter cliente.');
                        }
                      }}
                      className="bg-white/5 hover:bg-amber-500 hover:text-black border border-white/10 rounded-2xl px-3.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
                      title="Remove da esteira de crédito mantendo como cliente comum"
                    >
                      Voltar p/ Cadastro Simples
                    </button>

                    {selectedCustomer.credit_status !== 'EM_ANALISE' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateCustomer(selectedCustomer.id, {
                              credit_status: 'EM_ANALISE',
                              registration_status: 'PRE_CADASTRO',
                              approved_for_purchase: false
                            });
                            showNotification('success', 'Análise de crédito reiniciada com sucesso!');
                            setFormData(prev => ({
                              ...prev,
                              credit_status: 'EM_ANALISE',
                              registration_status: 'PRE_CADASTRO',
                              approved_for_purchase: false
                            }));
                          } catch (err) {
                            showNotification('error', 'Falha ao reiniciar análise.');
                          }
                        }}
                        className="bg-white/5 hover:bg-primary hover:text-on-primary border border-white/10 rounded-2xl px-3.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Nova Análise
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteCustomerIdToConfirm(selectedCustomer.id)}
                      className="bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-2xl px-3.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all text-red-400"
                    >
                      Excluir Cliente
                    </button>
                  </div>
                </div>

                {/* Informações Pessoais & Documentação do Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-3xl p-5">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2">Endereço Residencial</span>
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs space-y-1.5">
                        <p className="text-white"><strong className="text-on-surface-variant uppercase text-[9px] tracking-wider block">Logradouro / Rua</strong> {selectedCustomer.address || '—'}, {selectedCustomer.address_number || '—'}</p>
                        <p className="text-white"><strong className="text-on-surface-variant uppercase text-[9px] tracking-wider block">Bairro</strong> {selectedCustomer.neighborhood || '—'}</p>
                        <p className="text-white"><strong className="text-on-surface-variant uppercase text-[9px] tracking-wider block">Cidade / UF</strong> {selectedCustomer.city || '—'} / {selectedCustomer.state || '—'}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2">Contatos & Referências</span>
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs space-y-3">
                        {selectedCustomer.parent_contact_phone && (
                          <div>
                            <span className="text-on-surface-variant uppercase text-[8px] tracking-wider block">Contato dos Pais</span>
                            <span className="text-white font-bold font-mono">{formatPhone(selectedCustomer.parent_contact_phone)}</span>
                          </div>
                        )}
                        {selectedCustomer.reference1_name && (
                          <div>
                            <span className="text-on-surface-variant uppercase text-[8px] tracking-wider block">Referência 1</span>
                            <span className="text-white font-bold uppercase">{selectedCustomer.reference1_name}</span>
                            {selectedCustomer.reference1_phone && (
                              <span className="text-white/60 font-mono block mt-0.5">{formatPhone(selectedCustomer.reference1_phone)}</span>
                            )}
                          </div>
                        )}
                        {selectedCustomer.reference2_name && (
                          <div>
                            <span className="text-on-surface-variant uppercase text-[8px] tracking-wider block">Referência 2</span>
                            <span className="text-white font-bold uppercase">{selectedCustomer.reference2_name}</span>
                            {selectedCustomer.reference2_phone && (
                              <span className="text-white/60 font-mono block mt-0.5">{formatPhone(selectedCustomer.reference2_phone)}</span>
                            )}
                          </div>
                        )}
                        {!selectedCustomer.parent_contact_phone && !selectedCustomer.reference1_name && !selectedCustomer.reference2_name && (
                          <span className="text-on-surface-variant text-[11px]">Nenhuma referência cadastrada.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest block">Comprovantes & Selfie</span>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Identificação (CNH/RG)', url: selectedCustomer.document_id_url, key: 'document_id' },
                        { label: 'Comp. Residência', url: selectedCustomer.document_address_url, key: 'document_address' },
                        { label: 'Comp. Renda', url: selectedCustomer.document_income_url, key: 'document_income' },
                        { label: 'Selfie de Segurança', url: selectedCustomer.self_photo_url, key: 'self_photo', isSelfie: true }
                      ].map((doc) => {
                        if (!doc.url) {
                          return (
                            <div key={doc.key} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center opacity-40 h-28">
                              <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider block">{doc.label}</span>
                              <span className="text-[9px] mt-2 block">Não enviado</span>
                            </div>
                          );
                        }

                        const isPdf = doc.url.toLowerCase().endsWith('.pdf');

                        return (
                          <div key={doc.key} className="bg-white/5 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col items-center justify-between text-center transition-all h-28 group relative overflow-hidden">
                            <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider block z-10">{doc.label}</span>
                            
                            {doc.isSelfie && !isPdf ? (
                              <img 
                                src={doc.url} 
                                alt={doc.label} 
                                className="w-12 h-12 rounded-full object-cover border border-white/15 my-1"
                              />
                            ) : isPdf ? (
                              <FileText size={24} className="text-primary my-2" />
                            ) : (
                              <div 
                                className="w-full h-10 rounded-lg bg-cover bg-center border border-white/10 my-1"
                                style={{ backgroundImage: `url(${doc.url})` }}
                              />
                            )}

                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-full bg-white/5 hover:bg-primary hover:text-on-primary rounded-xl py-1 text-[8px] font-black uppercase tracking-widest transition-all z-10 flex items-center justify-center gap-1 text-center"
                            >
                              <ExternalLink size={8} /> Abrir
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Seletores de Consulta com Custo Estimado */}
                <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest block">Seletor de Consulta</span>
                  
                  {isCompany ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
                      <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold block text-white">Consulta Integrada CNPJ (WDAPI)</span>
                        <span className="text-[9px] text-on-surface-variant/70 leading-normal block mt-0.5">
                          Consulta dados cadastrais, QSA (sócios), capital social e atividade econômica do CNPJ de forma integrada.
                        </span>
                        <span className="text-[10px] font-mono font-bold text-primary block mt-1">Custo: R$ 0,00</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {serviceDetails.map(srv => {
                        const isSelected = selectedServices.includes(srv.id);
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => toggleService(srv.id)}
                            className={cn(
                              "flex items-start gap-3 p-4 rounded-2xl border text-left transition-all",
                              isSelected 
                                ? "bg-primary-container/20 border-primary text-white" 
                                : "bg-white/[0.01] border-white/5 text-on-surface-variant hover:bg-white/[0.03]"
                            )}
                          >
                            <div className="mt-0.5 text-primary shrink-0">
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                            <div>
                              <span className="text-xs font-bold block">{srv.name}</span>
                              <span className="text-[9px] text-on-surface-variant/70 leading-normal block mt-0.5">{srv.desc}</span>
                              <span className="text-[10px] font-mono font-bold text-primary block mt-1">Custo: R$ {srv.price.toFixed(2)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!hasValidDoc && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 flex items-start gap-3">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs uppercase leading-none">Documento Ausente ou Inválido</h4>
                        <p className="text-[9px] leading-relaxed mt-1 opacity-80">
                          Este cliente não possui um CPF ou CNPJ válido cadastrado. Atualize o cadastro do cliente para habilitar consultas.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs">
                      <CreditCard size={16} className="text-primary" />
                      <span>Custo Total da Consulta: <strong className="text-white font-mono">R$ {totalCost.toFixed(2)}</strong></span>
                    </div>
                    <button
                      onClick={handleExecuteQueries}
                      disabled={isQuerying || (!isCompany && selectedServices.length === 0) || !hasValidDoc}
                      className="w-full sm:w-auto flex items-center justify-center gap-3 bg-primary text-on-primary font-black uppercase tracking-widest text-[10px] px-6 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                      {isQuerying ? (
                        <><Loader2 className="animate-spin" size={14} /> {isCompany ? 'Consultando WDAPI...' : 'Consultando Direct Data...'}</>
                      ) : (
                        <><ShieldCheck size={14} /> Realizar Consultas</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Simulação de Venda */}
                {!!(selectedCustomer.desired_device || selectedCustomer.needed_credit || selectedCustomer.desired_installment_value) && (
                  <div className="pt-2 border-t border-white/5 space-y-4">
                    <p className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest">Simulação de Venda (Pré-venda)</p>
                    
                    {/* List of Simulated Devices */}
                    {(() => {
                      const devices = parseDesiredDevices(selectedCustomer.desired_device);
                      if (!devices || devices.length === 0) return null;
                      return (
                        <div className="space-y-2 mb-4">
                          <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest block pl-1">Aparelhos na Simulação (Preço de Troca/Crediário)</span>
                          <div className="space-y-2">
                            {devices.map((dev: any, idx: number) => {
                              const stockItem = inventory.find(i => i.id === dev.id);
                              const currentTradePrice = stockItem?.trade_in_price || stockItem?.price || dev.price;
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl text-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary shrink-0">
                                      <Smartphone size={14} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-white leading-tight uppercase">{dev.model}</p>
                                      {dev.brand && <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">{dev.brand}</p>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-bold text-white block">
                                      {(currentTradePrice * (dev.quantity || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    {dev.quantity > 1 && (
                                      <span className="text-[9px] text-on-surface-variant font-mono">
                                        {currentTradePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} cada
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                        <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Crédito Necessário</span>
                        <h4 className="text-sm font-black text-primary font-mono leading-tight mt-1.5">
                          {dynamicNeededCredit
                            ? Number(dynamicNeededCredit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'R$ 0,00'}
                        </h4>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                        <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Entrada Sugerida</span>
                        <h4 className="text-sm font-black text-white font-mono leading-tight mt-1.5">
                          {selectedCustomer.suggested_down_payment
                            ? Number(selectedCustomer.suggested_down_payment).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'R$ 0,00'}
                        </h4>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                        <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Parcela Desejada</span>
                        <h4 className="text-sm font-black text-white font-mono leading-tight mt-1.5">
                          {selectedCustomer.desired_installment_value
                            ? Number(selectedCustomer.desired_installment_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'R$ 0,00'}
                        </h4>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Histórico de Consultas Realizadas */}
              {queryHistory.length > 0 && (
                <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest block pl-1">Histórico de Consultas Realizadas</span>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {queryHistory.map((q) => {
                      const dateStr = new Date(q.created_at).toLocaleString('pt-BR');
                      const analystName = q.performed_by?.full_name || 'Desconhecido';
                      const isSelected = selectedHistoryId === q.id;
                      return (
                        <div key={q.id} className={cn(
                          "flex items-center justify-between p-3.5 rounded-2xl border transition-all text-xs",
                          isSelected 
                            ? "bg-primary/10 border-primary text-white" 
                            : "bg-white/5 border-white/5 text-on-surface hover:bg-white/10"
                        )}>
                          <button
                            type="button"
                            onClick={() => {
                              setQueryResults(q.raw_response);
                              setSelectedHistoryId(q.id);
                              if (q.raw_response?.isCNPJ) {
                                setActiveTab('cnpj');
                              } else {
                                const activeKeys = Object.keys(q.raw_response || {}).filter(k => q.raw_response[k] && !q.raw_response[k].error);
                                if (activeKeys.length > 0) {
                                  setActiveTab(activeKeys[0]);
                                }
                              }
                              showNotification('success', 'Relatório carregado do histórico!');
                            }}
                            className="flex-1 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                          >
                            <div>
                              <span className="font-bold uppercase block sm:inline">{q.query_type} - {formatCPF(q.document)}</span>
                              <span className="text-[9px] text-on-surface-variant/80 block mt-0.5">Analista: {analystName}</span>
                            </div>
                            <span className="text-[10px] text-on-surface-variant font-mono">{dateStr}</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setDeleteQueryId(q.id)}
                            className="p-2 ml-2 text-on-surface-variant hover:text-error transition-colors rounded-xl hover:bg-white/5"
                            title="Excluir do histórico"
                          >
                            <Trash2 size={15} className="text-error" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Painel de Resultados por Abas */}
              {queryResults && (
                <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
                  {/* Tabs Selector */}
                  <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar border-b border-white/5">
                    {selectedServices.map(srvId => {
                      const srv = serviceDetails.find(d => d.id === srvId);
                      const hasErr = !!queryErrors[srvId];
                      return (
                        <button
                          key={srvId}
                          type="button"
                          onClick={() => setActiveTab(srvId)}
                          className={cn(
                            "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border",
                            activeTab === srvId
                              ? "bg-primary border-primary text-on-primary shadow-lg"
                              : "bg-white/[0.01] border-white/5 text-on-surface-variant hover:bg-white/5",
                            hasErr && activeTab !== srvId && "border-red-500/30 text-red-400"
                          )}
                        >
                          {srv?.name} {hasErr && '⚠️'}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Render Body */}
                  <div className="p-2">
                    {renderTabContent()}
                  </div>
                </div>
              )}

              {/* Formulário de Decisão e Homologação de Crédito */}
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
                      <option value="A_VISTA" className="bg-[#121214] text-blue-400">🔵 Somente À Vista</option>
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
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Status Crédito */}
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

                  {/* Entrada Sugerida */}
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

                  {/* Analista Responsável */}
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

                  {/* Anotações */}
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

                  {/* Liberado para Compra */}
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
                    onClick={() => { setSelectedCustomerId(null); setQueryResults(null); setQueryErrors({}); }}
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
                      <><Loader2 className="animate-spin" size={16} /> Salvando...</>
                    ) : (
                      <><Save size={16} /> Homologar Análise de Crédito</>
                    )}
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>

      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteQueryId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-outline-variant/30 rounded-[40px] max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-error">
              <AlertTriangle size={28} />
              <h3 className="text-md font-black uppercase tracking-wider">Confirmar Exclusão</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Você tem certeza que deseja excluir esta consulta do histórico permanente? Esta ação é irreversível e removerá o relatório da esteira de crédito.
            </p>
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setDeleteQueryId(null)}
                className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteQuery}
                className="flex-1 py-4 px-6 rounded-2xl bg-error text-on-error text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-error/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Cliente */}
      {deleteCustomerIdToConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-outline-variant/30 rounded-[40px] max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-error">
              <AlertTriangle size={28} />
              <h3 className="text-md font-black uppercase tracking-wider">Confirmar Exclusão de Cliente</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Você tem certeza que deseja excluir completamente este cliente do sistema? Esta ação é irreversível e removerá todas as vendas, parcelas e dados associados a ele.
            </p>
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCustomerIdToConfirm(null)}
                className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                className="flex-1 py-4 px-6 rounded-2xl bg-error text-on-error text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-error/20"
              >
                Sim, Excluir Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
