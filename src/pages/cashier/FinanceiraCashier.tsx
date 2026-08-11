import React, { useState } from 'react';
import {
  DollarSign,
  ArrowUpRight,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

import { useUnitStore } from '../../store/useUnitStore';

interface FinanceiraCashierProps {
  cashierSummary: any;
  cashierTransfers: any[];
  relevantInstallments: any[];
  isLoadingCashier: boolean;
  fetchCashierData: () => void;
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  selectedUnitId: string;
}

export default function FinanceiraCashier({
  cashierSummary,
  cashierTransfers,
  relevantInstallments,
  isLoadingCashier,
  fetchCashierData,
  showNotification,
  selectedUnitId
}: FinanceiraCashierProps) {
  const { units } = useUnitStore();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [transferNotesInput, setTransferNotesInput] = useState('');
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<Set<string>>(new Set());
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [targetStoreId, setTargetStoreId] = useState<string>('');

  React.useEffect(() => {
    if (selectedUnitId && selectedUnitId !== 'all') {
      setTargetStoreId(selectedUnitId);
    } else if (units.length > 0 && !targetStoreId) {
      setTargetStoreId(units[0].id);
    }
  }, [selectedUnitId, units]);

  const totalPaid = relevantInstallments
    .filter(i => i.status === 'paid')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  const availableAmt = cashierSummary?.financeira?.saldoDisponivelReal || cashierSummary?.financeira?.disponivelD0 || totalPaid || 0;

  // Exibir os contratos de venda da financeira com o valor total a repassar (à vista da loja)
  const modalItems = (cashierSummary?.pendingRepasseItems && cashierSummary.pendingRepasseItems.length > 0)
    ? cashierSummary.pendingRepasseItems
    : relevantInstallments.filter(i => {
        const pm = (i.payment_method || '').toLowerCase();
        const isCard = pm === 'card' || pm === 'debit';
        const isVista = pm === 'vista' || pm === 'money_vista';
        const isDownPayment = i.number === 0 || i.is_down_payment === true || (i.number === 1 && (i as any).sales?.down_payment > 0 && Number(i.value) === Number((i as any).sales?.down_payment));
        const isSingle = i.total === 1 || (i as any).total_installments === 1;
        const isStrictFinanc = i.origin_type === 'FINANCIAMENTO_CELULAR';
        return i.status === 'paid' && isStrictFinanc && !isSingle && !isCard && !isVista && !isDownPayment;
      }).map(i => ({
        id: i.id,
        customerName: i.customer_name || 'Cliente Financiamento',
        deviceModel: i.device_model || 'Smartphone Financiado',
        installmentNumber: i.number,
        totalInstallments: i.total,
        value: i.value,
        isCleared: true
      }));

  const handleOpenModal = () => {
    setTransferAmountInput('0');
    setSelectedInstallmentIds(new Set());
    setIsTransferModalOpen(true);
  };

  const handleToggleSelectAll = () => {
    if (selectedInstallmentIds.size === modalItems.length) {
      setSelectedInstallmentIds(new Set());
      setTransferAmountInput('0');
    } else {
      const allIds = new Set<string>(modalItems.map((item: any) => String(item.id)));
      setSelectedInstallmentIds(allIds);
      const totalSum = modalItems.reduce((acc: number, curr: any) => acc + Number(curr.value || 0), 0);
      setTransferAmountInput(Number(totalSum.toFixed(2)).toString());
    }
  };

  const handleToggleItem = (id: string, value: number) => {
    const nextSet = new Set(selectedInstallmentIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setSelectedInstallmentIds(nextSet);

    const newSum = modalItems
      .filter((item: any) => nextSet.has(String(item.id)))
      .reduce((acc: number, curr: any) => acc + Number(curr.value || 0), 0);
    setTransferAmountInput(Number(newSum.toFixed(2)).toString());
  };

  const handleConfirmTransfer = async () => {
    try {
      setIsSubmittingTransfer(true);
      const amt = Number(transferAmountInput);
      if (isNaN(amt) || amt <= 0) {
        showNotification('error', 'Valor Inválido', 'Informe um valor maior que zero.');
        return;
      }

      const destStoreId = targetStoreId || (selectedUnitId !== 'all' ? selectedUnitId : null);
      if (!destStoreId) {
        showNotification('error', 'Loja de Destino Necessária', 'Selecione para qual caixa/loja o repasse será enviado.');
        return;
      }

      const selectedIdsArray = Array.from(selectedInstallmentIds);

      const res = await fetch('/api/cashier/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          description: transferNotesInput || 'Repasse seletivo de parcelas da financeira para o caixa da loja física',
          storeId: destStoreId,
          installmentIds: selectedIdsArray
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar repasse.');

      const storeObj = units.find((u: any) => u.id === destStoreId);
      const storeName = storeObj ? storeObj.name : 'Caixa Loja';

      showNotification('success', 'Repasse Concluído!', `R$ ${amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} repassados para o caixa da loja ${storeName}.`);
      setIsTransferModalOpen(false);
      setTransferNotesInput('');
      fetchCashierData();
    } catch (err: any) {
      showNotification('error', 'Falha no Repasse', err.message);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleRevertTransfer = async (transferId: string) => {
    if (window.confirm('Tem certeza que deseja estornar este repasse? As parcelas vinculadas retornarão ao Saldo Liberado da Financeira.')) {
      try {
        const res = await fetch('/api/cashier/revert-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferId })
        });
        if (res.ok) {
          showNotification('success', 'Estorno Realizado!', 'O repasse foi cancelado e o saldo retornou à financeira.');
          fetchCashierData();
        } else {
          showNotification('error', 'Falha no Estorno', 'Não foi possível estornar o repasse.');
        }
      } catch (err: any) {
        showNotification('error', 'Erro', err.message);
      }
    }
  };

  // Cálculo dinâmico direto da lista de parcelas para garantir sincronia absoluta com o modal
  const totalArrecadadoCalculado = modalItems.reduce((acc: number, item: any) => acc + Number(item.value || 0), 0);
  const totalLiberadoD0 = modalItems.filter((item: any) => item.isCleared !== false).reduce((acc: number, item: any) => acc + Number(item.value || 0), 0);
  const totalLiquidandoD2 = modalItems.filter((item: any) => item.isCleared === false).reduce((acc: number, item: any) => acc + Number(item.value || 0), 0);

  const displayArrecadado = cashierSummary?.financeira?.totalArrecadado || totalArrecadadoCalculado;
  const displayLiberado = cashierSummary?.financeira?.saldoDisponivelReal || cashierSummary?.financeira?.disponivelD0 || totalLiberadoD0;
  const displayLiquidando = cashierSummary?.financeira?.liquidandoD2 || totalLiquidandoD2;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Dashboard do Caixa da Financeira */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">💰 Arrecadado de Parcelas</span>
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white font-mono">
            R$ {Number(displayArrecadado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-zinc-400 mt-2 font-mono">
            Total acumulado de parcelas pagas da financeira
          </p>
        </div>

        <div className="bg-linear-to-br from-emerald-500/10 to-emerald-900/10 p-6 rounded-3xl border border-emerald-500/30">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">🟢 Saldo Liberado (D+0)</span>
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <DollarSign size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white font-mono">
            R$ {Number(displayLiberado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-emerald-400/80 mt-2 font-mono">
            Disponível para repasse imediato p/ Caixa Loja
          </p>
        </div>

        <div className="bg-linear-to-br from-amber-500/10 to-amber-900/10 p-6 rounded-3xl border border-amber-500/30">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">⏳ Em Liquidação (D+2)</span>
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
              <History size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white font-mono">
            R$ {Number(displayLiquidando).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-amber-400/80 mt-2 font-mono">
            Em compensação bancária (2 dias úteis)
          </p>
        </div>

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Ação de Caixa</span>
            <h4 className="text-sm font-black text-white uppercase">Realizar Repasse p/ Loja</h4>
          </div>
          <button
            onClick={handleOpenModal}
            disabled={availableAmt <= 0}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-4 font-display"
          >
            <DollarSign size={16} />
            Executar Repasse em Lote
          </button>
        </div>
      </div>

      {/* Histórico de Repasses Executados */}
      <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Histórico de Repasses para Caixa Loja</h3>
            <p className="text-xs text-zinc-400">Transferências de saldo da financeira para o caixa físico das lojas</p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {cashierTransfers.length} repasses registrados
          </span>
        </div>

        {cashierTransfers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm font-mono uppercase tracking-wider">
            Nenhum repasse realizado até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4">Destino (Loja)</th>
                  <th className="py-3 px-4">Valor Repassado</th>
                  <th className="py-3 px-4">Observações / Detalhes</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-mono">
                {cashierTransfers.map((t: any) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-zinc-300">
                      {new Date(t.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      Financeira MDR
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {t.units?.name || 'Caixa Loja Física'}
                    </td>
                    <td className="py-3 px-4 font-black text-white text-sm">
                      R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">
                      {t.notes || 'Repasse de Saldo Liberado'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevertTransfer(t.id)}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        title="Estornar Repasse"
                      >
                        Estornar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE REPASSE SELETIVO PARA CAIXA LOJA */}
      {isTransferModalOpen && (
        <div
          onClick={() => setIsTransferModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12121e] border border-white/10 rounded-3xl p-6 md:p-8 max-w-4xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider">Repasse Financeira ➔ Caixa Crediário Loja</h3>
                <p className="text-xs text-zinc-400">Selecione os contratos de venda financiada a serem repassados ao caixa físico da loja</p>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-zinc-400 hover:text-white p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block">Origem do Dinheiro</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">FINANCEIRA MDR (CONTA ASAAS)</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block">Destino do Repasse</span>
                <span className="text-sm font-bold text-white font-mono">
                  {units.find((u: any) => u.id === targetStoreId)
                    ? `${units.find((u: any) => u.id === targetStoreId)?.name} (${(units.find((u: any) => u.id === targetStoreId) as any)?.city || 'Unidade'})`
                    : 'Selecione a Loja de Destino...'}
                </span>
              </div>
            </div>

            {/* Resumo de Saldos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">🟢 Disponível p/ Repasse (D+0)</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  R$ {availableAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">💰 Total Selecionado p/ Repasse</span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  R$ {(modalItems.filter((i: any) => selectedInstallmentIds.has(String(i.id))).reduce((a: number, b: any) => a + Number(b.value || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Seleção de Contratos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs font-black text-white uppercase tracking-wider">Contratos de Venda Disponíveis p/ Repasse ({modalItems.length})</span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-black uppercase text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  {selectedInstallmentIds.size === modalItems.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {modalItems.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs font-mono uppercase">
                    Nenhum contrato de financiamento pendente de repasse no momento.
                  </div>
                ) : (
                  modalItems.map((item: any) => {
                    const itemIdStr = String(item.id);
                    const isSelected = selectedInstallmentIds.has(itemIdStr);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItem(itemIdStr, item.value)}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-md'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 rounded border-white/20 accent-amber-500 cursor-pointer shrink-0"
                          />
                          <div className="space-y-1">
                            <div className="font-black text-sm uppercase text-white tracking-wide flex items-center gap-2">
                              <span>{item.customerName}</span>
                              {item.storeName ? (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                                  {item.storeName}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 font-mono">
                              <span className="bg-white/10 px-2 py-0.5 rounded-lg text-white font-bold">{item.deviceModel}</span>
                              {item.originalPrice ? (
                                <span className="text-zinc-400">À Vista: R$ {Number(item.originalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              ) : null}
                              {item.downPayment > 0 ? (
                                <span className="text-amber-400 font-bold">Entrada Paga: R$ {Number(item.downPayment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-base text-emerald-400 font-mono">
                            R$ {Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                            🟢 REPASSE À VISTA
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-white uppercase tracking-wider block mb-2">Caixa Crediário Loja de Destino (Unidade)</label>
              <select
                value={targetStoreId}
                onChange={(e) => setTargetStoreId(e.target.value)}
                className="w-full bg-[#181824] border border-white/20 rounded-2xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500 text-xs cursor-pointer"
              >
                <option value="" disabled className="bg-[#12121e] text-white">Selecione a loja de destino...</option>
                {units.map((u: any) => (
                  <option key={u.id} value={u.id} className="bg-[#12121e] text-white font-bold">
                    {u.name} ({u.city || 'Unidade'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-white uppercase tracking-wider block mb-2">Valor a Repassar nesta Transferência (R$)</label>
              <input
                type="number"
                value={transferAmountInput}
                onChange={(e) => setTransferAmountInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-emerald-500 text-xl font-bold"
                placeholder="0.00"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={
                  isSubmittingTransfer ||
                  !targetStoreId ||
                  !Number(transferAmountInput) ||
                  Number(transferAmountInput) <= 0 ||
                  Number(transferAmountInput) > availableAmt
                }
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                <DollarSign size={18} />
                {isSubmittingTransfer ? 'Processando Repasse...' : `Confirmar Repasse de R$ ${Number(transferAmountInput || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
