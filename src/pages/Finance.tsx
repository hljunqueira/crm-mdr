import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useFinancialDashboardStore } from '../store/useFinancialDashboardStore';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { useCashStore, CashShift, CashTransaction } from '../store/useCashStore';
import { formatCPF, formatPhone, printElement, cn } from '../lib/utils';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const { syncAsaas, fetchAsaasDetails } = useFinanceStore();
  const [asaasDetails, setAsaasDetails] = useState<{
    barcode: string | null;
    pixPayload: string | null;
    pixImage: string | null;
    invoiceUrl: string | null;
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeAsaasTab, setActiveAsaasTab] = useState<'pix' | 'boleto'>('pix');
  const [copiedType, setCopiedType] = useState<'pix' | 'barcode' | null>(null);

  const handlePrint = () => {
    printElement('print-mount-point');
  };

  const hasAsaas = !!item?.asaas_invoice_url;

  useEffect(() => {
    if (item && hasAsaas) {
      setIsLoadingDetails(true);
      fetchAsaasDetails(item.id)
        .then((data) => {
          setAsaasDetails(data);
        })
        .catch((err) => {
          console.error('Error fetching details:', err);
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [item, hasAsaas, fetchAsaasDetails]);

  const handleCopy = (text: string, type: 'pix' | 'barcode') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-[#0f0f1a] border border-white/10 rounded-4xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
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

          {hasAsaas && item?.asaas_invoice_url ? (
            /* Asaas Webhook / Dynamic view */
            <div className="p-6 space-y-4">
              {isLoadingDetails ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs text-on-surface-variant">Carregando detalhes do pagamento...</p>
                </div>
              ) : asaasDetails ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                  {/* Tabs: Pix vs Boleto */}
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setActiveAsaasTab('pix')}
                      className={`flex-1 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all ${activeAsaasTab === 'pix' ? 'bg-white text-black' : 'text-on-surface-variant hover:text-white'}`}
                    >
                      Pagar via PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAsaasTab('boleto')}
                      className={`flex-1 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all ${activeAsaasTab === 'boleto' ? 'bg-white text-black' : 'text-on-surface-variant hover:text-white'}`}
                    >
                      Boleto Bancário
                    </button>
                  </div>

                  {activeAsaasTab === 'pix' ? (
                    <div className="text-center space-y-4">
                      {asaasDetails.pixImage ? (
                        <div className="bg-white p-3 rounded-2xl inline-block">
                          <img
                            src={`data:image/png;base64,${asaasDetails.pixImage}`}
                            className="w-44 h-44 mx-auto"
                            alt="Pix QR Code"
                          />
                        </div>
                      ) : (
                        <div className="py-8 text-xs text-on-surface-variant">QR Code não disponível para este ambiente</div>
                      )}
                      {asaasDetails.pixPayload && (
                        <div className="space-y-2">
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">Código Pix Copia e Cola</p>
                          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                            <span className="text-[10px] text-white font-mono break-all line-clamp-2 text-left flex-1 select-all">
                              {asaasDetails.pixPayload}
                            </span>
                            <button
                              onClick={() => handleCopy(asaasDetails.pixPayload || '', 'pix')}
                              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all shrink-0"
                              title="Copiar Pix"
                            >
                              {copiedType === 'pix' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {asaasDetails.barcode ? (
                        <div className="space-y-2">
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold text-center">Linha Digitável do Boleto</p>
                          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                            <span className="text-[10px] text-white font-mono break-all text-left flex-1 select-all">
                              {asaasDetails.barcode}
                            </span>
                            <button
                              onClick={() => handleCopy(asaasDetails.barcode || '', 'barcode')}
                              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all shrink-0"
                              title="Copiar Código de Barras"
                            >
                              {copiedType === 'barcode' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-on-surface-variant">Código de barras não disponível para este boleto</div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 text-center">
                    <a
                      href={item.asaas_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:underline"
                    >
                      Página da Fatura (Web) <ArrowUpRight size={12} />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto">
                    <FileText size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-white uppercase tracking-wider">Cobrança Registrada</p>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      Esta parcela está vinculada ao gateway. Clique abaixo para abrir o Boleto Bancário ou o Pix dinâmico no seu navegador.
                    </p>
                  </div>
                  <a
                    href={item.asaas_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                  >
                    Visualizar Boleto / Pix da MDR ↗
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* No Asaas invoice link (legacy or unsynced installment) */
            <div className="p-6 space-y-4 text-left">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-warning/10 border border-warning/20 rounded-2xl flex items-center justify-center text-warning mx-auto">
                  <AlertCircle size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">Sem Fatura Integrada</p>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    Esta parcela foi gerada de forma legada ou não foi integrada. Clique abaixo para gerar a cobrança no gateway da MDR.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSyncing || !item}
                  onClick={async () => {
                    if (!item) return;
                    setIsSyncing(true);
                    try {
                      await syncAsaas(item.id);
                    } catch (err) {
                      // error logged in store
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 w-full py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Gerando Cobrança...
                    </>
                  ) : (
                    <>
                      <QrCode size={14} />
                      Gerar Boleto / Pix da MDR
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions (Sticky at bottom) */}
        <div className="p-6 border-t border-white/10 bg-[#0f0f1a] shrink-0">
          {hasAsaas && item?.asaas_invoice_url ? (
            <button
              onClick={() => window.open(item.asaas_invoice_url, '_blank')}
              className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              Abrir no Navegador ↗
            </button>
          ) : (
            <button
              onClick={handlePrint}
              className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              Imprimir / Salvar PDF
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface CustomerGroup {
  id: string;
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
  onMethodChange,
  onValueChange
}: {
  item: Installment;
  fees: any;
  isOverdue: boolean;
  onMethodChange: (method: 'pix' | 'money' | 'card') => void;
  onValueChange: (value: number) => void;
}) {
  const [method, setMethod] = useState<'pix' | 'money' | 'card'>('money'); // Default to cash for retail shifts
  const [amountPaid, setAmountPaid] = useState<string>('');

  const dueDate = new Date(item.due_date + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isEarly = dueDate > today;
  const daysEarly = isEarly ? Math.max(0, Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  // Suggested discount: 8% per month (approx. 0.266% per day) pro-rata early payment discount
  const suggestedDiscount = isEarly ? Number((item.value * 0.08 / 30 * daysEarly).toFixed(2)) : 0;
  const [discount, setDiscount] = useState(suggestedDiscount);

  useEffect(() => {
    onMethodChange(method);
  }, [method]);

  const totalToReceive = isOverdue ? fees.total : Math.max(0, item.value - discount);

  useEffect(() => {
    onValueChange(totalToReceive);
  }, [discount, totalToReceive]);

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
          <>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-green-400">
                <span className="uppercase tracking-widest font-black">Desconto de Antecipação</span>
                <span className="font-mono font-black">- R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-xs pt-1 border-t border-white/5 mt-1">
              <span className="text-on-surface-variant uppercase tracking-widest font-black">Total a Receber</span>
              <span className="text-white font-mono font-black">R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
      </div>
      {isOverdue && (
        <p className="text-[10px] text-error font-black uppercase tracking-widest bg-error/10 p-3 rounded-xl border border-error/20">
          ⚠️ Multa e juros conforme contrato. Vencida há {fees.daysLate} dia(s).
        </p>
      )}

      {isEarly && !isOverdue && (
        <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">
              Desconto por Antecipação (R$) — {daysEarly} dia(s) antes
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={item.value}
              value={discount === 0 ? '' : discount}
              onChange={(e) => {
                const val = e.target.value;
                const numVal = val === '' ? 0 : Number(val);
                if (numVal >= 0 && numVal <= item.value) {
                  setDiscount(numVal);
                }
              }}
              placeholder={`Sugerido: R$ ${suggestedDiscount.toLocaleString('pt-BR')}`}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white font-mono"
            />
            <p className="text-[9px] text-on-surface-variant/80">
              O valor original da parcela é R$ {item.value.toFixed(2)}. Digite o valor do desconto concedido ao cliente.
            </p>
          </div>
        </div>
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

function BatchPaymentConfirmationContent({
  items,
  onMethodChange,
  onValueChange
}: {
  items: Installment[];
  onMethodChange: (method: 'pix' | 'money' | 'card') => void;
  onValueChange: (value: number) => void;
}) {
  const [method, setMethod] = useState<'pix' | 'money' | 'card'>('money');
  const [amountPaid, setAmountPaid] = useState<string>('');

  const totalOriginal = items.reduce((sum, item) => sum + item.value, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const suggestedDiscount = items.reduce((sum, item) => {
    const dueDate = new Date(item.due_date + 'T12:00:00');
    if (dueDate > today) {
      const daysEarly = Math.max(0, Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + Number((item.value * 0.08 / 30 * daysEarly).toFixed(2));
    }
    return sum;
  }, 0);

  const [discount, setDiscount] = useState(suggestedDiscount);

  useEffect(() => {
    onMethodChange(method);
  }, [method]);

  const totalToReceive = Math.max(0, totalOriginal - discount);

  useEffect(() => {
    onValueChange(totalToReceive);
  }, [discount, totalToReceive]);

  const change = Math.max(0, Number(amountPaid) - totalToReceive);

  return (
    <div className="space-y-4 text-xs text-left">
      <p className="text-xs">
        Liquidação antecipada de <span className="text-white font-black">{items.length} parcelas</span> de <span className="text-white font-black">{items[0]?.customer_name}</span>.
      </p>
      
      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-on-surface-variant uppercase tracking-widest font-black">Valor Original Total</span>
          <span className="text-white font-mono font-black">R$ {totalOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-xs text-green-400">
            <span className="uppercase tracking-widest font-black">Desconto de Liquidez</span>
            <span className="font-mono font-black">- R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between text-xs pt-2 border-t border-white/10 mt-1">
          <span className="text-white uppercase tracking-widest font-black">Total a Receber</span>
          <span className="text-white font-mono font-black text-sm">R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10 mt-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">
            Desconto de Liquidez Concedido (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={totalOriginal}
            value={discount === 0 ? '' : discount}
            onChange={(e) => {
              const val = e.target.value;
              const numVal = val === '' ? 0 : Number(val);
              if (numVal >= 0 && numVal <= totalOriginal) {
                setDiscount(numVal);
              }
            }}
            placeholder={`Sugerido: R$ ${suggestedDiscount.toLocaleString('pt-BR')}`}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white font-mono"
          />
          <p className="text-[9px] text-on-surface-variant/80">
            Digite o valor total do desconto concedido ao cliente para quitação antecipada destas parcelas.
          </p>
        </div>
      </div>

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
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'receivables' | 'caixas' | 'payable_cards') || 'receivables';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFinanceTab, setActiveFinanceTab] = useState<'receivables' | 'caixas' | 'payable_cards'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'caixas' || tabParam === 'receivables' || tabParam === 'payable_cards') {
      setActiveFinanceTab(tabParam);
    }
  }, [searchParams]);
  const [cashierSummary, setCashierSummary] = useState<any>(null);
  const [cashierTransfers, setCashierTransfers] = useState<any[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [transferDescInput, setTransferDescInput] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { 
    bills, 
    forecast, 
    monthlyReport,
    fetchDashboardData, 
    createBill, 
    updateBill, 
    deleteBill, 
    toggleBillPayment, 
    saveForecast 
  } = useFinancialDashboardStore();

  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [showPaidBills, setShowPaidBills] = useState<boolean>(false);

  const filteredBills = useMemo(() => {
    return bills
      .filter(bill => {
        const dayMatches = selectedDay === 'all' || bill.day === Number(selectedDay);
        const paidMatches = showPaidBills ? true : !bill.is_paid;
        return dayMatches && paidMatches;
      })
      .sort((a, b) => a.day - b.day);
  }, [bills, selectedDay, showPaidBills]);

  const dayOpenValue = useMemo(() => {
    if (selectedDay === 'all') return 0;
    return bills
      .filter(b => b.day === Number(selectedDay) && !b.is_paid)
      .reduce((sum, b) => sum + Number(b.value), 0);
  }, [bills, selectedDay]);

  const monthlyProjection = useMemo(() => {
    const projection = [];
    const now = new Date();
    let currentMonth = now.getMonth() + 1;
    let currentYear = now.getFullYear();

    for (let i = 0; i < 12; i++) {
      let totalForMonth = 0;
      for (const bill of bills) {
        const elapsedMonths = (currentYear - bill.start_year) * 12 + (currentMonth - bill.start_month);
        const currentInstallment = elapsedMonths + 1;
        if (currentInstallment >= 1 && currentInstallment <= bill.total_installments) {
          totalForMonth += Number(bill.value);
        }
      }

      projection.push({
        monthLabel: new Date(currentYear, currentMonth - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase(),
        amount: totalForMonth
      });

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    return projection;
  }, [bills]);

  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [billFormData, setBillFormData] = useState({
    day: 5,
    description: '',
    start_month: new Date().getMonth() + 1,
    start_year: new Date().getFullYear(),
    total_installments: 12,
    value: 0,
    category: 'store' as 'store' | 'personal'
  });

  const [forecastForm, setForecastForm] = useState({
    store_1_forecast: 0,
    store_2_forecast: 0,
    fixed_store_expenses: 0,
    fixed_personal_expenses: 0,
    card_payments_inflow: 0
  });

  const handleOpenBillModal = (bill?: any) => {
    if (bill) {
      setEditingBill(bill);
      setBillFormData({
        day: bill.day,
        description: bill.description,
        start_month: bill.start_month,
        start_year: bill.start_year,
        total_installments: bill.total_installments,
        value: bill.value,
        category: bill.category
      });
    } else {
      setEditingBill(null);
      setBillFormData({
        day: 5,
        description: '',
        start_month: selectedMonth,
        start_year: selectedYear,
        total_installments: 12,
        value: 0,
        category: 'store'
      });
    }
    setIsBillModalOpen(true);
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBill) {
        await updateBill(editingBill.id, billFormData);
        showNotification('success', 'Conta de cartão atualizada com sucesso!');
      } else {
        const targetUnitId = selectedUnitId === 'all' ? units[0]?.id : selectedUnitId;
        if (!targetUnitId) {
          showNotification('error', 'Erro', 'Selecione uma unidade para criar a conta.');
          return;
        }
        await createBill({ ...billFormData, unit_id: targetUnitId });
        showNotification('success', 'Conta de cartão inserida com sucesso!');
      }
      setIsBillModalOpen(false);
      fetchDashboardData(selectedMonth, selectedYear, selectedUnitId);
    } catch (err) {
      showNotification('error', 'Erro', 'Não foi possível salvar a conta de cartão.');
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta de cartão?')) {
      try {
        await deleteBill(id);
        showNotification('success', 'Conta de cartão excluída.');
        fetchDashboardData(selectedMonth, selectedYear, selectedUnitId);
      } catch (err) {
        showNotification('error', 'Erro', 'Falha ao excluir conta.');
      }
    }
  };

  const handleSaveForecast = async () => {
    try {
      await saveForecast({
        ...forecastForm,
        month: selectedMonth,
        year: selectedYear
      });
      showNotification('success', 'Previsões e relatórios salvos com sucesso!');
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao salvar as previsões financeiras.');
    }
  };
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [pixModalItem, setPixModalItem] = useState<Installment | null | undefined>(undefined); // undefined = closed
  const [sendingWa, setSendingWa] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'overdue' | 'blocked'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedInstIds, setSelectedInstIds] = useState<string[]>([]);

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
      if (selectedUnitId !== 'all') {
        fetchActiveShift(selectedUnitId);
        fetchTransactions(selectedUnitId);
      }
    }
  }, [selectedUnitId, fetchInstallments, fetchActiveShift, fetchTransactions]);

  useEffect(() => {
    if (selectedUnitId && activeFinanceTab === 'payable_cards') {
      fetchDashboardData(selectedMonth, selectedYear, selectedUnitId);
    }
  }, [selectedMonth, selectedYear, selectedUnitId, activeFinanceTab, fetchDashboardData]);

  const fetchCashierData = async () => {
    try {
      const res = await fetch(`/api/cashier/summary${selectedUnitId && selectedUnitId !== 'all' ? `?storeId=${selectedUnitId}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setCashierSummary(data);
        setCashierTransfers(data.recentTransfers || []);
      }
    } catch (e) {
      console.warn('Erro ao carregar resumo dos caixas:', e);
    }
  };

  useEffect(() => {
    fetchCashierData();
  }, [selectedUnitId, activeFinanceTab]);

  const handleExecuteTransfer = async () => {
    const numAmount = Number(transferAmountInput);
    if (!numAmount || numAmount <= 0) {
      showNotification('error', 'Informe um valor de repasse válido maior que zero.');
      return;
    }
    if (cashierSummary?.financeira?.balance && numAmount > cashierSummary.financeira.balance) {
      showNotification('error', 'Saldo no Caixa Financeira insuficiente para este repasse.');
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const res = await fetch('/api/cashier/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          description: transferDescInput || 'Repasse de valores da Financeira para o Caixa Loja',
          storeId: selectedUnitId !== 'all' ? selectedUnitId : null,
          transferredBy: profile?.id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', 'Repasse Concluído!', data.message);
        setIsTransferModalOpen(false);
        setTransferAmountInput('');
        setTransferDescInput('');
        fetchCashierData();
      } else {
        showNotification('error', 'Falha no Repasse', data.error || 'Erro ao processar transferência.');
      }
    } catch (err: any) {
      showNotification('error', 'Erro de Conexão', err.message);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  useEffect(() => {
    if (forecast) {
      setForecastForm({
        store_1_forecast: forecast.store_1_forecast || 0,
        store_2_forecast: forecast.store_2_forecast || 0,
        fixed_store_expenses: forecast.fixed_store_expenses || 0,
        fixed_personal_expenses: forecast.fixed_personal_expenses || 0,
        card_payments_inflow: forecast.card_payments_inflow || 0
      });
    } else {
      setForecastForm({
        store_1_forecast: 0,
        store_2_forecast: 0,
        fixed_store_expenses: 0,
        fixed_personal_expenses: 0,
        card_payments_inflow: 0
      });
    }
  }, [forecast]);

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
      const groupKey = inst.sale_id || inst.customer_id || 'unknown';
      const custId = inst.customer_id || 'unknown';
      let custName = inst.customer_name || 'Cliente Sem Nome';

      if (inst.sale_id) {
        const shortSaleId = inst.sale_id.slice(0, 8);
        const deviceLabel = inst.device_model ? ` - ${inst.device_model}` : '';
        custName = `${custName}${deviceLabel} (#${shortSaleId})`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
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

      const group = groups[groupKey];
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

      if (dateFilter === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const dueMs = dueDate.getTime();
        const start = customStartDate ? new Date(customStartDate + 'T00:00:00').getTime() : 0;
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59').getTime() : Infinity;
        return dueMs >= start && dueMs <= end;
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
        } else if (statusFilter === 'all') {
          matchesStatus = inst.status !== 'paid'; // Exclude paid installments under Total a Receber tab
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
  }, [customerGroups, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate]);

  const dateFilteredInstallments = useMemo(() => {
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

      if (dateFilter === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const dueMs = dueDate.getTime();
        const start = customStartDate ? new Date(customStartDate + 'T00:00:00').getTime() : 0;
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59').getTime() : Infinity;
        return dueMs >= start && dueMs <= end;
      }

      return true;
    };

    return installments.filter(inst => matchesDateFilter(inst.due_date));
  }, [installments, dateFilter, customStartDate, customEndDate]);

  const totalReceivable = useMemo(() => dateFilteredInstallments.filter(i => i.status !== 'paid').reduce((acc, current) => acc + current.value, 0), [dateFilteredInstallments]);
  const totalPaid = useMemo(() => dateFilteredInstallments.filter(i => i.status === 'paid').reduce((acc, current) => acc + current.value, 0), [dateFilteredInstallments]);
  const totalOverdue = useMemo(() => dateFilteredInstallments.filter(i => i.status === 'overdue' || i.status === 'blocked').reduce((acc, current) => acc + current.value, 0), [dateFilteredInstallments]);

  const toggleExpand = (groupId: string) => {
    setExpandedGroupId(prev => prev === groupId ? null : groupId);
  };

  const handlePayment = (item: Installment) => {
    if (!activeShift) {
      showNotification('error', 'Caixa fechado. Abra o caixa para receber pagamentos nesta unidade.');
      return;
    }

    const showManualPayment = () => {
      const fees = calculateOverdueFees(item);
      const isOverdue = fees.isLate;
      let selectedMethod: 'pix' | 'money' | 'card' = 'money';
      let finalValueToPay = isOverdue ? fees.total : item.value;

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
            onValueChange={(val) => {
              finalValueToPay = val;
            }}
          />
        ),
        confirmText: isOverdue ? `Receber R$ ${fees.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Confirmar Recebimento',
        onConfirm: async () => {
          try {
            await markAsPaid(item.id, finalValueToPay, selectedMethod);
            showNotification('success', 'Pagamento Confirmado');
            if (selectedUnitId && selectedUnitId !== 'all') {
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

    if (item.asaas_invoice_url) {
      showModal({
        title: 'Recebimento de Parcela',
        children: (
          <div className="space-y-4 text-xs text-left">
            <p className="text-on-surface-variant leading-relaxed">
              Esta parcela possui uma cobrança registrada no gateway. Como você deseja proceder com o recebimento?
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  window.open(item.asaas_invoice_url, '_blank');
                  hideModal();
                }}
                className="w-full py-3 bg-primary text-on-primary rounded-xl font-black uppercase tracking-widest text-[9px] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <QrCode size={14} />
                Visualizar Boleto / Pix da MDR ↗
              </button>
              <button
                type="button"
                onClick={() => {
                  showManualPayment();
                }}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2"
              >
                <DollarSign size={14} />
                Registrar Recebimento Manual no Caixa
              </button>
            </div>
          </div>
        ),
        confirmText: '', // Hide default confirm button
        onConfirm: () => {}
      });
    } else {
      showManualPayment();
    }
  };

  const handleBatchPayment = (items: Installment[]) => {
    if (!activeShift) {
      showNotification('error', 'Caixa fechado. Abra o caixa para receber pagamentos nesta unidade.');
      return;
    }

    if (items.length === 0) return;

    let selectedMethod: 'pix' | 'money' | 'card' = 'money';
    let finalTotalValue = items.reduce((sum, item) => sum + item.value, 0);
    const hasAsaas = items.some(item => item.asaas_invoice_url);

    showModal({
      title: 'Liquidação de Parcelas em Lote',
      children: (
        <div className="space-y-4">
          {hasAsaas && (
            <p className="text-[9px] text-warning font-black uppercase tracking-widest bg-warning/10 p-3 rounded-xl border border-warning/20">
              ⚠️ Atenção: Uma ou mais parcelas selecionadas possuem cobranças no Asaas. A liquidação manual dará a baixa local no caixa do CRM, mas a cobrança correspondente no Asaas deverá ser gerenciada manualmente se necessário.
            </p>
          )}
          <BatchPaymentConfirmationContent
            items={items}
            onMethodChange={(method) => {
              selectedMethod = method;
            }}
            onValueChange={(val) => {
              finalTotalValue = val;
            }}
          />
        </div>
      ),
      confirmText: 'Confirmar Liquidação',
      onConfirm: async () => {
        try {
          const totalOriginal = items.reduce((sum, item) => sum + item.value, 0);
          const totalDiscount = Math.max(0, totalOriginal - finalTotalValue);

          // Mark each installment as paid
          // Distribute discount proportionally based on installment value
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const propDiscount = totalOriginal > 0 ? (item.value / totalOriginal) * totalDiscount : 0;
            const finalVal = Math.max(0, item.value - propDiscount);
            await markAsPaid(item.id, finalVal, selectedMethod);
          }

          showNotification('success', 'Parcelas Liquidadas com Sucesso');
          setSelectedInstIds(prev => prev.filter(id => !items.map(item => item.id).includes(id)));
          
          if (selectedUnitId && selectedUnitId !== 'all') {
            await fetchActiveShift(selectedUnitId);
            await fetchTransactions(selectedUnitId);
          }
          hideModal();
        } catch (error: any) {
          showNotification('error', error?.response?.data?.error || 'Erro ao liquidar parcelas');
        }
      }
    });
  };

  const handleRevertPayment = (item: Installment) => {
    showModal({
      title: 'Confirmar Estorno de Pagamento',
      type: 'danger',
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
          if (selectedUnitId && selectedUnitId !== 'all') {
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

  const handleSendStatement = async (customerId: string, customerName: string) => {
    setSendingWa(`statement-${customerId}`);
    try {
      const res = await fetch('/api/billing/send-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId })
      });

      if (res.ok) {
        showNotification('success', 'Extrato Enviado!', `Extrato consolidado enviado via WhatsApp para ${customerName}.`);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification('error', 'Falha ao Enviar', `Erro: ${errData.error || 'Erro ao processar envio'}`);
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
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">
            {activeFinanceTab === 'receivables' ? 'Recebíveis' : 'Contas a Pagar (Cartões)'}
          </h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">
            {activeFinanceTab === 'receivables' ? 'Gestão de Parcelas e Recebimentos' : 'Mensal Fixo de Cartões de Crédito e Custos'}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Unit Selector for Admins */}
          {isAdmin && units.length > 0 && (
            <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-50 w-full md:w-auto">
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
                {isAdmin && (
                  <option value="all" className="bg-[#0f0f1a] text-white">Todas as Unidades</option>
                )}
                {units.map(u => (
                  <option key={u.id} value={u.id} className="bg-[#0f0f1a] text-white">{u.name}</option>
                ))}
              </select>
            </div>
          )}
          {activeFinanceTab === 'receivables' && (
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

      {/* TABS DE SELEÇÃO FINANCEIRA */}
      {isAdmin && (
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-fit mb-8 gap-1">
          <button
            onClick={() => setActiveFinanceTab('receivables')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeFinanceTab === 'receivables'
                ? "bg-white text-black shadow-lg"
                : "text-on-surface-variant hover:text-white"
            )}
          >
            Recebíveis
          </button>
          <button
            onClick={() => setActiveFinanceTab('caixas')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeFinanceTab === 'caixas'
                ? "bg-white text-black shadow-lg"
                : "text-on-surface-variant hover:text-white"
            )}
          >
            🏦 Gestão de Caixas (Financeira vs. Loja)
          </button>
          <button
            onClick={() => setActiveFinanceTab('payable_cards')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeFinanceTab === 'payable_cards'
                ? "bg-white text-black shadow-lg"
                : "text-on-surface-variant hover:text-white"
            )}
          >
            Contas a Pagar (Cartões)
          </button>
        </div>
      )}

      {/* RENDER CONTEÚDO */}
      {activeFinanceTab === 'receivables' || !isAdmin ? (
        <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { id: 'all', label: 'Total a Receber', value: `R$ ${totalReceivable.toLocaleString('pt-BR')}`, icon: ArrowUpRight, color: 'text-primary', activeBorder: 'border-primary/50 shadow-primary/5', activeBar: 'bg-primary' },
            { id: 'paid', label: 'Recebido (Total)', value: `R$ ${totalPaid.toLocaleString('pt-BR')}`, icon: CheckCircle2, color: 'text-success', activeBorder: 'border-success/50 shadow-success/5', activeBar: 'bg-success' },
            { id: 'overdue', label: 'Em Atraso', value: `R$ ${totalOverdue.toLocaleString('pt-BR')}`, icon: AlertCircle, color: 'text-error', activeBorder: 'border-error/50 shadow-error/5', activeBar: 'bg-error' },
            { id: 'blocked', label: 'Bloqueados', value: dateFilteredInstallments.filter(i => i.status === 'blocked').length.toString(), icon: ShieldAlert, color: 'text-error', activeBorder: 'border-red-500/50 shadow-red-500/5', activeBar: 'bg-red-500' },
          ].map((stat, idx) => {
            const isActive = statusFilter === stat.id;
            return (
              <div
                key={idx}
                onClick={() => setStatusFilter(stat.id as any)}
                className={`bg-white/2 p-6 rounded-4xl border relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:bg-white/4 ${isActive ? stat.activeBorder : 'border-white/5'}`}
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
        <div className="bg-white/2 rounded-[40px] border border-outline-variant/30 overflow-hidden">
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
            <div className="relative flex items-center gap-2 bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3 min-w-55">
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
                <option value="custom" className="bg-[#0f0f1a] text-white">Período Personalizado</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex flex-wrap gap-2 items-center bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none font-mono focus:text-primary transition-all"
                />
                <span className="text-on-surface-variant text-[10px] uppercase font-black tracking-widest">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none font-mono focus:text-primary transition-all"
                />
              </div>
            )}
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
                const isExpanded = expandedGroupId === group.id;
                const paidPercent = group.totalCount > 0 ? (group.paidCount / group.totalCount) * 100 : 0;

                return (
                  <div key={group.id} className="bg-white/1 hover:bg-white/2 border border-white/5 rounded-3xl overflow-hidden transition-all duration-300">
                    <div
                      onClick={() => toggleExpand(group.id)}
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
                          <div className="p-5 border-t border-white/5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/2 p-4 border border-white/5 rounded-2xl">
                              <div>
                                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Resumo de Cobrança</p>
                                <p className="text-xs text-white mt-1 flex flex-wrap items-center gap-2">
                                  Envie o extrato completo ou liquide várias parcelas selecionadas de uma vez com desconto.
                                  {group.displayedInstallments.filter(i => selectedInstIds.includes(i.id)).length > 0 && (
                                    <span className="bg-success/20 text-success text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-success/30 animate-pulse">
                                      {group.displayedInstallments.filter(i => selectedInstIds.includes(i.id)).length} Selecionada(s)
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {group.displayedInstallments.filter(i => selectedInstIds.includes(i.id)).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleBatchPayment(group.displayedInstallments.filter(i => selectedInstIds.includes(i.id)))}
                                    className="px-4 py-2.5 bg-success hover:scale-[1.02] active:scale-[0.98] text-white border border-success/25 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-success/15"
                                  >
                                    <DollarSign size={14} />
                                    Liquidar Selecionadas
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={sendingWa === `statement-${group.customerId}`}
                                  onClick={() => handleSendStatement(group.customerId, group.customerName)}
                                  className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Send size={14} className={sendingWa === `statement-${group.customerId}` ? "animate-pulse" : ""} />
                                  {sendingWa === `statement-${group.customerId}` ? 'Enviando Extrato...' : 'Enviar Extrato WhatsApp'}
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                                    <th className="pb-3 pl-4 w-10">
                                      <input
                                        type="checkbox"
                                        checked={group.displayedInstallments.filter(i => i.status !== 'paid').length > 0 && group.displayedInstallments.filter(i => i.status !== 'paid').every(i => selectedInstIds.includes(i.id))}
                                        onChange={(e) => {
                                          const pendingIds = group.displayedInstallments.filter(i => i.status !== 'paid').map(i => i.id);
                                          if (e.target.checked) {
                                            setSelectedInstIds(prev => [...new Set([...prev, ...pendingIds])]);
                                          } else {
                                            setSelectedInstIds(prev => prev.filter(id => !pendingIds.includes(id)));
                                          }
                                        }}
                                        className="rounded border-white/10 bg-white/5 text-primary focus:ring-0"
                                      />
                                    </th>
                                    <th className="pb-3 pl-2">Nº Parcela</th>
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
                                      <tr key={inst.id} className="border-b border-white/2 last:border-0 hover:bg-white/1 transition-all">
                                        <td className="py-4 pl-4">
                                          {inst.status !== 'paid' ? (
                                            <input
                                              type="checkbox"
                                              checked={selectedInstIds.includes(inst.id)}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedInstIds(prev => [...prev, inst.id]);
                                                } else {
                                                  setSelectedInstIds(prev => prev.filter(id => id !== inst.id));
                                                }
                                              }}
                                              className="rounded border-white/10 bg-white/5 text-primary focus:ring-0"
                                            />
                                          ) : null}
                                        </td>
                                        <td className="py-4 pl-2 text-xs font-black text-white">
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
                                                  title={inst.asaas_invoice_url ? "Visualizar Boleto / Pix da MDR" : "Gerar Cobrança QR Code"}
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
                                                  title={inst.asaas_invoice_url ? "Visualizar Boleto / Pix da MDR" : "Reimprimir Recibo"}
                                                  className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 cursor-pointer"
                                                >
                                                  <Printer size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={sendingWa === inst.id}
                                                  onClick={() => handleWhatsApp(inst)}
                                                  title="Enviar Comprovante via WhatsApp"
                                                  className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-all border border-green-500/20 cursor-pointer disabled:opacity-50"
                                                >
                                                  {sendingWa === inst.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
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
      ) : activeFinanceTab === 'caixas' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* CARDS DE CAIXA SEPAREDOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD CAIXA FINANCEIRA */}
            <div className="bg-linear-to-br from-[#0f1f18] to-[#0f0f1a] p-8 rounded-4xl border border-emerald-500/20 relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Caixa Financeira</h3>
                    <p className="text-[10px] text-emerald-400 font-mono font-black uppercase tracking-widest">Recebimentos de Clientes Final</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Ativo
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-on-surface-variant font-medium">Total Arrecadado (Parcelas + Entradas)</span>
                  <span className="text-sm font-black text-white font-mono">
                    R$ {(cashierSummary?.financeira?.totalArrecadado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-on-surface-variant font-medium">Total Já Repassado à Loja</span>
                  <span className="text-sm font-black text-warning font-mono">
                    - R$ {(cashierSummary?.financeira?.totalRepassado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-white uppercase tracking-wider">Saldo Disponível no Caixa</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    R$ {(cashierSummary?.financeira?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setTransferAmountInput((cashierSummary?.financeira?.balance || 0).toString());
                  setIsTransferModalOpen(true);
                }}
                disabled={(cashierSummary?.financeira?.balance || 0) <= 0}
                className="w-full py-4 bg-emerald-500 text-black hover:bg-emerald-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <DollarSign size={18} />
                💸 Realizar Repasse para o Caixa Loja
              </button>
            </div>

            {/* CARD CAIXA LOJA */}
            <div className="bg-linear-to-br from-[#180f24] to-[#0f0f1a] p-8 rounded-4xl border border-purple-500/20 relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Caixa Loja</h3>
                    <p className="text-[10px] text-purple-400 font-mono font-black uppercase tracking-widest">Caixa Operacional da Loja Física</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Ativo
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-on-surface-variant font-medium">Repasses Recebidos da Financeira</span>
                  <span className="text-sm font-black text-purple-300 font-mono">
                    + R$ {(cashierSummary?.loja?.totalRepassesRecebidos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-on-surface-variant font-medium">Entradas Diretas e Vendas à Vista</span>
                  <span className="text-sm font-black text-white font-mono">
                    + R$ {(cashierSummary?.loja?.totalEntradasDiretas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-white uppercase tracking-wider">Saldo em Caixa da Loja</span>
                  <span className="text-2xl font-black text-purple-400 font-mono">
                    R$ {(cashierSummary?.loja?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE REPASSES */}
          <div className="bg-white/2 rounded-4xl border border-white/10 p-6">
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <History size={18} className="text-primary" />
              Histórico de Repasses (Financeira ➔ Loja)
            </h4>

            {cashierTransfers.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-8 text-center">Nenhum repasse registrado até o momento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-on-surface-variant uppercase text-[10px] tracking-wider font-black">
                      <th className="py-3 px-4">Data/Hora</th>
                      <th className="py-3 px-4">Origem</th>
                      <th className="py-3 px-4">Destino</th>
                      <th className="py-3 px-4 text-right">Valor Repassado</th>
                      <th className="py-3 px-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashierTransfers.map((t: any) => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 font-mono">
                        <td className="py-3 px-4 text-white">
                          {new Date(t.created_at || t.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">Caixa Financeira</td>
                        <td className="py-3 px-4 text-purple-400 font-bold">Caixa Loja</td>
                        <td className="py-3 px-4 text-right text-success font-black text-sm">
                          R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant font-sans text-xs">
                          {t.description || 'Repasse efetuado'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MODAL DE REPASSE DE VALORES */}
          {isTransferModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-[#0f0f1a] border border-white/10 rounded-4xl p-8 max-w-md w-full space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-base font-black text-white uppercase tracking-wider">💸 Realizar Repasse para a Loja</h3>
                  <button onClick={() => setIsTransferModalOpen(false)} className="p-2 text-on-surface-variant hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest block mb-1">
                      Valor a Repassar (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={transferAmountInput}
                      onChange={(e) => setTransferAmountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-lg font-mono font-black text-emerald-400 outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-on-surface-variant/80 mt-1">
                      Saldo disponível na Financeira: <span className="text-white font-mono font-bold">R$ {(cashierSummary?.financeira?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest block mb-1">
                      Descrição / Observações
                    </label>
                    <input
                      type="text"
                      value={transferDescInput}
                      onChange={(e) => setTransferDescInput(e.target.value)}
                      placeholder="Ex: Repasse de recebimentos da semana para o caixa da loja"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setIsTransferModalOpen(false)}
                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecuteTransfer}
                    disabled={isSubmittingTransfer || !transferAmountInput}
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isSubmittingTransfer ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar Repasse'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/2 border border-white/5 p-6 rounded-4xl">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
                <Calendar size={16} className="text-primary shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-xs text-white outline-none w-28 cursor-pointer font-display font-black uppercase tracking-wider"
                >
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, idx) => (
                    <option key={idx} value={idx + 1} className="bg-[#0f0f1a] text-white">{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
                <Calendar size={16} className="text-primary shrink-0" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-xs text-white outline-none w-20 cursor-pointer font-display font-black uppercase tracking-wider"
                >
                  {[2026, 2027, 2028, 2029, 2030].map(y => (
                    <option key={y} value={y} className="bg-[#0f0f1a] text-white">{y}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Dia */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
                <Calendar size={16} className="text-primary shrink-0" />
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-transparent text-xs text-white outline-none w-28 cursor-pointer font-display font-black uppercase tracking-wider"
                >
                  <option value="all" className="bg-[#0f0f1a] text-white">Todos os dias</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d} className="bg-[#0f0f1a] text-white">Dia {d}</option>
                  ))}
                </select>
              </div>

              {/* Toggle de Ocultar Pagos */}
              <label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 cursor-pointer hover:bg-white/[0.07] transition-all select-none">
                <input
                  type="checkbox"
                  checked={showPaidBills}
                  onChange={(e) => setShowPaidBills(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 cursor-pointer"
                />
                <span className="text-[10px] text-white uppercase tracking-widest font-black">Ver Pagas</span>
              </label>
            </div>

            <button
              onClick={() => handleOpenBillModal()}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer w-full md:w-auto"
            >
              <Plus size={16} /> Nova Conta de Cartão
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 bg-white/2 border border-white/5 rounded-[40px] p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">
                  Mensal Fixo - Cartão ({filteredBills.length})
                </h3>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                      <th className="pb-3 pl-4">Dia</th>
                      <th className="pb-3">Descrição</th>
                      <th className="pb-3 text-center">P</th>
                      <th className="pb-3 text-center">X</th>
                      <th className="pb-3 text-center">F</th>
                      <th className="pb-3 text-right">Valor</th>
                      <th className="pb-3 text-center">Pago</th>
                      <th className="pb-3 text-right pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-xs text-on-surface-variant">
                          Nenhuma conta de cartão ativa para o período selecionado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-white/1 transition-all group">
                          <td className="py-4 pl-4 text-xs font-black font-mono text-white">
                            {String(bill.day).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}
                          </td>
                          <td className="py-4 text-xs font-bold text-white uppercase">
                            P-{bill.current_installment} {bill.description}
                            <span className={cn(
                              "ml-2 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                              bill.category === 'store'
                                ? "bg-primary/10 border-primary/20 text-primary"
                                : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                            )}>
                              {bill.category === 'store' ? 'Loja' : 'Pessoal'}
                            </span>
                          </td>
                          <td className="py-4 text-center text-xs font-mono text-on-surface-variant">{bill.current_installment}</td>
                          <td className="py-4 text-center text-xs font-mono text-on-surface-variant">{bill.total_installments}</td>
                          <td className="py-4 text-center text-xs font-mono text-on-surface-variant">{bill.remaining_installments}</td>
                          <td className="py-4 text-right text-xs font-mono font-black text-white">
                            R$ {Number(bill.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!bill.is_paid}
                              onChange={(e) => toggleBillPayment(bill.id, selectedMonth, selectedYear, e.target.checked, selectedUnitId)}
                              className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 text-right pr-4">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                type="button"
                                onClick={() => handleOpenBillModal(bill)}
                                className="p-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white transition-all cursor-pointer"
                                title="Editar"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBill(bill.id)}
                                className="p-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 rounded text-red-400 transition-all cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-white/5 flex flex-wrap justify-between text-[10px] font-bold text-white pl-4 pr-4 gap-2">
                <span>Contas Exibidas: {filteredBills.length} / {bills.length}</span>
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  <span>Pago (Exibido): <span className="text-success font-mono">R$ {filteredBills.filter(b => b.is_paid).reduce((sum, b) => sum + Number(b.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                  <span>A Pagar (Exibido): <span className="text-error font-mono">R$ {filteredBills.filter(b => !b.is_paid).reduce((sum, b) => sum + Number(b.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                  <span>Total (Mês): <span className="text-primary font-mono">R$ {bills.reduce((sum, b) => sum + Number(b.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white/5 border border-white/5 rounded-[40px] p-6 space-y-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">
                  Relatório Mensal
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-1 opacity-70">Total a pagar cartão (Dívida Total)</p>
                    <p className="text-xl font-black text-white font-mono">
                      R$ {bills.reduce((sum, b) => sum + (Number(b.value) * Math.max(0, b.remaining_installments || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {selectedDay !== 'all' && (
                    <div className="bg-[#181824] border border-white/5 rounded-2xl p-4 mt-2 animate-in fade-in duration-300">
                      <p className="text-[9px] text-primary uppercase tracking-widest font-black mb-1 opacity-70">A Pagar no Dia {selectedDay}</p>
                      <p className="text-lg font-black text-white font-mono">
                        R$ {dayOpenValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-1 opacity-70">Total cartão mês</p>
                      <p className="text-sm font-black text-white font-mono">
                        R$ {bills.reduce((sum, b) => sum + Number(b.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-error uppercase tracking-widest font-black mb-1 opacity-70">Total cartão à pagar</p>
                      <p className="text-sm font-black text-error font-mono">
                        R$ {bills.filter(b => !b.is_paid).reduce((sum, b) => sum + Number(b.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-white/5 pt-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Entrada cartão Mês (Previsão)</label>
                      <input
                        type="number"
                        value={forecastForm.card_payments_inflow || ''}
                        onChange={(e) => setForecastForm(prev => ({ ...prev, card_payments_inflow: Number(e.target.value) }))}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-white w-full"
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Conta fixa Lojas</label>
                      <input
                        type="number"
                        value={forecastForm.fixed_store_expenses || ''}
                        onChange={(e) => setForecastForm(prev => ({ ...prev, fixed_store_expenses: Number(e.target.value) }))}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-white w-full"
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Conta fixa Pessoal</label>
                      <input
                        type="number"
                        value={forecastForm.fixed_personal_expenses || ''}
                        onChange={(e) => setForecastForm(prev => ({ ...prev, fixed_personal_expenses: Number(e.target.value) }))}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-white w-full"
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/2 border border-white/5 rounded-[40px] p-6 space-y-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">
                  Entrada - Previsão
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Loja 1 (S)</label>
                      <input
                        type="number"
                        value={forecastForm.store_1_forecast || ''}
                        onChange={(e) => setForecastForm(prev => ({ ...prev, store_1_forecast: Number(e.target.value) }))}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-white w-full"
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Loja 2 (G)</label>
                      <input
                        type="number"
                        value={forecastForm.store_2_forecast || ''}
                        onChange={(e) => setForecastForm(prev => ({ ...prev, store_2_forecast: Number(e.target.value) }))}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-white w-full"
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveForecast}
                    className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-lg shadow-white/5"
                  >
                    Salvar Relatório & Previsões
                  </button>
                </div>
              </div>

              {/* Widget de Relatório Mensal de Cartões */}
              <div className="bg-white/2 border border-white/5 rounded-[40px] p-6 space-y-4 animate-in fade-in duration-300">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">
                  Relatório Mensal de Cartões
                </h3>
                <div className="overflow-x-auto max-h-87.5 pr-2 custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-wider pb-2">
                        <th className="pb-2">Mês</th>
                        <th className="pb-2 text-right">Fixado</th>
                        <th className="pb-2 text-right">Abatido</th>
                        <th className="pb-2 text-right">A Pagar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {monthlyReport.map((item, idx) => {
                        const isCurrentMonth = item.month === new Date().getMonth() + 1 && item.year === new Date().getFullYear();
                        return (
                          <tr key={idx} className={cn("hover:bg-white/5 transition-all", isCurrentMonth && "bg-white/5 font-bold")}>
                            <td className="py-2.5 font-bold text-white uppercase flex items-center gap-1">
                              {item.monthLabel}
                              {isCurrentMonth && (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[7px] font-black uppercase px-1 py-0.2 rounded scale-90">Atual</span>
                              )}
                            </td>
                            <td className="py-2.5 text-right font-mono text-zinc-400">
                              R$ {item.fixedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 text-right font-mono text-emerald-400">
                              R$ {item.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 text-right font-mono text-error">
                              R$ {item.remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isBillModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsBillModalOpen(false)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#0f0f1a] border border-white/10 rounded-4xl w-full max-w-md p-6 shadow-2xl space-y-6 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  {editingBill ? 'Editar Conta de Cartão' : 'Nova Conta de Cartão'}
                </h3>
                <button
                  onClick={() => setIsBillModalOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveBill} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Dia do Vencimento</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={billFormData.day}
                      onChange={(e) => setBillFormData(prev => ({ ...prev, day: Number(e.target.value) }))}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Valor da Parcela</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={billFormData.value || ''}
                      onChange={(e) => setBillFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white font-mono"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Descrição da Conta</label>
                  <input
                    type="text"
                    required
                    value={billFormData.description}
                    onChange={(e) => setBillFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white"
                    placeholder="Ex: CARTÃO NUBANK C.M."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Mês Início</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="12"
                      value={billFormData.start_month}
                      onChange={(e) => setBillFormData(prev => ({ ...prev, start_month: Number(e.target.value) }))}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Ano Início</label>
                    <input
                      type="number"
                      required
                      min="2026"
                      value={billFormData.start_year}
                      onChange={(e) => setBillFormData(prev => ({ ...prev, start_year: Number(e.target.value) }))}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Total Parc.</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={billFormData.total_installments}
                      onChange={(e) => setBillFormData(prev => ({ ...prev, total_installments: Number(e.target.value) }))}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black opacity-70">Classificação / Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['store', 'personal'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setBillFormData(prev => ({ ...prev, category: cat }))}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          billFormData.category === cat
                            ? "bg-white text-black border-white"
                            : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                        )}
                      >
                        {cat === 'store' ? 'Loja / Fixa' : 'Pessoal'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  {editingBill ? 'Atualizar Conta' : 'Adicionar Conta'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
