import React, { useState, useEffect, useMemo } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, CreditCard, AlertCircle, CheckCircle2, Filter, 
  Search, Download, Calendar, DollarSign, ArrowUpRight, 
  ArrowDownRight, Smartphone, ShieldAlert, MessageSquare, 
  FileText, Plus, Loader2, ChevronDown, ChevronUp, QrCode,
  X, Copy, Check, Printer, Send, RotateCcw, Lock, Unlock, AlertTriangle, Eye, EyeOff,
  Store, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, Installment } from '../store/useFinanceStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { useCashStore, CashShift, CashTransaction } from '../store/useCashStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { formatCPF, formatPhone, printElement } from '../lib/utils';

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
                  {[0,30,70].map(x => [0,30,70].map(y => (
                    <rect key={`${x}-${y}`} x={x} y={y} width="25" height="25" fill="#1a1a2e" rx="2"/>
                  )))}
                  {[4,34,74].map(x => [4,34,74].map(y => (
                    <rect key={`i${x}-${y}`} x={x} y={y} width="17" height="17" fill="white" rx="1"/>
                  )))}
                  {[8,38,78].map(x => [8,38,78].map(y => (
                    <rect key={`ii${x}-${y}`} x={x} y={y} width="9" height="9" fill="#6C63FF" rx="1"/>
                  )))}
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

interface CustomerGroup {
  customerId: string;
  customerName: string;
  totalValue: number;
  totalPaid: number;
  totalOverdue: number;
  installments: Installment[];
  displayedInstallments: Installment[];
  status: 'paid' | 'pending' | 'overdue' | 'blocked';
  paidCount: number;
  totalCount: number;
}

function PaymentConfirmationContent({ 
  item, 
  fees, 
  isOverdue, 
  onMethodChange 
}: { 
  item: Installment; 
  fees: any; 
  isOverdue: boolean; 
  onMethodChange: (method: 'pix' | 'money' | 'card') => void;
}) {
  const [method, setMethod] = useState<'pix' | 'money' | 'card'>('money'); // Default to cash for retail shifts

  useEffect(() => {
    onMethodChange(method);
  }, [method]);

  return (
    <div className="space-y-4 text-xs">
      <p className="text-xs">Recebimento da parcela <span className="text-white font-black">{item.number}/{item.total}</span> de <span className="text-white font-black">{item.customer_name}</span>.</p>
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
              <span className="text-white font-mono font-black text-sm">R$ {fees.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
        {!isOverdue && (
          <div className="flex justify-between text-xs pt-1">
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

      {/* Payment Method Selector */}
      <div className="space-y-2">
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">Forma de Pagamento</p>
        <div className="grid grid-cols-3 gap-2">
          {(['pix', 'money', 'card'] as const).map(m => {
            const label = m === 'pix' ? 'PIX' : m === 'money' ? 'Dinheiro' : 'Cartão';
            const active = method === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  active 
                    ? 'bg-white text-black border-white' 
                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Finance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'receivables' | 'cash_flow' | 'cash_control'>('receivables');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [pixModalItem, setPixModalItem] = useState<Installment | null | undefined>(undefined); // undefined = closed
  const [sendingWa, setSendingWa] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'overdue' | 'blocked'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  const { installments, markAsPaid, revertPayment, fetchInstallments } = useFinanceStore();
  const { units, fetchAllUnits, unit } = useUnitStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const { hasPermission, fetchUserPermissions } = usePermissionStore();

  // Cashier stores and states
  const { 
    activeShift, transactions, shiftHistory, fetchActiveShift, 
    openShift, closeShift, fetchTransactions, addTransaction, fetchShiftHistory 
  } = useCashStore();
  const { inventory, fetchInventory } = useInventoryStore();

  const isAdmin = profile?.role === 'admin';
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  // Shift Opening / Closing States
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingCash, setClosingCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isAdminViewShiftSecret, setIsAdminViewShiftSecret] = useState<boolean>(false);

  // Manual transaction Modal States
  const [isManualTxOpen, setIsManualTxOpen] = useState(false);
  const [manualTx, setManualTx] = useState({
    type: 'outflow' as 'inflow' | 'outflow',
    category: 'outros' as CashTransaction['category'],
    amount: '',
    payment_method: 'money' as CashTransaction['payment_method'],
    description: ''
  });

  useEffect(() => {
    fetchAllUnits();
    fetchUserPermissions();
  }, [fetchAllUnits, fetchUserPermissions]);

  useEffect(() => {
    if (profile?.unit_id) {
      setSelectedUnitId(profile.unit_id);
    } else if (units.length > 0 && !selectedUnitId) {
      setSelectedUnitId(units[0].id);
    }
  }, [profile, units, selectedUnitId]);

  useEffect(() => {
    if (selectedUnitId) {
      fetchInstallments(selectedUnitId);
      fetchActiveShift(selectedUnitId);
      fetchTransactions(selectedUnitId);
      fetchShiftHistory(selectedUnitId);
      fetchInventory(selectedUnitId);
    }
  }, [selectedUnitId, fetchInstallments, fetchActiveShift, fetchTransactions, fetchShiftHistory, fetchInventory]);

  const handleTabChange = (tab: 'receivables' | 'cash_flow' | 'cash_control') => {
    setActiveTab(tab);
    setStatusFilter('all');
  };

  const formatPaymentDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
      return new Date(cleanStr).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const pixKey = unit?.pix_key || unit?.cnpj || '';
  const pixName = unit?.name || DEFAULT_PIX_NAME;
  const pixPhone = unit?.phone || DEFAULT_PIX_PHONE;

  const handleExportCSV = () => {
    const filteredInstallments = filteredGroups.flatMap(group => group.displayedInstallments);

    if (filteredInstallments.length === 0) {
      showNotification('error', 'Sem dados', 'Não há parcelas filtradas para exportar.');
      return;
    }

    const headers = ['ID Parcela', 'Cliente', 'Parcela', 'Vencimento', 'Valor Original', 'Valor Atual com Mora', 'Status', 'Data Pagto', 'Método Pagto'];
    const rows = filteredInstallments.map(inst => {
      const fees = calculateOverdueFees(inst);
      return [
        `#${inst.id.split('-')[0]}`,
        inst.customer_name || 'Cliente Sem Nome',
        `${inst.number}/${inst.total}`,
        inst.due_date,
        inst.value.toFixed(2),
        fees.total.toFixed(2),
        inst.status === 'paid' ? 'Pago' : inst.status === 'blocked' ? 'Bloqueado' : fees.isLate ? 'Atrasado' : 'Pendente',
        inst.paid_at ? formatPaymentDate(inst.paid_at) : '',
        inst.payment_method ? (
          inst.payment_method === 'pix' ? 'PIX' :
          inst.payment_method === 'money' ? 'Dinheiro' :
          inst.payment_method === 'card' ? 'Cartão' : inst.payment_method
        ) : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `recebiveis_unidade_${selectedUnitId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('success', 'Relatório CSV exportado com sucesso!');
  };

  const calculateOverdueFees = (inst: Installment) => {
    const dueDate = new Date(inst.due_date + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDue = dueDate < today;
    const isLate = inst.status === 'overdue' || inst.status === 'blocked' || (inst.status === 'pending' && isPastDue);
    if (!isLate) {
      return { multa: 0, juros: 0, total: inst.value, daysLate: 0, isLate: false };
    }
    const diffMs = today.getTime() - dueDate.getTime();
    const daysLate = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const monthsLate = daysLate / 30;
    const multa = inst.value * 0.02;
    const juros = inst.value * 0.01 * monthsLate;
    const total = inst.value + multa + juros;
    return { multa, juros, total, daysLate, isLate: true };
  };

  const customerGroups = useMemo(() => {
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
          displayedInstallments: [],
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

  const filteredGroups = useMemo(() => {
    const matchesDateFilter = (dueDateStr: string) => {
      if (dateFilter === 'all') return true;
      const dueDate = new Date(dueDateStr + 'T12:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'today') {
        return dueDate.getFullYear() === today.getFullYear() &&
               dueDate.getMonth() === today.getMonth() &&
               dueDate.getDate() === today.getDate();
      }
      
      if (dateFilter === 'week') {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const dueMs = dueDate.getTime();
        return dueMs >= today.getTime() && dueMs <= nextWeek.getTime();
      }
      
      if (dateFilter === 'month') {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
      }
      
      return true;
    };

    return customerGroups.map(group => {
      const matchingInstallments = group.installments.filter(inst => {
        const matchesDate = matchesDateFilter(inst.due_date);
        
        let matchesStatus = true;
        if (statusFilter === 'paid') {
          matchesStatus = inst.status === 'paid';
        } else if (statusFilter === 'overdue') {
          const fees = calculateOverdueFees(inst);
          matchesStatus = fees.isLate;
        } else if (statusFilter === 'blocked') {
          matchesStatus = inst.status === 'blocked';
        }

        return matchesDate && matchesStatus;
      });

      return {
        ...group,
        displayedInstallments: matchingInstallments
      };
    }).filter(group => {
      const matchesSearch = group.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'overdue' as any) {
        matchesTab = group.status === 'overdue' || group.status === 'blocked';
      }

      const hasMatchingInstallments = group.displayedInstallments.length > 0;

      return matchesSearch && matchesTab && hasMatchingInstallments;
    });
  }, [customerGroups, searchTerm, activeTab, statusFilter, dateFilter]);

  const totalReceivable = installments.reduce((acc, current) => acc + current.value, 0);
  const totalPaid = installments.filter(i => i.status === 'paid').reduce((acc, current) => acc + current.value, 0);
  const totalOverdue = installments.filter(i => i.status === 'overdue' || i.status === 'blocked').reduce((acc, current) => acc + current.value, 0);

  const toggleExpand = (customerId: string) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

  const handlePayment = (item: Installment) => {
    const fees = calculateOverdueFees(item);
    const isOverdue = fees.isLate;
    let selectedMethod: 'pix' | 'money' | 'card' = 'money';

    showModal({
      title: isOverdue ? 'Recebimento com Mora' : 'Confirmar Pagamento',
      children: (
        <PaymentConfirmationContent
          item={item}
          fees={fees}
          isOverdue={isOverdue}
          onMethodChange={(method) => {
            selectedMethod = method;
          }}
        />
      ),
      confirmText: isOverdue ? `Receber R$ ${fees.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Confirmar Recebimento',
      onConfirm: async () => {
        try {
          await markAsPaid(item.id, isOverdue ? fees.total : undefined, selectedMethod);
          showNotification('success', 'Pagamento Confirmado');
          if (selectedUnitId) {
            await fetchActiveShift(selectedUnitId);
            await fetchTransactions(selectedUnitId);
          }
          hideModal();
        } catch (error: any) {
          showNotification('error', error?.response?.data?.error || 'Erro no Servidor');
        }
      }
    });
  };

  const handleRevertPayment = (item: Installment) => {
    showModal({
      title: 'Confirmar Estorno de Pagamento',
      type: 'warning',
      children: (
        <div className="space-y-4">
          <p className="text-sm">Tem certeza de que deseja estornar o pagamento da parcela <span className="text-white font-black">{item.number}/{item.total}</span> de <span className="text-white font-black">{item.customer_name}</span>?</p>
          <p className="text-[10px] text-error font-black uppercase tracking-widest bg-error/10 p-3 rounded-xl border border-error/20">
            ⚠️ Esta ação alterará o status da parcela de volta para "Pendente" (ou "Atrasado" se já estiver vencida) e removerá o registro da data e forma de pagamento.
          </p>
        </div>
      ),
      confirmText: 'Estornar Pagamento',
      onConfirm: async () => {
        try {
          await revertPayment(item.id);
          showNotification('success', 'Pagamento Estornado', 'A parcela voltou ao estado pendente.');
          if (selectedUnitId) {
            await fetchActiveShift(selectedUnitId);
            await fetchTransactions(selectedUnitId);
          }
          hideModal();
        } catch (error) {
          showNotification('error', 'Erro ao estornar pagamento');
        }
      }
    });
  };

  const handleWhatsApp = async (item: Installment) => {
    setSendingWa(item.id);
    try {
      const res = await fetch('/api/billing/send-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId: item.id })
      });

      if (res.ok) {
        showNotification('success', 'Cobrança Enviada!', `Notificação enviada para o n8n para cobrar ${item.customer_name}.`);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification('error', 'Falha ao Enviar', `Erro: ${errData.error || 'Erro no n8n'}`);
      }
    } catch (err: any) {
      showNotification('error', 'Erro de Conexão', err?.message || 'Não foi possível conectar ao servidor.');
    } finally {
      setSendingWa(null);
    }
  };

  // Cash flow metrics
  const totalStockCostValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + (Number(item.cost_price || 0) * (item.stock_quantity || 0)), 0);
  }, [inventory]);

  const flowInflows = useMemo(() => {
    return transactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const flowOutflows = useMemo(() => {
    return transactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const netBalance = flowInflows - flowOutflows;

  const handleOpenCashShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return;
    try {
      await openShift(selectedUnitId, profile?.id || '', openingBalance);
      showNotification('success', 'Caixa Aberto!', 'O caixa desta unidade foi aberto com sucesso.');
      setOpeningBalance(0);
    } catch (err: any) {
      showNotification('error', 'Erro ao abrir caixa', err?.response?.data?.error || err.message);
    }
  };

  const handleCloseCashShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    try {
      await closeShift(activeShift.id, profile?.id || '', closingCash, closingNotes);
      showNotification('success', 'Caixa Fechado com Sucesso!');
      setClosingCash(0);
      setClosingNotes('');
      fetchShiftHistory(selectedUnitId);
      fetchActiveShift(selectedUnitId);
    } catch (err: any) {
      showNotification('error', 'Erro ao fechar caixa', err?.response?.data?.error || err.message);
    }
  };

  const handleAddManualTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return;
    if (!manualTx.amount || Number(manualTx.amount) <= 0) {
      showNotification('error', 'Valor inválido');
      return;
    }
    try {
      await addTransaction({
        unit_id: selectedUnitId,
        type: manualTx.type,
        category: manualTx.category,
        amount: Number(manualTx.amount),
        payment_method: manualTx.payment_method,
        description: manualTx.description,
        created_by: profile?.id || ''
      });
      showNotification('success', 'Lançamento inserido com sucesso!');
      setIsManualTxOpen(false);
      setManualTx({
        type: 'outflow',
        category: 'outros',
        amount: '',
        payment_method: 'money',
        description: ''
      });
    } catch (err: any) {
      showNotification('error', 'Erro ao lançar', err?.response?.data?.error || err.message);
    }
  };

  // Shift printing layout/logic
  const printShiftClosure = (shift: CashShift) => {
    const windowName = `print_shift_${shift.id}`;
    const printWindow = window.open('', windowName, 'width=800,height=600');
    if (!printWindow) return;

    const opName = shift.opened_by_profile?.full_name || 'Operador';
    const clName = shift.closed_by_profile?.full_name || shift.notes || '—';

    const content = `
      <html>
      <head>
        <title>Fechamento de Caixa</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 80mm;
            padding: 5px;
            font-size: 11px;
            color: #000;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 1px double #000; border-bottom: 1px double #000; height: 3px; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .header { font-size: 15px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          .signature-box { margin-top: 35px; text-align: center; }
          .sig-line { border-top: 1px solid #000; width: 80%; margin: 0 auto 5px auto; }
        </style>
      </head>
      <body>
        <div class="center header">MDR INFORMÁTICA</div>
        <div class="center bold">RESUMO DE FECHAMENTO DE CAIXA</div>
        <div class="divider"></div>
        <div class="row"><span>ID Turno:</span><span>#${shift.id.substring(0,8).toUpperCase()}</span></div>
        <div class="row"><span>Abertura:</span><span>${new Date(shift.opened_at).toLocaleDateString('pt-BR')} ${new Date(shift.opened_at).toLocaleTimeString('pt-BR')}</span></div>
        <div class="row"><span>Fechamento:</span><span>${shift.closed_at ? new Date(shift.closed_at).toLocaleDateString('pt-BR') : '—'} ${shift.closed_at ? new Date(shift.closed_at).toLocaleTimeString('pt-BR') : ''}</span></div>
        <div class="row"><span>Operador:</span><span>${opName}</span></div>
        <div class="divider"></div>
        <div class="row bold"><span>Fundo de Troco:</span><span>R$ ${Number(shift.opening_balance).toFixed(2)}</span></div>
        <div class="row"><span>Dinheiro Esperado:</span><span>R$ ${Number(shift.expected_cash).toFixed(2)}</span></div>
        <div class="row"><span>Dinheiro Declarado:</span><span>R$ ${Number(shift.closing_cash || 0).toFixed(2)}</span></div>
        <div class="row bold"><span>Diferença/Quebra:</span><span>R$ ${Number(shift.difference || 0).toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="row"><span>Meios Eletrônicos (PIX/Cartão):</span><span>R$ ${Number(shift.expected_digital).toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="center bold">Assinatura do Conferente</div>
        <div class="signature-box">
          <div class="sig-line"></div>
          <span>${clName}</span>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER E SELETOR DE UNIDADE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Painel Financeiro</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gestão Financeira & Caixa</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Unit Selector for Admins */}
          {isAdmin && units.length > 0 && (
            <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[200px] w-full md:w-auto">
              <Store size={16} className="text-primary shrink-0" />
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-8 font-display font-black uppercase tracking-wider"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right center',
                }}
              >
                {units.map(u => (
                  <option key={u.id} value={u.id} className="bg-[#0f0f1a] text-white">{u.name}</option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'receivables' && (
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer w-full md:w-auto"
            >
              <Download size={16} />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex p-1 bg-white/[0.02] rounded-[24px] mb-8 gap-1 border border-white/5 max-w-lg">
        <button 
          onClick={() => handleTabChange('receivables')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'receivables' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-on-surface-variant hover:text-white'}`}
        >
          Recebíveis
        </button>
        <button 
          onClick={() => handleTabChange('cash_flow')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cash_flow' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-on-surface-variant hover:text-white'}`}
        >
          Fluxo de Caixa
        </button>
        <button 
          onClick={() => handleTabChange('cash_control')}
          className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cash_control' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-on-surface-variant hover:text-white'}`}
        >
          Controle de Caixa
        </button>
      </div>

      {/* RENDER CONTEÚDO DA ABA SELECIONADA */}
      {activeTab === 'receivables' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {[
              { id: 'all', label: 'Total a Receber', value: `R$ ${totalReceivable.toLocaleString('pt-BR')}`, icon: ArrowUpRight, color: 'text-primary', activeBorder: 'border-primary/50 shadow-primary/5', activeBar: 'bg-primary' },
              { id: 'paid', label: 'Recebido (Total)', value: `R$ ${totalPaid.toLocaleString('pt-BR')}`, icon: CheckCircle2, color: 'text-success', activeBorder: 'border-success/50 shadow-success/5', activeBar: 'bg-success' },
              { id: 'overdue', label: 'Em Atraso', value: `R$ ${totalOverdue.toLocaleString('pt-BR')}`, icon: AlertCircle, color: 'text-error', activeBorder: 'border-error/50 shadow-error/5', activeBar: 'bg-error' },
              { id: 'blocked', label: 'Bloqueados', value: installments.filter(i => i.status === 'blocked').length.toString(), icon: ShieldAlert, color: 'text-error', activeBorder: 'border-red-500/50 shadow-red-500/5', activeBar: 'bg-red-500' },
            ].map((stat, idx) => {
              const isActive = statusFilter === stat.id;
              return (
                <div 
                  key={idx} 
                  onClick={() => setStatusFilter(stat.id as any)}
                  className={`bg-white/[0.02] p-6 rounded-[32px] border relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.04] ${
                    isActive ? stat.activeBorder : 'border-white/5'
                  }`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stat.activeBar}`} />
                  )}
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color} mb-4 border border-white/10`}>
                    <stat.icon size={20} />
                  </div>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
                  <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{stat.value}</h3>
                </div>
              );
            })}
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
              
              {/* Period Filter Dropdown */}
              <div className="relative flex items-center gap-2 bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3 min-w-[220px]">
                <Calendar size={16} className="text-on-surface-variant shrink-0" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-transparent text-xs text-white outline-none w-full cursor-pointer appearance-none pr-8 font-display font-black uppercase tracking-wider"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                  }}
                >
                  <option value="all" className="bg-[#0f0f1a] text-white">Todos os Períodos</option>
                  <option value="today" className="bg-[#0f0f1a] text-white">Vencendo Hoje</option>
                  <option value="week" className="bg-[#0f0f1a] text-white">Esta Semana</option>
                  <option value="month" className="bg-[#0f0f1a] text-white">Este Mês</option>
                </select>
              </div>
            </div>

            {/* Customer Cards List */}
            <div className="p-6 space-y-4">
              {filteredGroups.length === 0 ? (
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

                  const progressBarColor = 
                    group.status === 'blocked' ? 'bg-gradient-to-r from-red-600 to-red-400' :
                    group.status === 'overdue' ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                    'bg-gradient-to-r from-primary via-indigo-500 to-green-500';

                  return (
                    <div 
                      key={group.customerId}
                      className={`bg-white/[0.01] hover:bg-white/[0.03] border rounded-[28px] transition-all duration-300 overflow-hidden ${
                        group.status === 'blocked' ? 'border-red-500/20 bg-red-500/[0.005] hover:bg-red-500/[0.01]' :
                        group.status === 'overdue' ? 'border-orange-500/20 bg-orange-500/[0.005] hover:bg-orange-500/[0.01]' :
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
                              className={`h-full rounded-full ${progressBarColor}`}
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
                                    {group.displayedInstallments.map((inst) => {
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
                                            <div className="flex flex-col gap-1 items-start">
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
                                              {inst.status === 'paid' && inst.paid_at && (
                                                <p className="text-[8px] text-on-surface-variant font-mono mt-0.5">
                                                  {formatPaymentDate(inst.paid_at)}
                                                  {inst.payment_method && ` via ${
                                                    inst.payment_method === 'pix' ? 'PIX' :
                                                    inst.payment_method === 'money' ? 'Dinheiro' :
                                                    inst.payment_method === 'card' ? 'Cartão' : inst.payment_method
                                                  }`}
                                                </p>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-4 text-right pr-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                              {inst.status !== 'paid' && (
                                                <>
                                                  {hasPermission(profile, 'Financeiro - Registrar Pagamento') && (
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
                                                  )}
                                                </>
                                              )}
                                              {inst.status === 'paid' && hasPermission(profile, 'Financeiro - Registrar Pagamento') && (
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRevertPayment(inst);
                                                  }}
                                                  className="p-1.5 bg-error/10 hover:bg-error/20 text-error rounded-lg transition-all border border-error/20"
                                                  title="Estornar Pagamento"
                                                >
                                                  <RotateCcw size={14} />
                                                </button>
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
        </>
      )}

      {/* ABA 2: FLUXO DE CAIXA */}
      {activeTab === 'cash_flow' && (
        <div className="space-y-8">
          {/* Dashboard de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-white/10">
                <TrendingUp size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Saldo Líquido</p>
              <h3 className={`text-2xl font-black font-mono leading-none tracking-tight ${netBalance >= 0 ? 'text-green-400' : 'text-error'}`}>
                R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            
            <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success mb-4 border border-white/10">
                <ArrowUpRight size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Entradas</p>
              <h3 className="text-2xl font-black font-mono text-white leading-none tracking-tight">
                R$ {flowInflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error mb-4 border border-white/10">
                <ArrowDownRight size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Saídas / Despesas</p>
              <h3 className="text-2xl font-black font-mono text-white leading-none tracking-tight">
                R$ {flowOutflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning mb-4 border border-white/10">
                <Smartphone size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Custo do Estoque</p>
              <h3 className="text-2xl font-black font-mono text-white leading-none tracking-tight">
                R$ {totalStockCostValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          {/* Seção Lançamento Rápido & Filtro de Fluxo */}
          <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} /> Registro de Transações
              </h3>
              <button
                onClick={() => setIsManualTxOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary font-black uppercase tracking-widest text-[9px] px-5 py-3.5 rounded-2xl hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Plus size={14} /> Novo Lançamento Manual
              </button>
            </div>

            {/* Listagem de Transações do Fluxo de Caixa */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                    <th className="pb-3 pl-4">Data/Hora</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Categoria</th>
                    <th className="pb-3">Descrição</th>
                    <th className="pb-3">Meio Pagto</th>
                    <th className="pb-3 text-right pr-4">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-on-surface-variant/60 text-[10px] uppercase font-black tracking-widest">Nenhuma movimentação lançada.</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 pl-4 text-[10px] font-mono text-on-surface-variant">
                          {new Date(tx.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider ${tx.type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.type === 'inflow' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {tx.type === 'inflow' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="py-4 text-xs font-bold text-white uppercase tracking-wider">
                          {tx.category === 'installment' ? 'Contrato' :
                           tx.category === 'sale' ? 'Venda PDV' :
                           tx.category === 'suprimento' ? 'Suprimento' :
                           tx.category === 'sangria' ? 'Sangria' :
                           tx.category === 'despesa_luz' ? 'Despesa Luz' :
                           tx.category === 'despesa_aluguel' ? 'Despesa Aluguel' : 'Outros'}
                        </td>
                        <td className="py-4 text-xs text-on-surface-variant max-w-[200px] truncate" title={tx.description}>
                          {tx.description || '—'}
                        </td>
                        <td className="py-4 text-[10px] font-black uppercase text-on-surface-variant">
                          {tx.payment_method === 'pix' ? 'PIX' :
                           tx.payment_method === 'money' ? 'Dinheiro' :
                           tx.payment_method === 'card' ? 'Cartão' : 'Conta/Banco'}
                        </td>
                        <td className={`py-4 text-right pr-4 font-mono font-black text-xs ${tx.type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'inflow' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: CONTROLE DE CAIXA */}
      {activeTab === 'cash_control' && (
        <div className="space-y-8">
          
          {/* Estado do Caixa Ativo */}
          <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 p-6 space-y-6">
            {!activeShift ? (
              <div className="text-center py-10 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-error mx-auto">
                  <Lock size={32} />
                </div>
                <div>
                  <h3 className="text-md font-black uppercase tracking-wider text-white">Caixa Fechado</h3>
                  <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                    Para iniciar o expediente e registrar suprimentos, sangrias ou recebimentos em espécie física, abra o caixa desta unidade.
                  </p>
                </div>
                
                <form onSubmit={handleOpenCashShift} className="pt-4 border-t border-white/5 space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Saldo Inicial / Fundo de Troco (R$)</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        required
                        value={openingBalance || ''}
                        onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#121214] border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Unlock size={14} /> Abrir Caixa da Unidade
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Lado Esquerdo: Info do Caixa Aberto */}
                <div className="lg:col-span-1 space-y-4 border-b lg:border-b-0 lg:border-r border-white/5 pb-6 lg:pb-0 lg:pr-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center text-success">
                      <Unlock size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm uppercase text-white leading-none">Caixa Aberto</h4>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-mono mt-1">
                        Início: {new Date(activeShift.opened_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant uppercase tracking-widest font-black text-[9px]">Operador</span>
                      <span className="text-white font-bold">{activeShift.opened_by_profile?.full_name || 'Operador'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant uppercase tracking-widest font-black text-[9px]">Fundo de Troco</span>
                      <span className="text-white font-mono font-bold">R$ {Number(activeShift.opening_balance).toFixed(2)}</span>
                    </div>
                    {/* Expected digital and expected cash details only shown to Admin for blind closure protection */}
                    {isAdmin && (
                      <>
                        <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                          <span className="text-primary uppercase tracking-widest font-black text-[9px]">PIX/Cartões (Banco)</span>
                          <span className="text-primary font-mono font-bold">R$ {Number(activeShift.expected_digital).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-success uppercase tracking-widest font-black text-[9px]">Dinheiro Físico (Gaveta)</span>
                          <span className="text-success font-mono font-bold">R$ {Number(activeShift.expected_cash).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Admin Visual Verification Shortcut */}
                  {isAdmin && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAdminViewShiftSecret(!isAdminViewShiftSecret)}
                        className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl text-[9px] font-black uppercase text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                      >
                        {isAdminViewShiftSecret ? (
                          <><EyeOff size={12} /> Ocultar Auditoria do Caixa</>
                        ) : (
                          <><Eye size={12} /> Revelar Auditoria do Caixa</>
                        )}
                      </button>
                    </div>
                  )}

                  {isAdmin && isAdminViewShiftSecret && (
                    <div className="p-4 bg-primary/10 border border-primary/20 text-primary-light rounded-2xl text-[10px] space-y-1.5 animate-in slide-in-from-top duration-300">
                      <p className="font-bold uppercase tracking-wider text-[9px]">DADOS DE CONCILIAÇÃO (AUDIT ADMIN)</p>
                      <p>Troco Inicial: R$ {Number(activeShift.opening_balance).toFixed(2)}</p>
                      <p>Recebido em Dinheiro: R$ {Number(activeShift.expected_cash - activeShift.opening_balance).toFixed(2)}</p>
                      <p className="font-bold border-t border-primary/20 pt-1 mt-1">Total Físico Esperado: R$ {Number(activeShift.expected_cash).toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {/* Lado Direito: Formulário de Fechamento de Caixa Cego */}
                <form onSubmit={handleCloseCashShift} className="lg:col-span-2 space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 pl-1">
                    <Lock size={14} /> Procedimento de Fechamento Cego
                  </h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Efetue a contagem física das cédulas e moedas na gaveta e declare o valor exato abaixo. O sistema calculará divergências em segundo plano.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Dinheiro Físico Contado na Gaveta (R$)</label>
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          required
                          value={closingCash || ''}
                          onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Observações do Fechamento</label>
                      <input
                        type="text"
                        placeholder="Ex: Tudo correto, ou sangria de fechamento realizada."
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Homologar Fechamento de Caixa
                  </button>
                </form>

              </div>
            )}
          </div>

          {/* Histórico de Fechamentos Recentes */}
          <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 p-6 space-y-6">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <History size={16} /> Histórico de Fechamentos de Caixa
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                    <th className="pb-3 pl-4">Fechamento</th>
                    <th className="pb-3">Operador</th>
                    <th className="pb-3 text-right">Troco Inicial</th>
                    <th className="pb-3 text-right">Físico Esperado</th>
                    <th className="pb-3 text-right">Físico Declarado</th>
                    <th className="pb-3 text-right">Quebra / Sobra</th>
                    <th className="pb-3 text-right pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {shiftHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-on-surface-variant/60 text-[10px] uppercase font-black tracking-widest">Nenhum fechamento registrado no histórico.</td>
                    </tr>
                  ) : (
                    shiftHistory.map((shift) => {
                      const hasDiscrepancy = Number(shift.difference || 0) !== 0;
                      return (
                        <tr key={shift.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 pl-4 text-[10px] font-mono text-on-surface-variant">
                            {shift.closed_at ? new Date(shift.closed_at).toLocaleString('pt-BR') : '—'}
                          </td>
                          <td className="py-4 text-xs font-bold text-white uppercase">
                            {shift.opened_by_profile?.full_name || 'Operador'}
                          </td>
                          <td className="py-4 text-right font-mono text-xs text-white">
                            R$ {Number(shift.opening_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 text-right font-mono text-xs text-on-surface-variant">
                            R$ {Number(shift.expected_cash).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 text-right font-mono text-xs text-white">
                            R$ {Number(shift.closing_cash || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-4 text-right font-mono text-xs font-black ${
                            hasDiscrepancy ? 'text-error animate-pulse' : 'text-green-400'
                          }`}>
                            R$ {Number(shift.difference || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {hasDiscrepancy && ' ⚠️'}
                          </td>
                          <td className="py-4 text-right pr-4">
                            <button
                              type="button"
                              onClick={() => printShiftClosure(shift)}
                              title="Imprimir Cupom de Fechamento"
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 cursor-pointer"
                            >
                              <Printer size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

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

      {/* MANUAL TRANSACTION MODAL */}
      <AnimatePresence>
        {isManualTxOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsManualTxOpen(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#0f0f1a] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Lançamento Manual</h2>
                  <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest opacity-60 mt-0.5">Fluxo de Caixa</p>
                </div>
                <button onClick={() => setIsManualTxOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddManualTxSubmit} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Tipo Movimentação</label>
                    <select
                      value={manualTx.type}
                      onChange={(e) => setManualTx(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none"
                    >
                      <option value="inflow">🟢 Entrada (Reforço)</option>
                      <option value="outflow">🔴 Saída (Despesa/Sangria)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Categoria</label>
                    <select
                      value={manualTx.category}
                      onChange={(e) => setManualTx(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none"
                    >
                      <option value="suprimento">Suprimento</option>
                      <option value="sangria">Sangria</option>
                      <option value="despesa_luz">Conta de Luz</option>
                      <option value="despesa_aluguel">Aluguel</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        required
                        value={manualTx.amount}
                        onChange={(e) => setManualTx(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full bg-[#121214] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Meio Pagto</label>
                    <select
                      value={manualTx.payment_method}
                      onChange={(e) => setManualTx(prev => ({ ...prev, payment_method: e.target.value as any }))}
                      className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none"
                    >
                      <option value="money">Dinheiro (Gaveta)</option>
                      <option value="pix">PIX</option>
                      <option value="card">Cartão</option>
                      <option value="bank">Banco/Conta</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Descrição / Justificativa</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Descreva o motivo do lançamento (Ex: Troco de abertura de caixa, ou pagamento de lanche da equipe)."
                    value={manualTx.description}
                    onChange={(e) => setManualTx(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Save size={14} /> Registrar Lançamento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
