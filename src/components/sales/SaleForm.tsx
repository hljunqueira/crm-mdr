import React, { useState, useMemo } from 'react';
import { Smartphone, User, DollarSign, Calendar, Calculator, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useSaleStore } from '../../store/useSaleStore';
import { useFinanceStore, Installment } from '../../store/useFinanceStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useUI } from '../../context/UIContext';

interface SaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SaleForm({ onSuccess, onCancel }: SaleFormProps) {
  const { customers } = useCustomerStore();
  const { addSale } = useSaleStore();
  const { addInstallments } = useFinanceStore();
  const { inventory, updateItem } = useInventoryStore();
  const { showNotification } = useUI();

  const [formData, setFormData] = useState({
    customerId: '',
    deviceId: '',
    deviceModel: '',
    imei: '',
    totalValue: 0,
    downPayment: 0,
    installments: 12,
    firstDueDate: new Date().toISOString().split('T')[0]
  });

  const availableDevices = useMemo(() => 
    inventory.filter(item => item.status === 'available'), 
  [inventory]);

  const handleDeviceChange = (deviceId: string) => {
    const device = inventory.find(d => d.id === deviceId);
    if (device) {
      setFormData(prev => ({
        ...prev,
        deviceId,
        deviceModel: device.model,
        imei: device.imei,
        totalValue: device.price
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        deviceId: '',
        deviceModel: '',
        imei: '',
        totalValue: 0
      }));
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  const installmentValue = useMemo(() => {
    const financed = formData.totalValue - formData.downPayment;
    return financed > 0 ? financed / formData.installments : 0;
  }, [formData.totalValue, formData.downPayment, formData.installments]);

  const generatedInstallments = useMemo(() => {
    if (!formData.customerId || formData.totalValue <= 0) return [];

    const preview: Partial<Installment>[] = [];
    const baseDate = new Date(formData.firstDueDate);

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

    if (!formData.customerId || !formData.deviceModel || formData.totalValue <= 0) {
      showNotification('error', 'Campos Obrigatórios', 'Por favor, preencha todos os campos corretamente.');
      return;
    }

    try {
      const saleId = `S-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // 1. Add Sale
      await addSale({
        customerId: formData.customerId,
        customerName: selectedCustomer?.name || 'Cliente Desconhecido',
        deviceModel: formData.deviceModel,
        imei: formData.imei,
        totalValue: formData.totalValue,
        downPayment: formData.downPayment,
        installments: formData.installments,
        date: new Date().toISOString().split('T')[0],
        status: 'completed'
      });

      // 2. Add Installments
      const installmentsToSave: Installment[] = generatedInstallments.map((inst, index) => ({
        id: `P-${saleId.split('-')[1]}-${index + 1}`,
        saleId: saleId,
        customerName: selectedCustomer?.name || 'Cliente Desconhecido',
        number: inst.number!,
        total: inst.total!,
        value: inst.value!,
        dueDate: inst.dueDate!,
        status: 'pending' as const
      }));

      await addInstallments(installmentsToSave);

      // 3. Mark Device as Sold if applicable
      if (formData.deviceId) {
        await updateItem(formData.deviceId, { status: 'sold' });
      }
      
      showNotification('success', 'Venda Registrada', `Venda de ${formData.deviceModel} para ${selectedCustomer?.name} concluída com sucesso.`);
      onSuccess();
    } catch (error) {
      showNotification('error', 'Erro no Servidor', 'Não foi possível registrar a venda.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Section */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <User size={14} className="text-primary" /> Cliente
          </label>
          <select 
            value={formData.customerId}
            onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            <option value="" className="bg-surface-container-high">Selecionar Cliente...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id} className="bg-surface-container-high">{c.name} - {c.cpf}</option>
            ))}
          </select>
        </div>

        {/* Selection Strategy Section */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <Layers size={14} className="text-primary" /> Selecionar do Estoque (Opcional)
          </label>
          <select 
            value={formData.deviceId}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            <option value="" className="bg-surface-container-high">-- Entrada Manual --</option>
            {availableDevices.map(d => (
              <option key={d.id} value={d.id} className="bg-surface-container-high">{d.model} - {d.imei} (R$ {d.price})</option>
            ))}
          </select>
        </div>

        {/* Device Section */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <Smartphone size={14} className="text-primary" /> Modelo do Aparelho
          </label>
          <input 
            type="text" 
            placeholder="Ex: iPhone 15 Pro Max"
            value={formData.deviceModel}
            onChange={(e) => setFormData(prev => ({ ...prev, deviceModel: e.target.value }))}
            readOnly={!!formData.deviceId}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all",
              formData.deviceId && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <Calculator size={14} className="text-primary" /> IMEI / Serial
          </label>
          <input 
            type="text" 
            placeholder="Número do IMEI"
            value={formData.imei}
            onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
            readOnly={!!formData.deviceId}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all",
              formData.deviceId && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <DollarSign size={14} className="text-primary" /> Valor Total (R$)
          </label>
          <input 
            type="number" 
            placeholder="0.00"
            value={formData.totalValue || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, totalValue: Number(e.target.value) }))}
            readOnly={!!formData.deviceId}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all",
              formData.deviceId && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <DollarSign size={14} className="text-primary" /> Entrada (R$)
          </label>
          <input 
            type="number" 
            placeholder="0.00"
            value={formData.downPayment || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, downPayment: Number(e.target.value) }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <Layers size={14} className="text-primary" /> Parcelas
          </label>
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

        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} className="text-primary" /> 1º Vencimento
          </label>
          <input 
            type="date" 
            value={formData.firstDueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, firstDueDate: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Preview Section */}
      {generatedInstallments.length > 0 && (
        <div className="mt-8 p-6 bg-primary/5 rounded-[32px] border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Resumo do Financiamento</h4>
            <div className="text-right">
              <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest">Valor da Parcela</p>
              <p className="text-lg font-black text-white font-mono">R$ {installmentValue.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {generatedInstallments.slice(0, 4).map((inst, i) => (
              <div key={i} className="bg-surface-container-high p-3 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Parcela {inst.number}</p>
                <p className="text-[10px] font-black text-white">{new Date(inst.dueDate!).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
          {generatedInstallments.length > 4 && (
            <p className="text-[9px] text-on-surface-variant mt-3 italic">+ {generatedInstallments.length - 4} outras parcelas geradas consecutivamente.</p>
          )}
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
          className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20"
        >
          Concluir Venda e Gerar Parcelas
        </button>
      </div>
    </form>
  );
}
