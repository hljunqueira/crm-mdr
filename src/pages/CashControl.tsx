import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, ArrowUpRight, ArrowDownRight, Plus, X, Lock, Unlock, CheckCircle2, History, Printer, Pencil, Trash2, Store, Save, Loader2, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUnitStore } from '../store/useUnitStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { useCashStore, CashShift, CashTransaction } from '../store/useCashStore';
import { formatPhone } from '../lib/utils';

export default function CashControl() {
  const { units, fetchAllUnits, unit } = useUnitStore();
  const { showModal, showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();

  const {
    activeShift, transactions, shiftHistory, fetchActiveShift,
    openShift, closeShift, fetchTransactions, addTransaction, fetchShiftHistory,
    updateShift, deleteShift
  } = useCashStore();

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

  // Edit Shift States
  const [editingShift, setEditingShift] = useState<CashShift | null>(null);
  const [editOpeningBalance, setEditOpeningBalance] = useState<number>(0);
  const [editClosingCash, setEditClosingCash] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  const isAdmin = profile?.role === 'admin';
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  useEffect(() => {
    fetchAllUnits();
  }, [fetchAllUnits]);

  useEffect(() => {
    if (profile?.unit_id) {
      setSelectedUnitId(profile.unit_id);
    } else if (units.length > 0 && !selectedUnitId) {
      setSelectedUnitId(units[0].id);
    }
  }, [profile, units, selectedUnitId]);

  useEffect(() => {
    if (selectedUnitId) {
      fetchActiveShift(selectedUnitId);
      fetchTransactions(selectedUnitId);
      fetchShiftHistory(selectedUnitId);
    }
  }, [selectedUnitId, fetchActiveShift, fetchTransactions, fetchShiftHistory]);

  const [shiftTxChannelFilter, setShiftTxChannelFilter] = useState<'all' | 'money' | 'digital'>('all');

  const currentShiftTransactions = useMemo(() => {
    if (!activeShift) return [];
    // O Turno Diário é EXCLUSIVAMENTE da LOJA FÍSICA. Transações de Financeira pertencem ao Caixa da Financeira!
    const shiftTxs = transactions.filter(t => t.shift_id === activeShift.id && t.cashier_type !== 'FINANCEIRA');
    
    if (shiftTxChannelFilter === 'money') {
      return shiftTxs.filter(t => t.payment_method === 'money' || t.category === 'suprimento' || t.category === 'sangria');
    } else if (shiftTxChannelFilter === 'digital') {
      return shiftTxs.filter(t => t.payment_method !== 'money' && t.category !== 'suprimento' && t.category !== 'sangria');
    }

    return shiftTxs;
  }, [transactions, activeShift, shiftTxChannelFilter]);

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

  const handleEditShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    try {
      await updateShift(editingShift.id, {
        opening_balance: editOpeningBalance,
        closing_cash: editClosingCash,
        notes: editNotes
      });
      showNotification('success', 'Fechamento Atualizado!', 'O fechamento de caixa foi atualizado com sucesso.');
      setEditingShift(null);
      if (selectedUnitId) {
        fetchShiftHistory(selectedUnitId);
      }
    } catch (err: any) {
      showNotification('error', 'Erro ao atualizar fechamento', err?.response?.data?.error || err.message);
    }
  };

  const handleDeleteShift = async (shift: CashShift) => {
    showModal({
      title: 'Confirmar Exclusão de Fechamento',
      type: 'danger',
      children: (
        <div className="space-y-4">
          <p className="text-sm">Tem certeza de que deseja excluir o fechamento de caixa do dia <span className="text-white font-black">{shift.closed_at ? new Date(shift.closed_at).toLocaleDateString('pt-BR') : ''}</span>?</p>
          <p className="text-[10px] text-error font-black uppercase tracking-widest bg-error/10 p-3 rounded-xl border border-error/20">
            ⚠️ Esta ação removerá permanentemente o fechamento de caixa do histórico. As transações associadas não serão deletadas, mas ficarão desvinculadas deste turno.
          </p>
        </div>
      ),
      confirmText: 'Excluir Fechamento',
      onConfirm: async () => {
        try {
          await deleteShift(shift.id);
          showNotification('success', 'Fechamento Excluído', 'O fechamento de caixa foi removido.');
          if (selectedUnitId) {
            fetchShiftHistory(selectedUnitId);
          }
          hideModal();
        } catch (error: any) {
          showNotification('error', 'Erro ao excluir fechamento', error?.response?.data?.error || error.message);
        }
      }
    });
  };

  const printShiftClosure = (shift: CashShift) => {
    const windowName = `print_shift_${shift.id}`;
    const printWindow = window.open('', windowName, 'width=800,height=600');
    if (!printWindow) return;

    const opName = shift.opened_by_profile?.full_name || 'Operador';
    const shiftUnit = units.find(u => u.id === shift.unit_id) || unit;

    const cleanUnitName = (shiftUnit?.name || 'MDR').replace(/MDR\s*(Informática\s*(e|&)\s*Celulares)?\s*-\s*/gi, '').toUpperCase();
    const unitCNPJ = shiftUnit?.cnpj || '';
    const unitPhone = shiftUnit?.phone ? formatPhone(shiftUnit.phone) : '';
    const unitAddress = shiftUnit?.address || '';

    const content = `
      <html>
      <head>
        <title>Fechamento de Caixa</title>
        <style>
          @media print {
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            @page {
              margin: 0;
              size: auto;
            }
          }
          body {
            margin: 0;
            padding: 10px;
            font-family: 'Inter', Arial, Helvetica, sans-serif;
            font-size: 10.5px;
            color: #000;
            background: #fff;
            line-height: 1.3;
            font-weight: bold;
          }
          .thermal-receipt {
            width: 80mm;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .header-center {
            text-align: center;
            margin-bottom: 6px;
          }
          .brand-name {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: -1px;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .brand-sub {
            font-size: 8px;
            letter-spacing: 1px;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          .unit-details {
            font-size: 9px;
            color: #333;
            line-height: 1.25;
          }
          .receipt-title {
            font-size: 13px;
            font-weight: bold;
            margin-top: 4px;
            text-transform: uppercase;
          }
          .receipt-num {
            font-size: 10px;
            font-weight: bold;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 1px double #000;
            border-bottom: 1px double #000;
            height: 3px;
            margin: 6px 0;
          }
          .section-title {
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
            font-size: 10px;
            letter-spacing: 0.5px;
            text-decoration: underline;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 2.5px 0;
          }
          .align-right {
            text-align: right;
            max-width: 60%;
            word-wrap: break-word;
          }
          .font-mono {
            font-family: 'Courier New', Courier, monospace;
          }
          .sig-line-box {
            margin-top: 30px;
            text-align: center;
          }
          .sig-line {
            border-top: 1px solid #000;
            width: 80%;
            margin: 0 auto 4px auto;
          }
          .sig-label {
            font-size: 9px;
            line-height: 1.1;
            display: block;
          }
          .footer-note {
            font-size: 8px;
            text-align: center;
            margin-top: 10px;
            line-height: 1.2;
          }
          .highlight {
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        <div class="thermal-receipt">
          <div class="header-center">
            <div class="brand-name">MDR</div>
            <div class="brand-sub">INFORMÁTICA & CELULARES</div>
            <div class="unit-details">
              <strong>LOJA: ${cleanUnitName}</strong>
              ${unitCNPJ ? ` | CNPJ: ${unitCNPJ}` : ''}
              ${unitPhone ? ` | Tel: ${unitPhone}` : ''}
              <br />
              ${unitAddress}
            </div>
          </div>

          <div class="double-divider"></div>

          <div class="header-center">
            <div class="receipt-title">RESUMO DE FECHAMENTO DE CAIXA</div>
            <div class="receipt-num">N° #${shift.id.substring(0, 8).toUpperCase()}</div>
          </div>

          <div class="divider"></div>

          <div class="section-title">DADOS DO TURNO</div>
          <div class="row">
            <span>Operador:</span>
            <span class="align-right">${opName}</span>
          </div>
          <div class="row">
            <span>Abertura:</span>
            <span class="align-right font-mono">${new Date(shift.opened_at).toLocaleDateString('pt-BR')} ${new Date(shift.opened_at).toLocaleTimeString('pt-BR')}</span>
          </div>
          <div class="row">
            <span>Fechamento:</span>
            <span class="align-right font-mono">${shift.closed_at ? `${new Date(shift.closed_at).toLocaleDateString('pt-BR')} ${new Date(shift.closed_at).toLocaleTimeString('pt-BR')}` : '—'}</span>
          </div>

          <div class="divider"></div>

          <div class="section-title">DADOS FINANCEIROS</div>
          <div class="row">
            <span>Fundo de Troco (Inicial):</span>
            <span class="align-right font-mono">R$ ${Number(shift.opening_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="row">
            <span>Dinheiro Esperado:</span>
            <span class="align-right font-mono">R$ ${Number(shift.expected_cash).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="row">
            <span>Dinheiro Declarado:</span>
            <span class="align-right font-mono">R$ ${Number(shift.closing_cash || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="row highlight">
            <span>Diferença / Quebra:</span>
            <span class="align-right font-mono">R$ ${Number(shift.difference || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="row">
            <span>Meios Digitais (Pix/Cartão):</span>
            <span class="align-right font-mono">R$ ${Number(shift.expected_digital || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          ${shift.notes ? `
            <div class="divider"></div>
            <div style="font-size: 9px; line-height: 1.2;">
              <strong>Observações:</strong><br/>
              ${shift.notes}
            </div>
          ` : ''}

          <div class="double-divider"></div>

          <div class="sig-line-box">
            <div class="sig-line"></div>
            <span class="sig-label">Assinatura do Conferente / Gerente</span>
          </div>

          <div class="sig-line-box" style="margin-top: 25px;">
            <div class="sig-line"></div>
            <span class="sig-label">Assinatura do Operador (${opName})</span>
          </div>

          <div class="footer-note">
            Comprovante de fechamento de caixa emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.
          </div>
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
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Controle de Caixa</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Abertura, Fechamento e Fluxo do Caixa Físico</p>
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
                {units.map(u => (
                  <option key={u.id} value={u.id} className="bg-[#0f0f1a] text-white">{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Estado do Caixa Ativo */}
        <div className="bg-white/2 rounded-[40px] border border-outline-variant/30 p-6 space-y-6">
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

                {/* Quick Actions for cash drawer */}
                <div className="grid grid-cols-2 gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setManualTx({
                        type: 'inflow',
                        category: 'suprimento',
                        amount: '',
                        payment_method: 'money',
                        description: ''
                      });
                      setIsManualTxOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-3.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <Plus size={12} /> Suprimento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualTx({
                        type: 'outflow',
                        category: 'sangria',
                        amount: '',
                        payment_method: 'money',
                        description: ''
                      });
                      setIsManualTxOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <X size={12} /> Sangria
                  </button>
                </div>
              </div>

              {/* Lado Direito: Formulário de Fechamento de Caixa Cego */}
              <form onSubmit={handleCloseCashShift} className="lg:col-span-2 space-y-4">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 pl-1">
                  <Lock size={14} /> Procedimento de Fechamento
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

              {/* Movimentações do Turno com Filtro por Canal */}
              <div className="lg:col-span-3 border-t border-white/5 pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-widest pl-1">
                    Movimentações deste Turno ({currentShiftTransactions.length})
                  </h4>

                  {/* Seletor de Tipo de Movimentação da Loja */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
                    {[
                      { id: 'all', label: 'Todas da Loja' },
                      { id: 'money', label: '💵 Dinheiro (Espécie)' },
                      { id: 'digital', label: '💳 PIX & Cartão Loja' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setShiftTxChannelFilter(f.id as any)}
                        className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          shiftTxChannelFilter === f.id
                            ? 'bg-primary text-black font-bold shadow-md'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] pb-3">
                        <th className="pb-3 pl-4">Data/Hora</th>
                        <th className="pb-3">Tipo</th>
                        <th className="pb-3">Origem / Canal</th>
                        <th className="pb-3">Categoria</th>
                        <th className="pb-3">Descrição</th>
                        <th className="pb-3">Meio Pagto</th>
                        <th className="pb-3 text-right pr-4">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentShiftTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-on-surface-variant/60 text-[9px] uppercase font-black tracking-widest">
                            Nenhuma movimentação para o canal selecionado neste turno.
                          </td>
                        </tr>
                      ) : (
                        currentShiftTransactions.map((tx) => {
                          const isAsaas = (tx.description || '').toLowerCase().includes('asaas');
                          const isFinanc = tx.cashier_type === 'FINANCEIRA' && !isAsaas;
                          return (
                            <tr key={tx.id} className="hover:bg-white/1 transition-colors">
                              <td className="py-3 pl-4 text-[9px] font-mono text-on-surface-variant">
                                {new Date(tx.created_at).toLocaleTimeString('pt-BR')}
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider ${tx.type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>
                                  {tx.type === 'inflow' ? '+' : '-'} {tx.type === 'inflow' ? 'Entrada' : 'Saída'}
                                </span>
                              </td>
                              <td className="py-3">
                                {isAsaas ? (
                                  <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                    🌐 Asaas Gateway
                                  </span>
                                ) : isFinanc ? (
                                  <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                                    📱 Financeira
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                    🏬 Loja Gaveta
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-[10px] font-bold text-white uppercase">
                                {tx.category === 'installment' ? 'Contrato' :
                                 tx.category === 'sale' ? 'Venda PDV' :
                                 tx.category === 'suprimento' ? 'Suprimento' :
                                 tx.category === 'sangria' ? 'Sangria' :
                                 tx.category === 'despesa_luz' ? 'Despesa Luz' :
                                 tx.category === 'despesa_aluguel' ? 'Despesa Aluguel' : 'Outros'}
                              </td>
                              <td className="py-3 text-[10px] text-on-surface-variant max-w-50 truncate" title={tx.description}>
                                {tx.description || '—'}
                              </td>
                              <td className="py-3 text-[9px] font-black uppercase text-on-surface-variant">
                                {tx.payment_method === 'pix' ? 'PIX' :
                                 tx.payment_method === 'money' ? 'Dinheiro (Espécie)' :
                                 tx.payment_method === 'card' ? 'Cartão' : 'Conta/Banco'}
                              </td>
                              <td className={`py-3 text-right pr-4 font-mono font-black text-[10px] ${tx.type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>
                                R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
        </div>

        {/* Histórico de Fechamentos Recentes */}
        <div className="bg-white/2 rounded-[40px] border border-outline-variant/30 p-6 space-y-6">
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
                      <tr key={shift.id} className="hover:bg-white/1 transition-colors">
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
                        <td className={`py-4 text-right font-mono text-xs font-black ${hasDiscrepancy ? 'text-error animate-pulse' : 'text-green-400'}`}>
                          R$ {Number(shift.difference || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          {hasDiscrepancy && ' ⚠️'}
                        </td>
                        <td className="py-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => printShiftClosure(shift)}
                              title="Imprimir Cupom de Fechamento"
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 cursor-pointer"
                            >
                              <Printer size={13} />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingShift(shift);
                                    setEditOpeningBalance(Number(shift.opening_balance));
                                    setEditClosingCash(Number(shift.closing_cash || 0));
                                    setEditNotes(shift.notes || '');
                                  }}
                                  title="Editar Fechamento de Caixa"
                                  className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20 cursor-pointer"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteShift(shift)}
                                  title="Excluir Fechamento de Caixa"
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20 cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
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

      {/* MANUAL TRANSACTION MODAL */}
      <AnimatePresence>
        {isManualTxOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsManualTxOpen(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#0f0f1a] border border-white/10 rounded-4xl w-full max-w-md overflow-hidden shadow-2xl z-10"
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

      {/* EDIT SHIFT MODAL */}
      <AnimatePresence>
        {editingShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setEditingShift(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#0f0f1a] border border-white/10 rounded-4xl w-full max-w-md overflow-hidden shadow-2xl z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Editar Fechamento</h2>
                  <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest opacity-60 mt-0.5">Auditoria Retroativa</p>
                </div>
                <button onClick={() => setEditingShift(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditShiftSubmit} className="p-6 space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Fundo de Troco Abertura (R$)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editOpeningBalance}
                      onChange={(e) => setEditOpeningBalance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121214] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Valor Físico Declarado Fechamento (R$)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editClosingCash}
                      onChange={(e) => setEditClosingCash(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121214] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Observações / Justificativa</label>
                  <textarea
                    rows={3}
                    placeholder="Descreva o motivo desta alteração retroativa."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Save size={14} /> Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
