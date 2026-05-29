import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, Search, Plus, Loader2, AlertCircle, CheckCircle2, 
  User, Phone, FileText, Printer, ExternalLink, ShieldAlert, 
  Save, ArrowLeft, Trash2, Smartphone, Monitor, PrinterIcon, 
  Gamepad2, PlusCircle, Check, Info, Calendar, DollarSign, Send
} from 'lucide-react';
import { useServiceOrderStore, ServiceOrder } from '../store/useServiceOrderStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { formatCPF, formatPhone, printElement } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

const DEVICE_CATEGORIES = [
  { id: 'all', label: 'Tudo', icon: Wrench },
  { id: 'smartphone', label: 'Celular', icon: Smartphone },
  { id: 'notebook', label: 'Notebook', icon: Monitor },
  { id: 'desktop', label: 'Computador PC', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Smartphone },
  { id: 'printer', label: 'Impressora', icon: PrinterIcon },
  { id: 'console', label: 'Console Video Game', icon: Gamepad2 },
  { id: 'other', label: 'Outros', icon: Wrench }
];

const ACCESSORY_SUGGESTIONS: Record<string, string[]> = {
  smartphone: ['Capinha', 'Película', 'Carregador', 'Cabo USB', 'Gaveta de Chip', 'Cartão SD'],
  tablet: ['Capinha', 'Carregador', 'Cabo USB', 'Teclado Portátil', 'Caneta Touch'],
  notebook: ['Fonte de Alimentação', 'Cabo de Energia', 'Mochila / Case', 'Mouse USB', 'Cadeado Trava'],
  desktop: ['Cabo de Força', 'Adaptador Wi-Fi', 'Teclado', 'Mouse', 'Cabo HDMI/VGA'],
  printer: ['Cabo de Força', 'Cabo USB', 'Cartucho Preto', 'Cartucho Colorido', 'Tonner'],
  console: ['Cabo HDMI', 'Cabo de Força', 'Controle Sem Fio', 'Controle com Fio', 'Base de Cooler', 'Cabo de Carga'],
  other: ['Cabo de Força', 'Fonte de Alimentação', 'Cabo de Conexão', 'Bolsa de Transporte']
};

const COMP_CHECKLIST = [
  { id: 'post', label: 'Inicialização (POST)' },
  { id: 'ssd', label: 'Saúde do HD/SSD' },
  { id: 'ram', label: 'Memória RAM' },
  { id: 'cooler', label: 'Cooler & Temperatura' },
  { id: 'usb', label: 'Conexões USB' },
  { id: 'keyboard', label: 'Teclado / Touchpad' },
  { id: 'software', label: 'Sistema / Drivers' }
];

const MOBILE_CHECKLIST = [
  { id: 'screen', label: 'Display & Touchscreen' },
  { id: 'cameras', label: 'Câmeras (Frontal/Traseira)' },
  { id: 'audio', label: 'Microfone & Alto-falante' },
  { id: 'wifi', label: 'Wi-Fi & Bluetooth' },
  { id: 'proximity', label: 'Sensor de Proximidade' },
  { id: 'buttons', label: 'Botões Físicos' },
  { id: 'charge', label: 'Conector de Carga' }
];

export default function ServiceOrders() {
  const { 
    serviceOrders, fetchServiceOrders, currentServiceOrder, fetchServiceOrderById,
    createServiceOrder, updateServiceOrder, deleteServiceOrder, addPartToOs,
    deletePartFromOs, notifyOsStatus, isLoading 
  } = useServiceOrderStore();
  
  const { customers, fetchCustomers } = useCustomerStore();
  const { inventory, fetchInventory } = useInventoryStore();
  const { showNotification } = useUI();
  const { profile } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);
  
  // Navigation / Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);

  // Parts Addition State
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [addingPart, setAddingPart] = useState(false);
  const [notifyingWhatsApp, setNotifyingWhatsApp] = useState<string | null>(null);

  // New OS Form State
  const [newOs, setNewOs] = useState({
    customer_id: '',
    device_category: 'smartphone' as any,
    device_brand: '',
    device_model: '',
    device_serial_number: '',
    device_passcode: '',
    cosmetic_condition: '',
    accessories_left: [] as string[],
    reported_issue: '',
    estimated_delivery: '',
    labor_value: 0,
    warranty_period: 90,
    warranty_notes: '',
    responsible_technician_id: '',
    custom_accessory: ''
  });

  const [justCreatedOs, setJustCreatedOs] = useState<ServiceOrder | null>(null);

  // Load and fetch initial states
  useEffect(() => {
    fetchServiceOrders();
    fetchCustomers();
    fetchInventory();

    const fetchAdmins = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('active', true);
      if (data) setAdmins(data);
    };
    fetchAdmins();
  }, [fetchServiceOrders, fetchCustomers, fetchInventory]);

  // Load single OS details when selected
  useEffect(() => {
    if (selectedOsId) {
      fetchServiceOrderById(selectedOsId);
    }
  }, [selectedOsId, fetchServiceOrderById]);

  // Filter OS listings
  const filteredOs = useMemo(() => {
    return serviceOrders.filter(os => {
      const matchCategory = selectedCategoryTab === 'all' || os.device_category === selectedCategoryTab;
      
      const osNumberStr = String(os.os_number);
      const customerName = os.customers?.name?.toLowerCase() || '';
      const clientCpf = os.customers?.cpf || '';
      const deviceModel = os.device_model?.toLowerCase() || '';
      const serialNum = os.device_serial_number?.toLowerCase() || '';
      
      const search = searchTerm.toLowerCase();
      
      const matchSearch = 
        osNumberStr.includes(search) ||
        customerName.includes(search) ||
        clientCpf.includes(search) ||
        deviceModel.includes(search) ||
        serialNum.includes(search);
        
      return matchCategory && matchSearch;
    });
  }, [serviceOrders, selectedCategoryTab, searchTerm]);

  // Search filtered customers for new OS
  const filteredCustomersForSelect = useMemo(() => {
    if (!customerSearchTerm) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      c.cpf.includes(customerSearchTerm)
    ).slice(0, 5);
  }, [customers, customerSearchTerm]);

  // Checklist computation based on OS Device type
  const isComputerCategory = (cat: string) => cat === 'notebook' || cat === 'desktop';
  const activeChecklist = isComputerCategory(currentServiceOrder?.device_category || '') ? COMP_CHECKLIST : MOBILE_CHECKLIST;

  // Retrieve checklist checked state from technical_diagnosis text (e.g. "[post: OK]")
  const isChecklistItemOk = (itemId: string) => {
    if (!currentServiceOrder?.technical_diagnosis) return false;
    return currentServiceOrder.technical_diagnosis.includes(`[${itemId}: OK]`);
  };

  const handleToggleChecklist = async (itemId: string) => {
    if (!currentServiceOrder) return;
    
    let diagnosis = currentServiceOrder.technical_diagnosis || '';
    const itemTag = `[${itemId}: OK]`;
    
    if (diagnosis.includes(itemTag)) {
      diagnosis = diagnosis.replace(itemTag, '').trim();
    } else {
      diagnosis = `${diagnosis} ${itemTag}`.trim();
    }

    try {
      await updateServiceOrder(currentServiceOrder.id, { technical_diagnosis: diagnosis });
      showNotification('success', 'Checklist atualizado com sucesso!');
    } catch (err) {
      showNotification('error', 'Erro ao atualizar checklist');
    }
  };

  // Accessories checked options
  const handleToggleAccessory = (acc: string) => {
    setNewOs(prev => {
      const current = prev.accessories_left;
      if (current.includes(acc)) {
        return { ...prev, accessories_left: current.filter(a => a !== acc) };
      } else {
        return { ...prev, accessories_left: [...current, acc] };
      }
    });
  };

  const handleAddCustomAccessory = () => {
    if (!newOs.custom_accessory.trim()) return;
    setNewOs(prev => ({
      ...prev,
      accessories_left: [...prev.accessories_left, prev.custom_accessory.trim()],
      custom_accessory: ''
    }));
  };

  const handleCreateOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOs.customer_id || !newOs.device_brand || !newOs.device_model || !newOs.reported_issue) {
      showNotification('error', 'Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const techId = newOs.responsible_technician_id || profile?.id || null;
      const created = await createServiceOrder({
        customer_id: newOs.customer_id,
        device_category: newOs.device_category,
        device_brand: newOs.device_brand,
        device_model: newOs.device_model,
        device_serial_number: newOs.device_serial_number || null,
        device_passcode: newOs.device_passcode || null,
        cosmetic_condition: newOs.cosmetic_condition || null,
        accessories_left: newOs.accessories_left.length > 0 ? newOs.accessories_left : null,
        reported_issue: newOs.reported_issue,
        estimated_delivery: newOs.estimated_delivery ? newOs.estimated_delivery : null,
        labor_value: Number(newOs.labor_value) || 0,
        parts_value: 0,
        payment_status: 'pending',
        warranty_period: Number(newOs.warranty_period) || 90,
        warranty_notes: newOs.warranty_notes || null,
        responsible_technician_id: techId,
        status: 'budget_pending'
      });

      showNotification('success', 'Ordem de Serviço criada com sucesso!');
      
      // Load details into currentServiceOrder immediately so relation details are populated for print
      await fetchServiceOrderById(created.id);
      setJustCreatedOs(created);

      // Auto-trigger WhatsApp notification
      try {
        await notifyOsStatus(created.id, 'entry');
      } catch (waErr) {
        console.warn('Silent WA notification fail:', waErr);
      }

      setIsCreateOpen(false);
      setCustomerSearchTerm('');
      setNewOs({
        customer_id: '',
        device_category: 'smartphone',
        device_brand: '',
        device_model: '',
        device_serial_number: '',
        device_passcode: '',
        cosmetic_condition: '',
        accessories_left: [],
        reported_issue: '',
        estimated_delivery: '',
        labor_value: 0,
        warranty_period: 90,
        warranty_notes: '',
        responsible_technician_id: '',
        custom_accessory: ''
      });
      fetchServiceOrders();
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao salvar Ordem de Serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPart = async () => {
    if (!currentServiceOrder || !selectedPartId) return;
    const selectedItem = inventory.find(i => i.id === selectedPartId);
    if (!selectedItem) return;

    setAddingPart(true);
    try {
      await addPartToOs(currentServiceOrder.id, {
        inventory_item_id: selectedPartId,
        part_name: `${selectedItem.brand} ${selectedItem.model}`,
        quantity: partQty,
        unit_price: selectedItem.price
      });
      showNotification('success', 'Peça adicionada com sucesso!');
      setSelectedPartId('');
      setPartQty(1);
    } catch (err) {
      showNotification('error', 'Erro ao adicionar peça');
    } finally {
      setAddingPart(false);
    }
  };

  const handleDeletePart = async (partId: string) => {
    if (!currentServiceOrder) return;
    if (!confirm('Deseja realmente remover esta peça da OS?')) return;
    
    try {
      await deletePartFromOs(currentServiceOrder.id, partId);
      showNotification('success', 'Peça removida com sucesso!');
    } catch (err) {
      showNotification('error', 'Erro ao remover peça');
    }
  };

  const handleSendWhatsAppNotification = async (type: 'entry' | 'budget' | 'ready') => {
    if (!currentServiceOrder) return;
    setNotifyingWhatsApp(type);
    try {
      await notifyOsStatus(currentServiceOrder.id, type);
      showNotification('success', 'Notificação enviada com sucesso no WhatsApp do cliente!');
    } catch (err: any) {
      showNotification('error', `Erro ao notificar: ${err.message || 'Sem canal ativo'}`);
    } finally {
      setNotifyingWhatsApp(null);
    }
  };

  const handlePrintDocument = (id: string) => {
    printElement(id);
  };

  // Map status labels
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'budget_pending':
        return { label: 'Orçamento Pendente', color: 'bg-red-500/10 border-red-500/20 text-red-400' };
      case 'awaiting_approval':
        return { label: 'Aguardando Cliente', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
      case 'in_progress':
        return { label: 'Em Reparo', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' };
      case 'ready':
        return { label: 'Pronto p/ Retirada', color: 'bg-green-500/10 border-green-500/20 text-green-400' };
      case 'delivered':
        return { label: 'Entregue / Concluído', color: 'bg-white/10 border-white/20 text-white/60' };
      case 'returned_no_fix':
        return { label: 'Sem Conserto', color: 'bg-neutral-500/15 border-neutral-500/20 text-neutral-400' };
      case 'canceled':
        return { label: 'Cancelado', color: 'bg-red-900/20 border-red-900/30 text-red-500' };
      default:
        return { label: status, color: 'bg-white/5 border-white/10 text-on-surface-variant' };
    }
  };

  // Accessories quick suggestions based on selected category
  const activeAccessoriesList = ACCESSORY_SUGGESTIONS[newOs.device_category] || ACCESSORY_SUGGESTIONS.other;

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Assistência Técnica</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Gestão de Ordens de Serviço (OS) & Manutenções</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary font-black uppercase tracking-widest text-[10px] px-6 py-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus size={16} /> Nova Ordem de Serviço
        </button>
      </div>

      {/* TABS DE CATEGORIAS */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-6 custom-scrollbar">
        {DEVICE_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryTab(cat.id)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all shrink-0",
                selectedCategoryTab === cat.id
                  ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/10"
                  : "bg-white/[0.01] border-white/5 text-on-surface-variant hover:bg-white/5"
              )}
            >
              <CatIcon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: FILA DE ORDENS DE SERVIÇO */}
        <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 h-[75vh] flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Wrench size={16} /> Fila de Serviços ({filteredOs.length})
            </h3>
          </div>
          
          {/* Campo de Busca */}
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar por OS, cliente, modelo ou N/S..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-white outline-none transition-all font-display"
            />
          </div>

          {/* Listagem */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {isLoading && serviceOrders.length === 0 ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : filteredOs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 opacity-40 text-center gap-2">
                <CheckCircle2 size={32} className="text-success" />
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Tudo Organizado!</p>
                <p className="text-[9px] text-on-surface-variant max-w-[200px]">Nenhum conserto nesta categoria precisando de atenção.</p>
              </div>
            ) : (
              filteredOs.map(os => {
                const statusInfo = getStatusInfo(os.status);
                const numberStr = String(os.os_number).padStart(4, '0');
                const isSelected = selectedOsId === os.id;
                
                return (
                  <button
                    key={os.id}
                    onClick={() => setSelectedOsId(os.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-3xl border transition-all flex flex-col gap-2",
                      isSelected 
                        ? 'bg-primary-container border-primary/40 text-on-primary-container shadow-lg' 
                        : 'bg-white/[0.01] border-white/5 text-on-surface hover:bg-white/[0.03]'
                    )}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black font-mono leading-none tracking-widest opacity-60">OS #{numberStr}</span>
                        <span className="text-xs font-black uppercase truncate mt-1 max-w-[140px]">{os.customers?.name}</span>
                      </div>
                      <span className={cn("inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-medium border-t border-white/5 pt-2">
                      <span className="truncate max-w-[120px] opacity-75">{os.device_brand} {os.device_model}</span>
                      <span className="font-bold font-mono text-primary">
                        R$ {Number(os.labor_value + os.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA 2 E 3: BANCADA DO TÉCNICO & DETALHES DA OS */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!selectedOsId || !currentServiceOrder ? (
            <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-8 h-[75vh] flex flex-col items-center justify-center text-center gap-4 opacity-50">
              <Wrench size={64} className="text-on-surface-variant opacity-20" />
              <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Nenhuma OS Selecionada</h3>
              <p className="text-xs text-on-surface-variant max-w-sm">Escolha uma Ordem de Serviço na fila ao lado para diagnosticar, adicionar peças, checklist de testes e emitir termos.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* FICHA GERAL DO EQUIPAMENTO */}
              <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary border border-white/10 shrink-0">
                      {currentServiceOrder.device_category === 'smartphone' ? <Smartphone size={24} /> :
                       currentServiceOrder.device_category === 'notebook' || currentServiceOrder.device_category === 'desktop' ? <Monitor size={24} /> :
                       currentServiceOrder.device_category === 'printer' ? <PrinterIcon size={24} /> :
                       currentServiceOrder.device_category === 'console' ? <Gamepad2 size={24} /> : <Wrench size={24} />}
                    </div>
                    <div>
                      <h2 className="text-md font-black uppercase leading-tight">
                        OS #{String(currentServiceOrder.os_number).padStart(4, '0')} - {currentServiceOrder.device_brand} {currentServiceOrder.device_model}
                      </h2>
                      <p className="text-[10px] text-on-surface-variant font-mono uppercase mt-0.5">
                        N/S ou IMEI: {currentServiceOrder.device_serial_number || 'Sem número de série'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => handlePrintDocument('print-os-entry')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                      title="Imprimir Termo de Entrada"
                    >
                      <Printer size={12} /> Entrada
                    </button>
                    <button
                      onClick={() => handlePrintDocument('print-os-warranty')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                      title="Imprimir Garantia e Saída"
                    >
                      <Printer size={12} /> Saída
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                    <User size={14} className="opacity-40 text-primary" />
                    <div>
                      <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Cliente</p>
                      <p className="font-bold mt-0.5">{currentServiceOrder.customers?.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                    <Phone size={14} className="opacity-40 text-primary" />
                    <div>
                      <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">WhatsApp do Cliente</p>
                      <p className="font-bold font-mono mt-0.5">{currentServiceOrder.customers?.phone ? formatPhone(currentServiceOrder.customers.phone) : 'Sem Telefone'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5 md:col-span-2">
                    <AlertCircle size={14} className="opacity-40 text-primary mt-0.5" />
                    <div>
                      <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Problema Relatado</p>
                      <p className="font-bold text-on-surface mt-1 leading-relaxed">{currentServiceOrder.reported_issue}</p>
                    </div>
                  </div>

                  {currentServiceOrder.device_passcode && (
                    <div className="flex items-center gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                      <Info size={14} className="opacity-40 text-primary" />
                      <div>
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Senha do Dispositivo</p>
                        <p className="font-bold font-mono mt-0.5 text-warning">{currentServiceOrder.device_passcode}</p>
                      </div>
                    </div>
                  )}

                  {currentServiceOrder.cosmetic_condition && (
                    <div className="flex items-center gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                      <Info size={14} className="opacity-40 text-primary" />
                      <div>
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Estado de Vistoria Visual</p>
                        <p className="font-bold truncate mt-0.5">{currentServiceOrder.cosmetic_condition}</p>
                      </div>
                    </div>
                  )}

                  {currentServiceOrder.accessories_left && currentServiceOrder.accessories_left.length > 0 && (
                    <div className="flex items-start gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5 md:col-span-2">
                      <FileText size={14} className="opacity-40 text-primary mt-0.5" />
                      <div>
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Acessórios Inclusos</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {currentServiceOrder.accessories_left.map((acc, index) => (
                            <span key={index} className="text-[8px] font-black px-2 py-0.5 bg-white/5 rounded-full uppercase tracking-wider border border-white/5 text-on-surface">
                              {acc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BANCADA E TESTES DE QUALIDADE */}
              <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
                  <Wrench size={16} /> Bancada de Testes de Qualidade
                </h3>
                
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
                  Marque os testes aprovados do equipamento para atestar na garantia:
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {activeChecklist.map(item => {
                    const isOk = isChecklistItemOk(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleToggleChecklist(item.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all",
                          isOk 
                            ? "bg-success/10 border-success/30 text-success" 
                            : "bg-white/[0.01] border-white/5 text-on-surface-variant/70 hover:bg-white/5"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border transition-all",
                          isOk ? "bg-success border-success text-on-success" : "border-white/20"
                        )}>
                          {isOk && <Check size={10} strokeWidth={4} />}
                        </div>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CONTROLE DE PEÇAS CONSUMIDAS DO ESTOQUE */}
              <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
                  <PlusCircle size={16} /> Peças Consumidas do Estoque
                </h3>

                {/* Adicionar Peça */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Selecione a Peça (Estoque)</label>
                    <select
                      value={selectedPartId}
                      onChange={(e) => setSelectedPartId(e.target.value)}
                      className="w-full bg-[#121214] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-primary outline-none transition-all"
                    >
                      <option value="">Nenhuma Peça Selecionada</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id} disabled={item.stock_quantity <= 0}>
                          {item.brand} {item.model} - R$ {item.price.toLocaleString('pt-BR')} (Estoque: {item.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Qtd</label>
                    <input 
                      type="number" 
                      min={1}
                      value={partQty}
                      onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-on-surface focus:border-primary outline-none transition-all text-center"
                    />
                  </div>

                  <button
                    onClick={handleAddPart}
                    disabled={addingPart || !selectedPartId}
                    className="w-full bg-primary hover:scale-[1.01] text-on-primary font-black uppercase tracking-widest text-[9px] py-4 rounded-2xl transition-all disabled:opacity-50"
                  >
                    {addingPart ? 'Inserindo...' : 'Adicionar Peça'}
                  </button>
                </div>

                {/* Tabela de Peças Utilizadas */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black uppercase text-on-surface-variant tracking-widest">
                        <th className="pb-3">Descrição da Peça</th>
                        <th className="pb-3 text-center">Quantidade</th>
                        <th className="pb-3 text-right">Valor Unitário</th>
                        <th className="pb-3 text-right">Subtotal</th>
                        <th className="pb-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!currentServiceOrder.parts || currentServiceOrder.parts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[10px] text-on-surface-variant opacity-60">
                            Nenhuma peça registrada nesta Ordem de Serviço.
                          </td>
                        </tr>
                      ) : (
                        currentServiceOrder.parts.map(part => (
                          <tr key={part.id} className="border-b border-white/5 last:border-0">
                            <td className="py-3 font-bold">{part.part_name}</td>
                            <td className="py-3 text-center font-mono">{part.quantity}</td>
                            <td className="py-3 text-right font-mono">R$ {Number(part.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 text-right font-mono text-primary font-bold">R$ {Number(part.quantity * part.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 text-center">
                              <button 
                                onClick={() => handleDeletePart(part.id)}
                                className="text-on-surface-variant hover:text-error transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOTOR DE DECISÃO TÉCNICA E HOMOLOGAÇÃO FINANCEIRA */}
              <div className="bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
                  <Save size={16} /> Homologação Técnica & Fechamento Financeiro
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status do Serviço */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Status da Manutenção</label>
                    <select
                      value={currentServiceOrder.status}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { status: e.target.value as any })}
                      className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                    >
                      <option value="budget_pending">🔴 Orçamento Pendente</option>
                      <option value="awaiting_approval">🟡 Aguardando Aprovação</option>
                      <option value="in_progress">🔵 Em Execução / Reparo</option>
                      <option value="ready">🟢 Pronto para Retirada</option>
                      <option value="delivered">⚪ Entregue / Concluído</option>
                      <option value="returned_no_fix">❔ Devolvido Sem Conserto</option>
                      <option value="canceled">❌ Cancelado</option>
                    </select>
                  </div>

                  {/* Valor Mão de Obra */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Mão de Obra (R$)</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                      <input 
                        type="number" 
                        step="0.01"
                        value={currentServiceOrder.labor_value}
                        onChange={(e) => updateServiceOrder(currentServiceOrder.id, { labor_value: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Financeiro Display */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest leading-none">Resumo Financeiro da OS</p>
                      <div className="flex gap-4 mt-2 text-[10px] font-bold text-on-surface-variant">
                        <span>Peças: <strong className="text-white">R$ {Number(currentServiceOrder.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                        <span>•</span>
                        <span>Mão de Obra: <strong className="text-white">R$ {Number(currentServiceOrder.labor_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest block leading-none">Valor Total do Serviço</span>
                      <h4 className="text-2xl font-black text-white font-mono leading-none mt-1.5">
                        R$ {Number(currentServiceOrder.labor_value + currentServiceOrder.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h4>
                    </div>
                  </div>

                  {/* WhatsApp Alerts Trigger Panel */}
                  <div className="md:col-span-2 border border-outline-variant/30 rounded-3xl p-4 bg-primary/5 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Send size={14} className="text-primary" />
                      <span className="text-[10px] font-black uppercase text-on-surface tracking-wider">Disparador de Alertas do WhatsApp</span>
                    </div>
                    <p className="text-[9px] text-on-surface-variant opacity-75">Notifique instantaneamente o cliente via Evolution API:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppNotification('entry')}
                        disabled={notifyingWhatsApp !== null}
                        className="py-3 px-4 bg-white/5 border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {notifyingWhatsApp === 'entry' ? <Loader2 size={12} className="animate-spin" /> : '1. Entrada da OS'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppNotification('budget')}
                        disabled={notifyingWhatsApp !== null}
                        className="py-3 px-4 bg-white/5 border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {notifyingWhatsApp === 'budget' ? <Loader2 size={12} className="animate-spin" /> : '2. Enviar Orçamento'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppNotification('ready')}
                        disabled={notifyingWhatsApp !== null}
                        className="py-3 px-4 bg-primary text-on-primary rounded-xl text-[9px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {notifyingWhatsApp === 'ready' ? <Loader2 size={12} className="animate-spin" /> : '3. Aparelho Pronto'}
                      </button>
                    </div>
                  </div>

                  {/* Laudo Técnico */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Laudo Técnico Completo / Histórico</label>
                    <textarea
                      rows={3}
                      placeholder="Descreva o laudo detalhado do reparo (Ex: Substituição da tela quebrada por tela original de reposição. Efetuado testes de toque e carga que operam 100%.)"
                      value={currentServiceOrder.technical_diagnosis || ''}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { technical_diagnosis: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>

                  {/* Warranty Notes */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Período de Garantia (Dias)</label>
                    <input 
                      type="number" 
                      value={currentServiceOrder.warranty_period}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { warranty_period: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono"
                    />
                  </div>

                  {/* Responsible Technician */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Técnico Responsável</label>
                    <select
                      value={currentServiceOrder.responsible_technician_id || ''}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { responsible_technician_id: e.target.value || null as any })}
                      className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                    >
                      <option value="">Não Atribuído</option>
                      {admins.map(adm => (
                        <option key={adm.id} value={adm.id}>
                          {adm.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedOsId(null);
                    }}
                    className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedOsId(null);
                      showNotification('success', 'Procedimento de homologação salvo com sucesso!');
                    }}
                    className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Salvar OS & Sincronizar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ======================================================================= */}
      {/* MODAL: NOVA ORDEM DE SERVIÇO */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121214] border border-outline-variant/30 w-full max-w-3xl rounded-[40px] p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-md font-black uppercase tracking-wider text-white">Criar Nova Ordem de Serviço (OS)</h3>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Preencha a vistoria e intake de entrada</p>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="text-on-surface-variant hover:text-white transition-all text-lg font-black"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateOS} className="space-y-6 text-xs">
              
              {/* Pesquisa e Seleção do Cliente */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <User size={14} /> 1. Pesquisa de Cliente Associado
                </h4>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Pesquisar cliente por nome ou CPF..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-white outline-none transition-all font-display text-white"
                  />
                </div>

                {/* Cliente Selecionado Indicator */}
                {newOs.customer_id ? (
                  <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center justify-between text-success">
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      Cliente Selecionado: {customers.find(c => c.id === newOs.customer_id)?.name}
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        setNewOs(prev => ({ ...prev, customer_id: '' }));
                        setCustomerSearchTerm('');
                      }}
                      className="text-[9px] font-black uppercase hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ) : filteredCustomersForSelect.length > 0 ? (
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <p className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider">Resultados Encontrados:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {filteredCustomersForSelect.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewOs(prev => ({ ...prev, customer_id: c.id }))}
                          className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 text-white flex justify-between uppercase font-bold text-[10px] transition-all"
                        >
                          <span>{c.name}</span>
                          <span className="font-mono text-on-surface-variant">CPF: {formatCPF(c.cpf)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : customerSearchTerm && (
                  <p className="text-[10px] text-on-surface-variant text-center py-2">Nenhum cliente encontrado. Redija outro nome ou cadastre no CRM.</p>
                )}
              </div>

              {/* Informações Gerais do Equipamento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Categoria */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Categoria de Aparelho</label>
                  <select
                    value={newOs.device_category}
                    onChange={(e) => setNewOs(prev => ({ ...prev, device_category: e.target.value as any, accessories_left: [] }))}
                    className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                  >
                    <option value="smartphone">📱 Smartphone</option>
                    <option value="tablet">📲 Tablet</option>
                    <option value="notebook">💻 Notebook</option>
                    <option value="desktop">🖥️ Computador Desktop</option>
                    <option value="printer">🖨️ Impressora</option>
                    <option value="console">🎮 Console Video Game</option>
                    <option value="other">🔧 Outros Equipamentos</option>
                  </select>
                </div>

                {/* Marca */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Marca (Dell, Apple, HP, Sony)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dell, Apple, Samsung"
                    value={newOs.device_brand}
                    onChange={(e) => setNewOs(prev => ({ ...prev, device_brand: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                  />
                </div>

                {/* Modelo */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Modelo do Equipamento</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Inspiron 15, iPhone 13"
                    value={newOs.device_model}
                    onChange={(e) => setNewOs(prev => ({ ...prev, device_model: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                  />
                </div>

                {/* Serial / IMEI */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Número de Série / IMEI</label>
                  <input
                    type="text"
                    placeholder="N/S ou IMEI"
                    value={newOs.device_serial_number}
                    onChange={(e) => setNewOs(prev => ({ ...prev, device_serial_number: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono"
                  />
                </div>

                {/* Senha do Aparelho */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Senha de Entrada / PIN</label>
                  <input
                    type="text"
                    placeholder="Senha para testes"
                    value={newOs.device_passcode}
                    onChange={(prev) => setNewOs(p => ({ ...p, device_passcode: prev.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono text-warning"
                  />
                </div>

                {/* Previsão de Entrega */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Previsão de Entrega</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                    <input
                      type="date"
                      value={newOs.estimated_delivery}
                      onChange={(e) => setNewOs(prev => ({ ...prev, estimated_delivery: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Defeitos & Vistoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Defeito Relatado pelo Cliente *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Descreva o problema apontado pelo cliente (Ex: Não liga, tela piscando, notebook desliga sozinho após aquecer)"
                    value={newOs.reported_issue}
                    onChange={(e) => setNewOs(prev => ({ ...prev, reported_issue: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Observações de Vistoria Estética / Riscos</label>
                  <textarea
                    rows={3}
                    placeholder="Descreva riscos na tela, tampa amassada, marcas de queda, trincas ou parafusos faltando no chassi."
                    value={newOs.cosmetic_condition}
                    onChange={(e) => setNewOs(prev => ({ ...prev, cosmetic_condition: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Vistoria de Acessórios Deixados */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileText size={14} /> 3. Acessórios Deixados na Assistência
                </h4>
                
                <div className="flex flex-wrap gap-2.5">
                  {activeAccessoriesList.map(acc => {
                    const isChecked = newOs.accessories_left.includes(acc);
                    return (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => handleToggleAccessory(acc)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                          isChecked 
                            ? "bg-primary border-primary text-on-primary" 
                            : "bg-[#121214] border-white/5 text-on-surface-variant hover:bg-white/5"
                        )}
                      >
                        {isChecked && <Check size={10} strokeWidth={4} />}
                        {acc}
                      </button>
                    );
                  })}
                </div>

                {/* Personalizado */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Outro acessório (Ex: Capa de Neoprene, Pendrive, etc.)"
                    value={newOs.custom_accessory}
                    onChange={(e) => setNewOs(prev => ({ ...prev, custom_accessory: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] text-white focus:border-primary outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAccessory}
                    className="py-3 px-5 bg-white/10 hover:bg-white/15 border border-white/5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Tecnico Responsável e Garantia inicial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Atribuir a um Técnico</label>
                  <select
                    value={newOs.responsible_technician_id}
                    onChange={(e) => setNewOs(prev => ({ ...prev, responsible_technician_id: e.target.value }))}
                    className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                  >
                    <option value="">Não Atribuir (Aguardando Fila)</option>
                    {admins.map(adm => (
                      <option key={adm.id} value={adm.id}>{adm.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Mão de Obra Orçada Inicial (Opcional)</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={newOs.labor_value}
                      onChange={(e) => setNewOs(prev => ({ ...prev, labor_value: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newOs.customer_id}
                  className="flex-[2] py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Registrar OS e Entrada
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* IMPRESSÕES TÉRMICAS E DE TERMOS (CONTAINERS OCULTOS PRINT:BLOCK) */}
      {currentServiceOrder && (
        <>
          {/* TERMO 1: COMPROVANTE DE ENTRADA (OS ADMISSION) */}
          <div id="print-os-entry" className="hidden print:block font-sans text-black p-6 space-y-6 max-w-[800px] mx-auto">
            {/* Header */}
            <div className="text-center space-y-2 border-b border-black pb-4">
              <h2 className="text-lg font-black uppercase tracking-wider">MDR Informática & Celulares</h2>
              <p className="text-xs">Rua Principal, 1234 - Centro • WhatsApp: (11) 99999-9999</p>
              <h3 className="text-sm font-black bg-black text-white py-1 uppercase tracking-widest mt-2">Termo de Recebimento de Equipamento</h3>
              <p className="text-xs font-mono font-bold mt-1">Ordem de Serviço (OS) Nº {String(currentServiceOrder.os_number).padStart(4, '0')}</p>
            </div>

            {/* Dados do Cliente */}
            <div className="text-xs space-y-1.5 border border-black p-3 rounded-lg">
              <h4 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-1 mb-1 bg-gray-100 pl-1">Dados do Cliente</h4>
              <p><strong>Nome:</strong> {currentServiceOrder.customers?.name}</p>
              <p><strong>CPF:</strong> {currentServiceOrder.customers?.cpf ? formatCPF(currentServiceOrder.customers.cpf) : '—'}</p>
              <p><strong>Telefone:</strong> {currentServiceOrder.customers?.phone ? formatPhone(currentServiceOrder.customers.phone) : '—'}</p>
            </div>

            {/* Dados do Equipamento */}
            <div className="text-xs space-y-1.5 border border-black p-3 rounded-lg">
              <h4 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-1 mb-1 bg-gray-100 pl-1">Detalhes do Dispositivo</h4>
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Categoria:</strong> {currentServiceOrder.device_category.toUpperCase()}</p>
                <p><strong>Aparelho:</strong> {currentServiceOrder.device_brand} {currentServiceOrder.device_model}</p>
                <p className="col-span-2"><strong>Número de Série/IMEI:</strong> {currentServiceOrder.device_serial_number || '—'}</p>
                {currentServiceOrder.device_passcode && <p className="col-span-2"><strong>Senha do Dispositivo:</strong> {currentServiceOrder.device_passcode}</p>}
              </div>
            </div>

            {/* Vistoria Técnica */}
            <div className="text-xs space-y-1.5 border border-black p-3 rounded-lg">
              <h4 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-1 mb-1 bg-gray-100 pl-1">Defeito & Vistoria Estética</h4>
              <p><strong>Defeito Relatado:</strong> {currentServiceOrder.reported_issue}</p>
              <p><strong>Condições Estéticas:</strong> {currentServiceOrder.cosmetic_condition || 'Nenhuma avaria visível anotada'}</p>
              <p><strong>Acessórios Deixados:</strong> {currentServiceOrder.accessories_left ? currentServiceOrder.accessories_left.join(', ') : 'Nenhum'}</p>
            </div>

            {/* Cláusulas do Contrato de Entrada */}
            <div className="text-[9px] leading-relaxed text-justify space-y-1 border border-black p-3 rounded-lg opacity-80">
              <p>1. <strong>Do Orçamento:</strong> Os orçamentos têm validade de 10 dias. O início dos serviços dar-se-á apenas após aprovação expressa do cliente (WhatsApp ou assinatura).</p>
              <p>2. <strong>De Backup de Dados:</strong> O cliente declara estar ciente de que a MDR **NÃO se responsabiliza por perdas de dados, softwares ou arquivos** armazenados nos dispositivos sob manutenção. O cliente deve realizar backups prévios.</p>
              <p>3. <strong>Do Prazo de Descarte:</strong> Conforme lei vigente, equipamentos deixados na assistência **por mais de 90 (noventa) dias** após a notificação de conclusão (Pronto/Devolvido) sem retirada serão considerados **bens abandonados**, ficando a MDR autorizada a descartá-los ou vendê-los para custeio de despesas operacionais e armazenamento.</p>
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
              <div className="space-y-4">
                <div className="border-t border-black w-full mx-auto pt-1"></div>
                <p>MDR Informática & Celulares</p>
              </div>
              <div className="space-y-4">
                <div className="border-t border-black w-full mx-auto pt-1"></div>
                <p>Assinatura do Cliente</p>
              </div>
            </div>
          </div>

          {/* TERMO 2: COMPROVANTE DE SAÍDA E GARANTIA (OS FINAL WARRANTY) */}
          <div id="print-os-warranty" className="hidden print:block font-sans text-black p-6 space-y-6 max-w-[800px] mx-auto">
            {/* Header */}
            <div className="text-center space-y-2 border-b border-black pb-4">
              <h2 className="text-lg font-black uppercase tracking-wider">MDR Informática & Celulares</h2>
              <p className="text-xs">Rua Principal, 1234 - Centro • WhatsApp: (11) 99999-9999</p>
              <h3 className="text-sm font-black bg-black text-white py-1 uppercase tracking-widest mt-2">Comprovante de Conclusão & Garantia</h3>
              <p className="text-xs font-mono font-bold mt-1">Ordem de Serviço (OS) Nº {String(currentServiceOrder.os_number).padStart(4, '0')}</p>
            </div>

            {/* Dados do Cliente */}
            <div className="text-xs space-y-1.5 border border-black p-3 rounded-lg">
              <h4 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-1 mb-1 bg-gray-100 pl-1">Dados do Cliente</h4>
              <p><strong>Nome:</strong> {currentServiceOrder.customers?.name}</p>
              <p><strong>CPF:</strong> {currentServiceOrder.customers?.cpf ? formatCPF(currentServiceOrder.customers.cpf) : '—'}</p>
            </div>

            {/* Detalhes Técnicos do Conserto */}
            <div className="text-xs space-y-1.5 border border-black p-3 rounded-lg">
              <h4 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-1 mb-1 bg-gray-100 pl-1">Laudo Técnico de Reparo</h4>
              <p><strong>Equipamento:</strong> {currentServiceOrder.device_brand} {currentServiceOrder.device_model} (S/N: {currentServiceOrder.device_serial_number || '—'})</p>
              <p><strong>Defeito Relatado:</strong> {currentServiceOrder.reported_issue}</p>
              <p><strong>Procedimentos Efetuados (Laudo):</strong> {currentServiceOrder.technical_diagnosis ? currentServiceOrder.technical_diagnosis.split('[')[0].trim() : 'Reparos e testes diversos executados com sucesso.'}</p>
            </div>

            {/* Detalhamento Financeiro */}
            <div className="text-xs space-y-1.5 border border-black p-3 rounded-lg">
              <h4 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-1 mb-1 bg-gray-100 pl-1">Detalhes Financeiros</h4>
              <p><strong>Valor de Mão de Obra:</strong> R$ {Number(currentServiceOrder.labor_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p><strong>Valor de Peças Aplicadas:</strong> R$ {Number(currentServiceOrder.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p><strong>Valor Total Pago:</strong> <strong>R$ {Number(currentServiceOrder.labor_value + currentServiceOrder.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
              {currentServiceOrder.payment_method && <p><strong>Forma de Recebimento:</strong> {currentServiceOrder.payment_method.toUpperCase()}</p>}
            </div>

            {/* Termos de Garantia */}
            <div className="text-xs space-y-1.5 border border-black p-3 rounded-lg">
              <h4 className="font-bold uppercase tracking-wider text-[10px] border-b border-black pb-1 mb-1 bg-gray-100 pl-1">Certificado de Garantia Legal</h4>
              <p>A MDR Informática & Celulares confere garantia técnica de **{currentServiceOrder.warranty_period || 90} dias** sobre os serviços e peças relacionados nesta Ordem de Serviço, a contar da data de retirada.</p>
              <p className="text-[10px] leading-relaxed text-justify opacity-80 mt-1">
                <strong>Cláusulas de Exclusão da Garantia:</strong> A garantia cobre exclusivamente defeitos relativos ao serviço executado e peças trocadas. A garantia será **automaticamente invalidada** caso ocorram indícios de:
                (a) Mau uso, quedas físicas, amassados ou telas quebradas; 
                (b) Oxidação, umidade ou contato direto com líquidos; 
                (c) Rompimento ou violação dos selos de garantia internos aplicados pela MDR; 
                (d) Abertura do aparelho por terceiros ou assistência técnica não autorizada.
              </p>
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
              <div className="space-y-4">
                <div className="border-t border-black w-full mx-auto pt-1"></div>
                <p>MDR Informática & Celulares</p>
              </div>
              <div className="space-y-4">
                <div className="border-t border-black w-full mx-auto pt-1"></div>
                <p>Assinatura de Retirada do Cliente</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE IMPRESSÃO IMEDIATA */}
      {justCreatedOs && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#121214] border border-outline-variant/30 w-full max-w-md rounded-[40px] p-8 space-y-6 text-center animate-in zoom-in duration-300 shadow-2xl">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20 mx-auto">
              <Printer size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase tracking-wider text-white">OS Registrada com Sucesso!</h3>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-mono">Ordem de Serviço Nº {String(justCreatedOs.os_number).padStart(4, '0')}</p>
              <p className="text-xs text-on-surface-variant leading-relaxed pt-2">
                Deseja imprimir o <strong>Termo de Entrada (Admission)</strong> agora para coletar a assinatura do cliente?
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  printElement('print-os-entry');
                  setJustCreatedOs(null);
                }}
                className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={14} /> Imprimir Termo de Entrada
              </button>
              <button
                onClick={() => setJustCreatedOs(null)}
                className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                Fechar Sem Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
