import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Plus, Loader2, CheckCircle2, 
  AlertTriangle, DollarSign, Settings, Globe, Shield, Check
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useFiscalStore, Invoice } from '../store/useFiscalStore';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';

export default function Fiscal() {
  const { showNotification } = useUI();
  const { profile } = useAuthStore();
  const {
    invoices,
    config,
    isLoading,
    fetchInvoices,
    addInvoice,
    updateInvoiceStatus,
    fetchStoreConfig,
    saveStoreConfig
  } = useFiscalStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApi, setSelectedApi] = useState('focusnfe');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Configuration inputs state
  const [apiToken, setApiToken] = useState('');
  const [cnpjEmitente, setCnpjEmitente] = useState('');

  // Fetch initial config and invoices on mount
  useEffect(() => {
    if (profile?.unit_id) {
      fetchStoreConfig(profile.unit_id);
      fetchInvoices(profile.unit_id);
    }
  }, [profile?.unit_id, fetchStoreConfig, fetchInvoices]);

  // Bind store config to form states when config is fetched
  useEffect(() => {
    if (config) {
      setCnpjEmitente(config.cnpj || '');
      setApiToken(config.fiscal_api_token || '');
      setSelectedApi(config.fiscal_gateway || 'focusnfe');
      setEnvironment(config.fiscal_environment || 'sandbox');
    }
  }, [config]);

  // Calculate dynamic KPIs from live DB invoices
  const authorizedInvoices = invoices.filter(inv => inv.status === 'authorized');
  const cancelledInvoices = invoices.filter(inv => inv.status === 'cancelled');
  
  const totalInvoicesCount = authorizedInvoices.length;
  const cancelledInvoicesCount = cancelledInvoices.length;
  const totalFaturamento = authorizedInvoices.reduce((acc, inv) => acc + inv.value, 0);
  const totalImpostos = authorizedInvoices.reduce((acc, inv) => acc + inv.tax, 0);

  const handleCreateMockInvoice = async () => {
    if (!profile?.unit_id) {
      showNotification('error', 'Por favor, faça login para emitir uma nota fiscal.');
      return;
    }

    setLoadingAction('create');
    try {
      const nextNumber = String(invoices.length + 453).padStart(6, '0');
      const val = 350.00;
      const tax = 14.80;
      
      const newInv = await addInvoice({
        number: nextNumber,
        type: Math.random() > 0.5 ? 'NF-e (Produto)' : 'NFS-e (Serviço)',
        client_name: 'Henrique Lins Junqueira',
        value: val,
        tax: tax,
        status: 'processing',
        key: '352605' + (config?.cnpj?.replace(/\D/g, '') || '45189230000199') + '55001000000' + nextNumber + '1004531234',
        store_id: profile.unit_id
      });

      showNotification('success', 'Nota Fiscal enviada para processamento na API!');
      setLoadingAction(null);

      // Auto-approve after 3 seconds to mock a real webhook response!
      setTimeout(async () => {
        await updateInvoiceStatus(newInv.id, 'authorized');
        showNotification('success', `Nota Fiscal Nº ${newInv.number} AUTORIZADA com sucesso!`);
      }, 3000);

    } catch (error) {
      showNotification('error', 'Falha ao emitir nota fiscal de teste.');
      setLoadingAction(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.unit_id) return;

    setLoadingAction('save');
    try {
      await saveStoreConfig(profile.unit_id, {
        cnpj: cnpjEmitente,
        fiscal_api_token: apiToken,
        fiscal_gateway: selectedApi as any,
        fiscal_environment: environment
      });
      showNotification('success', 'Configurações de emissão salvas no banco de dados!');
    } catch (error) {
      showNotification('error', 'Erro ao salvar as configurações.');
    } finally {
      setLoadingAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'authorized':
        return { label: 'Autorizada', color: 'border-success/20 text-success bg-success/5' };
      case 'processing':
        return { label: 'Processando', color: 'border-warning/20 text-warning bg-warning/5 animate-pulse' };
      case 'cancelled':
        return { label: 'Cancelada', color: 'border-error/20 text-error bg-error/5' };
      default:
        return { label: status, color: 'border-white/10 text-white/60 bg-white/5' };
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.number.includes(searchTerm) ||
    inv.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 pb-20 space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display text-3xl font-black text-white uppercase tracking-tight">Módulo Fiscal</h2>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Emissão de NF-e, NFS-e e Integrações</p>
        </div>
        <button
          onClick={handleCreateMockInvoice}
          disabled={loadingAction !== null}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary font-black uppercase tracking-widest text-[10px] px-6 py-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
        >
          {loadingAction === 'create' ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Simular Emissão Fiscal
        </button>
      </div>

      {/* BANNER INFORMATIVO */}
      <div className="bg-primary/5 border border-primary/20 rounded-[32px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Globe size={18} />
            <h4 className="text-xs font-black uppercase tracking-wider">Módulo de Emissão Fiscal Inteligente</h4>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed max-w-2xl">
            Este painel gerencia a emissão fiscal de notas de venda de produtos (NF-e) e ordens de serviços de assistência (NFS-e).
            Você poderá integrar a sua API preferida (como **FocusNFe**, **e-Notas** ou **plugNotas**) de forma ágil para automatizar todas as emissões fiscais da loja.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-full shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-success animate-ping"></span>
          <span className="text-[9px] font-black uppercase text-white tracking-widest">Motor Fiscal Pronto</span>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {[
          { label: 'Notas Emitidas', value: String(totalInvoicesCount), valColor: 'text-white', icon: FileText, iconColor: 'text-primary' },
          { label: 'Notas Canceladas', value: String(cancelledInvoicesCount), valColor: 'text-error', icon: AlertTriangle, iconColor: 'text-error' },
          { label: 'Faturamento Fiscal', value: `R$ ${totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valColor: 'text-success', icon: DollarSign, iconColor: 'text-success' },
          { label: 'Impostos Calculados', value: `R$ ${totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valColor: 'text-warning', icon: Shield, iconColor: 'text-warning' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white/[0.02] border border-outline-variant/30 rounded-[32px] p-6 flex items-center gap-4">
            <div className={cn("w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shrink-0", card.iconColor)}>
              <card.icon size={22} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-on-surface-variant/60 tracking-widest block leading-none">{card.label}</span>
              <span className={cn("text-xl font-black font-mono leading-none mt-2 block", card.valColor)}>{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1 & 2: LISTAGEM DE NOTAS EMITIDAS */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-6 flex flex-col h-[65vh]">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} /> Últimas Notas Emitidas
            </h3>
            <span className="text-[10px] text-on-surface-variant font-mono uppercase font-black tracking-widest">
              {environment === 'sandbox' ? 'Sandbox Ativo' : 'Produção Ativa'}
            </span>
          </div>

          {/* Campo de Busca */}
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, número ou modelo de nota..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-12 pr-4 py-3 text-xs focus:border-white outline-none transition-all font-display text-white"
            />
          </div>

          {/* Listagem */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 gap-3">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-[9px] font-black uppercase tracking-widest">Carregando Notas Fiscais...</span>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 gap-3">
                <FileText size={32} />
                <span className="text-[9px] font-black uppercase tracking-widest">Nenhuma nota emitida</span>
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const badge = getStatusBadge(inv.status);
                const formattedDate = inv.created_at ? new Date(inv.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
                return (
                  <div key={inv.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-3xl hover:bg-white/[0.03] transition-all flex flex-col md:flex-row justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black font-mono tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5 text-on-surface-variant">Nº {inv.number}</span>
                        <span className="font-bold text-white uppercase">{inv.type}</span>
                        <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", badge.color)}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-on-surface-variant mt-1">Cliente: <strong className="text-white">{inv.client_name}</strong></p>
                      <p className="text-[9px] font-mono text-on-surface-variant/50 max-w-[340px] truncate" title={inv.key}>Chave: {inv.key || '—'}</p>
                    </div>
                    
                    <div className="flex flex-col md:items-end justify-between shrink-0 text-left md:text-right gap-1 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                      <span className="font-bold text-white font-mono text-sm">R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-on-surface-variant/60 font-medium font-mono leading-none">Imposto retido: R$ {inv.tax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[8px] text-on-surface-variant/40 font-mono mt-1">{formattedDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA 3: INTEGRAÇÃO DE API FISCAL */}
        <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-6 flex flex-col">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Settings size={16} className="text-primary" />
            <h3 className="text-xs font-black text-primary uppercase tracking-widest">Configurações da API</h3>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5 text-xs flex-1 flex flex-col">
            
            {/* Escolha da API */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Escolha o Gateway Fiscal</label>
              <select
                value={selectedApi}
                onChange={(e) => setSelectedApi(e.target.value)}
                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
              >
                <option value="focusnfe">⚡ FocusNFe API (Recomendado)</option>
                <option value="enotas">🚀 e-Notas Gateway</option>
                <option value="plugnotas">🔌 plugNotas (Tecnospeed)</option>
                <option value="other">📦 Outras APIs (Custom)</option>
              </select>
            </div>

            {/* CNPJ Emitente */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">CNPJ Emitente da Loja</label>
              <input
                type="text"
                required
                value={cnpjEmitente}
                onChange={(e) => setCnpjEmitente(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono"
                placeholder="00.000.000/0001-00"
              />
            </div>

            {/* Token da API */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">API Token (Sandbox/Produção)</label>
              <input
                type="password"
                required
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono text-warning"
                placeholder="API Token..."
              />
            </div>

            {/* Ambiente */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Ambiente de Operação</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEnvironment('sandbox')}
                  className={cn(
                    "py-3 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    environment === 'sandbox' 
                      ? "bg-warning/10 border-warning/30 text-warning" 
                      : "bg-[#121214] border-white/5 text-on-surface-variant"
                  )}
                >
                  Homologação
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironment('production')}
                  className={cn(
                    "py-3 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    environment === 'production' 
                      ? "bg-success/10 border-success/30 text-success" 
                      : "bg-[#121214] border-white/5 text-on-surface-variant"
                  )}
                >
                  Produção
                </button>
              </div>
            </div>

            {/* Certificado Digital */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 space-y-2.5">
              <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-widest block leading-none">Certificado Digital (.pfx)</span>
              <div className="border border-dashed border-white/15 hover:border-primary/50 transition-colors rounded-2xl p-4 text-center cursor-pointer">
                <span className="text-[10px] text-on-surface-variant font-bold">Certificado_MDR_2026.pfx</span>
                <span className="text-[8px] text-success font-black uppercase tracking-widest block mt-1">✓ Válido até Jan/2027</span>
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 mt-auto">
              <button
                type="submit"
                disabled={loadingAction !== null}
                className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingAction === 'save' ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                Salvar Configurações
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
