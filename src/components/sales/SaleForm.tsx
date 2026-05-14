import React, { useState, useMemo } from 'react';
import { Smartphone, User, DollarSign, Calendar, Calculator, CheckCircle2, AlertCircle, Layers, Save, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useSaleStore } from '../../store/useSaleStore';
import { useFinanceStore, Installment } from '../../store/useFinanceStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useUnitStore } from '../../store/useUnitStore';
import { printElement } from '../../lib/utils';
import ContractPrint from './ContractPrint';

interface SaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SaleForm({ onSuccess, onCancel }: SaleFormProps) {
  const { customers } = useCustomerStore();
  const { addSale } = useSaleStore();
  const { addInstallments } = useFinanceStore();
  const { inventory, updateItem } = useInventoryStore();
  const { showNotification, hideModal } = useUI();
  const { profile } = useAuthStore();
  const { unit } = useUnitStore();

  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    device_id: '',
    device_model: '',
    imei: '',
    total_value: 0,
    down_payment: 0,
    installments: 12,
    first_due_date: new Date().toISOString().split('T')[0],
    service_fee: 0 // New field for manual override
  });

  const availableDevices = useMemo(() => 
    inventory.filter(item => item.status === 'available'), 
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

  // MDR Fee Logic from Commercial Conditions
  const suggestedFee = useMemo(() => {
    const price = formData.total_value;
    const hasDownPayment = formData.down_payment > 0;
    
    if (price <= 0) return 0;
    if (price <= 2000) return hasDownPayment ? 0.05 : 0.08;
    if (price <= 3000) return hasDownPayment ? 0.08 : 0.10;
    if (price <= 3500) return 0.15;
    return 0.18;
  }, [formData.total_value, formData.down_payment]);

  // Update manual fee when price changes significantly if it was 0 or same as previous suggested
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, service_fee: suggestedFee * 100 }));
  }, [suggestedFee]);

  const feePercentage = formData.service_fee / 100;
  const feeValue = formData.total_value * feePercentage;
  const finalValue = formData.total_value + feeValue;

  const installmentValue = useMemo(() => {
    const financed = finalValue - formData.down_payment;
    return financed > 0 ? financed / formData.installments : 0;
  }, [finalValue, formData.down_payment, formData.installments]);

  const generatedInstallments = useMemo(() => {
    if (!formData.customer_id || formData.total_value <= 0) return [];

    const preview: any[] = [];
    const baseDate = new Date(formData.first_due_date);

    for (let i = 1; i <= formData.installments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(baseDate.getMonth() + (i - 1));
      
      preview.push({
        number: i,
        total: formData.installments,
        value: installmentValue,
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending'
      });
    }
    return preview;
  }, [formData, installmentValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id || !formData.device_model || formData.total_value <= 0) {
      showNotification('error', 'Campos Obrigatórios', 'Por favor, preencha todos os campos corretamente.');
      return;
    }

    try {
      // 1. Add Sale
      await addSale({
        unit_id: profile?.unit_id || undefined,
        customer_id: formData.customer_id,
        device_model: formData.device_model,
        imei: formData.imei,
        total_value: finalValue,
        down_payment: formData.down_payment,
        installments: formData.installments,
        date: new Date().toISOString().split('T')[0],
        status: 'completed'
      });

      // 2. Mark Device as Sold if applicable
      if (formData.device_id) {
        await updateItem(formData.device_id, { status: 'sold' });
      }
      
      showNotification('success', 'Venda Registrada');
      setIsSuccess(true);
      // Removed automatic onCancel/hideModal to show the success view
    } catch (error) {
      showNotification('error', 'Erro ao registrar venda');
    }
  };

  if (isSuccess && selectedCustomer) {
    return (
      <div className="text-center py-12 space-y-8 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-success/10 rounded-[32px] flex items-center justify-center mx-auto border border-success/20 text-success">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">Venda Realizada!</h2>
          <p className="text-on-surface-variant font-display">O registro foi concluído e o estoque atualizado.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
          <button 
            onClick={() => printElement('sale-contract')}
            className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3"
          >
            <FileText size={20} />
            Imprimir Contrato
          </button>
          
          <button 
            onClick={() => {
              onSuccess();
              hideModal();
            }}
            className="w-full py-5 bg-white/5 border border-white/10 text-on-surface-variant rounded-2xl font-black uppercase tracking-widest text-xs hover:text-white transition-all"
          >
            Fechar e Voltar
          </button>
        </div>

        {/* Hidden Printable Component */}
        <ContractPrint 
          sale={{
            ...formData,
            date: formData.first_due_date,
            total_value: finalValue
          }}
          customer={selectedCustomer}
          unit={unit || { name: 'MDR Informática' }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            {customers.map(c => (
              <option key={c.id} value={c.id} className="bg-surface-container-high">{c.name} - {c.cpf}</option>
            ))}
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
              <option key={d.id} value={d.id} className="bg-surface-container-high">{d.model} - {d.imei}</option>
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
            readOnly={!!formData.device_id}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all",
              formData.device_id && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Valor Total (R$)</label>
          <input 
            type="number" 
            required
            placeholder="0.00"
            value={formData.total_value || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, total_value: Number(e.target.value) }))}
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
            value={formData.down_payment || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, down_payment: Number(e.target.value) }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Parcelas</label>
          <select 
            value={formData.installments}
            onChange={(e) => setFormData(prev => ({ ...prev, installments: Number(e.target.value) }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            {[1, 2, 3, 6, 10, 12, 18, 24].map(n => (
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Preço Base</p>
              <p className="text-sm font-black text-white font-mono">R$ {formData.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Taxa de Serviço (%)</p>
              <div className="relative group">
                <input 
                  type="number"
                  step="0.1"
                  value={formData.service_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_fee: Number(e.target.value) }))}
                  className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-black text-primary font-mono focus:border-primary outline-none transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/40 pointer-events-none group-focus-within:opacity-0 transition-opacity">%</span>
              </div>
            </div>
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Acréscimo (R$)</p>
              <p className="text-sm font-black text-primary font-mono">+ R$ {feeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Valor Final</p>
              <p className="text-sm font-black text-white font-mono">R$ {finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {generatedInstallments.slice(0, 4).map((inst, i) => (
              <div key={i} className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Parcela {inst.number}</p>
                <p className="text-[10px] font-black text-white">{new Date(inst.dueDate!).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
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
          <Save size={16} /> Finalizar Venda
        </button>
      </div>
    </form>
  );
}
