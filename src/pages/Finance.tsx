import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, CreditCard, AlertCircle, CheckCircle2,
  Search, Download, Calendar, DollarSign, ArrowUpRight,
  ArrowDownRight, Smartphone, ShieldAlert, MessageSquare,
  FileText, Plus, Loader2, ChevronDown, ChevronUp, QrCode,
  X, Copy, Check, Printer, Send, RotateCcw, Lock, Unlock, AlertTriangle, Eye, EyeOff,
  Store, Save, History, Pencil, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, Installment } from '../store/useFinanceStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { useCashStore, CashShift, CashTransaction } from '../store/useCashStore';
import { formatCPF, formatPhone } from '../lib/utils';
import PixBoletoPrint from '../components/finance/PixBoletoPrint';

// PIX defaults — overridden by unit settings
const DEFAULT_PIX_KEY = '00020126360014BR.GOV.BCB.PIX0114+55489990358545204000053039865802BR5901N6001C62160512MaykondaRosa6304AC2B';
const DEFAULT_PIX_NAME = 'Maykon da Rosa';
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
    } catch { }
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
        className="relative bg-[#0f0f1a] border border-white/10 rounded-[32px] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Sticky at top) */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
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

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Amount */}
          {item && (
            <div className="px-6 pt-6 pb-0">
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

              {/* QR Code — visual representation */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl flex items-center justify-center" style={{ width: 160, height: 160 }}>
                  <img src="/Pix.png" alt="PIX QR Code" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* PIX Key */}
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-2">Chave PIX Copia-e-Cola ({pixKey ? 'Configurada' : 'não configurada'})</p>
                <div className="flex flex-col gap-2">
                  <code className="text-xs text-white font-mono break-all select-all bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">{pixKey || 'Configure nas Configurações da loja'}</code>
                  {pixKey && (
                    <button
                      onClick={copyPix}
                      className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-[9px] font-black text-primary uppercase tracking-widest transition-all"
                    >
                      {copiedPix ? <Check size={12} /> : <Copy size={12} />}
                      {copiedPix ? 'Código Copiado!' : 'Copiar Pix Copia-e-Cola'}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[9px] text-on-surface-variant text-center">
                Beneficiário: <strong className="text-white">{pixName}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Actions (Sticky at bottom) */}
        <div className="p-6 border-t border-white/10 bg-[#0f0f1a] shrink-0">
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
  const [amountPaid, setAmountPaid] = useState<string>('');

  useEffect(() => {
    onMethodChange(method);
  }, [method]);

  const totalToReceive = isOverdue ? fees.total : item.value;
  const change = Math.max(0, Number(amountPaid) - totalToReceive);

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
                className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${active
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

      {/* Change Calculator (Only for Money/Cash) */}
      {method === 'money' && (
        <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">Valor Recebido (Dinheiro)</label>
            <input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="R$ 0,00"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white font-mono"
            />
          </div>
          {Number(amountPaid) > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">Troco a devolver</span>
              <span className="text-sm font-black text-success font-mono">
                R$ {change.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Finance() {
  const navigate = useNavigate();
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
  const { fetchUserPermissions } = usePermissionStore();

  // Cashier stores and states (only what's needed for shift payment validations)
  const {
    activeShift, fetchActiveShift, fetchTransactions
  } = useCashStore();

  const isAdmin = profile?.role === 'admin';
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

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
    }
  }, [selectedUnitId, fetchInstallments, fetchActiveShift, fetchTransactions]);

  const formatPaymentDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
      return new Date(cleanStr).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const pixKey = unit?.pix_key || DEFAULT_PIX_KEY;
  const pixName = DEFAULT_PIX_NAME;
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
      const hasMatchingInstallments = group.displayedInstallments.length > 0;
      return matchesSearch && hasMatchingInstallments;
    });
  }, [customerGroups, searchTerm, statusFilter, dateFilter]);

  const totalReceivable = installments.reduce((acc, current) => acc + current.value, 0);
  const totalPaid = installments.filter(i => i.status === 'paid').reduce((acc, current) => acc + current.value, 0);
  const totalOverdue = installments.filter(i => i.status === 'overdue' || i.status === 'blocked').reduce((acc, current) => acc + current.value, 0);

  const toggleExpand = (customerId: string) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

  const handlePayment = (item: Installment) => {
    if (!activeShift) {
      showNotification('error', 'Caixa fechado. Abra o caixa para receber pagamentos nesta unidade.');
      return;
    }
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

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">

      {/* HEADER E SELETOR DE UNIDADE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Recebíveis</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gestão de Parcelas e Recebimentos</p>
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
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer w-full md:w-auto"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* RENDER CONTEÚDO */}
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
                className={`bg-white/[0.02] p-6 rounded-[32px] border relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.04] ${isActive ? stat.activeBorder : 'border-white/5'}`}
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
                <option value="week" className="bg-[#0f0f1a] text-white">Vencendo nesta Semana</option>
                <option value="month" className="bg-[#0f0f1a] text-white">Vencendo neste Mês</option>
              </select>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-20">
                <AlertCircle className="mx-auto text-on-surface-variant opacity-40 mb-4 animate-bounce" size={40} />
                <h3 className="text-base font-black uppercase tracking-wider text-white">Nenhum recebível</h3>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto mt-2 leading-relaxed">
                  Não encontramos parcelas ou contratos correspondentes aos filtros selecionados para esta filial.
                </p>
              </div>
            ) : (
              filteredGroups.map(group => {
                const isExpanded = expandedCustomerId === group.customerId;
                const paidPercent = group.totalCount > 0 ? (group.paidCount / group.totalCount) * 100 : 0;

                return (
                  <div key={group.customerId} className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden transition-all duration-300">
                    <div
                      onClick={() => toggleExpand(group.customerId)}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant font-display font-black text-sm uppercase">
                          {group.customerName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm uppercase text-white leading-none">{group.customerName}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${group.status === 'paid'
                              ? 'bg-success/10 border-success/20 text-success'
                              : group.status === 'blocked'
                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                : group.status === 'overdue'
                                  ? 'bg-error/10 border-error/20 text-error'
                                  : 'bg-warning/10 border-warning/20 text-warning'
                              }`}>
                              {group.status === 'paid' ? 'Em dia / Quitada' : group.status === 'blocked' ? 'Bloqueado' : group.status === 'overdue' ? 'Parcelas em Atraso' : 'Financeiro Pendente'}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              ({group.paidCount} de {group.totalCount} parcelas pagas)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Total Geral de Contrato</p>
                          <p className="text-sm font-black text-white font-mono">R$ {group.totalValue.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-error uppercase tracking-widest font-black mb-1">Valor Vencido</p>
                          <p className="text-sm font-black text-error font-mono">
                            {group.totalOverdue > 0 ? `R$ ${group.totalOverdue.toLocaleString('pt-BR')}` : 'R$ 0,00'}
                          </p>
                        </div>
                        <div className="p-1 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-on-surface-variant hover:text-white">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar under group */}
                    <div className="h-1 bg-white/5 w-full relative overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${group.status === 'paid' ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>

                    {/* Expansion area for individual installments */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-black/10"
                        >
                          <div className="p-5 border-t border-white/5">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                                    <th className="pb-3 pl-4">Nº Parcela</th>
                                    <th className="pb-3">Data de Vencimento</th>
                                    <th className="pb-3">Status Interno</th>
                                    <th className="pb-3 text-right">Valor Original</th>
                                    <th className="pb-3 text-right">Mora / Atualizado</th>
                                    <th className="pb-3 text-right pr-4">Ações Financeiras</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.displayedInstallments.map((inst) => {
                                    const fees = calculateOverdueFees(inst);
                                    return (
                                      <tr key={inst.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-all">
                                        <td className="py-4 pl-4 text-xs font-black text-white">
                                          Parcela {inst.number} de {inst.total}
                                        </td>
                                        <td className="py-4 text-xs font-mono text-on-surface-variant">
                                          {new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="py-4">
                                          {inst.status === 'paid' ? (
                                            <div className="flex flex-col">
                                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-success tracking-wider">
                                                <CheckCircle2 size={10} /> Pago
                                              </span>
                                              <span className="text-[8px] text-on-surface-variant mt-0.5">
                                                {formatPaymentDate(inst.paid_at)} via {inst.payment_method === 'money' ? 'Dinheiro' : inst.payment_method === 'pix' ? 'PIX' : 'Cartão'}
                                              </span>
                                            </div>
                                          ) : inst.status === 'blocked' ? (
                                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-red-400 tracking-wider">
                                              <Lock size={10} /> Aparelho Bloqueado
                                            </span>
                                          ) : fees.isLate ? (
                                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-error tracking-wider animate-pulse">
                                              <AlertTriangle size={10} /> Vencida (+{fees.daysLate}d)
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-warning tracking-wider">
                                              <AlertCircle size={10} /> Pendente
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-4 text-right font-mono text-xs text-on-surface-variant">
                                          R$ {inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className={`py-4 text-right font-mono text-xs font-black ${fees.isLate ? 'text-error' : 'text-white'}`}>
                                          R$ {fees.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-4 text-right pr-4">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {inst.status !== 'paid' ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handlePayment(inst)}
                                                  className="px-3 py-1.5 bg-success hover:scale-[1.03] text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                                                >
                                                  Receber
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setPixModalItem(inst)}
                                                  title="Gerar Cobrança QR Code"
                                                  className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 cursor-pointer"
                                                >
                                                  <QrCode size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={sendingWa === inst.id}
                                                  onClick={() => handleWhatsApp(inst)}
                                                  title="Enviar Link de Cobrança WhatsApp"
                                                  className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-all border border-green-500/20 cursor-pointer disabled:opacity-50"
                                                >
                                                  {sendingWa === inst.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                {isAdmin && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRevertPayment(inst)}
                                                    title="Estornar/Cancelar Recebimento"
                                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20 cursor-pointer"
                                                  >
                                                    <RotateCcw size={13} />
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => setPixModalItem(inst)}
                                                  title="Reimprimir Recibo"
                                                  className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 cursor-pointer"
                                                >
                                                  <Printer size={13} />
                                                </button>
                                              </>
                                            )}
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

      {/* Print Mount Point for A4 Pix Slip */}
      <div id="print-mount-point" className="hidden">
        {pixModalItem && (
          <PixBoletoPrint
            installments={[pixModalItem]}
            customer={{
              name: pixModalItem.customer_name || 'Cliente Sem Nome',
              cpf: pixModalItem.customer_cpf || '',
              phone: pixModalItem.customer_phone || '',
              address: pixModalItem.customer_address || ''
            }}
            unit={units.find(u => u.id === selectedUnitId) || unit || { name: pixName, cnpj: pixKey, phone: pixPhone }}
          />
        )}
      </div>

    </div>
  );
}
