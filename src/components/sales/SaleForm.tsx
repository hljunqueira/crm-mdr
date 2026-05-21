import React, { useState, useMemo } from 'react';
import { Smartphone, User, DollarSign, Calendar, Calculator, CheckCircle2, AlertCircle, Layers, Save, FileText, Receipt, Plus, X, Gift, ShoppingBag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useSaleStore, Sale } from '../../store/useSaleStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useUnitStore } from '../../store/useUnitStore';
import { printElement } from '../../lib/utils';
import ContractPrint from './ContractPrint';
import SaleReceiptPrint from './SaleReceiptPrint';

const CREDIARIO_COEFFICIENTS: Record<'premium' | 'standard' | 'flex', Record<number, number>> = {
  premium: {
    1: 1.050000,  2: 0.537805,  3: 0.367209,  4: 0.282012,  5: 0.230975,  6: 0.197017,
    7: 0.172820,  8: 0.154722,  9: 0.140690, 10: 0.129505, 11: 0.120363, 12: 0.112825
  },
  standard: {
    1: 1.080000,  2: 0.561600,  3: 0.388033,  4: 0.301920,  5: 0.250457,  6: 0.216315,
    7: 0.192066,  8: 0.173998,  9: 0.160041, 10: 0.148970, 11: 0.139997, 12: 0.132695
  },
  flex: {
    1: 1.120000,  2: 0.592727,  3: 0.416350,  4: 0.329234,  5: 0.277410,  6: 0.243226,
    7: 0.219108,  8: 0.201259,  9: 0.187543, 10: 0.176706, 11: 0.167974, 12: 0.160819
  }
};

const CARD_COEFFICIENTS: Record<number, number> = {
  1: 1.040000,  2: 0.530196,  3: 0.360349,  4: 0.275490,  5: 0.224627,  6: 0.190762,
  7: 0.166610,  8: 0.148528,  9: 0.134493, 10: 0.123291, 11: 0.114149, 12: 0.106552
};

interface SaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Sale;
}

export default function SaleForm({ onSuccess, onCancel, initialData }: SaleFormProps) {
  const { customers } = useCustomerStore();
  const { addSale, updateSale } = useSaleStore();
  const { installments, fetchInstallments, addInstallments } = useFinanceStore();
  const { inventory, updateItem } = useInventoryStore();
  const { showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const { unit } = useUnitStore();

  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: initialData?.customer_id || '',
    device_id: '',
    device_model: initialData?.device_model || '',
    imei: initialData?.imei || '',
    total_value: initialData?.original_price || initialData?.total_value || 0,
    down_payment: initialData?.down_payment || 0,
    installments: initialData?.installments || 12,
    first_due_date: initialData?.date || new Date().toISOString().split('T')[0],
    device_color: initialData?.device_color || '',
    accessories: initialData?.accessories || '',
    payment_type: initialData?.payment_type || 'crediario',
    interest_table: 'standard',
    down_payment_method: 'money_pix',
    trade_device_model: '',
    trade_device_imei: ''
  });

  // ─── Accessories from inventory ─────────────────────────────────────
  type SelectedAccessory = {
    id: string;
    model: string;
    price: number;
    type: 'brinde' | 'venda';
    quantity: number;
    stockItem: typeof inventory[0];
  };

  const [selectedAccessories, setSelectedAccessories] = useState<SelectedAccessory[]>([]);
  const [accessoryDropdownOpen, setAccessoryDropdownOpen] = useState(false);
  const [accessorySearch, setAccessorySearch] = useState('');

  // Items available as accessories (with stock, excluding the selected device)
  const availableAccessories = useMemo(() =>
    inventory.filter(item =>
      item.id !== formData.device_id &&
      (item.stock_quantity || 0) > 0
    ),
  [inventory, formData.device_id]);

  const filteredAccessories = useMemo(() =>
    availableAccessories.filter(item =>
      item.model.toLowerCase().includes(accessorySearch.toLowerCase()) ||
      item.brand.toLowerCase().includes(accessorySearch.toLowerCase())
    ),
  [availableAccessories, accessorySearch]);

  const addAccessory = (item: typeof inventory[0]) => {
    // Don't add duplicates
    if (selectedAccessories.find(a => a.id === item.id)) return;
    setSelectedAccessories(prev => [...prev, {
      id: item.id,
      model: item.model,
      price: item.price,
      type: 'brinde', // default to brinde
      quantity: 1,
      stockItem: item
    }]);
    setAccessoryDropdownOpen(false);
    setAccessorySearch('');
  };

  const removeAccessory = (id: string) => {
    setSelectedAccessories(prev => prev.filter(a => a.id !== id));
  };

  const toggleAccessoryType = (id: string) => {
    setSelectedAccessories(prev => prev.map(a =>
      a.id === id ? { ...a, type: a.type === 'brinde' ? 'venda' : 'brinde' } : a
    ));
  };

  const [customDueDates, setCustomDueDates] = useState<string[]>([]);

  const handleDueDateChange = (idx: number, val: string) => {
    setCustomDueDates(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  // Initialize and update due dates based on base date and installment count
  React.useEffect(() => {
    if (formData.first_due_date && formData.installments > 0) {
      const dates: string[] = [];
      const baseDate = new Date(formData.first_due_date + 'T12:00:00'); // Use noon to avoid timezone issues
      for (let i = 1; i <= formData.installments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(baseDate.getMonth() + (i - 1));
        dates.push(dueDate.toISOString().split('T')[0]);
      }
      setCustomDueDates(dates);
    }
  }, [formData.first_due_date, formData.installments]);

  React.useEffect(() => {
    fetchInstallments();
  }, [formData.customer_id, fetchInstallments]);

  const availableDevices = useMemo(() => 
    inventory.filter(item => item.status === 'available' || (item.stock_quantity || 0) > 0), 
  [inventory]);

  const handleDeviceChange = (deviceId: string) => {
    const device = inventory.find(d => d.id === deviceId);
    if (device) {
      setFormData(prev => ({
        ...prev,
        device_id: deviceId,
        device_model: device.model,
        imei: device.imei,
        total_value: device.price
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        device_id: '',
        device_model: '',
        imei: '',
        total_value: 0
      }));
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  // MDR Coefficient Calculations
  const paymentType = (formData.payment_type || 'crediario') as 'crediario' | 'card';
  const installmentCount = formData.installments || 1;

  const baseCoefficient = useMemo(() => {
    if (paymentType === 'card') {
      return CARD_COEFFICIENTS[installmentCount] || (1 / installmentCount);
    }
    const table = formData.interest_table || 'standard';
    return CREDIARIO_COEFFICIENTS[table as 'premium' | 'standard' | 'flex']?.[installmentCount] || (1 / installmentCount);
  }, [paymentType, formData.interest_table, installmentCount]);

  // Customer Debt & Limit Calculations
  const customerDebts = useMemo(() => {
    if (!formData.customer_id) return 0;
    return installments
      .filter(i => i.customer_id === formData.customer_id && i.status !== 'paid')
      .reduce((sum, i) => sum + i.value, 0);
  }, [installments, formData.customer_id]);

  const availableLimit = useMemo(() => {
    if (!selectedCustomer) return 0;
    const totalLimit = selectedCustomer.credit_limit || 0;
    return Math.max(0, totalLimit - customerDebts);
  }, [selectedCustomer, customerDebts]);

  // Only 'venda' accessories add to the total price
  const accessoriesTotal = useMemo(() =>
    selectedAccessories
      .filter(a => a.type === 'venda')
      .reduce((sum, a) => sum + a.price * a.quantity, 0),
  [selectedAccessories]);

  const newFinancedAmount = useMemo(() => {
    return Math.max(0, (formData.total_value + accessoriesTotal) - formData.down_payment);
  }, [formData.total_value, accessoriesTotal, formData.down_payment]);

  const isOverLimit = useMemo(() => {
    if (formData.payment_type !== 'crediario' || !selectedCustomer) return false;
    return newFinancedAmount > availableLimit;
  }, [formData.payment_type, selectedCustomer, newFinancedAmount, availableLimit]);

  const minDownPayment = useMemo(() => {
    if (!selectedCustomer) return 0;
    const classification = (selectedCustomer.classification || 'BOM').toUpperCase();
    if (classification === 'RUIM') return formData.total_value * 0.5;
    if (classification === 'MEDIO') return formData.total_value * 0.2;
    return 0;
  }, [selectedCustomer, formData.total_value]);

  const riskMultiplier = useMemo(() => {
    if (paymentType === 'card' || !selectedCustomer) return 1.00;
    const classification = (selectedCustomer.classification || 'BOM').toUpperCase();
    if (classification === 'RUIM') return 1.15;
    if (classification === 'MEDIO') return 1.05;
    return 1.00;
  }, [selectedCustomer, paymentType]);

  const installmentValue = useMemo(() => {
    const financed = formData.total_value - formData.down_payment;
    if (financed <= 0) return 0;
    const finalCoeff = baseCoefficient * riskMultiplier;
    return financed * finalCoeff;
  }, [formData.total_value, formData.down_payment, baseCoefficient, riskMultiplier]);

  const totalInstallmentsValue = useMemo(() => {
    return installmentValue * installmentCount;
  }, [installmentValue, installmentCount]);

  const finalValue = useMemo(() => {
    return formData.down_payment + totalInstallmentsValue + accessoriesTotal;
  }, [formData.down_payment, totalInstallmentsValue, accessoriesTotal]);

  const feeValue = useMemo(() => {
    // Interest = final value minus base device price (accessories 'venda' are transparent cost)
    return Math.max(0, finalValue - formData.total_value - accessoriesTotal);
  }, [finalValue, formData.total_value, accessoriesTotal]);

  const availableInstallmentOptions = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }, []);

  const generatedInstallments = useMemo(() => {
    if (!formData.customer_id || formData.total_value <= 0) return [];

    return customDueDates.map((dueDate, idx) => ({
      number: idx + 1,
      total: formData.installments,
      value: installmentValue,
      dueDate: dueDate,
      status: 'pending'
    }));
  }, [formData.customer_id, formData.total_value, formData.installments, installmentValue, customDueDates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id || !formData.device_model || formData.total_value <= 0) {
      showNotification('error', 'Campos Obrigatórios', 'Por favor, preencha todos os campos corretamente.');
      return;
    }

    if (selectedCustomer && selectedCustomer.approved_for_purchase !== true) {
      showNotification('error', 'Cliente Bloqueado', 'Este cliente não está liberado para compras. É necessária a aprovação de um administrador.');
      return;
    }

    if (formData.down_payment < minDownPayment) {
      const pct = selectedCustomer?.classification === 'RUIM' ? '50%' : '20%';
      showNotification('error', 'Entrada Insuficiente', `Para clientes com classificação ${selectedCustomer?.classification || 'MEDIO'}, a entrada mínima exigida é de ${pct} (R$ ${minDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`);
      return;
    }

    if (formData.payment_type === 'crediario' && isOverLimit) {
      showNotification('error', 'Limite de Crédito Excedido', `O valor financiado (R$ ${newFinancedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o limite disponível do cliente (R$ ${availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Venda bloqueada. Apenas após nova análise de crédito.`);
      return;
    }

    try {
      // Build accessories string for DB and append metadata
      let accessoriesStr = selectedAccessories.length > 0
        ? selectedAccessories.map(a => `${a.model} (${a.type === 'brinde' ? 'Brinde' : `Venda R$${a.price.toFixed(2)}`})`).join(', ')
        : formData.accessories;

      const metadataParts: string[] = [];
      if (formData.payment_type === 'crediario') {
        const tableName = formData.interest_table === 'premium' ? 'PREMIUM (5%)' :
                          formData.interest_table === 'flex' ? 'FLEX (12%)' : 'STANDARD (8%)';
        metadataParts.push(`[Tabela: ${tableName}]`);
      }
      if (formData.down_payment > 0) {
        if (formData.down_payment_method === 'trade') {
          metadataParts.push(`[Entrada: Troca - ${formData.trade_device_model} (IMEI: ${formData.trade_device_imei || 'N/A'})]`);
        } else {
          metadataParts.push(`[Entrada: Dinheiro/PIX]`);
        }
      }

      if (metadataParts.length > 0) {
        accessoriesStr = accessoriesStr 
          ? `${accessoriesStr} | ${metadataParts.join(' | ')}`
          : metadataParts.join(' | ');
      }

      if (initialData) {
        await updateSale(initialData.id, {
          customer_id: formData.customer_id,
          device_model: formData.device_model,
          imei: formData.imei,
          total_value: finalValue,
          down_payment: formData.down_payment,
          service_fee: feeValue,
          original_price: formData.total_value,
          installments: formData.installments,
          date: formData.first_due_date,
          device_color: formData.device_color,
          accessories: accessoriesStr,
          payment_type: formData.payment_type as any
        });
        showNotification('success', 'Venda Atualizada');
        onSuccess();
      } else {
        const newSale: any = await addSale({
          unit_id: profile?.unit_id || undefined,
          customer_id: formData.customer_id,
          customer_name: selectedCustomer?.name,
          device_model: formData.device_model,
          imei: formData.imei,
          total_value: finalValue,
          down_payment: formData.down_payment,
          service_fee: feeValue,
          original_price: formData.total_value,
          installments: formData.installments,
          date: formData.first_due_date,
          device_color: formData.device_color,
          accessories: accessoriesStr,
          status: 'completed',
          payment_type: formData.payment_type as any
        });

        // Mark main device as sold
        if (formData.device_id) {
          await updateItem(formData.device_id, { status: 'sold' });
        }

        // Deduct stock for all accessories (both brinde and venda)
        for (const acc of selectedAccessories) {
          const currentStock = acc.stockItem.stock_quantity || 0;
          const newQty = Math.max(0, currentStock - acc.quantity);
          await updateItem(acc.id, {
            stock_quantity: newQty,
            ...(newQty === 0 ? { status: 'sold' as const } : {})
          });
        }

        // Create installments
        if (newSale?.id && formData.installments > 0) {
          const installmentsToCreate = generatedInstallments.map(inst => ({
            unit_id: profile?.unit_id || undefined,
            sale_id: newSale.id,
            customer_id: formData.customer_id,
            number: inst.number,
            total: inst.total,
            value: inst.value,
            due_date: inst.dueDate,
            status: 'pending' as const
          }));
          await addInstallments(installmentsToCreate);
        }

        showNotification('success', 'Venda Registrada');
        setIsSuccess(true);
      }
    } catch (error) {
      showNotification('error', initialData ? 'Erro ao atualizar venda' : 'Erro ao registrar venda');
    }
  };

  if (isSuccess && selectedCustomer) {
    const accessoriesStr = selectedAccessories.length > 0
      ? selectedAccessories.map(a => `${a.model} (${a.type === 'brinde' ? 'Brinde' : `Venda R$${a.price.toFixed(2)}`})`).join(', ')
      : formData.accessories;

    const metadataParts: string[] = [];
    if (formData.payment_type === 'crediario') {
      const tableName = formData.interest_table === 'premium' ? 'PREMIUM (5%)' :
                        formData.interest_table === 'flex' ? 'FLEX (12%)' : 'STANDARD (8%)';
      metadataParts.push(`[Tabela: ${tableName}]`);
    }
    if (formData.down_payment > 0) {
      if (formData.down_payment_method === 'trade') {
        metadataParts.push(`[Entrada: Troca - ${formData.trade_device_model} (IMEI: ${formData.trade_device_imei || 'N/A'})]`);
      } else {
        metadataParts.push(`[Entrada: Dinheiro/PIX]`);
      }
    }

    const finalAccessoriesStr = metadataParts.length > 0
      ? (accessoriesStr ? `${accessoriesStr} | ${metadataParts.join(' | ')}` : metadataParts.join(' | '))
      : accessoriesStr;

    const saleDataForPrint = {
      ...formData,
      date: formData.first_due_date,
      total_value: finalValue,
      original_price: formData.total_value,
      service_fee: feeValue,
      accessories: finalAccessoriesStr
    };
    return (
      <div className="text-center py-12 space-y-8 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-success/10 rounded-[32px] flex items-center justify-center mx-auto border border-success/20 text-success">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">Venda Realizada!</h2>
          <p className="text-on-surface-variant font-display">O registro foi concluído e o estoque atualizado.</p>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 max-w-sm mx-auto text-left">
          <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-2">Resumo</p>
          <p className="text-sm text-white font-black">{formData.installments}x de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-on-surface-variant">Total: R$ {finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Entrada: R$ {formData.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
          <button 
            onClick={() => printElement('sale-contract')}
            className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3"
          >
            <FileText size={18} />
            Imprimir Contrato
          </button>

          <button 
            onClick={() => printElement('sale-receipt')}
            className="w-full py-4 bg-primary/10 border border-primary/30 text-primary rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/20 transition-all flex items-center justify-center gap-3"
          >
            <Receipt size={18} />
            Imprimir Nota de Venda
          </button>
          
          <button 
            onClick={() => {
              onSuccess();
              hideModal();
            }}
            className="w-full py-4 bg-white/5 border border-white/10 text-on-surface-variant rounded-2xl font-black uppercase tracking-widest text-xs hover:text-white transition-all"
          >
            Fechar e Voltar
          </button>
        </div>

        {/* Hidden Printable Components */}
        <ContractPrint 
          sale={saleDataForPrint}
          customer={selectedCustomer}
          unit={unit || { name: 'MDR Informática' }}
          installmentValue={installmentValue}
        />
        <SaleReceiptPrint
          sale={saleDataForPrint}
          customer={selectedCustomer}
          unit={unit || { name: 'MDR Informática' }}
          installmentValue={installmentValue}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {selectedCustomer && (
        <>
          <div className={cn(
            "p-5 rounded-3xl border text-xs flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all animate-in fade-in duration-300",
            selectedCustomer.classification === 'RUIM' ? "bg-red-500/10 border-red-500/20 text-red-400" :
            selectedCustomer.classification === 'MEDIO' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
            "bg-success/10 border-success/20 text-success"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl border",
                selectedCustomer.classification === 'RUIM' ? "bg-red-500/10 border-red-500/20" :
                selectedCustomer.classification === 'MEDIO' ? "bg-yellow-500/10 border-yellow-500/20" :
                "bg-success/10 border-success/20"
              )}>
                <User size={18} />
              </div>
              <div>
                <p className="font-black uppercase tracking-wider text-[10px] opacity-60">Classificação de Risco</p>
                <h4 className="text-sm font-black uppercase leading-tight mt-0.5">
                  Cliente {selectedCustomer.classification || 'BOM'}
                </h4>
              </div>
            </div>
            <div className="flex-1 md:max-w-md text-[11px] leading-relaxed opacity-95">
              {selectedCustomer.classification === 'RUIM' && (
                <span>⚠️ <strong>Atenção:</strong> Exige entrada mínima de <strong>50%</strong> do valor do produto (R$ {minDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). O parcelamento é restrito a até <strong>12x</strong> com juros de 15% devido ao risco elevado.</span>
              )}
              {selectedCustomer.classification === 'MEDIO' && (
                <span>⚖️ <strong>Atenção:</strong> Exige entrada mínima de <strong>20%</strong> do valor do produto (R$ {minDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). O parcelamento possui um acréscimo padrão de <strong>5%</strong> sobre as taxas de juros.</span>
              )}
              {selectedCustomer.classification === 'BOM' && (
                <span>🌟 <strong>Excelente:</strong> Sem obrigatoriedade de entrada (entrada mínima de 0%). Taxa de juros básica sem acréscimo de risco (Tabela 1).</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/5 border border-white/10 rounded-3xl text-xs transition-all animate-in fade-in duration-300">
            <div>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Limite Pré-Aprovado</p>
              <p className="text-sm font-black text-white font-mono">R$ {(selectedCustomer.credit_limit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Saldo Devedor Ativo</p>
              <p className="text-sm font-black text-amber-400 font-mono">R$ {customerDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Limite de Crédito Disponível</p>
              <p className={`text-sm font-black font-mono ${availableLimit <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                R$ {availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            {formData.payment_type === 'crediario' && isOverLimit && (
              <div className="md:col-span-3 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl mt-1 animate-pulse">
                <AlertCircle size={14} className="shrink-0" />
                <span className="font-bold text-[10px] uppercase tracking-wider">
                  Bloqueio: Valor financiado (R$ {newFinancedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o limite disponível! Apenas após nova análise de crédito.
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Cliente</label>
          <select 
            required
            value={formData.customer_id}
            onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            <option value="" className="bg-surface-container-high">Selecionar Cliente...</option>
            {customers.map(c => {
              const isBlocked = c.approved_for_purchase !== true;
              return (
                <option 
                  key={c.id} 
                  value={c.id} 
                  disabled={isBlocked}
                  className="bg-surface-container-high"
                >
                  {c.name} - {c.cpf}{isBlocked ? ' (BLOQUEADO - Sem Aprovação)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Selection Strategy Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Vincular do Estoque</label>
          <select 
            value={formData.device_id}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            <option value="" className="bg-surface-container-high">-- Entrada Manual --</option>
            {availableDevices.map(d => (
              <option key={d.id} value={d.id} className="bg-surface-container-high">
                {d.model}{d.imei ? ` - ${d.imei}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Device Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Modelo do Aparelho</label>
          <input 
            type="text" 
            required
            placeholder="Ex: iPhone 15 Pro Max"
            value={formData.device_model}
            onChange={(e) => setFormData(prev => ({ ...prev, device_model: e.target.value }))}
            readOnly={!!formData.device_id}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all",
              formData.device_id && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">IMEI / Serial</label>
          <input 
            type="text" 
            required
            placeholder="Número do IMEI"
            value={formData.imei}
            onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
          {formData.device_id && <p className="text-[10px] text-on-surface-variant pl-1 opacity-60">Preenchido do estoque — edite se necessário</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Valor Total (R$)</label>
          <input 
            type="number" 
            required
            placeholder="0.00"
            value={formData.total_value === 0 ? '' : formData.total_value}
            onChange={(e) => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, total_value: val === '' ? 0 : Number(val) }));
            }}
            readOnly={!!formData.device_id}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all",
              formData.device_id && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Entrada (R$)</label>
          <input 
            type="number" 
            placeholder="0.00"
            value={formData.down_payment === 0 ? '' : formData.down_payment}
            onChange={(e) => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, down_payment: val === '' ? 0 : Number(val) }));
            }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>

        {formData.down_payment > 0 && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-white/5 rounded-[32px] border border-white/10 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Método de Entrada</label>
              <select 
                value={formData.down_payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, down_payment_method: e.target.value }))}
                className="w-full bg-[#1e1e38] border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
              >
                <option value="money_pix" className="bg-[#1e1e38]">Dinheiro / PIX</option>
                <option value="trade" className="bg-[#1e1e38]">Troca (Celular/Aparelho)</option>
              </select>
            </div>
            {formData.down_payment_method === 'trade' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Aparelho na Troca (Modelo)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: iPhone 11 64GB"
                    value={formData.trade_device_model}
                    onChange={(e) => setFormData(prev => ({ ...prev, trade_device_model: e.target.value }))}
                    className="w-full bg-[#1e1e38] border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">IMEI / Serial (Troca)</label>
                  <input 
                    type="text" 
                    placeholder="Número do IMEI"
                    value={formData.trade_device_imei}
                    onChange={(e) => setFormData(prev => ({ ...prev, trade_device_imei: e.target.value }))}
                    className="w-full bg-[#1e1e38] border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Forma de Parcelamento</label>
          <select 
            value={formData.payment_type}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_type: e.target.value as any }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            <option value="crediario" className="bg-surface-container-high">Crediário da Loja</option>
            <option value="card" className="bg-surface-container-high">Cartão de Crédito</option>
          </select>
        </div>

        {formData.payment_type === 'crediario' && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Tabela de Juros</label>
            <select 
              value={formData.interest_table}
              onChange={(e) => setFormData(prev => ({ ...prev, interest_table: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
            >
              <option value="premium" className="bg-surface-container-high">🟢 Premium (5% a.m.)</option>
              <option value="standard" className="bg-surface-container-high">🟡 Standard (8% a.m.)</option>
              <option value="flex" className="bg-surface-container-high">🔴 Flex (12% a.m.)</option>
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Parcelas</label>
          <select 
            value={formData.installments}
            onChange={(e) => setFormData(prev => ({ ...prev, installments: Number(e.target.value) }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            {availableInstallmentOptions.map(n => (
              <option key={n} value={n} className="bg-surface-container-high">{n} Parcela(s)</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">1º Vencimento</label>
          <input 
            type="date" 
            value={formData.first_due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, first_due_date: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Cor do Aparelho</label>
          <input 
            type="text" 
            placeholder="Ex: Titânio Natural"
            value={formData.device_color}
            onChange={(e) => setFormData(prev => ({ ...prev, device_color: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="md:col-span-2 space-y-3">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Acessórios Inclusos</label>

          {/* Selected accessories list */}
          {selectedAccessories.length > 0 && (
            <div className="space-y-2">
              {selectedAccessories.map(acc => (
                <div key={acc.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">{acc.model}</p>
                    <p className="text-[10px] text-on-surface-variant">R$ {acc.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  {/* Brinde / Venda toggle */}
                  <button
                    type="button"
                    onClick={() => toggleAccessoryType(acc.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                      acc.type === 'brinde'
                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
                        : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {acc.type === 'brinde' ? <Gift size={11} /> : <ShoppingBag size={11} />}
                    {acc.type === 'brinde' ? 'Brinde' : 'Venda'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAccessory(acc.id)}
                    className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add accessory dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccessoryDropdownOpen(prev => !prev)}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-white/5 border border-dashed border-white/20 rounded-2xl text-[10px] font-black text-on-surface-variant hover:text-white hover:border-white/40 transition-all"
            >
              <Plus size={14} />
              Buscar acessório do estoque
              {availableAccessories.length > 0 && (
                <span className="ml-auto text-[8px] bg-white/10 px-2 py-0.5 rounded-full">{availableAccessories.length} disponíveis</span>
              )}
            </button>

            {accessoryDropdownOpen && (
              <div className="absolute z-20 top-full mt-2 w-full bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-3 border-b border-white/5">
                  <input
                    type="text"
                    placeholder="Buscar por nome ou marca..."
                    value={accessorySearch}
                    onChange={e => setAccessorySearch(e.target.value)}
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-primary"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredAccessories.length === 0 ? (
                    <p className="text-[10px] text-on-surface-variant text-center p-4">Nenhum item encontrado no estoque</p>
                  ) : (
                    filteredAccessories.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addAccessory(item)}
                        disabled={!!selectedAccessories.find(a => a.id === item.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 text-left transition-all disabled:opacity-40"
                      >
                        <div>
                          <p className="text-xs font-black text-white">{item.model}</p>
                          <p className="text-[9px] text-on-surface-variant">{item.brand} · Estoque: {item.stock_quantity}</p>
                        </div>
                        <span className="text-xs font-black text-primary font-mono">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedAccessories.length > 0 && (
            <div className="flex items-center justify-between text-[10px] px-1">
              <span className="text-on-surface-variant">
                {selectedAccessories.filter(a => a.type === 'brinde').length} brinde(s) · {selectedAccessories.filter(a => a.type === 'venda').length} venda(s)
              </span>
              {accessoriesTotal > 0 && (
                <span className="text-green-400 font-black">+ R$ {accessoriesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} adicionado ao total</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {generatedInstallments.length > 0 && (
        <div className="mt-8 p-6 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-white/5">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Resumo da Negociação</h4>
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none">Taxas MDR Aplicadas</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Preço Base (Aparelho)</p>
              <p className="text-sm font-black text-white font-mono">R$ {formData.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Índice ({formData.installments}x)</p>
              <p className="text-sm font-black text-primary font-mono">{(baseCoefficient * riskMultiplier).toFixed(6)}</p>
            </div>
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Juros/Serviço (R$)</p>
              <p className="text-sm font-black text-primary font-mono">+ R$ {feeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Valor Final</p>
              <p className="text-sm font-black text-white font-mono">R$ {finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          {accessoriesTotal > 0 && (
            <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-2xl text-xs">
              <ShoppingBag size={14} className="text-green-400 shrink-0" />
              <span className="text-on-surface-variant">Acessórios (venda):</span>
              <span className="text-green-400 font-black font-mono">+ R$ {accessoriesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className="text-on-surface-variant ml-auto text-[10px]">incluídos no Valor Final</span>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Plano de {formData.installments}x</p>
              <p className="text-xl font-black text-white font-mono">R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Entrada</p>
              <p className="text-sm font-black text-on-surface-variant font-mono">R$ {formData.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">📅 Vencimentos — ajuste as datas individualmente:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {generatedInstallments.map((inst, i) => (
                <div key={i} className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Parcela {inst.number}/{formData.installments}</p>
                  <input
                    type="date"
                    value={customDueDates[i] || ''}
                    onChange={(e) => handleDueDateChange(i, e.target.value)}
                    className="w-full bg-transparent border border-white/10 rounded-xl px-2 py-1.5 text-[11px] font-black text-white focus:border-primary outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
        >
          Cancelar
        </button>
          <button 
          type="submit"
          className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Save size={16} /> {initialData ? 'Atualizar Venda' : 'Finalizar Venda'}
        </button>
      </div>
    </form>
  );
}
