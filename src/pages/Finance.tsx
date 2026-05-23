import React, { useState, useEffect } from 'react'; 
import { 
  TrendingUp, CreditCard, AlertCircle, CheckCircle2, Filter, 
  Search, Download, Calendar, DollarSign, ArrowUpRight, 
  ArrowDownRight, Smartphone, ShieldAlert, MessageSquare, 
  FileText, Plus, Loader2, ChevronDown, ChevronUp, QrCode,
  X, Copy, Check, Printer, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, Installment } from '../store/useFinanceStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';

interface CustomerGroup {
  customerId: string;
  customerName: string;
  totalValue: number;
  totalPaid: number;
  totalOverdue: number;
  installments: Installment[];
  status: 'paid' | 'pending' | 'overdue' | 'blocked';
  paidCount: number;
  totalCount: number;
}

// PIX defaults — overridden by unit settings
const DEFAULT_PIX_KEY = '';
const DEFAULT_PIX_NAME = 'MDR Informática & Celulares';
const DEFAULT_PIX_PHONE = '';

// Boleto/PIX Print Modal Component
function PixBoletoModal({ item, onClose, pixKey, pixName, pixPhone }: {
  item?: Installment;
  onClose: () => void;
  pixKey: string;
  pixName: string;
  pixPhone: string;
}) {
  const [copiedPix, setCopiedPix] = useState(false);

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    } catch {}
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-[#0f0f1a] border border-white/10 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Pagamento</h2>
            <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60 mt-0.5">
              {item ? `Parcela ${item.number}/${item.total} — ${item.customer_name}` : 'Recebimento de Parcela'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Amount */}
        {item && (
          <div className="px-6 pt-4 pb-0">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Valor a Receber</p>
              <p className="text-3xl font-black text-white font-mono">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-on-surface-variant mt-1">Vencimento: {new Date(item.due_date).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        )}

        {/* PIX Section */}
        <div className="p-6 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                <QrCode size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black">PIX Instantâneo</p>
                <p className="text-xs text-white font-black">Chave CNPJ</p>
              </div>
            </div>

            {/* QR Code Placeholder — visual representation */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl" style={{ width: 160, height: 160 }}>
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                  {/* Simplified QR-like pattern for visual effect */}
                  {[0,30,70].map(x => [0,30,70].map(y => (
                    <rect key={`${x}-${y}`} x={x} y={y} width="25" height="25" fill="#1a1a2e" rx="2"/>
                  )))}
                  {/* Inner squares */}
                  {[4,34,74].map(x => [4,34,74].map(y => (
                    <rect key={`i${x}-${y}`} x={x} y={y} width="17" height="17" fill="white" rx="1"/>
                  )))}
                  {[8,38,78].map(x => [8,38,78].map(y => (
                    <rect key={`ii${x}-${y}`} x={x} y={y} width="9" height="9" fill="#6C63FF" rx="1"/>
                  )))}
                  {/* Data dots */}
                  {[30,35,40,45,50,55,60,65,70].map((x, xi) =>
                    [5,10,15,20,25].map((y, yi) =>
                      (xi + yi) % 2 === 0 ? <rect key={`d${x}-${y}`} x={x} y={y} width="4" height="4" fill="#1a1a2e" rx="0.5"/> : null
                    )
                  )}
                  {[5,10,15,20,25].map((x, xi) =>
                    [30,35,40,45,50,55,60,65,70].map((y, yi) =>
                      (xi + yi) % 3 === 0 ? <rect key={`e${x}-${y}`} x={x} y={y} width="4" height="4" fill="#1a1a2e" rx="0.5"/> : null
                    )
                  )}
                  {[30,35,40,45,50,55,60,65].map((x, xi) =>
                    [30,35,40,45,50,55,60,65].map((y, yi) =>
                      (xi * yi) % 3 !== 1 ? <rect key={`f${x}-${y}`} x={x} y={y} width="4" height="4" fill="#1a1a2e" rx="0.5"/> : null
                    )
                  )}
                  {/* MDR text in center */}
                  <text x="50" y="55" textAnchor="middle" fontSize="8" fontWeight="900" fill="#6C63FF" fontFamily="Arial">MDR</text>
                </svg>
              </div>
            </div>

            {/* PIX Key */}
            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Chave PIX ({pixKey ? 'Configurada' : 'não configurada'})</p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-xs text-white font-mono">{pixKey || 'Configure nas Configurações da loja'}</code>
                {pixKey && (
                  <button
                    onClick={copyPix}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-[9px] font-black text-primary uppercase tracking-widest transition-all"
                  >
                    {copiedPix ? <Check size={12} /> : <Copy size={12} />}
                    {copiedPix ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
              </div>
            </div>

            <p className="text-[9px] text-on-surface-variant text-center">
              Beneficiário: <strong className="text-white">{pixName}</strong>
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={handlePrint}
            className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <Printer size={16} />
            Imprimir / Salvar PDF
          </button>
        </div>

        {/* Print-only styles */}
        <style>{`
          @media print {
            body > *:not(.pix-boleto-print-wrapper) { display: none !important; }
            .pix-boleto-print-wrapper { display: block !important; }
          }
        `}</style>
      </motion.div>
    </div>
  );
}

export default function Finance() {
  const [activeTab, setActiveTab] = useState<'receivables' | 'overdue'>('receivables');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [pixModalItem, setPixModalItem] = useState<Installment | null | undefined>(undefined); // undefined = closed
  const [sendingWa, setSendingWa] = useState<string | null>(null);
  
  const { installments, markAsPaid, markAsBlocked, fetchInstallments, isLoading } = useFinanceStore();
  const { customers } = useCustomerStore();
  const { unit } = useUnitStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();

  // Derive PIX data from unit settings (with fallbacks)
  const pixKey = unit?.pix_key || unit?.cnpj || '';
  const pixName = unit?.name || DEFAULT_PIX_NAME;
  const pixPhone = unit?.phone || DEFAULT_PIX_PHONE;

  // ─── Late-payment fee calculator ───────────────────────────────────────
  // Contract terms: 2% multa + 1% per month interest after due date
  const calculateOverdueFees = (inst: Installment) => {
    const dueDate = new Date(inst.due_date + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDue = dueDate < today;
    // Treat as overdue: explicitly overdue/blocked, OR pending but past due date
    const isLate = inst.status === 'overdue' || inst.status === 'blocked' || (inst.status === 'pending' && isPastDue);
    if (!isLate) {
      return { multa: 0, juros: 0, total: inst.value, daysLate: 0, isLate: false };
    }
    const diffMs = today.getTime() - dueDate.getTime();
    const daysLate = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const monthsLate = daysLate / 30;
    const multa = inst.value * 0.02;                  // 2% one-time fine
    const juros = inst.value * 0.01 * monthsLate;    // 1% per month pro-rata
    const total = inst.value + multa + juros;
    return { multa, juros, total, daysLate, isLate: true };
  };

  useEffect(() => {
    fetchInstallments(profile?.unit_id || undefined);
  }, [profile?.unit_id, fetchInstallments]);

  // Group installments by customer
  const customerGroups = React.useMemo(() => {
    const groups: { [key: string]: CustomerGroup } = {};
    
    installments.forEach(inst => {
      const custId = inst.customer_id || 'unknown';
      const custName = inst.customer_name || 'Cliente Sem Nome';
      
      if (!groups[custId]) {
        groups[custId] = {
          customerId: custId,
          customerName: custName,
          totalValue: 0,
          totalPaid: 0,
          totalOverdue: 0,
          installments: [],
          status: 'pending',
          paidCount: 0,
          totalCount: 0
        };
      }
      
      const group = groups[custId];
      group.installments.push(inst);
      group.totalValue += inst.value;
      group.totalCount += 1;
      
      if (inst.status === 'paid') {
        group.totalPaid += inst.value;
        group.paidCount += 1;
      } else if (inst.status === 'overdue' || inst.status === 'blocked') {
        group.totalOverdue += inst.value;
      }
    });
    
    return Object.values(groups).map(group => {
      group.installments.sort((a, b) => a.number - b.number);
      
      const hasBlocked = group.installments.some(i => i.status === 'blocked');
      const hasOverdue = group.installments.some(i => i.status === 'overdue');
      const allPaid = group.installments.every(i => i.status === 'paid');
      
      if (hasBlocked) {
        group.status = 'blocked';
      } else if (hasOverdue) {
        group.status = 'overdue';
      } else if (allPaid) {
        group.status = 'paid';
      } else {
        group.status = 'pending';
      }
      
      return group;
    });
  }, [installments]);

  const filteredGroups = React.useMemo(() => {
    return customerGroups.filter(group => {
      const matchesSearch = group.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (activeTab === 'overdue') {
        return (group.status === 'overdue' || group.status === 'blocked') && matchesSearch;
      }
      return matchesSearch;
    });
  }, [customerGroups, searchTerm, activeTab]);

  const totalReceivable = installments.reduce((acc, current) => acc + current.value, 0);
  const totalPaid = installments.filter(i => i.status === 'paid').reduce((acc, current) => acc + current.value, 0);
  const totalOverdue = installments.filter(i => i.status === 'overdue' || i.status === 'blocked').reduce((acc, current) => acc + current.value, 0);

  const toggleExpand = (customerId: string) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

  const handlePayment = (item: Installment) => {
    const fees = calculateOverdueFees(item);
    const isOverdue = fees.isLate;
    showModal({
      title: isOverdue ? 'Recebimento com Mora' : 'Confirmar Pagamento',
      children: (
        <div className="space-y-4">
          <p className="text-sm">Recebimento da parcela <span className="text-white font-black">{item.number}/{item.total}</span> de <span className="text-white font-black">{item.customer_name}</span>.</p>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface-variant uppercase tracking-widest font-black">Valor Original</span>
              <span className="text-white font-mono font-black">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {isOverdue && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-error uppercase tracking-widest font-black">Multa (2%)</span>
                  <span className="text-error font-mono font-black">+ R$ {fees.multa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-error uppercase tracking-widest font-black">Juros (1%/mês · {fees.daysLate}d)</span>
                  <span className="text-error font-mono font-black">+ R$ {fees.juros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm">
                  <span className="text-white uppercase tracking-widest font-black">Total a Receber</span>
                  <span className="text-white font-mono font-black text-base">R$ {fees.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            {!isOverdue && (
              <div className="flex justify-between text-sm pt-1">
                <span className="text-on-surface-variant uppercase tracking-widest font-black">Total a Receber</span>
                <span className="text-white font-mono font-black">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
          {isOverdue && (
            <p className="text-[10px] text-error font-black uppercase tracking-widest bg-error/10 p-3 rounded-xl border border-error/20">
              ⚠️ Multa e juros conforme contrato. Vencida há {fees.daysLate} dia(s).
            </p>
          )}
        </div>
      ),
      confirmText: isOverdue ? `Receber R$ ${fees.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Confirmar Recebimento',
      onConfirm: async () => {
        try {
          // Pass the total with fees so the actual received amount is persisted in DB
          await markAsPaid(item.id, isOverdue ? fees.total : undefined);
          showNotification('success', 'Pagamento Confirmado');
          hideModal();
        } catch (error) {
          showNotification('error', 'Erro no Servidor');
        }
      }
    });
  };

  const handleBlock = (item: Installment) => {
    showModal({
      title: 'Bloquear Aparelho',
      children: (
        <div className="space-y-4">
          <p className="text-sm">O aparelho de <span className="text-white font-black">{item.customer_name}</span> será bloqueado remotamente.</p>
          <p className="text-[10px] text-error font-black uppercase tracking-widest bg-error/10 p-4 rounded-xl border border-error/20">Esta ação impedirá o uso do dispositivo até que o pagamento seja regularizado.</p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Confirmar Bloqueio',
      onConfirm: async () => {
        try {
          await markAsBlocked(item.id);
          showNotification('warning', 'Aparelho Bloqueado');
          hideModal();
        } catch (error) {
          showNotification('error', 'Erro no Servidor');
        }
      }
    });
  };

  const handleWhatsApp = async (item: Installment) => {
    setSendingWa(item.id);
    try {
      // Fetch active evolution channels
      const chRes = await fetch('/api/evolution/instance/fetchInstances', {
        headers: { 'Content-Type': 'application/json' }
      });
      let instanceName = 'mdr-principal';
      if (chRes.ok) {
        const chData = await chRes.json();
        const instances = Array.isArray(chData) ? chData : (chData?.instances || []);
        const active = instances.find((i: any) => i.connectionStatus === 'open' || i.state === 'open');
        if (active) instanceName = active.instance?.instanceName || active.instanceName || instanceName;
      }

      // Look up phone from customers store
      const customer = customers.find(c => c.id === item.customer_id);
      const rawPhone = (customer?.phone || '').replace(/\D/g, '');
      const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

      if (phone.length < 12) {
        showNotification('error', 'Telefone inválido', 'O cliente não possui um número de telefone válido cadastrado.');
        setSendingWa(null);
        return;
      }

      const dueDate = new Date(item.due_date).toLocaleDateString('pt-BR');
      const valueFormatted = item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

      const text = `Olá, *${item.customer_name}*! 👋\n\n`
        + `Passando para lembrar sobre sua parcela com a *${pixName}*:\n\n`
        + `📋 *Parcela:* ${item.number}/${item.total}\n`
        + `💰 *Valor:* R$ ${valueFormatted}\n`
        + `📅 *Vencimento:* ${dueDate}\n\n`
        + (pixKey ? `Pague pelo PIX:\n🔑 *Chave:* ${pixKey}\n👤 Beneficiário: ${pixName}\n\n` : '')
        + (pixPhone ? `Dúvidas? Fale conosco: ${pixPhone}\n` : '')
        + `_Mensagem automática — não responda este número._`;

      const res = await fetch(`/api/evolution/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone, text })
      });

      if (res.ok) {
        showNotification('success', 'WhatsApp Enviado!', `Lembrete enviado para ${item.customer_name}.`);
      } else {
        const err = await res.text();
        showNotification('error', 'Falha ao Enviar', `Erro: ${err.substring(0, 80)}`);
      }
    } catch (err: any) {
      showNotification('error', 'Erro de Conexão', err?.message || 'Não foi possível conectar ao servidor de WhatsApp.');
    } finally {
      setSendingWa(null);
    }
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Painel Financeiro</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gestão de Recebíveis</p>
        </div>
        <button
          onClick={() => setPixModalItem(null)}
          className="flex items-center gap-2 px-5 py-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all"
        >
          <QrCode size={16} />
          PIX / Boleto da Loja
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total a Receber', value: `R$ ${totalReceivable.toLocaleString('pt-BR')}`, icon: ArrowUpRight, color: 'text-primary' },
          { label: 'Recebido (Total)', value: `R$ ${totalPaid.toLocaleString('pt-BR')}`, icon: CheckCircle2, color: 'text-success' },
          { label: 'Em Atraso', value: `R$ ${totalOverdue.toLocaleString('pt-BR')}`, icon: AlertCircle, color: 'text-error' },
          { label: 'Bloqueados', value: installments.filter(i => i.status === 'blocked').length.toString(), icon: ShieldAlert, color: 'text-error' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color} mb-4 border border-white/10`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
            <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Tabs Switcher */}
      <div className="flex p-1 bg-white/[0.02] rounded-[24px] mb-8 gap-1 border border-white/5 max-w-sm">
        <button 
          onClick={() => setActiveTab('receivables')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'receivables' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-on-surface-variant hover:text-white'}`}
        >
          Recebíveis
        </button>
        <button 
          onClick={() => setActiveTab('overdue')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overdue' ? 'bg-error text-white shadow-xl shadow-error/20' : 'text-on-surface-variant hover:text-white'}`}
        >
          Inadimplência
        </button>
      </div>

      {/* Search Input and Cards List Container */}
      <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-12 pr-6 py-4 text-sm focus:border-white outline-none transition-all font-display"
            />
          </div>
        </div>

        {/* Customer Cards List */}
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
              <Loader2 className="animate-spin" size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Financeiro...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
              <CreditCard size={48} className="text-on-surface-variant mb-2 opacity-20" />
              <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhum cliente encontrado</p>
              <p className="text-[10px] font-display text-on-surface-variant opacity-70">A lista de recebíveis está vazia ou a busca não encontrou resultados.</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isExpanded = expandedCustomerId === group.customerId;
              const percentPaid = group.totalCount > 0 ? (group.paidCount / group.totalCount) * 100 : 0;
              
              const initials = group.customerName
                .split(' ')
                .slice(0, 2)
                .map(n => n[0])
                .join('')
                .toUpperCase();

              const statusColors = 
                group.status === 'blocked' ? { bg: 'from-red-500/20 to-red-950/40 border-red-500/30 text-red-500', text: 'Bloqueado', badge: 'bg-red-500/10 text-red-500 border-red-500/20' } :
                group.status === 'overdue' ? { bg: 'from-orange-500/20 to-orange-950/40 border-orange-500/30 text-orange-500', text: 'Atrasado', badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20' } :
                group.status === 'paid' ? { bg: 'from-green-500/20 to-green-950/40 border-green-500/30 text-green-500', text: 'Pago', badge: 'bg-green-500/10 text-green-500 border-green-500/20' } :
                { bg: 'from-primary/20 to-primary-container/20 border-primary/30 text-primary', text: 'Pendente', badge: 'bg-secondary/10 text-secondary border-secondary/20' };

              return (
                <div 
                  key={group.customerId}
                  className={`bg-white/[0.01] hover:bg-white/[0.03] border rounded-[28px] transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'border-white/10 bg-white/[0.02] shadow-2xl' : 'border-white/5'
                  }`}
                >
                  {/* Card Header Summary */}
                  <div 
                    onClick={() => toggleExpand(group.customerId)}
                    className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer select-none"
                  >
                    {/* Left: Avatar + Name */}
                    <div className="flex items-center gap-4 min-w-[240px]">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${statusColors.bg} border flex items-center justify-center font-black text-sm tracking-widest shrink-0 shadow-lg`}>
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight leading-tight mb-1">{group.customerName}</h3>
                        <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">
                          {group.totalCount === 1 ? '1 Parcela Única' : `${group.totalCount} Parcelas Geradas`}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Progress Bar */}
                    <div className="flex-1 max-w-md">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                        <span>Progresso: {group.paidCount} de {group.totalCount} Quitadas</span>
                        <span className="text-white">{percentPaid.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-primary via-indigo-500 to-green-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentPaid}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* Right: Totals + Status Badge */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0">
                      <div className="flex gap-6">
                        <div className="text-right">
                          <span className="block text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-0.5 opacity-60">Recebido</span>
                          <span className="text-xs font-black text-success font-mono">R$ {group.totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-0.5 opacity-60">A Receber</span>
                          <span className="text-xs font-black text-primary font-mono">R$ {(group.totalValue - group.totalPaid).toFixed(2)}</span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="block text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-0.5 opacity-60">Total</span>
                          <span className="text-xs font-black text-white font-mono">R$ {group.totalValue.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusColors.badge}`}>
                          <div className="w-1 h-1 rounded-full bg-current" />
                          {statusColors.text}
                        </div>
                        <div className="text-on-surface-variant hover:text-white transition-colors">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Installment List Section */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="border-t border-white/5 p-6 bg-white/[0.005]">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                                  <th className="pb-3 pl-4">Parcela</th>
                                  <th className="pb-3">Vencimento</th>
                                  <th className="pb-3">Valor</th>
                                  <th className="pb-3">Status</th>
                                  <th className="pb-3 text-right pr-4">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {group.installments.map((inst) => {
                                  const fees = calculateOverdueFees(inst);
                                  const isOverdue = fees.isLate;
                                  return (
                                    <tr 
                                      key={inst.id}
                                      className="hover:bg-white/[0.01] transition-colors group"
                                    >
                                      <td className="py-4 pl-4">
                                        <div className="flex items-center">
                                          <span className="text-[8px] font-mono text-primary font-black tracking-widest leading-none bg-primary/10 px-1.5 py-0.5 rounded uppercase border border-primary/20 mr-2">
                                            #{inst.id.split('-')[0]}
                                          </span>
                                          <span className="text-xs font-bold text-white">
                                            Parcela {inst.number} de {inst.total}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-4">
                                        <div className="flex items-center gap-1.5">
                                          {isOverdue && <AlertCircle size={12} className="text-error animate-pulse" />}
                                          <span className={`text-xs font-black tracking-tight ${
                                            isOverdue ? 'text-error' : 'text-on-surface'
                                          }`}>
                                            {new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-4">
                                        <div>
                                          <span className={`text-xs font-mono font-bold ${isOverdue ? 'line-through text-on-surface-variant' : 'text-white'}`}>
                                            R$ {inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          </span>
                                          {isOverdue && (
                                            <div>
                                              <span className="text-xs font-mono font-black text-error">
                                                R$ {fees.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                              </span>
                                              <p className="text-[8px] text-error opacity-70">c/ mora {fees.daysLate}d</p>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                          inst.status === 'paid' ? 'bg-success/10 text-success border-success/20' :
                                          isOverdue ? 'bg-error/10 text-error border-error/20' :
                                          inst.status === 'pending' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                                          'bg-error/20 text-white border-error/50'
                                        }`}>
                                          <div className="w-1 h-1 rounded-full bg-current" />
                                          {inst.status === 'paid' ? 'Pago' : 
                                           inst.status === 'blocked' ? 'Bloqueado' : 
                                           isOverdue ? 'Atrasado' : 'Pendente'}
                                        </div>
                                      </td>
                                      <td className="py-4 text-right pr-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {inst.status !== 'paid' && (
                                            <>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handlePayment(inst);
                                                }}
                                                className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10"
                                                title="Confirmar Pagamento"
                                              >
                                                <CheckCircle2 size={14} />
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleBlock(inst);
                                                }}
                                                className="p-1.5 bg-error/10 hover:bg-error/20 text-error rounded-lg transition-all border border-error/20"
                                                title="Bloquear Aparelho"
                                              >
                                                <ShieldAlert size={14} />
                                              </button>
                                            </>
                                          )}
                                          {/* PIX / Boleto button */}
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPixModalItem(inst);
                                            }}
                                            title="Gerar PIX / Boleto"
                                            className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-all border border-green-500/20"
                                          >
                                            <QrCode size={14} />
                                          </button>
                                          {/* WhatsApp button */}
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleWhatsApp(inst);
                                            }}
                                            disabled={sendingWa === inst.id}
                                            title="Notificar WhatsApp"
                                            className="p-1.5 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white rounded-lg transition-all border border-white/10 disabled:opacity-40"
                                          >
                                            {sendingWa === inst.id ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PIX / Boleto Modal */}
      <AnimatePresence>
        {pixModalItem !== undefined && (
          <PixBoletoModal
            item={pixModalItem ?? undefined}
            onClose={() => setPixModalItem(undefined)}
            pixKey={pixKey}
            pixName={pixName}
            pixPhone={pixPhone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
