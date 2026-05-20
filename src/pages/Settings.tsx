import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Globe, 
  ShieldCheck, 
  MessageCircle, 
  Smartphone, 
  Bell, 
  CreditCard,
  User,
  Building2,
  Key,
  Database,
  Save,
  CheckCircle2,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUnitStore } from '../store/useUnitStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'unit' | 'white-label' | 'notifications';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('unit');
  const { profile } = useAuthStore();
  const { unit, units, fetchUnit, fetchAllUnits, updateUnit, isLoading } = useUnitStore();
  const { showNotification } = useUI();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    contract_terms: '',
    warranty_terms: '',
    pix_key: '',
    pix_key_type: 'cnpj' as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllUnits();
    } else if (profile?.unit_id) {
      fetchUnit(profile.unit_id);
    }
  }, [profile, fetchUnit, fetchAllUnits]);

  // Ao carregar a lista ou a unidade inicial, seleciona a primeira
  useEffect(() => {
    if (!selectedUnitId) {
      if (profile?.role === 'admin' && units.length > 0) {
        setSelectedUnitId(units[0].id);
      } else if (unit) {
        setSelectedUnitId(unit.id);
      }
    }
  }, [units, unit, profile, selectedUnitId]);

  // Carrega os dados da unidade selecionada no form
  useEffect(() => {
    const currentUnit = units.find(u => u.id === selectedUnitId) || unit;
    if (currentUnit && currentUnit.id === selectedUnitId) {
      setFormData({
        name: currentUnit.name || '',
        cnpj: currentUnit.cnpj || '',
        address: currentUnit.address || '',
        phone: currentUnit.phone || '',
        contract_terms: currentUnit.contract_terms || '',
        warranty_terms: currentUnit.warranty_terms || '',
        pix_key: currentUnit.pix_key || '',
        pix_key_type: (currentUnit.pix_key_type as any) || 'cnpj'
      });
    }
  }, [selectedUnitId, units, unit]);

  const handleSave = async () => {
    if (!selectedUnitId) return;
    try {
      await updateUnit(selectedUnitId, formData);
      showNotification('success', 'Configurações Salvas', 'Os dados da unidade foram atualizados com sucesso.');
    } catch (error) {
      showNotification('error', 'Erro ao Salvar', 'Não foi possível atualizar as configurações.');
    }
  };

  const menuItems = [
    { id: 'unit', label: 'Gerenciar Unidades', icon: Building2 },
    { id: 'white-label', label: 'Identidade Visual', icon: Palette },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="p-8 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Configurações</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gerencie sua rede e integrações</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={!selectedUnitId}
          className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50"
        >
          <Save size={18} />
          Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                activeTab === item.id 
                  ? "bg-white text-black border-white shadow-xl shadow-white/5" 
                  : "bg-white/[0.02] text-on-surface-variant border-transparent hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'unit' && (
              <motion.div 
                key="unit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-10 border border-white/5 rounded-[40px] space-y-8 bg-white/[0.02]"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Gerenciar Unidades</h2>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Selecione a loja para editar os dados</p>
                    </div>
                  </div>
                </div>

                {/* Lista de Unidades para Admin */}
                {profile?.role === 'admin' && units.length > 0 && (
                  <div className="flex flex-wrap gap-4 mb-10 p-2 bg-white/5 rounded-[32px] border border-white/10">
                    {units.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUnitId(u.id)}
                        className={cn(
                          "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                          selectedUnitId === u.id 
                            ? "bg-white text-black shadow-lg shadow-white/5" 
                            : "text-on-surface-variant hover:text-white"
                        )}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Nome da Loja</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">CNPJ</label>
                    <input 
                      type="text" 
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Endereço Completo</label>
                    <input 
                      type="text" 
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Telefone de Contato</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* PIX Section */}
                <div className="pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Dados para Recebimento PIX</h3>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Usados no modal de cobrança e nas mensagens WhatsApp</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Tipo de Chave PIX</label>
                      <select
                        value={formData.pix_key_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, pix_key_type: e.target.value as any }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all appearance-none"
                      >
                        <option value="cnpj" className="bg-surface-container-high">CNPJ</option>
                        <option value="cpf" className="bg-surface-container-high">CPF</option>
                        <option value="email" className="bg-surface-container-high">E-mail</option>
                        <option value="phone" className="bg-surface-container-high">Telefone</option>
                        <option value="random" className="bg-surface-container-high">Chave Aleatória</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Chave PIX</label>
                      <input
                        type="text"
                        placeholder={
                          formData.pix_key_type === 'cnpj' ? '00.000.000/0001-00' :
                          formData.pix_key_type === 'cpf' ? '000.000.000-00' :
                          formData.pix_key_type === 'email' ? 'pagamentos@suaempresa.com' :
                          formData.pix_key_type === 'phone' ? '+55 (48) 99999-9999' :
                          'Chave aleatória UUID'
                        }
                        value={formData.pix_key}
                        onChange={(e) => setFormData(prev => ({ ...prev, pix_key: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-green-400 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {formData.pix_key && (
                    <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl flex items-center gap-4">
                      <QrCode size={32} className="text-green-400 shrink-0" />
                      <div>
                        <p className="text-[9px] text-green-400 uppercase tracking-widest font-black">Prévia — Como aparecerá nas cobranças</p>
                        <p className="text-sm text-white font-black font-mono mt-0.5">{formData.pix_key}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">Tipo: {formData.pix_key_type?.toUpperCase()} · Beneficiário: {formData.name || 'Nome da Loja'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-white/5 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary" />
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Termos de Garantia</label>
                    </div>
                    <textarea 
                      rows={4}
                      value={formData.warranty_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, warranty_terms: e.target.value }))}
                      placeholder="Descreva aqui os termos de garantia padrão para os aparelhos..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all resize-none font-sans leading-relaxed"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-primary" />
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Cláusulas do Contrato</label>
                    </div>
                    <textarea 
                      rows={6}
                      value={formData.contract_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_terms: e.target.value }))}
                      placeholder="Insira aqui as cláusulas do contrato de venda e financiamento..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-white outline-none transition-all resize-none font-sans leading-relaxed text-xs opacity-80"
                    />
                  </div>
                </div>
              </motion.div>
            )}


            {activeTab === 'white-label' && (
              <motion.div 
                key="white-label"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-10 border border-white/5 rounded-[40px] space-y-8 bg-white/[0.02]"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Palette size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Identidade Visual</h2>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Personalização da Plataforma</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Logo da Unidade</label>
                    <div className="w-full aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-4 group hover:border-white/20 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant group-hover:text-white transition-all">
                        <Smartphone size={24} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant group-hover:text-white transition-all">Upload Logo PNG/SVG</span>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest pl-1">Cor de Destaque</label>
                      <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/20" />
                        <input type="text" value="#FFFFFF" readOnly className="flex-1 bg-transparent text-[10px] font-mono font-black text-on-surface-variant outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

