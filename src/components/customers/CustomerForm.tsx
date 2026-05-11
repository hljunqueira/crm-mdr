import React, { useState } from 'react';
import { User, CreditCard, Phone, MapPin, Save, X } from 'lucide-react';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useUI } from '../../context/UIContext';

interface CustomerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomerForm({ onSuccess, onCancel }: CustomerFormProps) {
  const { addCustomer } = useCustomerStore();
  const { showNotification } = useUI();

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    address: '',
    status: 'active' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.cpf) {
      showNotification('error', 'Erro', 'Nome e CPF são obrigatórios.');
      return;
    }

    try {
      await addCustomer(formData);
      showNotification('success', 'Cliente Cadastrado', `${formData.name} foi adicionado à base de dados.`);
      onSuccess();
    } catch (error) {
      showNotification('error', 'Erro no Servidor', 'Não foi possível cadastrar o cliente.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
          <User size={14} className="text-primary" /> Nome Completo
        </label>
        <input 
          type="text" 
          placeholder="Ex: João da Silva"
          value={formData.name}
          onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <CreditCard size={14} className="text-primary" /> CPF
          </label>
          <input 
            type="text" 
            placeholder="000.000.000-00"
            value={formData.cpf}
            onChange={(e) => setFormData(p => ({ ...p, cpf: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <Phone size={14} className="text-primary" /> Telefone / WhatsApp
          </label>
          <input 
            type="text" 
            placeholder="(00) 00000-0000"
            value={formData.phone}
            onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
          <MapPin size={14} className="text-primary" /> Endereço Residencial
        </label>
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
          <Save size={16} /> Salvar Cliente
        </button>
      </div>
    </form>
  );
}
