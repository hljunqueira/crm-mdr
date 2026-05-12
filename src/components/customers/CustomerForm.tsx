import React, { useState } from 'react';
import { User, CreditCard, Phone, MapPin, Save, X } from 'lucide-react';
import { useCustomerStore, Customer } from '../../store/useCustomerStore';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../store/useAuthStore';

interface CustomerFormProps {
  initialData?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomerForm({ initialData, onSuccess, onCancel }: CustomerFormProps) {
  const { addCustomer, updateCustomer } = useCustomerStore();
  const { showNotification } = useUI();
  const { profile } = useAuthStore();

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cpf: initialData?.cpf || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    status: (initialData?.status || 'active') as any
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (initialData) {
        await updateCustomer(initialData.id, formData);
        showNotification('success', 'Cliente Atualizado');
      } else {
        await addCustomer({
          ...formData,
          unit_id: profile?.unit_id || undefined
        });
        showNotification('success', 'Cliente Cadastrado');
      }
      onSuccess();
    } catch (error) {
      showNotification('error', 'Erro ao salvar cliente');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome Completo</label>
        <input 
          type="text" 
          required
          placeholder="Ex: João da Silva"
          value={formData.name}
          onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">CPF</label>
          <input 
            type="text" 
            required
            placeholder="000.000.000-00"
            value={formData.cpf}
            onChange={(e) => setFormData(p => ({ ...p, cpf: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">WhatsApp</label>
          <input 
            type="text" 
            required
            placeholder="(00) 00000-0000"
            value={formData.phone}
            onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Endereço</label>
        <input 
          type="text" 
          placeholder="Rua, Número, Bairro, Cidade - UF"
          value={formData.address}
          onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
        />
      </div>

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
          <Save size={16} /> {initialData ? 'Atualizar Cliente' : 'Salvar Cliente'}
        </button>
      </div>
    </form>
  );
}
