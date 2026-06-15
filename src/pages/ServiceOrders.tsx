import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, Search, Plus, Loader2, AlertCircle, CheckCircle2, 
  User, Phone, FileText, Printer, ExternalLink, ShieldAlert, 
  Save, ArrowLeft, Trash2, Smartphone, Monitor, PrinterIcon, 
  Gamepad2, PlusCircle, Check, Info, Calendar, DollarSign, Send,
  Edit, X, UserCheck
} from 'lucide-react';
import { useServiceOrderStore, ServiceOrder } from '../store/useServiceOrderStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePartnerStore } from '../store/usePartnerStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { useUnitStore } from '../store/useUnitStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { formatCPF, formatPhone, printElement, validateCPF, validateCNPJ } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

// Import subcomponentes isolados
import OsSidebar from '../components/layout/OsSidebar';
import OsTechWorkbench from '../components/layout/OsTechWorkbench';
import OsPartsLogistics from '../components/layout/OsPartsLogistics';
import DevicePhotoManager from '../components/layout/DevicePhotoManager';

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

const parseAddress = (addressStr?: string) => {
  if (!addressStr) return { street: '—', neighborhood: '—', cityState: '—', cep: '—' };
  const clean = addressStr.trim();
  const cepMatch = clean.match(/(\d{5}-?\d{3})/);
  const cep = cepMatch ? cepMatch[1] : '—';
  let remaining = clean;
  if (cepMatch) {
    remaining = clean.replace(cepMatch[0], '').replace(/,\s*$/, '').trim();
  }
  const dashParts = remaining.split(/\s*-\s*/);
  let street = '—';
  let neighborhood = '—';
  let cityState = '—';
  if (dashParts.length >= 3) {
    street = dashParts[0];
    neighborhood = dashParts[1];
    cityState = dashParts.slice(2).join(' - ');
  } else if (dashParts.length === 2) {
    street = dashParts[0];
    cityState = dashParts[1];
  } else {
    const commaParts = remaining.split(/\s*,\s*/);
    if (commaParts.length >= 3) {
      street = `${commaParts[0]}, ${commaParts[1]}`;
      neighborhood = commaParts[2];
      cityState = commaParts.slice(3).join(', ') || '—';
    } else {
      street = remaining;
    }
  }
  return { street, neighborhood, cityState, cep };
};

export default function ServiceOrders() {
  const { 
    serviceOrders, fetchServiceOrders, currentServiceOrder, fetchServiceOrderById,
    createServiceOrder, updateServiceOrder, deleteServiceOrder, addPartToOs,
    deletePartFromOs, notifyOsStatus, fetchOutsourcedInfo, outsourceOs, isLoading 
  } = useServiceOrderStore();
  
  const { customers, fetchCustomers, addCustomer } = useCustomerStore();
  const { inventory, fetchInventory } = useInventoryStore();
  const { showNotification } = useUI();
  const { profile, user } = useAuthStore();
  const isTerminal = user?.email?.toLowerCase().trim() === 'lojaarroio@mdrinformaticaecelulares.com.br' || 
                     user?.email?.toLowerCase().trim() === 'lojagaivota@mdrinformaticaecelulares.com.br';
  const { units, fetchAllUnits } = useUnitStore();
  const { hasPermission, fetchUserPermissions } = usePermissionStore();
  const { partners, fetchPartners, addPartner } = usePartnerStore();
  
  const [showQuickAddPartner, setShowQuickAddPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [isAddingPartner, setIsAddingPartner] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);
  const [osFilterTab, setOsFilterTab] = useState<'active' | 'canceled' | 'completed'>('active');
  const [activeMobileTab, setActiveMobileTab] = useState<'queue' | 'workbench'>('queue');
  const [isEditingReportedIssue, setIsEditingReportedIssue] = useState(false);
  const [editedReportedIssue, setEditedReportedIssue] = useState('');
  const [printFormatOverride, setPrintFormatOverride] = useState<'thermal' | 'a4' | null>(null);
  
  // Outsourcing State
  const [isOutsourceModalOpen, setIsOutsourceModalOpen] = useState(false);
  const [outsourcedInfo, setOutsourcedInfo] = useState<any | null>(null);
  const [outsourceForm, setOutsourceForm] = useState({
    partner_shop_name: '',
    partner_technician_name: '',
    external_cost: 0,
    tracking_code: '',
    notes: ''
  });
  
  // Navigation / Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', type: 'PF' as 'PF' | 'PJ', cpf: '', phone: '' });
  const [isLoadingQuickCustomer, setIsLoadingQuickCustomer] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);

  // Colaborador authentication states for OS creation
  const [isConfirmAuthOpen, setIsConfirmAuthOpen] = useState(false);
  const [authEmployeeId, setAuthEmployeeId] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

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
    device_pattern_lock: '',
    device_photos: [] as string[],
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
    fetchAllUnits();
    fetchUserPermissions();
    fetchPartners(undefined, false);

    const fetchAdmins = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('active', true);
      if (data) setAdmins(data);
    };
    fetchAdmins();
  }, [fetchServiceOrders, fetchCustomers, fetchInventory, fetchAllUnits, fetchUserPermissions, fetchPartners]);

  useEffect(() => {
    const searchParam = new URLSearchParams(window.location.search).get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleQuickAddPartner = async () => {
    if (!newPartnerName.trim()) {
      showNotification('error', 'Erro', 'Digite o nome do parceiro');
      return;
    }
    setIsAddingPartner(true);
    try {
      const created = await addPartner({
        name: newPartnerName.trim(),
        unit_id: profile?.unit_id || undefined
      });
      setOutsourceForm(prev => ({
        ...prev,
        partner_shop_name: created.name,
        partner_technician_name: created.technician_name || ''
      }));
      setNewPartnerName('');
      setShowQuickAddPartner(false);
      showNotification('success', 'Sucesso', 'Parceiro cadastrado com sucesso!');
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao cadastrar parceiro.');
    } finally {
      setIsAddingPartner(false);
    }
  };

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
      setActiveMobileTab('workbench');
      
      const loadOutsourceData = async () => {
        try {
          const info = await fetchOutsourcedInfo(selectedOsId);
          setOutsourcedInfo(info || null);
        } catch (e) {
          console.warn('Error loading outsourced info:', e);
        }
      };
      loadOutsourceData();
    }
  }, [selectedOsId, fetchServiceOrderById, fetchOutsourcedInfo]);

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name || !quickCustomer.phone) {
      showNotification('error', 'Erro', 'Nome e celular são obrigatórios.');
      return;
    }
    
    setIsLoadingQuickCustomer(true);
    try {
      const cleanCpf = quickCustomer.cpf.replace(/\D/g, '');
      
      if (cleanCpf) {
        if (quickCustomer.type === 'PF' && !validateCPF(cleanCpf)) {
          showNotification('error', 'Erro', 'CPF inválido.');
          setIsLoadingQuickCustomer(false);
          return;
        }
        if (quickCustomer.type === 'PJ' && !validateCNPJ(cleanCpf)) {
          showNotification('error', 'Erro', 'CNPJ inválido.');
          setIsLoadingQuickCustomer(false);
          return;
        }

        const existing = customers.find(c => c.cpf.replace(/\D/g, '') === cleanCpf);
        if (existing) {
          showNotification('error', 'Erro', `Já existe um cliente cadastrado com este ${quickCustomer.type === 'PF' ? 'CPF' : 'CNPJ'}.`);
          setIsLoadingQuickCustomer(false);
          return;
        }
      }

      const cleanPhone = quickCustomer.phone.replace(/\D/g, '');

      await addCustomer({
        name: quickCustomer.name,
        cpf: cleanCpf, // Stores cleaned CPF/CNPJ (can be empty string)
        phone: cleanPhone,
        address: '',
        status: 'active',
        classification: 'A_VISTA',
        credit_limit: 0,
        credit_status: 'APROVADO',
        registration_status: 'APROVADO',
        approved_for_purchase: true,
        unit_id: profile?.unit_id || undefined
      });

      await fetchCustomers(profile?.unit_id || undefined);

      // Find the created customer. If cleanCpf was provided, search by it. Otherwise, match by name and phone.
      const createdCustomer = useCustomerStore.getState().customers.find(
        c => cleanCpf 
          ? c.cpf.replace(/\D/g, '') === cleanCpf
          : (c.name === quickCustomer.name && c.phone.replace(/\D/g, '') === cleanPhone)
      );

      if (createdCustomer) {
        setNewOs(prev => ({ ...prev, customer_id: createdCustomer.id }));
        showNotification('success', 'Sucesso', 'Cliente cadastrado e selecionado com sucesso!');
      } else {
        showNotification('success', 'Sucesso', 'Cliente cadastrado com sucesso!');
      }

      setQuickCustomer({ name: '', type: 'PF', cpf: '', phone: '' });
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
        ? !['canceled', 'delivered', 'returned_no_fix'].includes(os.status)
        : osFilterTab === 'completed'
          ? ['delivered', 'returned_no_fix'].includes(os.status)
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

  const executeCreateOS = async (techId: string) => {
    setIsSubmitting(true);
    try {
      const isComputer = ['notebook', 'desktop'].includes(newOs.device_category);
      const finalCategory = newOs.device_category === 'other'
        ? newOs.custom_category.trim()
        : newOs.device_category;

      const created = await createServiceOrder({
        customer_id: newOs.customer_id,
        unit_id: newOs.unit_id || null,
        device_category: finalCategory,
        device_brand: isComputer ? (newOs.device_brand.trim() || '-') : newOs.device_brand,
        device_model: isComputer ? (newOs.device_model.trim() || '-') : newOs.device_model,
        device_serial_number: newOs.device_serial_number || null,
        device_passcode: newOs.device_passcode || null,
        device_pattern_lock: newOs.device_pattern_lock || null,
        device_photos: newOs.device_photos,
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
        device_pattern_lock: '',
        device_photos: [],
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

  const handleConfirmAuth = async () => {
    if (!authEmployeeId || !authPassword) {
      setAuthError('Selecione seu nome e digite a senha.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch('/api/users/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authEmployeeId, password: authPassword })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao autenticar colaborador.');
      }

      // Autenticado com sucesso!
      setIsConfirmAuthOpen(false);
      setAuthPassword('');

      const isTerminal = user?.email?.toLowerCase().trim() === 'lojaarroio@mdrinformaticaecelulares.com.br' || 
                         user?.email?.toLowerCase().trim() === 'lojagaivota@mdrinformaticaecelulares.com.br';

      if (isTerminal && !isCreateOpen) {
        setNewOs(prev => ({
          ...prev,
          responsible_technician_id: authEmployeeId
        }));
        setIsCreateOpen(true);
      } else {
        await executeCreateOS(authEmployeeId);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Senha incorreta.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateOS = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isComputer = ['notebook', 'desktop'].includes(newOs.device_category);
    const brandValid = isComputer || !!newOs.device_brand.trim();
    const modelValid = isComputer || !!newOs.device_model.trim();

    if (!newOs.customer_id || !brandValid || !modelValid || !newOs.reported_issue) {
      showNotification('error', 'Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (newOs.device_category === 'other' && !newOs.custom_category.trim()) {
      showNotification('error', 'Erro', 'Por favor, digite o nome da categoria manual.');
      return;
    }

    const isTerminal = user?.email?.toLowerCase().trim() === 'lojaarroio@mdrinformaticaecelulares.com.br' || 
                       user?.email?.toLowerCase().trim() === 'lojagaivota@mdrinformaticaecelulares.com.br';

    if (isTerminal) {
      await executeCreateOS(newOs.responsible_technician_id);
    } else {
      await executeCreateOS(newOs.responsible_technician_id || profile?.id || '');
    }
  };

  const handleNewOsClick = () => {
    const isTerminal = user?.email?.toLowerCase().trim() === 'lojaarroio@mdrinformaticaecelulares.com.br' || 
                       user?.email?.toLowerCase().trim() === 'lojagaivota@mdrinformaticaecelulares.com.br';
    
    setAuthEmployeeId('');
    setAuthPassword('');
    setAuthError('');
    
    if (isTerminal) {
      setIsConfirmAuthOpen(true);
    } else {
      setNewOs(prev => ({
        ...prev,
        responsible_technician_id: profile?.id || ''
      }));
      setIsCreateOpen(true);
    }
  };

  const handleOutsourceOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentServiceOrder) return;
    if (!outsourceForm.partner_shop_name.trim()) {
      showNotification('error', 'Nome do Laboratório Parceiro é obrigatório.');
      return;
    }

    try {
      const data = await outsourceOs(currentServiceOrder.id, outsourceForm);
      setOutsourcedInfo(data);
      setIsOutsourceModalOpen(false);
      showNotification('success', 'Ordem de Serviço enviada para parceiro terceirizado!');
      await updateServiceOrder(currentServiceOrder.id, { status: 'in_progress' });
    } catch (err) {
      showNotification('error', 'Erro ao vincular terceirização.');
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

  const handlePrintDocument = (id: string, format?: 'thermal' | 'a4') => {
    if (format) {
      setPrintFormatOverride(format);
    }
    setTimeout(() => {
      printElement(id);
    }, 50);
  };

  const handlePrintBothVias = (type: 'entry' | 'warranty', format?: 'thermal' | 'a4') => {
    const activeFormat = format || printFormatOverride || (currentServiceOrder ? (units.find(u => u.id === currentServiceOrder.unit_id) || units[0])?.print_mode : 'thermal') || 'thermal';
    if (format) {
      setPrintFormatOverride(format);
    }
    setTimeout(() => {
      if (activeFormat === 'a4') {
        if (type === 'entry') {
          printElement('print-os-entry-client');
        } else {
          printElement('print-os-warranty-client');
        }
      } else {
        if (type === 'entry') {
          printElement('print-os-entry-client');
          setTimeout(() => {
            printElement('print-os-entry-shop');
          }, 1000);
        } else {
          printElement('print-os-warranty-client');
          setTimeout(() => {
            printElement('print-os-warranty-shop');
          }, 1000);
        }
      }
    }, 50);
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


  const osUnit = useMemo(() => {
    if (!currentServiceOrder) return null;
    return units.find(u => u.id === currentServiceOrder.unit_id) || units[0] || {
      name: 'MDR Informática & Celulares',
      address: 'Rua Principal, 1234 - Centro',
      phone: '(11) 99999-9999',
      print_mode: 'thermal' as const
    };
  }, [currentServiceOrder, units]);

  const getPrintStyles = (format: 'thermal' | 'a4') => {
    if (format === 'a4') {
      return `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          @page {
            size: A4;
            margin: 12mm !important;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        .os-a4-receipt {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          font-family: 'Inter', Arial, sans-serif;
          font-size: 10.5px;
          color: #1e293b;
          background: #fff;
          line-height: 1.4;
        }
        .os-a4-receipt .a4-header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .os-a4-receipt .a4-brand-details {
          font-size: 9px;
          color: #475569;
          text-align: right;
          line-height: 1.5;
        }
        .os-a4-receipt .a4-title-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 14px;
          background-color: #f1f5f9;
        }
        .os-a4-receipt .a4-os-num {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }
        .os-a4-receipt .a4-chave {
          font-size: 9.5px;
          font-weight: 600;
          color: #475569;
          text-align: right;
        }
        .os-a4-receipt .a4-title-main {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #0f172a;
        }
        .os-a4-receipt .a4-date {
          font-size: 9.5px;
          color: #475569;
          text-align: right;
        }
        .os-a4-receipt .a4-section-header {
          font-weight: 800;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
          margin: 14px 0 6px 0;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 3px;
          color: #0f172a;
        }
        .os-a4-receipt table.a4-grid-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        .os-a4-receipt table.a4-grid-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          font-size: 10px;
          vertical-align: top;
          color: #1e293b;
        }
        .os-a4-receipt table.a4-grid-table tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .os-a4-receipt .a4-notes {
          font-size: 8px;
          line-height: 1.4;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 14px;
          background-color: #f8fafc;
          color: #334155;
        }
        .os-a4-receipt .a4-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 45px;
        }
        .os-a4-receipt .a4-sig-box {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .os-a4-receipt .a4-sig-line {
          border-top: 1px solid #94a3b8;
          width: 80%;
          margin-bottom: 6px;
        }
        .os-a4-receipt .a4-sig-box span {
          font-size: 8px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .os-a4-receipt .a4-sig-box strong {
          font-size: 10px;
          color: #0f172a;
        }
      `;
    }
    return `
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
      .os-thermal-receipt .font-mono {
        font-family: 'Courier New', Courier, monospace !important;
      }
      .os-thermal-receipt .text-small {
        font-size: 10.5px !important;
      }
      .os-thermal-receipt .clauses {
        font-size: 9.5px !important;
        text-align: justify !important;
        line-height: 1.3 !important;
        font-weight: 700 !important;
      }
      .os-thermal-receipt .sig-line-box {
        margin-top: 55px !important;
        text-align: center !important;
      }
      .os-thermal-receipt .sig-line {
        border-top: 1px solid #000 !important;
        width: 80% !important;
        margin: 0 auto 4px auto !important;
      }
      .os-thermal-receipt .sig-label {
        font-size: 10px !important;
        line-height: 1.2 !important;
        display: block !important;
      }
      .os-thermal-receipt .footer-note {
        font-size: 9px !important;
        text-align: center !important;
        margin-top: 8px !important;
        line-height: 1.3 !important;
      }
    `;
  };

  const renderOsEntryCopy = (copyTitle: string, forceFormat?: 'thermal' | 'a4') => {
    if (!currentServiceOrder || !osUnit) return null;
    const activeFormat = forceFormat || printFormatOverride || osUnit.print_mode || 'thermal';
    const unitNameParts = osUnit.name.split(' ');
    const brandName = unitNameParts[0] || 'MDR';
    const brandSub = unitNameParts.slice(1).join(' ').toUpperCase() || 'INFORMÁTICA & CELULARES';

    if (activeFormat === 'a4') {
      return (
        <div className="os-a4-receipt text-left">
          <style>{getPrintStyles('a4')}</style>
          <div className="a4-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo-mdr.png" alt="MDR Logo" style={{ height: '40px', objectFit: 'contain' }} />
            </div>
            <div className="a4-brand-details">
              {osUnit.address}<br />
              WhatsApp: {osUnit.phone} {osUnit.cnpj && `| CNPJ: ${osUnit.cnpj}`}
            </div>
          </div>

          {/* Title Row */}
          <div className="a4-title-row">
            <div>
              <div className="a4-os-num text-black font-black">OS N° #{String(currentServiceOrder.os_number).padStart(4, '0')}</div>
              <div className="a4-title-main font-black mt-1">{copyTitle}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="a4-chave font-mono">Chave: {currentServiceOrder.id.substring(0, 8).toUpperCase()}</div>
              <div className="a4-date mt-1">Data Entrada: {new Date(currentServiceOrder.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          <div className="a4-section-header text-black font-bold">Dados do Cliente</div>
          <table className="a4-grid-table border border-black text-black">
            <tbody>
              <tr>
                <td style={{ width: '60%' }} colSpan={2}><strong>Cliente:</strong> {currentServiceOrder.customers?.name}</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>Telefone:</strong> {currentServiceOrder.customers?.phone ? formatPhone(currentServiceOrder.customers.phone) : '—'}</td>
              </tr>
              {(() => {
                const parsed = parseAddress(currentServiceOrder.customers?.address);
                let city = parsed.cityState;
                let uf = '—';
                if (parsed.cityState && parsed.cityState !== '—') {
                  const parts = parsed.cityState.split(/\s*[-/]\s*/);
                  if (parts.length >= 2) {
                    city = parts[0];
                    uf = parts[1];
                  }
                }
                return (
                  <>
                    <tr>
                      <td colSpan={2}><strong>Endereço:</strong> {parsed.street}</td>
                      <td colSpan={2}><strong>Bairro:</strong> {parsed.neighborhood}</td>
                    </tr>
                    <tr>
                      <td style={{ width: '45%' }}><strong>Cidade:</strong> {city}</td>
                      <td style={{ width: '15%' }}><strong>UF:</strong> {uf}</td>
                      <td style={{ width: '40%' }} colSpan={2}><strong>CEP:</strong> {parsed.cep}</td>
                    </tr>
                  </>
                );
              })()}
              <tr>
                <td style={{ width: '45%' }}><strong>CPF/CNPJ:</strong> {currentServiceOrder.customers?.cpf ? formatCPF(currentServiceOrder.customers.cpf) : '—'}</td>
                <td style={{ width: '15%' }}><strong>RG/IE:</strong> —</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>E-mail:</strong> {currentServiceOrder.customers?.email || '—'}</td>
              </tr>
            </tbody>
          </table>

          <div className="a4-section-header text-black font-bold">Dados do Equipamento & Entrada</div>
          <table className="a4-grid-table border border-black text-black">
            <tbody>
              <tr>
                <td style={{ width: '60%' }} colSpan={2}><strong>Equipamento:</strong> {currentServiceOrder.device_category ? currentServiceOrder.device_category.toUpperCase() : '—'}</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>Operadora:</strong> —</td>
              </tr>
              <tr>
                <td style={{ width: '60%' }} colSpan={2}><strong>Modelo/Marca:</strong> {currentServiceOrder.device_brand} {currentServiceOrder.device_model}</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>Nº Patrimônio:</strong> —</td>
              </tr>
              <tr>
                <td style={{ width: '60%' }} colSpan={2}><strong>Serial / IMEI:</strong> {currentServiceOrder.device_serial_number || '—'}</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>Senha/PIN:</strong> {currentServiceOrder.device_passcode || '—'}</td>
              </tr>
              {['smartphone', 'tablet'].includes(currentServiceOrder.device_category) && (
                <tr>
                  <td colSpan={4}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <strong>Padrão de Segurança (Desenhar):</strong>
                      <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'inline-block' }}>
                        <svg viewBox="0 0 100 100" style={{ width: '60px', height: '60px', display: 'block' }}>
                          <circle cx="20" cy="20" r="4.5" fill="#000000" />
                          <circle cx="50" cy="20" r="4.5" fill="#000000" />
                          <circle cx="80" cy="20" r="4.5" fill="#000000" />
                          <circle cx="20" cy="50" r="4.5" fill="#000000" />
                          <circle cx="50" cy="50" r="4.5" fill="#000000" />
                          <circle cx="80" cy="50" r="4.5" fill="#000000" />
                          <circle cx="20" cy="80" r="4.5" fill="#000000" />
                          <circle cx="50" cy="80" r="4.5" fill="#000000" />
                          <circle cx="80" cy="80" r="4.5" fill="#000000" />
                        </svg>
                      </div>
                      <span style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase' }}>O cliente deve desenhar o padrão de desbloqueio</span>
                    </div>
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={4}><strong>Acessórios Inclusos:</strong> {currentServiceOrder.accessories_left && currentServiceOrder.accessories_left.length > 0 ? currentServiceOrder.accessories_left.join(', ') : 'Nenhum'}</td>
              </tr>
              <tr>
                <td colSpan={4}><strong>Sintomas / Defeito Relatado:</strong> {currentServiceOrder.reported_issue}</td>
              </tr>
              <tr>
                <td colSpan={4}><strong>Observações / Vistoria Visual:</strong> {currentServiceOrder.cosmetic_condition || 'Nenhuma observação estética'}</td>
              </tr>
              <tr>
                <td colSpan={4}>
                  <strong>Previsão de Entrega:</strong>{' '}
                  {(() => {
                    if (!currentServiceOrder.estimated_delivery) return 'Sem Previsão';
                    const date = new Date(currentServiceOrder.estimated_delivery + 'T12:00:00');
                    return isNaN(date.getTime()) ? 'Sem Previsão' : date.toLocaleDateString('pt-BR');
                  })()}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="a4-section-header text-black font-bold">Termos de Recebimento</div>
          <div className="a4-notes text-black leading-relaxed">
            1. <strong>Orçamento:</strong> Validade de 10 dias. Início após aprovação.<br />
            2. <strong>Backup de Dados:</strong> A {brandName} <strong>NÃO se responsabiliza por perdas de dados</strong> ou arquivos. Faça backup prévio.<br />
            3. <strong>Prazo de Descarte:</strong> Aparelhos deixados por <strong>mais de 90 dias</strong> após conclusão serão abandonados e poderão ser vendidos para cobrir despesas operacionais.
          </div>

          <div className="a4-signatures text-black mt-8">
            <div className="a4-sig-box">
              <div className="a4-sig-line"></div>
              <span>Estou de acordo com o que li no todo desta nota.</span>
              <strong className="mt-1">{currentServiceOrder.customers?.name}</strong>
            </div>
            <div className="a4-sig-box">
              <div className="a4-sig-line"></div>
              <span>Aparelho recebido por</span>
              <strong className="mt-1">{brandName} {brandSub}</strong>
            </div>
          </div>

          {/* Canhoto Destacável de Retirada */}
          <div className="a4-destacavel mt-12 pt-6 border-t-2 border-dashed border-slate-400 relative">
            <div className="absolute -top-3.5 left-10 bg-white px-2 py-0.5 text-[8px] font-black uppercase text-slate-500 tracking-widest border border-slate-200 rounded-md">
              ✂️ DESTAQUE E ENTREGUE AO CLIENTE
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">COMPROVANTE DE RETIRADA</h3>
                <p className="text-[9px] text-slate-500 uppercase mt-0.5">{brandName} {brandSub}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] text-slate-700">
                  <p><strong>Cliente:</strong> {currentServiceOrder.customers?.name}</p>
                  <p><strong>Aparelho:</strong> {currentServiceOrder.device_brand} {currentServiceOrder.device_model}</p>
                  {currentServiceOrder.device_serial_number && <p><strong>IMEI/Serial:</strong> {currentServiceOrder.device_serial_number}</p>}
                  <p><strong>Data Entrada:</strong> {new Date(currentServiceOrder.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900 block">OS N° #{String(currentServiceOrder.os_number).padStart(4, '0')}</span>
                <span className="text-[8px] font-mono text-slate-500 block mt-1">Chave: {currentServiceOrder.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 text-[9px] text-slate-700">
              <p><strong>Acompanhamento:</strong> mdrinformaticaecelulares.com.br/consulta-os (Acesse com seu CPF)</p>
              <p><strong>Forma de Pagamento (PIX):</strong> Chave Celular: <strong>48999035854</strong> | Favorecido: <strong>Maykon da Rosa</strong></p>
            </div>
            <p className="text-[8px] text-slate-500 italic mt-3 text-center">
              Apresente este canhoto para retirar seu equipamento na assistência técnica.
            </p>
          </div>
        </div>
      );
    }

    if (copyTitle === "VIA DO CLIENTE") {
      return (
        <div className="os-thermal-receipt">
          <style>{getPrintStyles('thermal')}</style>
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
              {osUnit.cnpj && <><br />CNPJ: {osUnit.cnpj}</>}
            </div>
          </div>

          <div className="double-divider"></div>

          {/* Title and Meta */}
          <div className="header-center">
            <div className="receipt-title">COMPROVANTE DE RETIRADA</div>
            <div className="receipt-num">OS N° #{String(currentServiceOrder.os_number).padStart(4, '0')}</div>
            <div className="receipt-date">Data Entrada: {new Date(currentServiceOrder.created_at).toLocaleDateString('pt-BR')}</div>
            <div className="receipt-date font-mono" style={{ fontSize: '9px', marginTop: '2px' }}>
              Chave: {currentServiceOrder.id.substring(0, 8).toUpperCase()}
            </div>
          </div>

          <div className="divider"></div>

          {/* Buyer Section */}
          <div className="row">
            <span>Cliente:</span>
            <span className="align-right">{currentServiceOrder.customers?.name}</span>
          </div>
          <div className="row">
            <span>Aparelho:</span>
            <span className="align-right">{currentServiceOrder.device_brand} {currentServiceOrder.device_model}</span>
          </div>
          {currentServiceOrder.device_serial_number && (
            <div className="row">
              <span>IMEI/Serial:</span>
              <span className="align-right font-mono text-small">{currentServiceOrder.device_serial_number}</span>
            </div>
          )}

          <div className="divider"></div>

          {/* Online Tracking Instruction */}
          <div className="section-title" style={{ textAlign: 'center' }}>ACOMPANHAR CONSERTO ONLINE</div>
          <div className="clauses" style={{ textAlign: 'center', fontSize: '9px', marginBottom: '8px' }}>
            Consulte o status em tempo real do seu aparelho acessando:<br />
            <strong>mdrinformaticaecelulares.com.br/consulta-os</strong><br />
            e informe o seu CPF.
          </div>

          <div className="divider"></div>

          <div className="section-title" style={{ textAlign: 'center' }}>PAGAMENTO VIA PIX</div>
          <div className="clauses" style={{ textAlign: 'center', fontSize: '10px' }}>
            Chave Celular: <strong>48999035854</strong><br />
            Favorecido: <strong>Maykon da Rosa</strong>
          </div>

          <div className="divider"></div>

          <div className="footer-note" style={{ fontStyle: 'italic' }}>
            Apresente este canhoto para retirar seu equipamento na assistência técnica. Obrigado!
          </div>
        </div>
      );
    }

    return (
      <div className="os-thermal-receipt">
        <style>{getPrintStyles('thermal')}</style>
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
            {osUnit.cnpj && <><br />CNPJ: {osUnit.cnpj}</>}
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
        {['smartphone', 'tablet'].includes(currentServiceOrder.device_category) && (
          <div className="row" style={{ flexDirection: 'column', alignItems: 'center', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Padrão de Desbloqueio:</span>
            <div style={{ background: '#ffffff', padding: '4px', borderRadius: '8px', border: '1px solid #000000', marginTop: '4px', display: 'inline-block' }}>
              <svg viewBox="0 0 100 100" style={{ width: '70px', height: '70px', display: 'block' }}>
                <circle cx="20" cy="20" r="4.5" fill="#000000" />
                <circle cx="50" cy="20" r="4.5" fill="#000000" />
                <circle cx="80" cy="20" r="4.5" fill="#000000" />
                <circle cx="20" cy="50" r="4.5" fill="#000000" />
                <circle cx="50" cy="50" r="4.5" fill="#000000" />
                <circle cx="80" cy="50" r="4.5" fill="#000000" />
                <circle cx="20" cy="80" r="4.5" fill="#000000" />
                <circle cx="50" cy="80" r="4.5" fill="#000000" />
                <circle cx="80" cy="80" r="4.5" fill="#000000" />
              </svg>
            </div>
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
        <div className="row">
          <span>Previsão de Entrega:</span>
          <span className="align-right font-mono">
            {(() => {
              if (!currentServiceOrder.estimated_delivery) return 'Sem Previsão';
              const date = new Date(currentServiceOrder.estimated_delivery + 'T12:00:00');
              return isNaN(date.getTime()) ? 'Sem Previsão' : date.toLocaleDateString('pt-BR');
            })()}
          </span>
        </div>

        <div className="divider"></div>

        {/* Signatures */}
        <div className="sig-line-box" style={{ marginTop: '55px' }}>
          <div className="sig-line"></div>
          <span className="sig-label">{brandName} {brandSub}</span>
        </div>

        <div className="sig-line-box" style={{ marginTop: '75px' }}>
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

  const renderOsWarrantyCopy = (copyTitle: string, forceFormat?: 'thermal' | 'a4') => {
    if (!currentServiceOrder || !osUnit) return null;
    const activeFormat = forceFormat || printFormatOverride || osUnit.print_mode || 'thermal';
    const today = new Date().toLocaleDateString('pt-BR');
    const unitNameParts = osUnit.name.split(' ');
    const brandName = unitNameParts[0] || 'MDR';
    const brandSub = unitNameParts.slice(1).join(' ').toUpperCase() || 'INFORMÁTICA & CELULARES';

    if (activeFormat === 'a4') {
      return (
        <div className="os-a4-receipt text-left">
          <style>{getPrintStyles('a4')}</style>
          <div className="a4-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo-mdr.png" alt="MDR Logo" style={{ height: '40px', objectFit: 'contain' }} />
            </div>
            <div className="a4-brand-details">
              {osUnit.address}<br />
              WhatsApp: {osUnit.phone} {osUnit.cnpj && `| CNPJ: ${osUnit.cnpj}`}
            </div>
          </div>

          {/* Title Row */}
          <div className="a4-title-row">
            <div>
              <div className="a4-os-num text-black font-black">OS N° #{String(currentServiceOrder.os_number).padStart(4, '0')}</div>
              <div className="a4-title-main font-black mt-1">{copyTitle}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="a4-chave font-mono">Chave: {currentServiceOrder.id.substring(0, 8).toUpperCase()}</div>
              <div className="a4-date mt-1">Data Saída: {today}</div>
            </div>
          </div>

          <div className="a4-section-header text-black font-bold">Dados do Cliente</div>
          <table className="a4-grid-table border border-black text-black">
            <tbody>
              <tr>
                <td style={{ width: '60%' }} colSpan={2}><strong>Cliente:</strong> {currentServiceOrder.customers?.name}</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>Telefone:</strong> {currentServiceOrder.customers?.phone ? formatPhone(currentServiceOrder.customers.phone) : '—'}</td>
              </tr>
              {(() => {
                const parsed = parseAddress(currentServiceOrder.customers?.address);
                let city = parsed.cityState;
                let uf = '—';
                if (parsed.cityState && parsed.cityState !== '—') {
                  const parts = parsed.cityState.split(/\s*[-/]\s*/);
                  if (parts.length >= 2) {
                    city = parts[0];
                    uf = parts[1];
                  }
                }
                return (
                  <>
                    <tr>
                      <td colSpan={2}><strong>Endereço:</strong> {parsed.street}</td>
                      <td colSpan={2}><strong>Bairro:</strong> {parsed.neighborhood}</td>
                    </tr>
                    <tr>
                      <td style={{ width: '45%' }}><strong>Cidade:</strong> {city}</td>
                      <td style={{ width: '15%' }}><strong>UF:</strong> {uf}</td>
                      <td style={{ width: '40%' }} colSpan={2}><strong>CEP:</strong> {parsed.cep}</td>
                    </tr>
                  </>
                );
              })()}
              <tr>
                <td style={{ width: '45%' }}><strong>CPF/CNPJ:</strong> {currentServiceOrder.customers?.cpf ? formatCPF(currentServiceOrder.customers.cpf) : '—'}</td>
                <td style={{ width: '15%' }}><strong>RG/IE:</strong> —</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>E-mail:</strong> {currentServiceOrder.customers?.email || '—'}</td>
              </tr>
            </tbody>
          </table>

          <div className="a4-section-header text-black font-bold">Dados do Equipamento & Reparo</div>
          <table className="a4-grid-table border border-black text-black">
            <tbody>
              <tr>
                <td style={{ width: '60%' }} colSpan={2}><strong>Equipamento:</strong> {currentServiceOrder.device_category ? currentServiceOrder.device_category.toUpperCase() : '—'}</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>Operadora:</strong> —</td>
              </tr>
              <tr>
                <td style={{ width: '60%' }} colSpan={2}><strong>Modelo/Marca:</strong> {currentServiceOrder.device_brand} {currentServiceOrder.device_model}</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>Nº Patrimônio:</strong> —</td>
              </tr>
              <tr>
                <td style={{ width: '60%' }} colSpan={2}><strong>Serial / IMEI:</strong> {currentServiceOrder.device_serial_number || '—'}</td>
                <td style={{ width: '40%' }} colSpan={2}><strong>Senha/PIN:</strong> {currentServiceOrder.device_passcode || '—'}</td>
              </tr>
              <tr>
                <td colSpan={4}><strong>Problema Original / Sintomas:</strong> {currentServiceOrder.reported_issue}</td>
              </tr>
              <tr>
                <td colSpan={4}>
                  <strong>Laudo Técnico de Reparo:</strong>{' '}
                  {currentServiceOrder.technical_diagnosis ? currentServiceOrder.technical_diagnosis.split('[')[0].trim() : 'Reparo concluído.'}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="a4-section-header text-black font-bold">Resumo Financeiro</div>
          <table className="a4-grid-table border border-black text-black">
            <tbody>
              <tr>
                <td style={{ width: '33%' }}><strong>Mão de Obra:</strong> R$ {Number(currentServiceOrder.labor_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style={{ width: '33%' }}><strong>Peças Aplicadas:</strong> R$ {Number(currentServiceOrder.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style={{ width: '34%' }}><strong>Forma Pagamento:</strong> {currentServiceOrder.payment_method ? currentServiceOrder.payment_method.toUpperCase() : 'PIX / Dinheiro'}</td>
              </tr>
              <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ textAlign: 'center', fontSize: '11px' }}>
                  VALOR TOTAL PAGO: R$ {Number(currentServiceOrder.labor_value + currentServiceOrder.parts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="a4-section-header text-black font-bold">Certificado de Garantia</div>
          <div className="a4-notes text-black leading-relaxed">
            Garantia técnica de <strong>{currentServiceOrder.warranty_period || 90} dias</strong> sobre peças/serviços desta OS.<br />
            <strong>EXCLUSÕES DA GARANTIA:</strong> A garantia será anulada em caso de:<br />
            • Quedas, quebras, amassados ou mau uso;<br />
            • Oxidação, umidade ou contato com líquidos;<br />
            • Rompimento dos lacres {brandName} aplicados;<br />
            • Abertura por terceiros.<br />
            <strong>PAGAMENTO VIA PIX:</strong> Chave Celular: <strong>48999035854</strong> | Favorecido: <strong>Maykon da Rosa</strong>
          </div>

          <div className="a4-signatures text-black mt-8">
            <div className="a4-sig-box">
              <div className="a4-sig-line"></div>
              <span>Responsável Técnico</span>
              <strong className="mt-1">{brandName} {brandSub}</strong>
            </div>
            <div className="a4-sig-box">
              <div className="a4-sig-line"></div>
              <span>Assinatura do Cliente</span>
              <strong className="mt-1">{currentServiceOrder.customers?.name}</strong>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="os-thermal-receipt">
        <style>{getPrintStyles('thermal')}</style>
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
            {osUnit.cnpj && <><br />CNPJ: {osUnit.cnpj}</>}
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
        <div className="section-title">CERTIFICADO DE GARANTIA</div>
        <div className="clauses">
          Garantia técnica de **{currentServiceOrder.warranty_period || 90} dias** sobre peças/serviços desta OS.<br />
          <strong>EXCLUSÕES DA GARANTIA:</strong> A garantia será anulada em caso de:<br />
          • Quedas, quebras, amassados ou mau uso;<br />
          • Oxidação, umidade ou contato com líquidos;<br />
          • Rompimento dos lacres {brandName} aplicados;<br />
          • Abertura por terceiros.
        </div>

        {copyTitle === "VIA DO CLIENTE" && (
          <>
            <div className="divider"></div>
            <div className="section-title" style={{ textAlign: 'center' }}>PAGAMENTO VIA PIX</div>
            <div className="clauses" style={{ textAlign: 'center', fontSize: '10px' }}>
              Chave Celular: <strong>48999035854</strong><br />
              Favorecido: <strong>Maykon da Rosa</strong>
            </div>
          </>
        )}

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
        <div className="sig-line-box" style={{ marginTop: '55px' }}>
          <div className="sig-line"></div>
          <span className="sig-label">{brandName} {brandSub}</span>
        </div>

        <div className="sig-line-box" style={{ marginTop: '75px' }}>
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
        {hasPermission(profile, 'OS - Criar Nova OS') && (
          <button
            onClick={handleNewOsClick}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary font-black uppercase tracking-widest text-[10px] px-6 py-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20"
          >
            <Plus size={16} /> Nova Ordem de Serviço
          </button>
        )}
      </div>

      {/* TABS DE CATEGORIAS */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-6 custom-scrollbar">
        {DEVICE_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategoryTab(cat.id);
                setSelectedOsId(null);
              }}
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
 
      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-white/[0.02] border border-white/5 p-1 rounded-3xl mb-6 gap-1.5">
        <button
          onClick={() => setActiveMobileTab('queue')}
          className={cn(
            "flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all",
            activeMobileTab === 'queue'
              ? "bg-primary text-on-primary shadow-lg shadow-primary/10"
              : "text-on-surface-variant hover:text-white"
          )}
        >
          Fila de OS ({filteredOs.length})
        </button>
        <button
          onClick={() => setActiveMobileTab('workbench')}
          className={cn(
            "flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all",
            activeMobileTab === 'workbench'
              ? "bg-primary text-on-primary shadow-lg shadow-primary/10"
              : "text-on-surface-variant hover:text-white"
          )}
        >
          Detalhes / Bancada
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: FILA DE ORDENS DE SERVIÇO */}
        <div className={cn("w-full", activeMobileTab === 'queue' ? 'block' : 'hidden lg:block')}>
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
            updateServiceOrder={updateServiceOrder}
          />
        </div>

        {/* COLUNA 2 E 3: BANCADA DO TÉCNICO & DETALHES DA OS */}
        <div className={cn("lg:col-span-2 flex flex-col gap-6", activeMobileTab === 'workbench' ? 'block' : 'hidden lg:block')}>
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
                        OS #{String(currentServiceOrder.os_number).padStart(4, '0')} - {currentServiceOrder.device_brand === '-' && currentServiceOrder.device_model === '-' ? (currentServiceOrder.device_category === 'notebook' ? 'Notebook' : 'Computador PC') : `${currentServiceOrder.device_brand} ${currentServiceOrder.device_model}`}
                      </h2>
                      <p className="text-[10px] text-on-surface-variant font-mono uppercase mt-0.5">
                        N/S ou IMEI: {currentServiceOrder.device_serial_number || 'Sem número de série'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    {/* Seletor de Formato */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 shrink-0 h-[42px]">
                      <span className="text-[9px] text-on-surface-variant font-black uppercase tracking-wider">Formato:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPrintFormatOverride('thermal')}
                          className={cn(
                            "px-2.5 py-1 rounded-xl font-bold uppercase text-[8px] transition-all",
                            (printFormatOverride || osUnit?.print_mode || 'thermal') === 'thermal'
                              ? "bg-primary text-on-primary"
                              : "text-white/60 hover:bg-white/10"
                          )}
                        >
                          Cupom
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintFormatOverride('a4')}
                          className={cn(
                            "px-2.5 py-1 rounded-xl font-bold uppercase text-[8px] transition-all",
                            (printFormatOverride || osUnit?.print_mode || 'thermal') === 'a4'
                              ? "bg-primary text-on-primary"
                              : "text-white/60 hover:bg-white/10"
                          )}
                        >
                          A4
                        </button>
                      </div>
                    </div>

                    {(printFormatOverride || osUnit?.print_mode || 'thermal') === 'a4' ? (
                      <>
                        <button
                          onClick={() => handlePrintBothVias('entry')}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/35 border border-primary/30 text-primary-light font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                          title="Imprimir Ordem de Serviço A4 (Via Única)"
                        >
                          <Printer size={12} /> Imprimir A4 (Entrada)
                        </button>
                        <button
                          onClick={() => handlePrintBothVias('warranty')}
                          disabled={currentServiceOrder.status !== 'delivered'}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/35 border border-primary/30 text-primary-light font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                          title={currentServiceOrder.status === 'delivered' ? "Imprimir Termo de Saída/Garantia A4" : "Disponível apenas após a OS ser concluída/entregue"}
                        >
                          <Printer size={12} /> Imprimir A4 (Saída)
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePrintBothVias('entry')}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/35 border border-primary/30 text-primary-light font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                          title="Imprimir Via do Cliente e Via da Loja sequencialmente"
                        >
                          <Printer size={12} /> Imprimir 2 Vias (Entrada)
                        </button>
                        <button
                          onClick={() => handlePrintDocument('print-os-entry-client')}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                          title="Imprimir Via do Cliente (Entrada)"
                        >
                          <Printer size={12} /> Via Cliente (Entrada)
                        </button>
                        <button
                          onClick={() => handlePrintDocument('print-os-entry-shop')}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all"
                          title="Imprimir Via da Assistência (Entrada)"
                        >
                          <Printer size={12} /> Via Loja (Entrada)
                        </button>
                        <button
                          onClick={() => handlePrintBothVias('warranty')}
                          disabled={currentServiceOrder.status !== 'delivered'}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/35 border border-primary/30 text-primary-light font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                          title={currentServiceOrder.status === 'delivered' ? "Imprimir Via do Cliente e Via da Loja (Saída)" : "Disponível apenas após a OS ser concluída/entregue"}
                        >
                          <Printer size={12} /> Imprimir 2 Vias (Saída)
                        </button>
                        <button
                          onClick={() => handlePrintDocument('print-os-warranty-client')}
                          disabled={currentServiceOrder.status !== 'delivered'}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                          title={currentServiceOrder.status === 'delivered' ? "Imprimir Via do Cliente (Saída/Garantia)" : "Disponível apenas após a OS ser concluída/entregue"}
                        >
                          <Printer size={12} /> Via Cliente (Saída)
                        </button>
                        <button
                          onClick={() => handlePrintDocument('print-os-warranty-shop')}
                          disabled={currentServiceOrder.status !== 'delivered'}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                          title={currentServiceOrder.status === 'delivered' ? "Imprimir Via da Assistência (Saída/Garantia)" : "Disponível apenas após a OS ser concluída/entregue"}
                        >
                          <Printer size={12} /> Via Loja (Saída)
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        if (outsourcedInfo) {
                          window.location.href = `/outsourcing?search=${currentServiceOrder.os_number}`;
                        } else {
                          setOutsourceForm({
                            partner_shop_name: '',
                            partner_technician_name: '',
                            external_cost: 0,
                            tracking_code: '',
                            notes: ''
                          });
                          setIsOutsourceModalOpen(true);
                        }
                      }}
                      className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[9px] px-4 py-3 rounded-2xl transition-all border cursor-pointer",
                        outsourcedInfo 
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 animate-pulse" 
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                      )}
                      title={outsourcedInfo ? "Visualizar status no laboratório externo" : "Terceirizar serviço para laboratório parceiro"}
                    >
                      <ExternalLink size={12} /> {outsourcedInfo ? "Terceirizada" : "Terceirizar OS"}
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

                  {currentServiceOrder.device_pattern_lock && (
                    <div className="flex items-start gap-2.5 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                      <Info size={14} className="opacity-40 text-primary mt-0.5" />
                      <div>
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-wider leading-none">Padrão de Desbloqueio</p>
                        <div className="mt-1.5 bg-white p-1.5 rounded-xl inline-block border border-white/10">
                          <img src={currentServiceOrder.device_pattern_lock} className="w-16 h-16 object-contain block" />
                        </div>
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

                  <div className="md:col-span-2 border-t border-white/5 pt-4">
                    <DevicePhotoManager
                      photos={currentServiceOrder.device_photos || []}
                      onChange={async (urls) => {
                        try {
                          await updateServiceOrder(currentServiceOrder.id, { device_photos: urls });
                          showNotification('success', 'Galeria de fotos atualizada!');
                        } catch (err) {
                          showNotification('error', 'Falha ao atualizar fotos.');
                        }
                      }}
                      title="Galeria de Fotos da Vistoria (Apenas Registro)"
                    />
                  </div>
                </div>
              </div>

              {/* BANCADA E TESTES DE QUALIDADE */}
              <OsTechWorkbench 
                currentServiceOrder={currentServiceOrder}
                activeChecklist={activeChecklist}
                isChecklistItemOk={isChecklistItemOk}
                handleToggleChecklist={handleToggleChecklist}
                disabled={!hasPermission(profile, 'OS - Mudar Status de Bancada')}
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
                disabled={!hasPermission(profile, 'OS - Editar OS')}
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
                      disabled={!hasPermission(profile, 'OS - Editar OS')}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { status: e.target.value as any })}
                      className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all disabled:opacity-50"
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
                        value={currentServiceOrder.labor_value || ''}
                        disabled={!hasPermission(profile, 'OS - Editar OS')}
                        onChange={(e) => updateServiceOrder(currentServiceOrder.id, { labor_value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono disabled:opacity-50"
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
                      disabled={!hasPermission(profile, 'OS - Editar OS')}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { technical_diagnosis: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all resize-none leading-relaxed disabled:opacity-50"
                    />
                  </div>

                  {/* Warranty Notes */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Período de Garantia (Dias)</label>
                    <input 
                      type="number" 
                      value={currentServiceOrder.warranty_period}
                      disabled={!hasPermission(profile, 'OS - Editar OS')}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { warranty_period: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono disabled:opacity-50"
                    />
                  </div>

                  {/* Unit Selection */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Unidade / Loja</label>
                    <select
                      value={currentServiceOrder.unit_id || ''}
                      disabled={!hasPermission(profile, 'OS - Editar OS')}
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { unit_id: e.target.value || null })}
                      className="w-full bg-[#121214] border border-primary/20 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all disabled:opacity-50"
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
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Colaborador Responsável</label>
                    <select
                      value={currentServiceOrder.responsible_technician_id || ''}
                      disabled={
                        !hasPermission(profile, 'OS - Editar OS') || 
                        ['delivered', 'returned_no_fix', 'canceled'].includes(currentServiceOrder.status) ||
                        isTerminal
                      }
                      onChange={(e) => updateServiceOrder(currentServiceOrder.id, { responsible_technician_id: e.target.value || null as any })}
                      className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all disabled:opacity-50"
                    >
                      <option value="">Não Atribuído</option>
                      {admins
                        .filter(adm => !adm.full_name.toLowerCase().includes('terminal') && adm.full_name.toLowerCase() !== 'loja arroio')
                        .map(adm => (
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
                  {hasPermission(profile, 'OS - Editar OS') && (
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
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ======================================================================= */}
      {/* MODAL: NOVA ORDEM DE SERVIÇO */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#121214] border border-outline-variant/30 w-full max-w-5xl rounded-2xl sm:rounded-[40px] p-4 sm:p-8 space-y-4 sm:space-y-6 my-4 sm:my-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-md font-black uppercase tracking-wider text-white">Criar Nova Ordem de Serviço (OS)</h3>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Preencha a vistoria e intake de entrada</p>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/5 transition-all"
                aria-label="Fechar"
              >
                <X size={18} />
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
                {!['notebook', 'desktop'].includes(newOs.device_category) && (
                  <div className="space-y-2 animate-in fade-in duration-200">
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
                )}

                {/* Modelo */}
                {!['notebook', 'desktop'].includes(newOs.device_category) && (
                  <div className="space-y-2 animate-in fade-in duration-200">
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
                )}

                {/* Serial / IMEI */}
                {['smartphone', 'tablet', 'notebook', 'desktop'].includes(newOs.device_category) && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Número de Série / IMEI</label>
                    <input
                      type="text"
                      placeholder="N/S ou IMEI"
                      value={newOs.device_serial_number}
                      onChange={(e) => setNewOs(prev => ({ ...prev, device_serial_number: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono"
                    />
                  </div>
                )}

                {/* Senha do Aparelho (Texto/PIN) */}
                {['smartphone', 'tablet', 'notebook', 'desktop'].includes(newOs.device_category) && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Senha de Entrada / PIN</label>
                    <input
                      type="text"
                      placeholder="Ex: 1234, admin, sem senha"
                      value={newOs.device_passcode}
                      onChange={(e) => setNewOs(p => ({ ...p, device_passcode: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all font-mono text-warning"
                    />
                  </div>
                )}

                {/* Senha por Desenho (Padrão) */}
                {['smartphone', 'tablet'].includes(newOs.device_category) && (
                  <div className="space-y-2 md:col-span-2 animate-in fade-in duration-200">
                    <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Senha por Desenho (Padrão)</label>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        A grade de pontos 3x3 será impressa no comprovante para que o cliente desenhe o padrão manualmente.
                      </p>
                    </div>
                  </div>
                )}

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

              {/* Fotos de Vistoria (Registro Opcional) */}
              <DevicePhotoManager
                photos={newOs.device_photos}
                onChange={(urls) => setNewOs(prev => ({ ...prev, device_photos: urls }))}
                title="Fotos do Aparelho (Vistoria de Entrada - Apenas Registro)"
              />

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
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Atribuir a um Colaborador</label>
                  <select
                    value={newOs.responsible_technician_id}
                    onChange={(e) => setNewOs(prev => ({ ...prev, responsible_technician_id: e.target.value }))}
                    disabled={user?.email?.toLowerCase().trim() === 'lojaarroio@mdrinformaticaecelulares.com.br' || user?.email?.toLowerCase().trim() === 'lojagaivota@mdrinformaticaecelulares.com.br'}
                    className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-xs text-on-surface focus:border-primary outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Não Atribuir (Aguardando Fila)</option>
                    {admins
                      .filter(adm => !adm.full_name.toLowerCase().includes('terminal') && adm.full_name.toLowerCase() !== 'loja arroio')
                      .map(adm => (
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
                      value={newOs.labor_value || ''}
                      onChange={(e) => setNewOs(prev => ({ ...prev, labor_value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
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
          {/* TERMO 1: COMPROVANTE DE ENTRADA (OS ADMISSION) - CLIENTE */}
          <div id="print-os-entry-client" className="hidden">
            {renderOsEntryCopy("VIA DO CLIENTE")}
          </div>

          {/* TERMO 1: COMPROVANTE DE ENTRADA (OS ADMISSION) - LOJA */}
          <div id="print-os-entry-shop" className="hidden">
            {renderOsEntryCopy("VIA DA ASSISTÊNCIA")}
          </div>

          {/* TERMO 2: COMPROVANTE DE SAÍDA E GARANTIA (OS FINAL WARRANTY) - CLIENTE */}
          <div id="print-os-warranty-client" className="hidden">
            {renderOsWarrantyCopy("VIA DO CLIENTE")}
          </div>

          {/* TERMO 2: COMPROVANTE DE SAÍDA E GARANTIA (OS FINAL WARRANTY) - LOJA */}
          <div id="print-os-warranty-shop" className="hidden">
            {renderOsWarrantyCopy("VIA DA ASSISTÊNCIA")}
          </div>
        </>
      )}

      {/* ======================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE IMPRESSÃO IMEDIATA */}
      {justCreatedOs && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#121214] border border-outline-variant/30 w-full max-w-md rounded-[40px] p-8 space-y-6 text-center animate-in zoom-in duration-300 shadow-2xl relative">
            {/* Botão de Fechar */}
            <button
              onClick={() => setJustCreatedOs(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/5 transition-all z-10"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

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

            <div className="flex items-center justify-center gap-4 py-2 border-y border-white/5">
              <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider">Formato:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPrintFormatOverride('thermal')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[8px] transition-all",
                    (printFormatOverride || (justCreatedOs && units.find(u => u.id === justCreatedOs.unit_id)?.print_mode) || 'thermal') === 'thermal'
                      ? "bg-primary text-on-primary"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                  )}
                >
                  Cupom
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormatOverride('a4')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[8px] transition-all",
                    (printFormatOverride || (justCreatedOs && units.find(u => u.id === justCreatedOs.unit_id)?.print_mode) || 'thermal') === 'a4'
                      ? "bg-primary text-on-primary"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                  )}
                >
                  Folha A4
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {(printFormatOverride || (justCreatedOs && units.find(u => u.id === justCreatedOs.unit_id)?.print_mode) || 'thermal') === 'a4' ? (
                <button
                  onClick={() => handlePrintBothVias('entry')}
                  className="w-full py-3.5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[9px] hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={14} /> Imprimir Ordem de Serviço A4 (Via Única)
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handlePrintBothVias('entry')}
                    className="w-full py-3.5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[9px] hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer size={14} /> Imprimir Ambas as Vias (Cliente + Loja)
                  </button>
                  <button
                    onClick={() => handlePrintDocument('print-os-entry-client')}
                    className="w-full py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer size={14} /> Imprimir Via do Cliente
                  </button>
                  <button
                    onClick={() => handlePrintDocument('print-os-entry-shop')}
                    className="w-full py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer size={14} /> Imprimir Via da Loja
                  </button>
                </>
              )}
              <button
                onClick={() => setJustCreatedOs(null)}
                className="w-full py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                Fechar / Concluir
              </button>
            </div>
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
                  setQuickCustomer({ name: '', type: 'PF', cpf: '', phone: '' });
                  setIsQuickCustomerOpen(false);
                }}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/5 transition-all"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome Completo / Razão Social</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva ou MDR Ltda"
                  value={quickCustomer.name}
                  onChange={(e) => setQuickCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3.5 text-xs text-white focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Toggle Tipo de Documento */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Tipo de Documento</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCustomer(prev => ({ ...prev, type: 'PF', cpf: '' }))}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all",
                      quickCustomer.type === 'PF'
                        ? "bg-primary border-primary text-on-primary"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    )}
                  >
                    Pessoa Física (CPF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCustomer(prev => ({ ...prev, type: 'PJ', cpf: '' }))}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all",
                      quickCustomer.type === 'PJ'
                        ? "bg-primary border-primary text-on-primary"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    )}
                  >
                    Pessoa Jurídica (CNPJ)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">
                    {quickCustomer.type === 'PF' ? 'CPF (Opcional)' : 'CNPJ (Opcional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={quickCustomer.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
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
                    setQuickCustomer({ name: '', type: 'PF', cpf: '', phone: '' });
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

      {/* MODAL: TERCEIRIZAR ORDEM DE SERVIÇO */}
      {isOutsourceModalOpen && currentServiceOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-outline-variant/30 w-full max-w-md rounded-[32px] p-6 space-y-6 animate-in zoom-in duration-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Terceirizar OS</h3>
                <p className="text-[8px] text-on-surface-variant uppercase tracking-widest">Enviar equipamento para laboratório parceiro</p>
              </div>
              <button 
                onClick={() => setIsOutsourceModalOpen(false)}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/5 transition-all"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOutsourceOS} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Laboratório / Loja Parceira *</label>
                {!showQuickAddPartner ? (
                  <div className="flex gap-2">
                    <select
                      required
                      value={outsourceForm.partner_shop_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const partnerObj = partners.find(p => p.name === val);
                        setOutsourceForm(prev => ({
                          ...prev,
                          partner_shop_name: val,
                          partner_technician_name: partnerObj?.technician_name || prev.partner_technician_name || ''
                        }));
                      }}
                      className="flex-1 bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none appearance-none"
                    >
                      <option value="" className="bg-[#121214] text-white">— Selecione o Parceiro —</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.name} className="bg-[#121214] text-white">{p.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddPartner(true)}
                      className="p-3 bg-white/5 hover:bg-white/10 text-white border border-outline-variant/30 rounded-2xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                      title="Cadastrar parceiro rápido"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 bg-white/[0.02] border border-white/5 p-3 rounded-2xl animate-in slide-in-from-top-1 duration-200">
                    <span className="text-[8px] font-bold text-primary uppercase tracking-wider block">Novo Parceiro Rápido</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPartnerName}
                        onChange={(e) => setNewPartnerName(e.target.value)}
                        placeholder="Nome do laboratório parceiro"
                        className="flex-1 bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-2 text-xs text-white focus:border-primary outline-none"
                        disabled={isAddingPartner}
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddPartner}
                        disabled={isAddingPartner}
                        className="px-3 bg-primary text-on-primary rounded-2xl text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                      >
                        {isAddingPartner ? '...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickAddPartner(false);
                          setNewPartnerName('');
                        }}
                        disabled={isAddingPartner}
                        className="px-3 bg-white/5 hover:bg-white/10 text-white border border-outline-variant/30 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Técnico Externo Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos, Técnico Responsável"
                  value={outsourceForm.partner_technician_name}
                  onChange={(e) => setOutsourceForm(prev => ({ ...prev, partner_technician_name: e.target.value }))}
                  className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Custo Estimado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={outsourceForm.external_cost}
                    onChange={(e) => setOutsourceForm(prev => ({ ...prev, external_cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Cód. Rastreio / Motoboy</label>
                  <input
                    type="text"
                    placeholder="Ex: Rastreio correios ou motoboy"
                    value={outsourceForm.tracking_code}
                    onChange={(e) => setOutsourceForm(prev => ({ ...prev, tracking_code: e.target.value }))}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Observações de Envio</label>
                <textarea
                  rows={3}
                  placeholder="Notas de defeito ou peças para o laboratório externo..."
                  value={outsourceForm.notes}
                  onChange={(e) => setOutsourceForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsOutsourceModalOpen(false)}
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <ExternalLink size={12} /> Confirmar Envio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Assinatura do Colaborador (Senha) */}
      {isConfirmAuthOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-[40px] max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center gap-3 text-primary">
              <UserCheck size={28} />
              <h3 className="text-md font-black uppercase tracking-wider">Assinatura do Colaborador</h3>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Para registrar esta transação, selecione seu nome e confirme sua senha de acesso.
            </p>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span className="font-bold">{authError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Colaborador</label>
                <select
                  value={authEmployeeId}
                  onChange={(e) => {
                    setAuthEmployeeId(e.target.value);
                    setAuthError('');
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
                >
                  <option value="" className="bg-[#121214]">Selecione seu nome...</option>
                  {admins
                    .filter(emp => !emp.full_name.toLowerCase().includes('terminal') && emp.full_name.toLowerCase() !== 'loja arroio')
                    .map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#121214]">
                        {emp.full_name} ({emp.role === 'admin' ? 'Admin' : emp.role === 'technician' ? 'Técnico' : 'Atendente'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Senha de Acesso</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value);
                    setAuthError('');
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmAuthOpen(false);
                  setAuthPassword('');
                  setAuthError('');
                }}
                disabled={authLoading}
                className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface hover:text-white transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAuth}
                disabled={authLoading || !authEmployeeId || !authPassword}
                className="flex-1 py-4 px-6 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
