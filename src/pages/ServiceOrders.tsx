import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, Search, Plus, Loader2, AlertCircle, CheckCircle2, 
  User, Phone, FileText, Printer, ExternalLink, ShieldAlert, 
  Save, ArrowLeft, Trash2, Smartphone, Monitor, PrinterIcon, 
  Gamepad2, PlusCircle, Check, Info, Calendar, DollarSign, Send,
  Edit
} from 'lucide-react';
import { useServiceOrderStore, ServiceOrder } from '../store/useServiceOrderStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { useUnitStore } from '../store/useUnitStore';
import { formatCPF, formatPhone, printElement } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

// Import subcomponentes isolados
import OsSidebar from '../components/layout/OsSidebar';
import OsTechWorkbench from '../components/layout/OsTechWorkbench';
import OsPartsLogistics from '../components/layout/OsPartsLogistics';
import SignatureCanvas from '../components/layout/SignatureCanvas';

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
  
  const { customers, fetchCustomers, addCustomer } = useCustomerStore();
  const { inventory, fetchInventory } = useInventoryStore();
  const { showNotification } = useUI();
  const { profile } = useAuthStore();
  const { units, fetchAllUnits } = useUnitStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);
  const [osFilterTab, setOsFilterTab] = useState<'active' | 'canceled'>('active');
  const [isEditingReportedIssue, setIsEditingReportedIssue] = useState(false);
  const [editedReportedIssue, setEditedReportedIssue] = useState('');
  
  // Navigation / Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', cpf: '', phone: '' });
  const [isLoadingQuickCustomer, setIsLoadingQuickCustomer] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
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
    unit_id: '',
    device_category: 'smartphone' as any,
    custom_category: '',
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
  const [signatureMode, setSignatureMode] = useState<'entry' | 'exit' | null>(null);

  // Load and fetch initial states
  useEffect(() => {
    fetchServiceOrders();
    fetchCustomers();
    fetchInventory();
    fetchAllUnits();

    const fetchAdmins = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('active', true);
      if (data) setAdmins(data);
    };
    fetchAdmins();
  }, [fetchServiceOrders, fetchCustomers, fetchInventory, fetchAllUnits]);

  // Default unit_id to profile's unit_id when profile/units are loaded
  useEffect(() => {
    if (profile?.unit_id) {
      setNewOs(prev => ({ ...prev, unit_id: profile.unit_id }));
    } else if (units.length > 0) {
      setNewOs(prev => ({ ...prev, unit_id: units[0].id }));
    }
  }, [profile, units]);

  // Load single OS details when selected
  useEffect(() => {
    if (selectedOsId) {
      fetchServiceOrderById(selectedOsId);
      setIsEditingReportedIssue(false);
    }
  }, [selectedOsId, fetchServiceOrderById]);

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name || !quickCustomer.cpf || !quickCustomer.phone) {
      showNotification('error', 'Erro', 'Todos os campos são obrigatórios.');
      return;
    }
    
    setIsLoadingQuickCustomer(true);
    try {
      const cleanCpf = quickCustomer.cpf.replace(/\D/g, '');
      
      const existing = customers.find(c => c.cpf.replace(/\D/g, '') === cleanCpf);
      if (existing) {
        showNotification('error', 'Erro', 'Já existe um cliente cadastrado com este CPF.');
        setIsLoadingQuickCustomer(false);
        return;
      }

      await addCustomer({
        name: quickCustomer.name,
        cpf: cleanCpf,
        phone: quickCustomer.phone.replace(/\D/g, ''),
        address: '',
        status: 'active',
        classification: 'BOM',
        credit_status: 'APROVADO',
        registration_status: 'APROVADO',
        approved_for_purchase: true,
        unit_id: profile?.unit_id || undefined
      });

      await fetchCustomers(profile?.unit_id || undefined);

      const createdCustomer = useCustomerStore.getState().customers.find(
        c => c.cpf.replace(/\D/g, '') === cleanCpf
      );

      if (createdCustomer) {
        setNewOs(prev => ({ ...prev, customer_id: createdCustomer.id }));
        showNotification('success', 'Sucesso', 'Cliente cadastrado e selecionado com sucesso!');
      } else {
        showNotification('success', 'Sucesso', 'Cliente cadastrado com sucesso!');
      }

      setQuickCustomer({ name: '', cpf: '', phone: '' });
      setIsQuickCustomerOpen(false);
    } catch (error) {
      showNotification('error', 'Erro', error?.response?.data?.message || 'Falha ao cadastrar cliente.');
    } finally {
      setIsLoadingQuickCustomer(false);
    }
  };

  // Filter OS listings
  const filteredOs = useMemo(() => {
    return serviceOrders.filter(os => {
      const isStandard = ['smartphone', 'tablet', 'notebook', 'desktop', 'printer', 'console'].includes(os.device_category);
      
      let matchCategory = false;
      if (selectedCategoryTab === 'all') {
        matchCategory = true;
      } else if (selectedCategoryTab === 'other') {
        matchCategory = !isStandard || os.device_category === 'other';
      } else {
        matchCategory = os.device_category === selectedCategoryTab;
      }
      
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

      const matchStatus = osFilterTab === 'active'
        ? os.status !== 'canceled'
        : os.status === 'canceled';
        
      return matchCategory && matchSearch && matchStatus;
    });
  }, [serviceOrders, selectedCategoryTab, searchTerm, osFilterTab]);

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

  const handleDeleteOS = async () => {
    if (!currentServiceOrder) return;
    
    try {
      await deleteServiceOrder(currentServiceOrder.id);
      showNotification('success', 'Ordem de Serviço excluída com sucesso!');
      setSelectedOsId(null);
      setIsDeleteConfirmOpen(false);
      fetchServiceOrders();
    } catch (err) {
      showNotification('error', 'Falha ao excluir a Ordem de Serviço.');
    }
  };

  const handleCreateOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOs.customer_id || !newOs.device_brand || !newOs.device_model || !newOs.reported_issue) {
      showNotification('error', 'Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (newOs.device_category === 'other' && !newOs.custom_category.trim()) {
      showNotification('error', 'Erro', 'Por favor, digite o nome da categoria manual.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCategory = newOs.device_category === 'other'
        ? newOs.custom_category.trim()
        : newOs.device_category;

      const techId = newOs.responsible_technician_id || profile?.id || null;
      const created = await createServiceOrder({
        customer_id: newOs.customer_id,
        unit_id: newOs.unit_id || null,
        device_category: finalCategory,
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
        unit_id: profile?.unit_id || (units[0]?.id ?? ''),
        device_category: 'smartphone',
        custom_category: '',
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


  const renderOsEntryCopy = (copyTitle: string) => {
    if (!currentServiceOrder) return null;
    const osUnit = units.find(u => u.id === currentServiceOrder.unit_id) || units[0] || {
      name: 'MDR Informática & Celulares',
      address: 'Rua Principal, 1234 - Centro',
      phone: '(11) 99999-9999'
    };
    const unitNameParts = osUnit.name.split(' ');
    const brandName = unitNameParts[0] || 'MDR';
    const brandSub = unitNameParts.slice(1).join(' ').toUpperCase() || 'INFORMÁTICA & CELULARES';

    return (
      <div className="os-thermal-receipt">
        {/* Copy Indicator */}
        <div className="copy-indicator" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10px', border: '1px solid #000', padding: '2px', marginBottom: '8px' }}>
          {copyTitle}
        </div>

        {/* Company Header */}
        <div className="header-center">
          <div className="brand-name">{brandName}</div>
          <div className="brand-sub">{brandSub}</div>
          <div className="unit-details">
            {osUnit.address}<br />
            WhatsApp: {osUnit.phone}
          </div>
        </div>

        <div className="double-divider"></div>

        {/* Title and Meta */}
        <div className="header-center">
          <div className="receipt-title">ORDEM DE SERVIÇO</div>
          <div className="receipt-num">OS N° #{String(currentServiceOrder.os_number).padStart(4, '0')}</div>
          <div className="receipt-date">Data Entrada: {new Date(currentServiceOrder.created_at).toLocaleDateString('pt-BR')}</div>
        </div>

        <div className="divider"></div>

        {/* Buyer Section */}
        <div className="section-title">DADOS DO CLIENTE</div>
        <div className="row">
          <span>Nome:</span>
          <span className="align-right">{currentServiceOrder.customers?.name}</span>
        </div>
        <div className="row">
          <span>CPF:</span>
          <span className="align-right font-mono">{currentServiceOrder.customers?.cpf ? formatCPF(currentServiceOrder.customers.cpf) : '—'}</span>
        </div>
        <div className="row">
          <span>Tel:</span>
          <span className="align-right font-mono">{currentServiceOrder.customers?.phone ? formatPhone(currentServiceOrder.customers.phone) : '—'}</span>
        </div>

        <div className="divider"></div>

        {/* Device Section */}
        <div className="section-title">DADOS DO EQUIPAMENTO</div>
        <div className="row">
          <span>Aparelho:</span>
          <span className="align-right">{currentServiceOrder.device_brand} {currentServiceOrder.device_model}</span>
        </div>
        <div className="row">
          <span>Categoria:</span>
          <span className="align-right">{currentServiceOrder.device_category.toUpperCase()}</span>
        </div>
        <div className="row">
          <span>S/N ou IMEI:</span>
          <span className="align-right font-mono text-small">{currentServiceOrder.device_serial_number || '—'}</span>
        </div>
        {currentServiceOrder.device_passcode && (
          <div className="row">
            <span>Senha/PIN:</span>
            <span className="align-right font-mono">{currentServiceOrder.device_passcode}</span>
          </div>
        )}

        <div className="divider"></div>

        {/* Diagnosis Intake Section */}
        <div className="section-title">VISTORIA E ENTRADA</div>
        <div className="row">
          <span>Defeito Relatado:</span>
          <span className="align-right text-small">{currentServiceOrder.reported_issue}</span>
        </div>
        {currentServiceOrder.cosmetic_condition && (
          <div className="row">
            <span>Vistoria Visual:</span>
            <span className="align-right text-small">{currentServiceOrder.cosmetic_condition}</span>
          </div>
        )}
        {currentServiceOrder.accessories_left && currentServiceOrder.accessories_left.length > 0 && (
          <div className="row">
            <span>Acessórios Inclusos:</span>
            <span className="align-right text-small">{currentServiceOrder.accessories_left.join(', ')}</span>
          </div>
        )}
        {currentServiceOrder.estimated_delivery && (
          <div className="row">
            <span>Previsão de Entrega:</span>
            <span className="align-right font-mono">{new Date(currentServiceOrder.estimated_delivery + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
        )}

        <div className="divider"></div>

        {/* Clauses */}
        <div className="page-break"></div>
        <div className="section-title">TERMOS DE RECEBIMENTO</div>
        <div className="clauses">
          1. <strong>Orçamento:</strong> Validade de 10 dias. Início após aprovação.<br />
          2. <strong>Backup de Dados:</strong> A {brandName} **NÃO se responsabiliza por perdas de dados** ou arquivos. Faça backup prévio.<br />
          3. <strong>Prazo de Descarte:</strong> Aparelhos deixados por **mais de 90 dias** após conclusão serão abandonados e poderão ser vendidos para cobrir despesas operacionais.
        </div>

        <div className="divider"></div>

        {/* Online Tracking Instruction */}
        <div className="section-title" style={{ textAlign: 'center' }}>ACOMPANHAR CONSERTO ONLINE</div>
        <div className="clauses" style={{ textAlign: 'center', fontSize: '9px', marginBottom: '8px' }}>
          Consulte o status em tempo real do seu aparelho acessando:<br />
          <strong>mdrinformaticaecelulares.com.br/consulta-os</strong><br />
          e informe o seu CPF.
        </div>

        <div className="divider"></div>

        {/* Signatures */}
        <div className="sig-line-box">
          <div className="sig-line"></div>
          <span className="sig-label">{brandName} {brandSub}</span>
        </div>

        <div className="sig-line-box" style={{ marginTop: '20px' }}>
          {currentServiceOrder.signature_entry && (
            <div className="sig-image-container">
              <img src={currentServiceOrder.signature_entry} alt="Assinatura Cliente" className="sig-image" />
            </div>
          )}
          <div className="sig-line"></div>
          <span className="sig-label">{currentServiceOrder.customers?.name}<br />Comprador</span>
        </div>

        <div className="divider"></div>

        <div className="footer-note">
          Comprovante de Entrada. Obrigado!
        </div>
      </div>
    );
  };

  const renderOsWarrantyCopy = (copyTitle: string) => {
    if (!currentServiceOrder) return null;
    const today = new Date().toLocaleDateString('pt-BR');
    const osUnit = units.find(u => u.id === currentServiceOrder.unit_id) || units[0] || {
      name: 'MDR Informática & Celulares',
      address: 'Rua Principal, 1234 - Centro',
      phone: '(11) 99999-9999'
    };
    const unitNameParts = osUnit.name.split(' ');
    const brandName = unitNameParts[0] || 'MDR';
    const brandSub = unitNameParts.slice(1).join(' ').toUpperCase() || 'INFORMÁTICA & CELULARES';

    return (
      <div className="os-thermal-receipt">
        {/* Copy Indicator */}
        <div className="copy-indicator" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10px', border: '1px solid #000', padding: '2px', marginBottom: '8px' }}>
          {copyTitle}
        </div>

        {/* Company Header */}
        <div className="header-center">
          <div className="brand-name">{brandName}</div>
          <div className="brand-sub">{brandSub}</div>
          <div className="unit-details">
            {osUnit.address}<br />
            WhatsApp: {osUnit.phone}
          </div>
        </div>

        <div className="double-divider"></div>

        {/* Title and Meta */}
        <div className="header-center">
          <div className="receipt-title">COMPROVANTE DE SAÍDA & GARANTIA</div>
          <div className="receipt-num">OS N° #{String(currentServiceOrder.os_number).padStart(4, '0')}</div>
          <div className="receipt-date">Data Saída: {today}</div>
        </div>

        <div className="divider"></div>

        {/* Buyer Section */}
        <div className="section-title">DADOS DO CLIENTE</div>
        <div className="row">
          <span>Nome:</span>
          <span className="align-right">{currentServiceOrder.customers?.name}</span>
        </div>
        <div className="row">
          <span>CPF:</span>
          <span className="align-right font-mono">{currentServiceOrder.customers?.cpf ? formatCPF(currentServiceOrder.customers.cpf) : '—'}</span>
        </div>

        <div className="divider"></div>

        {/* Device Section */}
        <div className="section-title">DADOS DO EQUIPAMENTO</div>
        <div className="row">
          <span>Aparelho:</span>
          <span className="align-right">{currentServiceOrder.device_brand} {currentServiceOrder.device_model}</span>
        </div>
        <div className="row">
          <span>S/N ou IMEI:</span>
          <span className="align-right font-mono text-small">{currentServiceOrder.device_serial_number || '—'}</span>
        </div>

        <div className="divider"></div>

        {/* Diagnosis & Fix Section */}
        <div className="section-title">LAUDO TÉCNICO DE REPARO</div>
        <div className="row">
          <span>Problema Original:</span>
          <span className="align-right text-small">{currentServiceOrder.reported_issue}</span>
        </div>
        <div className="row">
          <span>Laudo Técnico:</span>
          <span className="align-right text-small">
            {currentServiceOrder.technical_diagnosis ? currentServiceOrder.technical_diagnosis.split('[')[0].trim() : 'Reparo concluído.'}
          </span>
        </div>

        <div className="divider"></div>

        {/* Financial Details */}
        <div className="section-title">DETALHAMENTO FINANCEIRO</div>
        <div className="row">
          <span>Mão de Obra:</span>
          <span className="align-right font-mono">R$ {Number(currentServiceOrder.labor_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="row">
          <span>Peças Aplicadas:</span>
          <span className="align-right font-mono">R$ {Number(currentServiceOrder.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="row">
          <span>Forma Pagamento:</span>
          <span className="align-right font-mono">{currentServiceOrder.payment_method ? currentServiceOrder.payment_method.toUpperCase() : 'PIX / Dinheiro'}</span>
        </div>
        
        <div className="total-box">
          <div className="total-label">VALOR TOTAL PAGO</div>
          <div className="total-val">R$ {Number(currentServiceOrder.labor_value + currentServiceOrder.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>

        <div className="divider"></div>

        {/* Warranty info */}
        <div className="page-break"></div>
        <div className="section-title">CERTIFICADO DE GARANTIA</div>
        <div className="clauses">
          Garantia técnica de **{currentServiceOrder.warranty_period || 90} dias** sobre peças/serviços desta OS.<br />
          <strong>EXCLUSÕES DA GARANTIA:</strong> A garantia será anulada em caso de:<br />
          • Quedas, quebras, amassados ou mau uso;<br />
          • Oxidação, umidade ou contato com líquidos;<br />
          • Rompimento dos lacres {brandName} aplicados;<br />
          • Abertura por terceiros.
        </div>

        <div className="divider"></div>

        {/* Online Tracking Instruction */}
        <div className="section-title" style={{ textAlign: 'center' }}>ACOMPANHAR CONSERTO ONLINE</div>
        <div className="clauses" style={{ textAlign: 'center', fontSize: '9px', marginBottom: '8px' }}>
          Consulte a situação e a garantia do seu aparelho acessando:<br />
          <strong>mdrinformaticaecelulares.com.br/consulta-os</strong><br />
          e informe o seu CPF.
        </div>

        <div className="divider"></div>

        {/* Signatures */}
        <div className="sig-line-box">
          <div className="sig-line"></div>
          <span className="sig-label">{brandName} {brandSub}</span>
        </div>

        <div className="sig-line-box" style={{ marginTop: '20px' }}>
          {currentServiceOrder.signature_exit && (
            <div className="sig-image-container">
              <img src={currentServiceOrder.signature_exit} alt="Assinatura Cliente Saída" className="sig-image" />
            </div>
          )}
          <div className="sig-line"></div>
          <span className="sig-label">{currentServiceOrder.customers?.name}<br />Comprador</span>
        </div>

        <div className="divider"></div>

        <div className="footer-note">
          Guarde este certificado. Obrigado!
        </div>
      </div>
    );
  };

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
        <OsSidebar 
          filteredOs={filteredOs}
          selectedOsId={selectedOsId}
          setSelectedOsId={setSelectedOsId}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isLoading={isLoading}
          getStatusInfo={getStatusInfo}
          osFilterTab={osFilterTab}
          setOsFilterTab={setOsFilterTab}
        />

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
              {/* WARNING BANNER FOR CANCELED OS */}
              {currentServiceOrder.status === 'canceled' && (
                <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 shrink-0 text-red-500">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-wider text-[10px]">Ordem de Serviço Cancelada</p>
                      <p className="text-[11px] opacity-80 leading-snug">Esta OS foi cancelada e não está ativa na fila de serviços.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await updateServiceOrder(currentServiceOrder.id, { status: 'budget_pending' });
                        showNotification('success', 'Ordem de Serviço reaberta com sucesso!');
                      } catch (err) {
                        showNotification('error', 'Falha ao reabrir a Ordem de Serviço.');
                      }
                    }}
                    className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20 cursor-pointer w-full sm:w-auto text-center"
                  >
                    Reabrir OS
                  </button>
                </div>
              )}
              
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

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                      onClick={() => handlePrintDocument('print-os-entry')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                      title="Imprimir Termo de Entrada"
                    >
                      <Printer size={12} /> Imprimir Entrada
                    </button>
                    <button
                      onClick={() => setSignatureMode('entry')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all cursor-pointer"
                      title="Coletar Assinatura Digital de Entrada"
                    >
                      <Save size={12} /> Assinar Entrada
                    </button>
                    <button
                      onClick={() => handlePrintDocument('print-os-entry')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                      title="Reimprimir Termo de Entrada"
                    >
                      <Printer size={12} /> Reimprimir Entrada
                    </button>
                    <button
                      onClick={() => handlePrintDocument('print-os-warranty')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                      title="Imprimir Garantia e Saída"
                    >
                      <Printer size={12} /> Imprimir Saída
                    </button>
                    <button
                      onClick={() => setSignatureMode('exit')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all cursor-pointer"
                      title="Coletar Assinatura Digital de Saída"
                    >
                      <Save size={12} /> Assinar Saída
                    </button>
                    {profile?.role === 'admin' && (
                      <button
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all cursor-pointer animate-in fade-in"
                        title="Excluir Ordem de Serviço permanentemente"
                      >
                        <Trash2 size={12} /> Excluir OS
                      </button>
                    )}
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
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Problema Relatado</p>
                        {isEditingReportedIssue ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateServiceOrder(currentServiceOrder.id, { reported_issue: editedReportedIssue });
                                setIsEditingReportedIssue(false);
                                showNotification('success', 'Relato atualizado com sucesso!');
                              } catch (err) {
                                showNotification('error', 'Falha ao atualizar o relato.');
                              }
                            }}
                            className="text-primary hover:text-white transition-colors cursor-pointer"
                          >
                            <Check size={12} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditedReportedIssue(currentServiceOrder.reported_issue);
                              setIsEditingReportedIssue(true);
                            }}
                            className="text-on-surface-variant hover:text-white transition-colors cursor-pointer"
                          >
                            <Edit size={12} />
                          </button>
                        )}
                      </div>
                      {isEditingReportedIssue ? (
                        <textarea
                          value={editedReportedIssue}
                          onChange={(e) => setEditedReportedIssue(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none transition-all resize-none mt-1.5"
                          rows={2}
                          autoFocus
                        />
                      ) : (
                        <p className="font-bold text-on-surface mt-1 leading-relaxed">{currentServiceOrder.reported_issue}</p>
                      )}
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

                  {currentServiceOrder.signature_entry && (
                    <div className="flex items-start gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                      <FileText size={14} className="opacity-40 text-primary mt-0.5" />
                      <div>
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Assinatura de Entrada</p>
                        <div className="mt-1.5 bg-white/5 border border-white/5 rounded-xl px-4 py-1.5 h-10 flex items-center justify-center overflow-hidden">
                          <img src={currentServiceOrder.signature_entry} alt="Assinatura Entrada" className="h-full w-auto object-contain brightness-200" />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentServiceOrder.signature_exit && (
                    <div className="flex items-start gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                      <FileText size={14} className="opacity-40 text-primary mt-0.5" />
                      <div>
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Assinatura de Saída</p>
                        <div className="mt-1.5 bg-white/5 border border-white/5 rounded-xl px-4 py-1.5 h-10 flex items-center justify-center overflow-hidden">
                          <img src={currentServiceOrder.signature_exit} alt="Assinatura Saída" className="h-full w-auto object-contain brightness-200" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BANCADA E TESTES DE QUALIDADE */}
              <OsTechWorkbench 
                currentServiceOrder={currentServiceOrder}
                activeChecklist={activeChecklist}
                isChecklistItemOk={isChecklistItemOk}
                handleToggleChecklist={handleToggleChecklist}
              />

              {/* CONTROLE DE PEÇAS CONSUMIDAS DO ESTOQUE */}
              <OsPartsLogistics 
                currentServiceOrder={currentServiceOrder}
                inventory={inventory}
                selectedPartId={selectedPartId}
                setSelectedPartId={setSelectedPartId}
                partQty={partQty}
                setPartQty={setPartQty}
                addingPart={addingPart}
                handleAddPart={handleAddPart}
                handleDeletePart={handleDeletePart}
              />

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

                  {/* Unit Selection */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Unidade / Loja</label>
                    <select
                      value={currentServiceOrder.unit_id || ''}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { unit_id: e.target.value || null })}
                      className="w-full bg-[#121214] border border-primary/20 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                    >
                      <option value="" disabled>Selecione a Unidade</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
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
                {/* Link for simple registration */}
                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerOpen(true)}
                    className="text-[10px] text-primary hover:text-white font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} className="shrink-0" /> Não encontrou? Adicione o cliente no cadastro simples
                  </button>
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

                {/* Categoria Manual (se selecionado 'Outros') */}
                {newOs.device_category === 'other' && (
                  <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Nome da Categoria Manual *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Smartwatch, Microondas, TV"
                      value={newOs.custom_category}
                      onChange={(e) => setNewOs(prev => ({ ...prev, custom_category: e.target.value }))}
                      className="w-full bg-white/5 border border-primary/30 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                    />
                  </div>
                )}

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

              {/* Unidade, Técnico e Garantia inicial */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Unidade / Loja *</label>
                  <select
                    required
                    value={newOs.unit_id}
                    onChange={(e) => setNewOs(prev => ({ ...prev, unit_id: e.target.value }))}
                    className="w-full bg-[#121214] border border-primary/30 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all"
                  >
                    <option value="" disabled>Selecione a Unidade</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

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
      {/* MODAL: CONFIRMAÇÃO DE DELEÇÃO */}
      {isDeleteConfirmOpen && currentServiceOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-red-500/20 w-full max-w-md rounded-[40px] p-6 md:p-8 space-y-6 shadow-[0_24px_50px_rgba(239,68,68,0.15)] animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Trash2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-md font-black uppercase tracking-wider text-white">Excluir Ordem de Serviço</h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Esta ação é permanente e irreversível</p>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Tem certeza que deseja excluir permanentemente a <span className="font-bold text-white">OS #{String(currentServiceOrder.os_number).padStart(4, '0')}</span> do cliente <span className="font-bold text-white">{currentServiceOrder.customers?.name}</span>?
              </p>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleDeleteOS}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Excluir OS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* IMPRESSÕES TÉRMICAS E DE TERMOS (CONTAINERS OCULTOS PRINT:BLOCK) */}
      {currentServiceOrder && (
        <>
          {/* Style for OS thermal receipts */}
          <style>{`
            .os-thermal-receipt {
              width: 80mm;
              margin: 0 auto;
              padding: 4mm;
              box-sizing: border-box;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              color: #000;
              background: #fff;
              line-height: 1.3;
            }
            .os-thermal-receipt .header-center {
              text-align: center;
              margin-bottom: 6px;
            }
            .os-thermal-receipt .brand-name {
              font-size: 20px;
              font-weight: 900;
              letter-spacing: -1px;
            }
            .os-thermal-receipt .brand-sub {
              font-size: 8px;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .os-thermal-receipt .unit-details {
              font-size: 9px;
              color: #333;
            }
            .os-thermal-receipt .receipt-title {
              font-size: 13px;
              font-weight: bold;
              margin-top: 4px;
              border: 1px solid #000;
              padding: 2px;
              background: #f0f0f0;
            }
            .os-thermal-receipt .receipt-num {
              font-size: 11px;
              font-weight: bold;
              margin-top: 2px;
            }
            .os-thermal-receipt .receipt-date {
              font-size: 10px;
            }
            .os-thermal-receipt .divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .os-thermal-receipt .double-divider {
              border-top: 1px double #000;
              border-bottom: 1px double #000;
              height: 3px;
              margin: 6px 0;
            }
            .os-thermal-receipt .section-title {
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 4px;
              font-size: 10px;
              letter-spacing: 0.5px;
              text-decoration: underline;
            }
            .os-thermal-receipt .row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .os-thermal-receipt .align-right {
              text-align: right;
              max-width: 60%;
              word-wrap: break-word;
            }
            .os-thermal-receipt .font-mono {
              font-family: 'Courier New', Courier, monospace;
            }
            .os-thermal-receipt .text-small {
              font-size: 9px;
            }
            .os-thermal-receipt .clauses {
              font-size: 8px;
              text-align: justify;
              line-height: 1.2;
              opacity: 0.9;
            }
            .os-thermal-receipt .total-box {
              border: 2px solid #000;
              padding: 6px;
              margin: 8px 0;
              text-align: center;
            }
            .os-thermal-receipt .total-label {
              font-size: 9px;
              font-weight: bold;
            }
            .os-thermal-receipt .total-val {
              font-size: 16px;
              font-weight: bold;
            }
            .os-thermal-receipt .sig-line-box {
              margin-top: 25px;
              text-align: center;
            }
            .os-thermal-receipt .sig-line {
              border-top: 1px solid #000;
              width: 80%;
              margin: 0 auto 4px auto;
            }
            .os-thermal-receipt .sig-label {
              font-size: 9px;
              line-height: 1.1;
              display: block;
            }
            .os-thermal-receipt .sig-image-container {
              height: 35px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: -15px;
            }
            .os-thermal-receipt .sig-image {
              height: 100%;
              object-fit: contain;
              filter: grayscale(1) contrast(2);
            }
            .os-thermal-receipt .footer-note {
              font-size: 8px;
              text-align: center;
              margin-top: 8px;
              line-height: 1.2;
            }
          `}</style>

          {/* TERMO 1: COMPROVANTE DE ENTRADA (OS ADMISSION) */}
          <div id="print-os-entry" className="hidden">
            <style>{`
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0 !important;
                }
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background-color: #ffffff !important;
                }
                .os-thermal-receipt {
                  width: 80mm !important;
                  margin: 0 auto !important;
                  padding: 4mm 4mm 8mm 4mm !important;
                  font-family: Arial, Helvetica, sans-serif !important;
                  font-size: 12px !important;
                  color: #000000 !important;
                  line-height: 1.4 !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt strong,
                .os-thermal-receipt b {
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .brand-name {
                  font-size: 22px !important;
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .brand-sub {
                  font-size: 10px !important;
                  font-weight: 800 !important;
                }
                .os-thermal-receipt .unit-details {
                  font-size: 11px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .receipt-title {
                  font-size: 13.5px !important;
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .receipt-num {
                  font-size: 13px !important;
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .section-title {
                  font-size: 12.5px !important;
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .row span {
                  font-size: 12px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .text-small {
                  font-size: 11.5px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .clauses {
                  font-size: 11px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .sig-label {
                  font-size: 11px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .footer-note {
                  font-size: 11px !important;
                  font-weight: 700 !important;
                }
                .page-break {
                  page-break-before: always !important;
                  break-before: page !important;
                }
              }
            `}</style>
            {renderOsEntryCopy("VIA DO CLIENTE")}
            <div className="page-break receipt-separator">
              - - - - - - - - SERRILHA DE CORTE - - - - - - - -
            </div>
            {renderOsEntryCopy("VIA DA ASSISTÊNCIA")}
          </div>

          {/* TERMO 2: COMPROVANTE DE SAÍDA E GARANTIA (OS FINAL WARRANTY) */}
          <div id="print-os-warranty" className="hidden">
            <style>{`
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0 !important;
                }
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background-color: #ffffff !important;
                }
                .os-thermal-receipt {
                  width: 80mm !important;
                  margin: 0 auto !important;
                  padding: 4mm 4mm 8mm 4mm !important;
                  font-family: Arial, Helvetica, sans-serif !important;
                  font-size: 12px !important;
                  color: #000000 !important;
                  line-height: 1.4 !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt strong,
                .os-thermal-receipt b {
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .brand-name {
                  font-size: 22px !important;
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .brand-sub {
                  font-size: 10px !important;
                  font-weight: 800 !important;
                }
                .os-thermal-receipt .unit-details {
                  font-size: 11px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .receipt-title {
                  font-size: 13.5px !important;
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .receipt-num {
                  font-size: 13px !important;
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .section-title {
                  font-size: 12.5px !important;
                  font-weight: 900 !important;
                }
                .os-thermal-receipt .row span {
                  font-size: 12px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .text-small {
                  font-size: 11.5px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .clauses {
                  font-size: 11px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .sig-label {
                  font-size: 11px !important;
                  font-weight: 700 !important;
                }
                .os-thermal-receipt .footer-note {
                  font-size: 11px !important;
                  font-weight: 700 !important;
                }
                .page-break {
                  page-break-before: always !important;
                  break-before: page !important;
                }
              }
            `}</style>
            {renderOsWarrantyCopy("VIA DO CLIENTE")}
            <div className="page-break receipt-separator">
              - - - - - - - - SERRILHA DE CORTE - - - - - - - -
            </div>
            {renderOsWarrantyCopy("VIA DA ASSISTÊNCIA")}
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

      {/* MODAL DE ASSINATURA ELETRÔNICA */}
      {signatureMode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <SignatureCanvas
              title={signatureMode === 'entry' ? "Assinatura de Entrada do Cliente" : "Assinatura de Retirada do Cliente"}
              onCancel={() => setSignatureMode(null)}
              onSave={async (base64) => {
                if (!currentServiceOrder) return;
                try {
                  if (signatureMode === 'entry') {
                    await updateServiceOrder(currentServiceOrder.id, { signature_entry: base64 });
                  } else {
                    await updateServiceOrder(currentServiceOrder.id, { signature_exit: base64 });
                  }
                  showNotification('success', 'Assinatura Registrada', 'Rubrica salva e vinculada à OS!');
                  setSignatureMode(null);
                } catch (err) {
                  showNotification('error', 'Erro ao salvar assinatura');
                }
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO RÁPIDO DE CLIENTE */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-outline-variant/30 w-full max-w-md rounded-[32px] p-6 space-y-6 animate-in zoom-in duration-300 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Cadastro Rápido de Cliente</h3>
                <p className="text-[8px] text-on-surface-variant uppercase tracking-widest">Insira os dados essenciais para o atendimento</p>
              </div>
              <button 
                onClick={() => {
                  setQuickCustomer({ name: '', cpf: '', phone: '' });
                  setIsQuickCustomerOpen(false);
                }}
                className="text-on-surface-variant hover:text-white transition-all text-lg font-black"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={quickCustomer.name}
                  onChange={(e) => setQuickCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3.5 text-xs text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">CPF</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={quickCustomer.cpf}
                    onChange={(e) => setQuickCustomer(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3.5 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Celular / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={quickCustomer.phone}
                    onChange={(e) => setQuickCustomer(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3.5 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setQuickCustomer({ name: '', cpf: '', phone: '' });
                    setIsQuickCustomerOpen(false);
                  }}
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingQuickCustomer}
                  className="flex-1 py-3.5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[9px] hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingQuickCustomer ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
