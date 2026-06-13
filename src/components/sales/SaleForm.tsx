import React, { useState, useMemo, useEffect } from 'react';
import { Smartphone, User, DollarSign, Calendar, Calculator, CheckCircle2, AlertCircle, Layers, Save, FileText, Receipt, Printer, Plus, X, Gift, ShoppingBag, UserCheck, Loader2 } from 'lucide-react';
import { cn, printElement, formatCPF, formatPhone, validateCPF, validateCNPJ } from '../../lib/utils';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useSaleStore, Sale } from '../../store/useSaleStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useSupplierStore } from '../../store/useSupplierStore';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useUnitStore } from '../../store/useUnitStore';
import ContractPrint from './ContractPrint';
import SaleReceiptPrint from './SaleReceiptPrint';
import PixBoletoPrint from '../finance/PixBoletoPrint';
import { supabase } from '../../lib/supabase';

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
  const { customers, addCustomer, fetchCustomers } = useCustomerStore();
  const { addSale, updateSale } = useSaleStore();
  const { installments, fetchInstallments, addInstallments } = useFinanceStore();
  const { inventory, updateItem, addItem, fetchInventory } = useInventoryStore();
  const { suppliers, addSupplier, fetchSuppliers } = useSupplierStore();
  const { showNotification, hideModal } = useUI();
  const { profile, user } = useAuthStore();
  const { unit } = useUnitStore();

  const [isSuccess, setIsSuccess] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  const [saleType, setSaleType] = useState<'cellphone' | 'general'>('cellphone');
  const [manualCategory, setManualCategory] = useState<string>('smartphone');
  const [selectedDevices, setSelectedDevices] = useState<{ id: string; model: string; brand: string; price: number; quantity: number; imei: string; category?: string }[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);

  // Quick Customer State
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    name: '',
    cpf: '',
    phone: '',
    address: ''
  });

  // Quick Product State
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState({
    description: '',
    category: 'other',
    price: '',
    cost_price: '',
    stock_quantity: '1',
    supplier: '',
    barcode: '',
    condition: 'new' as 'new' | 'used' | 'refurbished' | 'vitrine',
    imei: ''
  });
  
  // Quick Supplier State inside the Quick Product registration
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');

  const handleQuickCustomerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name.trim() || !quickCustomer.cpf.trim() || !quickCustomer.phone.trim() || !quickCustomer.address.trim()) {
      showNotification('error', 'Campos Obrigatórios', 'Por favor, preencha todos os campos do cliente.');
      return;
    }
    
    // Validate CPF/CNPJ
    const cleanCpf = quickCustomer.cpf.replace(/\D/g, '');
    if (cleanCpf.length <= 11) {
      if (!validateCPF(cleanCpf)) {
        showNotification('error', 'CPF Inválido', 'O CPF informado é inválido.');
        return;
      }
    } else {
      if (!validateCNPJ(cleanCpf)) {
        showNotification('error', 'CNPJ Inválido', 'O CNPJ informado é inválido.');
        return;
      }
    }

    try {
      const newCustomer = await addCustomer({
        unit_id: profile?.unit_id || undefined,
        name: quickCustomer.name.trim(),
        cpf: formatCPF(cleanCpf),
        phone: formatPhone(quickCustomer.phone),
        address: quickCustomer.address.trim(),
        registration_status: 'APROVADO',
        credit_status: 'APROVADO',
        approved_for_purchase: true,
        status: 'active',
        classification: 'A_VISTA',
        credit_limit: 0,
        notes: 'Cadastrado rapidamente na venda.'
      });

      if (newCustomer) {
        setFormData(prev => ({ ...prev, customer_id: newCustomer.id }));
        showNotification('success', 'Cliente Cadastrado', `${newCustomer.name} foi cadastrado e selecionado!`);
        setIsQuickCustomerOpen(false);
        setQuickCustomer({ name: '', cpf: '', phone: '', address: '' });
      }
    } catch (err: any) {
      showNotification('error', 'Erro ao salvar', err.message || 'Falha ao cadastrar cliente.');
    }
  };

  const handleQuickProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProduct.description.trim()) {
      showNotification('error', 'Descrição Obrigatória', 'A descrição do produto é obrigatória.');
      return;
    }

    const shortNameFinal = quickProduct.description.substring(0, 25).trim();
    const firstWord = quickProduct.description.trim().split(/\s+/)[0] || '-';
    const brandValue = firstWord.length > 20 ? firstWord.substring(0, 20) : firstWord;

    const priceNum = Number(quickProduct.price) || 0;
    const costPriceNum = Number(quickProduct.cost_price) || 0;
    const qtyNum = Math.max(1, Number(quickProduct.stock_quantity) || 1);

    try {
      const newProduct = await addItem({
        brand: brandValue,
        model: shortNameFinal,
        description: quickProduct.description.trim(),
        short_name: shortNameFinal,
        condition: quickProduct.condition,
        status: 'available',
        stock_quantity: qtyNum,
        notes: quickProduct.description.trim(),
        price: priceNum,
        cost_price: costPriceNum,
        imei: quickProduct.imei.trim(),
        category: quickProduct.category as any,
        unit_id: profile?.unit_id || undefined,
        barcode: quickProduct.barcode.trim() || undefined,
        supplier: quickProduct.supplier || undefined,
        purchase_date: new Date().toISOString().split('T')[0]
      });

      if (newProduct) {
        // Automatically add to selected devices
        setSelectedDevices(prev => {
          if (prev.find(d => d.id === newProduct.id)) return prev;
          return [...prev, {
            id: newProduct.id,
            model: newProduct.model,
            brand: newProduct.brand,
            price: newProduct.price,
            quantity: 1,
            imei: newProduct.imei || '',
            category: newProduct.category
          }];
        });

        showNotification('success', 'Produto Cadastrado', `${newProduct.model} foi adicionado à venda!`);
        setIsQuickProductOpen(false);
        setQuickProduct({
          description: '',
          category: 'other',
          price: '',
          cost_price: '',
          stock_quantity: '1',
          supplier: '',
          barcode: '',
          condition: 'new',
          imei: ''
        });
      }
    } catch (err: any) {
      showNotification('error', 'Erro ao salvar', err.message || 'Falha ao cadastrar produto.');
    }
  };

  const handleQuickSupplierSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) return;

    try {
      const newSupplier = await addSupplier({
        name: quickSupplierName.trim(),
        unit_id: profile?.unit_id || undefined
      });
      if (newSupplier) {
        setQuickProduct(prev => ({ ...prev, supplier: newSupplier.name }));
        setQuickSupplierName('');
        setIsQuickSupplierOpen(false);
        showNotification('success', 'Fornecedor Cadastrado', `${newSupplier.name} adicionado!`);
      }
    } catch (err: any) {
      showNotification('error', 'Erro ao salvar fornecedor', err.message);
    }
  };

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

  // Colaborador authentication states
  const [isConfirmAuthOpen, setIsConfirmAuthOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [authEmployeeId, setAuthEmployeeId] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [preAuthenticatedSellerId, setPreAuthenticatedSellerId] = useState<string | null>(null);

  const isTerminal = user?.email?.toLowerCase().trim() === 'lojaarroio@mdrinformaticaecelulares.com.br' || 
                     user?.email?.toLowerCase().trim() === 'lojagaivota@mdrinformaticaecelulares.com.br';

  useEffect(() => {
    if (isTerminal && !initialData) {
      setIsConfirmAuthOpen(true);
    }
  }, [isTerminal, initialData]);

  // Fetch employees list
  useEffect(() => {
    const fetchEmps = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('active', true);
        if (data && !error) {
          setEmployees(data);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };
    fetchEmps();
  }, []);

  // Automatically calculate total value, concatenated model names and IMEIs when selectedDevices changes
  React.useEffect(() => {
    if (selectedDevices.length > 0) {
      const total = selectedDevices.reduce((sum, d) => sum + d.price * d.quantity, 0);
      const models = selectedDevices.map(d => `${d.model} (x${d.quantity})`).join(' + ');
      const imeis = selectedDevices.map(d => d.imei || 'N/A').filter(val => val !== 'N/A').join(', ');
      
      setFormData(prev => ({
        ...prev,
        total_value: total,
        device_model: models,
        imei: imeis
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        total_value: 0,
        device_model: '',
        imei: ''
      }));
    }
  }, [selectedDevices]);

  // Prevent crediario on general/IT sales
  React.useEffect(() => {
    if (saleType === 'general' && formData.payment_type === 'crediario') {
      setFormData(prev => ({
        ...prev,
        payment_type: 'card',
        installments: 12
      }));
    }
  }, [saleType, formData.payment_type]);

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

  // Items available as accessories (with stock, excluding the selected devices)
  const availableAccessories = useMemo(() =>
    inventory.filter(item =>
      !selectedDevices.some(d => d.id === item.id) &&
      (item.stock_quantity || 0) > 0 &&
      (item.category === 'accessory_mobile' || item.category === 'accessory_it')
    ),
  [inventory, selectedDevices]);

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
    inventory.filter(item => (item.stock_quantity || 0) > 0), 
  [inventory]);

  const filteredDevices = useMemo(() => {
    const search = deviceSearch.toLowerCase();
    return availableDevices.filter(item => {
      return item.model.toLowerCase().includes(search) ||
             item.brand.toLowerCase().includes(search) ||
             (item.barcode && item.barcode.toLowerCase().includes(search)) ||
             (item.imei && item.imei.toLowerCase().includes(search));
    });
  }, [availableDevices, deviceSearch]);

  // Auto-select product on barcode scan (exact match)
  React.useEffect(() => {
    if (!deviceSearch) return;
    const match = availableDevices.find(item => 
      item.barcode && item.barcode.toLowerCase() === deviceSearch.trim().toLowerCase()
    );
    if (match) {
      addDeviceToSale(match);
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (e) {
        console.warn('AudioContext failed:', e);
      }
      showNotification('success', 'Produto Bipado', `${match.brand} ${match.model} adicionado!`);
    }
  }, [deviceSearch, availableDevices]);

  const addDeviceToSale = (item: typeof inventory[0]) => {
    if (selectedDevices.find(d => d.id === item.id)) return;
    setSelectedDevices(prev => [...prev, {
      id: item.id,
      model: item.model,
      brand: item.brand,
      price: item.price,
      quantity: 1,
      imei: item.imei || '',
      category: item.category
    }]);
    setDeviceDropdownOpen(false);
    setDeviceSearch('');
  };

  const increaseDeviceQty = (idx: number) => {
    setSelectedDevices(prev => prev.map((d, i) => {
      if (i !== idx) return d;
      const stockItem = inventory.find(inv => inv.id === d.id);
      const maxQty = stockItem?.stock_quantity || 99;
      if (d.quantity >= maxQty) {
        showNotification('info', `Estoque máximo atingido (${maxQty} unidades).`);
        return d;
      }
      return { ...d, quantity: d.quantity + 1 };
    }));
  };

  const decreaseDeviceQty = (idx: number) => {
    setSelectedDevices(prev => prev.map((d, i) => {
      if (i !== idx) return d;
      return { ...d, quantity: Math.max(1, d.quantity - 1) };
    }));
  };

  const removeDeviceFromSale = (idx: number) => {
    setSelectedDevices(prev => prev.filter((_, i) => i !== idx));
  };

  const showImeiField = useMemo(() => {
    if (saleType === 'cellphone') return true;
    if (selectedDevices.length > 0) {
      return selectedDevices.some(d => d.category === 'smartphone' || d.category === 'notebook' || d.category === 'desktop');
    }
    return ['smartphone', 'notebook', 'desktop'].includes(manualCategory);
  }, [saleType, selectedDevices, manualCategory]);

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  // MDR Coefficient Calculations
  const paymentType = (formData.payment_type || 'crediario') as 'crediario' | 'card' | 'vista' | 'debit';
  const isCashLike = paymentType === 'vista' || paymentType === 'debit';
  const installmentCount = formData.installments || 1;

  const baseCoefficient = useMemo(() => {
    if (paymentType === 'card') {
      return CARD_COEFFICIENTS[installmentCount] || (1 / installmentCount);
    }
    const table = formData.interest_table || 'standard';
    return CREDIARIO_COEFFICIENTS[table as 'premium' | 'standard' | 'flex']?.[installmentCount] || (1 / installmentCount);
  }, [paymentType, formData.interest_table, installmentCount]);

  // Monthly rate for the selected table (used in grace period calculation)
  const monthlyRate = useMemo(() => {
    if (paymentType === 'card') return 0.04;
    const table = formData.interest_table || 'standard';
    if (table === 'premium') return 0.05;
    if (table === 'flex') return 0.12;
    return 0.08; // standard
  }, [paymentType, formData.interest_table]);

  // Grace period extra interest: extra days beyond 30 days from today incur pro-rata interest
  // charged exclusively on the 1st installment
  const gracePeriodInterest = useMemo(() => {
    if (!formData.first_due_date || paymentType === 'card' || isCashLike) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDue = new Date(formData.first_due_date + 'T12:00:00');
    const diffMs = firstDue.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const extraDays = Math.max(0, diffDays - 30);
    if (extraDays === 0) return 0;
    const financed = formData.total_value - formData.down_payment;
    if (financed <= 0) return 0;
    const dailyRate = monthlyRate / 30;
    return financed * dailyRate * extraDays;
  }, [formData.first_due_date, formData.total_value, formData.down_payment, paymentType, monthlyRate]);

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

  const suggestedTotal = useMemo(() => {
    if (selectedDevices.length > 0) {
      return selectedDevices.reduce((sum, d) => sum + d.price * d.quantity, 0);
    }
    return 0;
  }, [selectedDevices]);

  const costTotal = useMemo(() => {
    if (selectedDevices.length > 0) {
      return selectedDevices.reduce((sum, d) => {
        const item = inventory.find(inv => inv.id === d.id);
        return sum + (item?.cost_price || 0) * d.quantity;
      }, 0);
    }
    return 0;
  }, [selectedDevices, inventory]);

  const profitMarginPercent = useMemo(() => {
    if (formData.total_value <= 0 || costTotal <= 0) return 0;
    const profit = formData.total_value - costTotal;
    return (profit / formData.total_value) * 100;
  }, [formData.total_value, costTotal]);

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
    if (isCashLike || !selectedCustomer) return 0;
    const classification = (selectedCustomer.classification || 'BOM').toUpperCase();
    if (classification === 'RUIM') return formData.total_value * 0.5;
    if (classification === 'MEDIO') return formData.total_value * 0.2;
    return 0;
  }, [selectedCustomer, formData.total_value, isCashLike]);

  const riskMultiplier = useMemo(() => {
    if (paymentType === 'card' || !selectedCustomer) return 1.00;
    const classification = (selectedCustomer.classification || 'BOM').toUpperCase();
    if (classification === 'RUIM') return 1.15;
    if (classification === 'MEDIO') return 1.05;
    return 1.00;
  }, [selectedCustomer, paymentType]);

  const installmentValue = useMemo(() => {
    if (isCashLike) return 0;
    const financed = formData.total_value - formData.down_payment;
    if (financed <= 0) return 0;
    const finalCoeff = baseCoefficient * riskMultiplier;
    return financed * finalCoeff;
  }, [isCashLike, formData.total_value, formData.down_payment, baseCoefficient, riskMultiplier]);

  // First installment value includes grace period interest (if any)
  const firstInstallmentValue = useMemo(() => {
    return installmentValue + gracePeriodInterest;
  }, [installmentValue, gracePeriodInterest]);

  const totalInstallmentsValue = useMemo(() => {
    if (installmentCount <= 1) return firstInstallmentValue;
    return firstInstallmentValue + installmentValue * (installmentCount - 1);
  }, [firstInstallmentValue, installmentValue, installmentCount]);

  const finalValue = useMemo(() => {
    if (isCashLike) {
      return formData.total_value + accessoriesTotal;
    }
    return formData.down_payment + totalInstallmentsValue + accessoriesTotal;
  }, [isCashLike, formData.total_value, formData.down_payment, totalInstallmentsValue, accessoriesTotal]);

  const feeValue = useMemo(() => {
    if (isCashLike) return 0;
    // Interest = final value minus base device price (accessories 'venda' are transparent cost)
    return Math.max(0, finalValue - formData.total_value - accessoriesTotal);
  }, [isCashLike, finalValue, formData.total_value, accessoriesTotal]);

  const changeValue = useMemo(() => {
    if (amountPaid <= 0) return 0;
    return Math.max(0, amountPaid - finalValue);
  }, [amountPaid, finalValue]);

  const availableInstallmentOptions = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }, []);

  const generatedInstallments = useMemo(() => {
    if (!formData.customer_id || formData.total_value <= 0 || isCashLike) return [];

    return customDueDates.map((dueDate, idx) => ({
      number: idx + 1,
      total: formData.installments,
      value: idx === 0 ? firstInstallmentValue : installmentValue,
      dueDate: dueDate,
      status: 'pending'
    }));
  }, [formData.customer_id, formData.total_value, formData.installments, installmentValue, firstInstallmentValue, customDueDates, isCashLike]);

  const executeSubmit = async (sellerId: string) => {
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

      const primaryDeviceId = selectedDevices[0]?.id || undefined;

      if (initialData) {
        await updateSale(initialData.id, {
          customer_id: formData.customer_id,
          device_id: primaryDeviceId,
          device_model: formData.device_model,
          imei: formData.imei,
          total_value: finalValue,
          down_payment: isCashLike ? finalValue : formData.down_payment,
          service_fee: feeValue,
          original_price: formData.total_value,
          installments: isCashLike ? 0 : formData.installments,
          date: formData.first_due_date,
          device_color: formData.device_color,
          accessories: accessoriesStr,
          payment_type: formData.payment_type as any,
          seller_id: sellerId
        });
        showNotification('success', 'Venda Atualizada');
        onSuccess();
      } else {
        const newSale: any = await addSale({
          unit_id: profile?.unit_id || undefined,
          customer_id: formData.customer_id,
          customer_name: selectedCustomer?.name,
          device_id: primaryDeviceId,
          device_model: formData.device_model,
          imei: formData.imei,
          total_value: finalValue,
          down_payment: isCashLike ? finalValue : formData.down_payment,
          service_fee: feeValue,
          original_price: formData.total_value,
          installments: isCashLike ? 0 : formData.installments,
          date: formData.first_due_date,
          device_color: formData.device_color,
          accessories: accessoriesStr,
          status: 'completed',
          payment_type: formData.payment_type as any,
          seller_id: sellerId
        });

        // Decrement stock for all selected devices
        for (const device of selectedDevices) {
          const deviceItem = inventory.find(d => d.id === device.id);
          if (deviceItem) {
            const currentStock = deviceItem.stock_quantity || 0;
            const newQty = Math.max(0, currentStock - device.quantity);
            await updateItem(device.id, {
              stock_quantity: newQty,
              status: newQty === 0 ? 'sold' : 'available'
            });
          }
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
      
      if (isTerminal && !initialData) {
        setPreAuthenticatedSellerId(authEmployeeId);
      } else {
        await executeSubmit(authEmployeeId);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Senha incorreta.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saleType === 'general' && selectedDevices.length === 0) {
      showNotification('error', 'Itens do Estoque', 'Por favor, vincule pelo menos um produto do estoque para realizar uma venda em geral.');
      return;
    }

    if (!formData.customer_id || !formData.device_model || formData.total_value <= 0) {
      showNotification('error', 'Campos Obrigatórios', 'Por favor, preencha todos os campos corretamente.');
      return;
    }

    if (selectedCustomer && selectedCustomer.approved_for_purchase !== true) {
      showNotification('error', 'Cliente Bloqueado', 'Este cliente não está liberado para compras. É necessária a aprovação de um administrador.');
      return;
    }

    if (!isCashLike && formData.down_payment < minDownPayment) {
      const pct = selectedCustomer?.classification === 'RUIM' ? '50%' : '20%';
      showNotification('error', 'Entrada Insuficiente', `Para clientes com classificação ${selectedCustomer?.classification || 'MEDIO'}, a entrada mínima exigida é de ${pct} (R$ ${minDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`);
      return;
    }

    if (formData.payment_type === 'crediario' && isOverLimit) {
      showNotification('error', 'Limite de Crédito Excedido', `O valor financiado (R$ ${newFinancedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o limite disponível do cliente (R$ ${availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Venda bloqueada. Apenas após nova análise de crédito.`);
      return;
    }

    if (isTerminal) {
      await executeSubmit(preAuthenticatedSellerId || '');
    } else {
      await executeSubmit(profile?.id || '');
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
      accessories: finalAccessoriesStr,
      amount_paid: amountPaid,
      change_value: changeValue
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
          <p className="text-sm text-white font-black">
            {isCashLike 
              ? 'Pagamento À Vista'
              : `${formData.installments}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </p>
          <p className="text-[10px] text-on-surface-variant">
            Total: R$ {finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            {!isCashLike && ` | Entrada: R$ ${formData.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
          {!isCashLike && (
            <button 
              onClick={() => printElement('sale-contract')}
              className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3"
            >
              <FileText size={18} />
              Imprimir Contrato
            </button>
          )}

          {formData.payment_type === 'crediario' && (
            <button 
              onClick={() => printElement('sale-pix-carne')}
              className="w-full py-4 bg-warning/15 border border-warning/30 text-warning rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-warning/20 transition-all flex items-center justify-center gap-3"
            >
              <Printer size={18} />
              Imprimir Carnê PIX
            </button>
          )}

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
        <div style={{ display: 'none' }}>
          <div id="sale-pix-carne">
            <PixBoletoPrint
              installments={generatedInstallments.map((inst, idx) => ({
                id: `temp-${idx}`,
                number: inst.number,
                total: inst.total,
                value: inst.value,
                due_date: inst.dueDate,
                status: 'pending',
                customer_name: selectedCustomer.name
              }))}
              customer={selectedCustomer}
              unit={unit || { name: 'MDR Informática' }}
            />
          </div>
        </div>
        <ContractPrint 
          sale={saleDataForPrint}
          customer={selectedCustomer}
          unit={unit || { name: 'MDR Informática' }}
          installmentValue={installmentValue}
          firstInstallmentValue={gracePeriodInterest > 0 ? firstInstallmentValue : undefined}
        />
        <SaleReceiptPrint
          sale={saleDataForPrint}
          customer={selectedCustomer}
          unit={unit || { name: 'MDR Informática' }}
          installmentValue={installmentValue}
          firstInstallmentValue={gracePeriodInterest > 0 ? firstInstallmentValue : undefined}
        />
      </div>
    );
  }

  const activeSeller = employees.find(e => e.id === (preAuthenticatedSellerId || initialData?.seller_id || profile?.id));

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {activeSeller && (
          <div className={cn(
            "p-4 border rounded-2xl flex items-center justify-between transition-all duration-300",
            isTerminal ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-on-surface"
          )}>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                {isTerminal ? 'Vendedor Responsável (Autenticado)' : 'Operador Logado'}
              </p>
              <p className="text-sm font-black text-white">{activeSeller.full_name}</p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
              isTerminal ? "bg-success/20 border-success/30 text-success" : "bg-white/10 border-white/20 text-on-surface-variant"
            )}>
              {isTerminal ? 'Autenticado' : 'Sessão Individual'}
            </div>
          </div>
        )}
      {saleType !== 'general' && selectedCustomer && (
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
                  Cliente {selectedCustomer.classification === 'BOM' ? 'Premium (5% a.m.)' : selectedCustomer.classification === 'RUIM' ? 'Flex (12% a.m.)' : 'Standard (8% a.m.)'}
                </h4>
              </div>
            </div>
            <div className="flex-1 md:max-w-md text-[11px] leading-relaxed opacity-95">
              {selectedCustomer.classification === 'RUIM' && (
                <span>⚠️ <strong>Atenção:</strong> Exige entrada mínima de <strong>50%</strong> do valor do produto (R$ {minDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). O parcelamento é restrito a até <strong>12x</strong> com juros de <strong>12% a.m.</strong> (Tabela Flex) devido ao risco elevado.</span>
              )}
              {selectedCustomer.classification === 'MEDIO' && (
                <span>⚖️ <strong>Atenção:</strong> Exige entrada mínima de <strong>20%</strong> do valor do produto (R$ {minDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). O parcelamento possui taxa de juros de <strong>8% a.m.</strong> (Tabela Standard).</span>
              )}
              {selectedCustomer.classification === 'BOM' && (
                <span>🌟 <strong>Excelente:</strong> Sem obrigatoriedade de entrada (entrada mínima de 0%). Taxa de juros reduzida de <strong>5% a.m.</strong> (Tabela Premium).</span>
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
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Cliente</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select 
                required
                value={formData.customer_id}
                onChange={(e) => {
                  const custId = e.target.value;
                  const selectedC = customers.find(c => c.id === custId);
                  setFormData(prev => {
                    const isAVista = selectedC?.classification === 'A_VISTA';
                    return {
                      ...prev,
                      customer_id: custId,
                      payment_type: (isAVista && prev.payment_type === 'crediario') ? 'vista' : prev.payment_type
                    };
                  });
                }}
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
            <button
              type="button"
              onClick={() => setIsQuickCustomerOpen(true)}
              className="px-5 bg-primary hover:bg-primary/80 text-on-primary rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              title="Cadastro Rápido de Cliente"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Seletor do Tipo de Venda */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Tipo de Venda</label>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full">
            <button
              type="button"
              onClick={() => {
                setSaleType('cellphone');
                setSelectedDevices([]);
              }}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                saleType === 'cellphone' ? "bg-white text-black shadow-lg shadow-white/5" : "text-on-surface-variant hover:text-white"
              )}
            >
              Crediário Loja
            </button>
            <button
              type="button"
              onClick={() => {
                setSaleType('general');
                setSelectedDevices([]);
              }}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                saleType === 'general' ? "bg-white text-black shadow-lg shadow-white/5" : "text-on-surface-variant hover:text-white"
              )}
            >
              Vendas Em Geral
            </button>
          </div>
        </div>

        {/* Vincular do Estoque (Múltiplos Itens) */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Itens Vinculados do Estoque</label>
          
          {selectedDevices.length === 0 ? (
            <div className="p-4 bg-white/5 border border-white/5 border-dashed rounded-2xl text-center text-xs text-on-surface-variant/50">
              Nenhum item do estoque vinculado. Busque itens no estoque abaixo.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDevices.map((device, idx) => {
                const stockItem = inventory.find(i => i.id === device.id);
                const maxQty = stockItem?.stock_quantity || 99;
                return (
                  <div key={device.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl text-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                        <Smartphone size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-white leading-tight">{device.model}</p>
                        {device.brand && <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{device.brand}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Controles de Quantidade */}
                      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => decreaseDeviceQty(idx)}
                          className="px-2.5 py-1.5 text-on-surface-variant hover:bg-white/10 hover:text-white transition-all text-xs font-black"
                        >
                          −
                        </button>
                        <span className="px-2 py-1 text-xs font-black text-white font-mono min-w-[24px] text-center">
                          {device.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseDeviceQty(idx)}
                          disabled={device.quantity >= maxQty}
                          className="px-2.5 py-1.5 text-on-surface-variant hover:bg-white/10 hover:text-white transition-all text-xs font-black disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-black text-white">
                          {(device.price * device.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeviceFromSale(idx)}
                        className="p-1 hover:bg-red-500/10 hover:text-red-400 text-on-surface-variant/60 rounded-lg transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Campo de Busca de Estoque com Botão de Adição Rápida */}
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1 font-display">
              <input
                type="text"
                placeholder={saleType === 'cellphone' ? "🔍 Buscar celulares no estoque..." : "🔍 Buscar informática, acessórios ou produtos no estoque..."}
                value={deviceSearch}
                onChange={(e) => {
                  setDeviceSearch(e.target.value);
                  setDeviceDropdownOpen(true);
                }}
                onFocus={() => setDeviceDropdownOpen(true)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
              />
              
              {deviceDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setDeviceDropdownOpen(false); setDeviceSearch(''); }} />
                  <div className="relative md:absolute left-0 right-0 mt-2 bg-[#1c1c30] border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-20 custom-scrollbar divide-y divide-white/5">
                    {filteredDevices.length === 0 ? (
                      <div className="p-4 text-center text-xs text-on-surface-variant">Nenhum item disponível no estoque.</div>
                    ) : (
                      filteredDevices.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addDeviceToSale(item)}
                          className="w-full text-left px-5 py-3 hover:bg-white/5 transition-all flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white">{item.model}</span>
                            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider ml-2">({item.brand})</span>
                            {item.imei && <p className="text-[9px] text-on-surface-variant/70 mt-0.5 font-mono">IMEI: {item.imei}</p>}
                          </div>
                          <span className="font-black text-primary font-mono ml-3">{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                fetchSuppliers(profile?.unit_id || undefined, true);
                setQuickProduct(prev => ({
                  ...prev,
                  category: saleType === 'cellphone' ? 'smartphone' : 'other',
                  imei: ''
                }));
                setIsQuickProductOpen(true);
              }}
              className="px-5 bg-primary hover:bg-primary/80 text-on-primary rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              title="Cadastro Rápido de Produto"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Modelo do Aparelho - Exibido apenas em vendas de celular/crediário */}
        {saleType === 'cellphone' && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Modelo do Aparelho</label>
            <input 
              type="text" 
              required
              placeholder="Ex: iPhone 15 Pro Max"
              value={formData.device_model}
              onChange={(e) => setFormData(prev => ({ ...prev, device_model: e.target.value }))}
              readOnly={selectedDevices.length > 0}
              className={cn(
                "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all",
                selectedDevices.length > 0 && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
        )}

        {/* IMEI / Serial Condicional - Exibido apenas em vendas de celular/crediário */}
        {saleType === 'cellphone' && showImeiField && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">IMEI / Serial</label>
            <input 
              type="text" 
              required
              placeholder="Número do IMEI"
              value={formData.imei}
              onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
              readOnly={selectedDevices.length > 0}
              className={cn(
                "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all",
                selectedDevices.length > 0 && "opacity-50 cursor-not-allowed"
              )}
            />
            {selectedDevices.length > 0 && <p className="text-[10px] text-on-surface-variant pl-1 opacity-60">Preenchido do estoque</p>}
          </div>
        )}

        {/* Valor Total */}
        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Valor de Venda (R$)</label>
          <input 
            type="number" 
            required
            placeholder="0.00"
            value={formData.total_value === 0 ? '' : formData.total_value}
            onChange={(e) => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, total_value: val === '' ? 0 : Number(val) }));
            }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
          />
          {selectedDevices.length > 0 && (
            <div className="mt-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-variant/70">
              <span>Sugerido: <strong className="text-white font-mono">R$ {suggestedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
              {profile?.role === 'admin' && (
                <>
                  <span>Custo: <strong className="text-amber-400 font-mono">R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  {costTotal > 0 && (
                    <span className={cn(
                      "font-bold",
                      profitMarginPercent < 0 ? "text-red-400" : "text-green-400"
                    )}>
                      Margem: {profitMarginPercent.toFixed(1)}% {profitMarginPercent < 0 ? '[Prejuízo]' : ''}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {formData.payment_type !== 'vista' && (
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
        )}

        {formData.payment_type !== 'vista' && formData.down_payment > 0 && (
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
            onChange={(e) => {
              const val = e.target.value;
              setFormData(prev => {
                const isVista = val === 'vista';
                return {
                  ...prev,
                  payment_type: val as any,
                  installments: isVista ? 0 : 12,
                  down_payment: isVista ? 0 : prev.down_payment
                };
              });
            }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            {saleType !== 'general' && (
              <option 
                value="crediario" 
                disabled={selectedCustomer?.classification === 'A_VISTA'}
                className="bg-surface-container-high"
              >
                Crediário da Loja {selectedCustomer?.classification === 'A_VISTA' ? '(Bloqueado - Somente À Vista)' : ''}
              </option>
            )}
            <option value="card" className="bg-surface-container-high">Cartão de Crédito</option>
            <option value="debit" className="bg-surface-container-high">Cartão de Débito</option>
            <option value="vista" className="bg-surface-container-high">À Vista (Dinheiro/Pix)</option>
          </select>
          {selectedCustomer?.classification === 'A_VISTA' && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl mt-1 animate-pulse">
              <AlertCircle size={14} className="shrink-0" />
              <span className="font-bold text-[10px] uppercase tracking-wider">
                Aviso: Cliente classificado como 'Somente À Vista'. Vendas parceladas não permitidas (sujeito a análise de crédito).
              </span>
            </div>
          )}
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

        {formData.payment_type !== 'vista' && formData.payment_type !== 'debit' && (
          <>
            <div className="space-y-2 animate-in fade-in duration-300">
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

            <div className="space-y-2 animate-in fade-in duration-300">
              <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">1º Vencimento</label>
              <input 
                type="date" 
                value={formData.first_due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, first_due_date: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Cor do Aparelho</label>
          <input 
            type="text" 
            placeholder={saleType === 'cellphone' ? "Ex: Titânio Natural" : "Ex: Preto, Cinza, N/A"}
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
      {formData.payment_type !== 'vista' && generatedInstallments.length > 0 && (
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
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">
                {gracePeriodInterest > 0 ? `1ª Parcela (c/ carência)` : `Plano de ${formData.installments}x`}
              </p>
              <p className="text-xl font-black text-white font-mono">
                R$ {(gracePeriodInterest > 0 ? firstInstallmentValue : installmentValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              {gracePeriodInterest > 0 && installmentCount > 1 && (
                <p className="text-[9px] text-amber-400 font-black mt-0.5">
                  Parcelas 2–{formData.installments}: R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Entrada</p>
              <p className="text-sm font-black text-on-surface-variant font-mono">R$ {formData.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {gracePeriodInterest > 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] animate-in fade-in duration-300">
              <Calendar size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-400 font-black uppercase tracking-wider">Juro de Carência Aplicado</p>
                <p className="text-on-surface-variant mt-0.5">
                  Vencimento estendido além de 30 dias — juro pro-rata de{' '}
                  <strong className="text-amber-400">
                    R$ {gracePeriodInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  somado à 1ª parcela.
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">📅 Vencimentos — ajuste as datas individualmente:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {generatedInstallments.map((inst, i) => (
                <div key={i} className={`p-3 rounded-2xl border ${i === 0 && gracePeriodInterest > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/5'}`}>
                  <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Parcela {inst.number}/{formData.installments}</p>
                  {i === 0 && gracePeriodInterest > 0 && (
                    <p className="text-[8px] text-amber-400 font-black mb-1">R$ {firstInstallmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (c/ carência)</p>
                  )}
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

      {/* Preview Section for cash/pix sale (À Vista) or Debit with Change (Troco) Calculator */}
      {isCashLike && formData.total_value > 0 && (
        <div className="mt-8 p-6 bg-white/5 rounded-[32px] border border-white/10 space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-6 border-b border-white/5">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{paymentType === 'debit' ? "Resumo da Negociação (Débito)" : "Resumo da Negociação (À Vista)"}</h4>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-black text-green-400 uppercase tracking-widest leading-none">Sem Juros</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Preço Base (Aparelho)</p>
              <p className="text-sm font-black text-white font-mono">R$ {formData.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            {accessoriesTotal > 0 && (
              <div>
                <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Acessórios (Venda)</p>
                <p className="text-sm font-black text-green-400 font-mono">+ R$ {accessoriesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            )}
            <div>
              <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1">Valor Total a Pagar</p>
              <p className="text-sm font-black text-white font-mono">R$ {finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Troco Calculator */}
          <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
            <h5 className="text-[9px] font-black text-white uppercase tracking-wider">Calculadora de Troco</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Valor Pago pelo Cliente (R$)</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60" />
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={amountPaid === 0 ? '' : amountPaid}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmountPaid(val === '' ? 0 : Number(val));
                    }}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest mb-1 font-sans">Troco a Devolver</p>
                <p className={cn(
                  "text-lg font-black font-mono leading-none",
                  changeValue < 0 ? "text-error" : changeValue > 0 ? "text-green-400" : "text-white"
                )}>
                  R$ {changeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {amountPaid > 0 && amountPaid < finalValue && (
                  <p className="text-[9px] text-error font-bold mt-1">Valor pago é menor que o total da venda.</p>
                )}
              </div>
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

      {/* Modal de Cadastro Rápido de Cliente */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#121224] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                  <User size={18} />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight font-display">Cadastro Rápido de Cliente</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsQuickCustomerOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-xl text-on-surface-variant hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleQuickCustomerSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={quickCustomer.name}
                  onChange={e => setQuickCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={quickCustomer.cpf}
                    onChange={e => setQuickCustomer(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">WhatsApp / Celular</label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={quickCustomer.phone}
                    onChange={e => setQuickCustomer(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Endereço Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Brasil, 1500 - Centro"
                  value={quickCustomer.address}
                  onChange={e => setQuickCustomer(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest transition-all hover:scale-102 active:scale-95 shadow-lg shadow-primary/20"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro Rápido de Produto */}
      {isQuickProductOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-[#121224] border border-white/10 rounded-[32px] w-full max-w-lg my-8 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                  <Smartphone size={18} />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight font-display">Cadastro Rápido de Produto</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsQuickProductOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-xl text-on-surface-variant hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleQuickProductSave} className="p-6 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Descrição do Item</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tela iPhone 11 Incell, Carregador Turbo 20W"
                  value={quickProduct.description}
                  onChange={e => setQuickProduct(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Categoria</label>
                  <select
                    value={quickProduct.category}
                    onChange={e => setQuickProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all appearance-none"
                  >
                    <option value="accessory_mobile" className="bg-[#121224]">🔌 Acessório Celular</option>
                    <option value="accessory_it" className="bg-[#121224]">💻 Acessório Informática</option>
                    <option value="smartphone" className="bg-[#121224]">📱 Smartphone / Celular</option>
                    <option value="notebook" className="bg-[#121224]">💻 Notebook</option>
                    <option value="desktop" className="bg-[#121224]">🖥️ Computador Desktop</option>
                    <option value="part" className="bg-[#121224]">🔧 Peça de Reposição</option>
                    <option value="other" className="bg-[#121224]">📦 Outros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Condição</label>
                  <select
                    value={quickProduct.condition}
                    onChange={e => setQuickProduct(prev => ({ ...prev, condition: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all appearance-none"
                  >
                    <option value="new" className="bg-[#121224]">Novo</option>
                    <option value="used" className="bg-[#121224]">Usado</option>
                    <option value="refurbished" className="bg-[#121224]">Recondicionado</option>
                    <option value="vitrine" className="bg-[#121224]">Vitrine</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={quickProduct.price}
                    onChange={e => setQuickProduct(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={quickProduct.cost_price}
                    onChange={e => setQuickProduct(prev => ({ ...prev, cost_price: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Quantidade</label>
                  <input
                    type="number"
                    required
                    placeholder="1"
                    value={quickProduct.stock_quantity}
                    onChange={e => setQuickProduct(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Código de Barras</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={quickProduct.barcode}
                    onChange={e => setQuickProduct(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {['smartphone', 'notebook', 'desktop'].includes(quickProduct.category) && (
                <div className="space-y-1 animate-in fade-in duration-300">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">IMEI / Serial</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite o IMEI ou Serial"
                    value={quickProduct.imei}
                    onChange={e => setQuickProduct(prev => ({ ...prev, imei: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Fornecedor</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={quickProduct.supplier}
                      onChange={e => setQuickProduct(prev => ({ ...prev, supplier: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="" className="bg-[#121224]">Sem Fornecedor</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name} className="bg-[#121224]">{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickSupplierOpen(true)}
                    className="px-4 bg-primary hover:bg-primary/80 text-on-primary rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                    title="Novo Fornecedor"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsQuickProductOpen(false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-primary text-on-primary text-xs font-black uppercase tracking-widest transition-all hover:scale-102 active:scale-95 shadow-lg shadow-primary/20"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro Rápido de Fornecedor */}
      {isQuickSupplierOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-[#121224] border border-white/10 rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-display">Novo Fornecedor</h4>
              <button 
                type="button" 
                onClick={() => setIsQuickSupplierOpen(false)}
                className="p-1 hover:bg-white/5 rounded-lg text-on-surface-variant hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickSupplierSave} className="p-5 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome do Fornecedor</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora X"
                  value={quickSupplierName}
                  onChange={e => setQuickSupplierName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickSupplierOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest transition-all hover:scale-102 active:scale-95 shadow-lg shadow-primary/20"
                >
                  Salvar
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
                  {employees
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
                  if (isTerminal && !preAuthenticatedSellerId && !initialData) {
                    onCancel();
                  }
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
    </>
  );
}
