import React, { useState, useEffect } from 'react';
import {
  Building, Package, DollarSign, Users, PlusCircle, Check, Loader2,
  TrendingUp, BarChart3, ArrowDownLeft, ShieldCheck, Link2, X, Trash2
} from 'lucide-react';
import { useScpStore } from '../store/useScpStore';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabase';
import { Upload } from 'lucide-react';

interface ApproveWithdrawalFormProps {
  id: string;
  onApprove: (paymentDate: string, receiptUrl: string) => Promise<void>;
  onCancel: () => void;
}

const ApproveWithdrawalForm: React.FC<ApproveWithdrawalFormProps> = ({ id, onApprove, onCancel }) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `receipts/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setReceiptUrl(publicUrl);
    } catch (err: any) {
      alert(`Falha no upload: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDate) return;
    try {
      setIsSaving(true);
      await onApprove(paymentDate, receiptUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-white text-xs">
      <p className="text-sm">Deseja realmente aprovar este resgate Pix?</p>
      <p className="text-[10px] text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 font-black uppercase tracking-widest leading-normal">
        Certifique-se de que a transferência Pix já foi efetuada manualmente na sua conta bancária antes de confirmar.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Data de Pagamento</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none transition-all"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Comprovante de Pagamento</label>
          <div className="flex items-center gap-4">
            <label className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl cursor-pointer transition-all flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]">
              <Upload size={14} />
              {isUploading ? 'Fazendo Upload...' : receiptUrl ? 'Alterar Comprovante' : 'Anexar Comprovante'}
              <input
                type="file"
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
                disabled={isUploading}
              />
            </label>
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-bold uppercase tracking-widest text-[10px] flex items-center gap-1"
              >
                Visualizar Anexo
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-t border-zinc-800 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isUploading || isSaving}
          className="flex-1 py-4 px-6 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          {isSaving ? 'Aprovando...' : 'Aprovar e Liquidar'}
        </button>
      </div>
    </form>
  );
};

export default function ScpManagement() {
  const {
    lots, fetchLots, createLot, addQuota, isLoading,
    withdrawals, fetchWithdrawals, approveWithdrawal, rejectWithdrawal,
    linkDevices, updateContractUrl, deleteLot, deleteQuota
  } = useScpStore();
  const { showNotification, showModal, hideModal } = useUI();

  const [activePanelTab, setActivePanelTab] = useState<'prime' | 'renda' | 'withdrawals' | 'investors' | 'financeira'>('prime');
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [isLoadingUsersList, setIsLoadingUsersList] = useState(false);
  const [financeiraReport, setFinanceiraReport] = useState<any>(null);
  const [isFinanceiraLoading, setIsFinanceiraLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLot, setNewLot] = useState({ title: '', target_amount: 0, status: 'OPEN' as any });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [newQuota, setNewQuota] = useState({ profile_id: '', amount_invested: 0, ownership_percentage: 0, interest_sharing_percentage: 20 });
  const [investors, setInvestors] = useState<any[]>([]);

  // Cadastro de novo investidor
  const [isCreateInvestorOpen, setIsCreateInvestorOpen] = useState(false);
  const [investorFormData, setInvestorFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    investor_profile: 'arrojado',
    manual_category: 'Bronze'
  });
  const [isSavingInvestor, setIsSavingInvestor] = useState(false);

  // Edição de investidor
  const [isEditInvestorOpen, setIsEditInvestorOpen] = useState(false);
  const [editingInvestorId, setEditingInvestorId] = useState('');
  const [editInvestorFormData, setEditInvestorFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    investor_profile: 'arrojado',
    custom_interest_rate: '',
    auto_reinvest: false,
    manual_category: 'auto'
  });

  // Estado para estatísticas administrativas consolidada
  const [adminStats, setAdminStats] = useState({
    totalRepasses: 0,
    totalWithdrawals: 0,
    totalInadimplencia: 0
  });

  // Estados para vinculação de aparelhos
  const [isLinkDevicesOpen, setIsLinkDevicesOpen] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [primeSelectedDeviceIds, setPrimeSelectedDeviceIds] = useState<string[]>([]);
  const [primeDeviceImeis, setPrimeDeviceImeis] = useState<Record<string, string[]>>({});
  const [primeSelectedQuantities, setPrimeSelectedQuantities] = useState<Record<string, number>>({});
  const [primeValuationType, setPrimeValuationType] = useState<'sale' | 'cost'>('sale');
  const [primeOnlyCashSale, setPrimeOnlyCashSale] = useState<boolean>(false);

  // Estados para edição de contrato
  const [isContractUrlOpen, setIsContractUrlOpen] = useState(false);
  const [selectedQuotaId, setSelectedQuotaId] = useState('');
  const [contractUrl, setContractUrl] = useState('');

  // States para Prime
  const [primeDevices, setPrimeDevices] = useState<any[]>([]);
  const [isLinkPrimeOpen, setIsLinkPrimeOpen] = useState(false);
  const [primeInvestorId, setPrimeInvestorId] = useState('');
  const [primeProfitShare, setPrimeProfitShare] = useState<number | ''>(60);
  const [primeProfitShareVal, setPrimeProfitShareVal] = useState<string>('');
  const [primeAdminFee, setPrimeAdminFee] = useState<number | ''>(10);
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [primeQuantityInput, setPrimeQuantityInput] = useState<number | ''>(1);

  // Filter available devices by search query
  const filteredAvailableDevices = React.useMemo(() => {
    if (!deviceSearchQuery) return availableDevices;
    const q = deviceSearchQuery.toLowerCase();
    return availableDevices.filter(d =>
      (d.brand && d.brand.toLowerCase().includes(q)) ||
      (d.model && d.model.toLowerCase().includes(q)) ||
      (d.imei && d.imei.toLowerCase().includes(q))
    );
  }, [availableDevices, deviceSearchQuery]);

  // States para Renda
  const [rendaPurchases, setRendaPurchases] = useState<any[]>([]);
  const [isSellReceivableOpen, setIsSellReceivableOpen] = useState(false);
  const [availableSales, setAvailableSales] = useState<any[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [rendaInvestorId, setRendaInvestorId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [totalReceivableVal, setTotalReceivableVal] = useState<number | ''>('');
  const [ownershipPercentage, setOwnershipPercentage] = useState(100);
  const [interestRateInput, setInterestRateInput] = useState<number | ''>('');

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setInvestors(data.filter((u: any) => u.role === 'investor') || []);
    } catch (err) {
      console.error('Error fetching investors:', err);
    }
  };

  const fetchPrimeDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*, profiles:investor_id(full_name)')
        .not('investor_id', 'is', null);
      if (error) throw error;
      setPrimeDevices(data || []);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar aparelhos Prime.');
    }
  };

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('receivable_purchases')
        .select('*, profiles(full_name), sales(customer:customers(name), total_value, device:devices(brand, model, imei))')
        .eq('status', 'pending');
      if (error) throw error;
      setPendingRequests(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRendaPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('receivable_purchases')
        .select('*, profiles(full_name), sales(customer:customers(name), total_value, device:devices(brand, model, imei))')
        .eq('status', 'approved');
      if (error) throw error;
      setRendaPurchases(data || []);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar recebíveis comprados.');
    }
  };

  const fetchAvailableSales = async () => {
    try {
      const res = await fetch('/api/scp/available-sales');
      const data = await res.json();
      setAvailableSales(data || []);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar contratos de venda.');
    }
  };

  const fetchAllUsersList = async () => {
    try {
      setIsLoadingUsersList(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      setAllUsersList(data.filter((u: any) => u.role === 'investor') || []);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar lista de investidores.');
    } finally {
      setIsLoadingUsersList(false);
    }
  };

  const fetchFinanceiraReport = async () => {
    try {
      setIsFinanceiraLoading(true);
      const res = await fetch('/api/scp/financeira-report');
      if (!res.ok) throw new Error('Falha ao buscar relatório');
      const data = await res.json();
      setFinanceiraReport(data);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar relatório da financeira.');
    } finally {
      setIsFinanceiraLoading(false);
    }
  };

  // Load lots, investors and withdrawals
  useEffect(() => {
    fetchLots();
    fetchProfiles();
  }, [fetchLots]);

  useEffect(() => {
    if (activePanelTab === 'withdrawals') {
      fetchWithdrawals();
    } else if (activePanelTab === 'prime') {
      fetchPrimeDevices();
    } else if (activePanelTab === 'renda') {
      fetchRendaPurchases();
      fetchPendingRequests();
    } else if (activePanelTab === 'investors') {
      fetchAllUsersList();
    } else if (activePanelTab === 'financeira') {
      fetchFinanceiraReport();
    }
  }, [activePanelTab, fetchWithdrawals]);

  // Carregar estatísticas administrativas para os KPIs do Admin
  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const { data: txs } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .in('type', ['AMORTIZATION', 'PROFIT']);

        const { data: wds } = await supabase
          .from('withdrawal_requests')
          .select('amount')
          .eq('status', 'APPROVED');

        const { data: insts } = await supabase
          .from('installments')
          .select('value')
          .in('status', ['overdue', 'blocked']);

        const totalRep = txs ? txs.reduce((acc, t) => acc + Number(t.amount), 0) : 0;
        const totalWithdraw = wds ? wds.reduce((acc, w) => acc + Number(w.amount), 0) : 0;
        const totalInad = insts ? insts.reduce((acc, i) => acc + Number(i.value), 0) : 0;

        setAdminStats({
          totalRepasses: totalRep,
          totalWithdrawals: totalWithdraw,
          totalInadimplencia: totalInad
        });
      } catch (err) {
        console.error('Error fetching admin SCP stats:', err);
      }
    };
    if (activePanelTab === 'prime' || activePanelTab === 'renda') {
      fetchAdminStats();
    }
  }, [lots, activePanelTab, primeDevices, rendaPurchases]);

  const fetchAvailableDevices = async () => {
    try {
      const res = await fetch('/api/scp/available-devices');
      const data = await res.json();
      setAvailableDevices(data);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Erro', 'Falha ao buscar aparelhos disponíveis.');
    }
  };

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLot.title || newLot.target_amount <= 0) {
      showNotification('error', 'Erro', 'Preencha todos os campos do lote.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createLot(newLot);
      showNotification('success', 'Sucesso', 'Lote de investimento criado com sucesso!');
      setIsCreateOpen(false);
      setNewLot({ title: '', target_amount: 0, status: 'OPEN' });
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao criar o lote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotId || !newQuota.profile_id || newQuota.amount_invested <= 0 || newQuota.ownership_percentage <= 0) {
      showNotification('error', 'Erro', 'Preencha todos os campos da cota.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addQuota({
        lot_id: selectedLotId,
        profile_id: newQuota.profile_id,
        amount_invested: newQuota.amount_invested,
        ownership_percentage: newQuota.ownership_percentage / 100, // Convert percent to decimal (ex: 15 to 0.15)
        interest_sharing_percentage: newQuota.interest_sharing_percentage / 100 // Convert percent to decimal (ex: 20 to 0.20)
      });
      showNotification('success', 'Sucesso', 'Cota de investidor associada com sucesso!');
      setIsQuotaOpen(false);
      setNewQuota({ profile_id: '', amount_invested: 0, ownership_percentage: 0, interest_sharing_percentage: 20 });
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao associar a cota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkDevicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDeviceIds.length === 0) {
      showNotification('error', 'Erro', 'Selecione pelo menos um aparelho.');
      return;
    }

    setIsSubmitting(true);
    try {
      await linkDevices(selectedLotId, selectedDeviceIds);
      showNotification('success', 'Sucesso', 'Aparelhos vinculados com sucesso ao lote.');
      setIsLinkDevicesOpen(false);
      setSelectedDeviceIds([]);
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao vincular aparelhos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkPrimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (primeSelectedDeviceIds.length === 0 || !primeInvestorId) {
      showNotification('error', 'Erro', 'Selecione pelo menos um aparelho e o investidor.');
      return;
    }

    // Validar se todos os IMEIs foram preenchidos para as quantidades selecionadas
    for (const devId of primeSelectedDeviceIds) {
      const qty = primeSelectedQuantities[devId] || 1;
      const imeis = primeDeviceImeis[devId] || [];
      for (let i = 0; i < qty; i++) {
        if (!imeis[i] || imeis[i].trim() === '') {
          showNotification('error', 'Erro', 'Por favor, preencha todos os IMEIs correspondentes às quantidades selecionadas.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/scp/devices/link-prime-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: primeInvestorId,
          device_ids: primeSelectedDeviceIds,
          device_quantities: primeSelectedQuantities,
          prime_profit_share: primeProfitShare === '' ? 0 : primeProfitShare,
          prime_admin_fee: primeAdminFee === '' ? 0 : primeAdminFee,
          device_imeis: primeDeviceImeis,
          prime_valuation_type: primeValuationType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao vincular aparelhos Prime.');
      showNotification('success', 'Sucesso', data.message || 'Investidor Prime vinculado com sucesso!');
      setIsLinkPrimeOpen(false);
      setPrimeSelectedDeviceIds([]);
      setPrimeDeviceImeis({});
      setPrimeSelectedQuantities({});
      setPrimeInvestorId('');
      setPrimeValuationType('sale');
      fetchPrimeDevices();
    } catch (err: any) {
      showNotification('error', 'Erro', err.message || 'Falha ao vincular investidor Prime.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkPrime = async (deviceId: string) => {
    showModal({
      title: 'Desvincular Investidor Prime',
      children: 'Deseja realmente desvincular o investidor deste aparelho? Ele não receberá repasses das próximas parcelas.',
      type: 'danger',
      confirmText: 'Desvincular',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/scp/devices/${deviceId}/link-investor`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ investor_id: null })
          });
          if (!res.ok) throw new Error();
          showNotification('success', 'Sucesso', 'Investidor desvinculado com sucesso.');
          fetchPrimeDevices();
          hideModal();
        } catch (err) {
          showNotification('error', 'Erro', 'Falha ao desvincular investidor.');
        }
      }
    });
  };

  const handleSellReceivableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId || !rendaInvestorId || !purchasePrice || !totalReceivableVal) {
      showNotification('error', 'Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/scp/receivables/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: rendaInvestorId,
          sale_id: selectedSaleId,
          purchase_price: purchasePrice,
          total_receivable: totalReceivableVal,
          ownership_percentage: ownershipPercentage / 100
        })
      });
      if (!res.ok) throw new Error();
      showNotification('success', 'Sucesso', 'Recebível vendido com sucesso!');
      setIsSellReceivableOpen(false);
      setSelectedSaleId('');
      setRendaInvestorId('');
      setPurchasePrice('');
      setTotalReceivableVal('');
      fetchRendaPurchases();
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao vender recebível.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRendaPurchase = async (id: string) => {
    try {
      const res = await fetch(`/api/scp/receivables/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error();
      showNotification('success', 'Sucesso', 'Solicitação de compra aprovada com sucesso.');
      fetchRendaPurchases();
      fetchPendingRequests();
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao aprovar solicitação.');
    }
  };

  const handleRejectRendaPurchase = async (id: string) => {
    try {
      const res = await fetch(`/api/scp/receivables/${id}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error();
      showNotification('success', 'Sucesso', 'Solicitação de compra rejeitada.');
      fetchPendingRequests();
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao rejeitar solicitação.');
    }
  };

  const handleDeleteRendaPurchase = async (id: string) => {
    showModal({
      title: 'Estornar Compra de Recebível',
      children: 'Deseja realmente estornar esta compra de recebíveis? O saldo de recebíveis futuros do investidor será recalculado.',
      type: 'danger',
      confirmText: 'Estornar',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/scp/receivables/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error();
          showNotification('success', 'Sucesso', 'Compra estornada com sucesso.');
          fetchRendaPurchases();
          hideModal();
        } catch (err) {
          showNotification('error', 'Erro', 'Falha ao estornar compra.');
        }
      }
    });
  };

  const handleUpdateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateContractUrl(selectedQuotaId, contractUrl);
      showNotification('success', 'Sucesso', 'Link do contrato atualizado com sucesso.');
      setIsContractUrlOpen(false);
      setContractUrl('');
    } catch (err) {
      showNotification('error', 'Erro', 'Falha ao atualizar o contrato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveWithdrawal = (id: string) => {
    showModal({
      title: 'Aprovar Solicitação de Resgate',
      children: (
        <ApproveWithdrawalForm
          id={id}
          onApprove={async (paymentDate, receiptUrl) => {
            try {
              await approveWithdrawal(id, { paymentDate, receiptUrl });
              showNotification('success', 'Sucesso', 'Resgate aprovado e saldo debitado com sucesso.');
              hideModal();
            } catch (err) {
              showNotification('error', 'Erro', 'Falha ao aprovar resgate.');
            }
          }}
          onCancel={hideModal}
        />
      ),
      type: 'primary'
    });
  };

  const handleRejectWithdrawal = (id: string) => {
    showModal({
      title: 'Rejeitar Solicitação de Resgate',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm">Deseja realmente rejeitar este resgate Pix?</p>
          <p className="text-[10px] text-zinc-400 leading-normal uppercase tracking-wider">
            O valor solicitado retornará ao saldo disponível na carteira do parceiro investidor.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Rejeitar Resgate',
      onConfirm: async () => {
        try {
          await rejectWithdrawal(id);
          showNotification('success', 'Sucesso', 'Resgate rejeitado com sucesso.');
          hideModal();
        } catch (err) {
          showNotification('error', 'Erro', 'Falha ao rejeitar resgate.');
        }
      }
    });
  };

  const toggleDeviceSelection = (id: string) => {
    setSelectedDeviceIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCreateInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorFormData.full_name || !investorFormData.email || !investorFormData.password) {
      showNotification('error', 'Erro', 'Nome, e-mail e senha são obrigatórios.');
      return;
    }
    setIsSavingInvestor(true);
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: investorFormData.full_name,
          email: investorFormData.email,
          password: investorFormData.password,
          phone: investorFormData.phone || null,
          role: 'investor',
          investor_profile: investorFormData.investor_profile || 'arrojado',
          store_id: null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao criar investidor');
      }

      // Salvar a categoria manual no perfil do investidor recém-criado
      const createdUserId = data.user?.id;
      if (createdUserId) {
        await fetch(`/api/scp/fintech/investor-settings/${createdUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customInterestRate: null,
            autoReinvest: false,
            manualCategory: investorFormData.manual_category
          })
        });
      }

      showNotification('success', 'Sucesso', 'Parceiro Investidor cadastrado com sucesso!');
      setIsCreateInvestorOpen(false);
      setInvestorFormData({ full_name: '', email: '', password: '', phone: '', investor_profile: 'arrojado', manual_category: 'Bronze' });
      fetchAllUsersList();
      fetchProfiles();
    } catch (err: any) {
      showNotification('error', 'Erro', err.message || 'Falha ao cadastrar investidor.');
    } finally {
      setIsSavingInvestor(false);
    }
  };

  const handleEditInvestorClick = (u: any) => {
    setEditingInvestorId(u.id);
    setEditInvestorFormData({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      investor_profile: u.investor_profile || 'arrojado',
      custom_interest_rate: u.custom_interest_rate !== null && u.custom_interest_rate !== undefined ? u.custom_interest_rate.toString() : '',
      auto_reinvest: !!u.auto_reinvest,
      manual_category: u.manual_category || 'auto'
    });
    setIsEditInvestorOpen(true);
  };

  const handleEditInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInvestorFormData.full_name || !editInvestorFormData.email) {
      showNotification('error', 'Erro', 'Nome e e-mail são obrigatórios.');
      return;
    }
    setIsSavingInvestor(true);
    try {
      const res = await fetch(`/api/users/${editingInvestorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editInvestorFormData.full_name,
          email: editInvestorFormData.email,
          phone: editInvestorFormData.phone || null,
          investor_profile: editInvestorFormData.investor_profile
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao atualizar investidor');
      }

      const rateVal = editInvestorFormData.custom_interest_rate === '' ? null : Number(editInvestorFormData.custom_interest_rate);
      const settingsRes = await fetch(`/api/scp/fintech/investor-settings/${editingInvestorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customInterestRate: rateVal,
          autoReinvest: editInvestorFormData.auto_reinvest,
          manualCategory: editInvestorFormData.manual_category
        })
      });
      if (!settingsRes.ok) {
        throw new Error('Falha ao atualizar configurações de rentabilidade do parceiro.');
      }

      showNotification('success', 'Sucesso', 'Parceiro Investidor atualizado com sucesso!');
      setIsEditInvestorOpen(false);
      fetchAllUsersList();
      fetchProfiles();
    } catch (err: any) {
      showNotification('error', 'Erro', err.message || 'Falha ao atualizar investidor.');
    } finally {
      setIsSavingInvestor(false);
    }
  };

  const handleDeleteInvestorClick = (id: string) => {
    showModal({
      title: 'Confirmar Exclusão de Investidor',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm font-semibold">Deseja realmente excluir este investidor permanentemente?</p>
          <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-wider">
            Esta ação excluirá o perfil do investidor e sua carteira. Esta ação NÃO pode ser desfeita.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Excluir Investidor',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/${id}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Falha ao excluir investidor');
          }
          showNotification('success', 'Sucesso', 'Investidor excluído com sucesso!');
          fetchAllUsersList();
          fetchProfiles();
          hideModal();
        } catch (err: any) {
          showNotification('error', 'Erro', err.message || 'Falha ao excluir investidor.');
          hideModal();
        }
      }
    });
  };

  const handleDeleteLot = (id: string, title: string) => {
    showModal({
      title: 'Confirmar Exclusão de Lote',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm">Deseja realmente excluir o lote <span className="text-white font-black">{title}</span>?</p>
          <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-wider">
            Esta ação desvinculará todos os aparelhos vinculados a este lote, devolvendo-os ao estoque geral.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Excluir Lote',
      onConfirm: async () => {
        try {
          await deleteLot(id);
          showNotification('success', 'Sucesso', 'Lote excluído com sucesso.');
          hideModal();
        } catch (err: any) {
          showNotification('error', 'Erro', err.response?.data?.error || err.message || 'Falha ao excluir lote.');
        }
      }
    });
  };

  const handleDeleteQuota = (id: string, investorName: string) => {
    showModal({
      title: 'Confirmar Remoção de Cotista',
      children: (
        <div className="space-y-4 text-white text-xs">
          <p className="text-sm">Deseja realmente remover o cotista <span className="text-white font-black">{investorName}</span> deste lote?</p>
          <p className="text-[10px] text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-black uppercase tracking-widest leading-normal">
            Atenção: O valor investido será abatido do saldo de recebíveis futuros na carteira deste investidor.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Confirmar Remoção',
      onConfirm: async () => {
        try {
          await deleteQuota(id);
          showNotification('success', 'Sucesso', 'Cotista removido com sucesso.');
          hideModal();
        } catch (err: any) {
          showNotification('error', 'Erro', err.response?.data?.error || err.message || 'Falha ao remover cotista.');
        }
      }
    });
  };

  // Calcs for Prime form
  const primeSelectedDevices = availableDevices.filter(d => primeSelectedDeviceIds.includes(d.id));
  const costPrice = primeSelectedDevices.reduce((sum, d) => sum + Number(d.cost_price || 0), 0);
  const salePrice = primeSelectedDevices.reduce((sum, d) => sum + Number(d.sale_price || 0), 0);
  const grossProfit = Math.max(0, salePrice - costPrice);
  const feePct = Number(primeAdminFee) || 0;
  const sharePct = Number(primeProfitShare) || 0;
  const netProfit = grossProfit * (1.0 - (feePct / 100));
  const estimatedProfitVal = netProfit * (sharePct / 100);

  const handleProfitValChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && netProfit > 0) {
      const pct = Math.min(100, Math.max(0, parseFloat(((val / netProfit) * 100).toFixed(2))));
      setPrimeProfitShare(pct);
    } else if (valStr === '') {
      setPrimeProfitShare('');
    }
  };

  useEffect(() => {
    if (netProfit > 0 && primeProfitShare !== '') {
      setPrimeProfitShareVal((netProfit * (primeProfitShare / 100)).toFixed(2));
    } else {
      setPrimeProfitShareVal('');
    }
  }, [primeSelectedDeviceIds, primeAdminFee]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121214] p-6 rounded-3xl border border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Gestão de Investimentos SCP</h2>
          <p className="text-xs text-zinc-400 mt-1">Monitore e distribua dividendos baseados no custo e venda de smartphones</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Alternador de abas */}
          <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-0.5 mr-2 flex-wrap gap-1">
            <button
              onClick={() => setActivePanelTab('prime')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activePanelTab === 'prime'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
                }`}
            >
              Prime (Estoque)
            </button>
            <button
              onClick={() => setActivePanelTab('renda')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activePanelTab === 'renda'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
                }`}
            >
              Renda (Recebíveis)
            </button>
            <button
              onClick={() => setActivePanelTab('withdrawals')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer relative ${activePanelTab === 'withdrawals'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
                }`}
            >
              Resgates Pix
              {withdrawals.filter(w => w.status === 'PENDING').length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                  {withdrawals.filter(w => w.status === 'PENDING').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActivePanelTab('investors')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activePanelTab === 'investors'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
                }`}
            >
              Investidores / Parceiros
            </button>
            <button
              onClick={() => setActivePanelTab('financeira')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${activePanelTab === 'financeira'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
                }`}
            >
              Financeira (Rendimentos)
            </button>
          </div>

          <button
            onClick={() => setIsCreateInvestorOpen(true)}
            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-700"
          >
            <PlusCircle size={14} />
            Novo Investidor
          </button>

          {activePanelTab === 'prime' && (
            <button
              onClick={() => {
                fetchAvailableDevices();
                setIsLinkPrimeOpen(true);
              }}
              className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} />
              Vincular Prime
            </button>
          )}

          {activePanelTab === 'renda' && (
            <button
              onClick={() => {
                fetchAvailableSales();
                setIsSellReceivableOpen(true);
              }}
              className="px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} />
              Vender Recebível
            </button>
          )}
        </div>
      </div>

      {activePanelTab === 'prime' ? (
        /* Aba Prime (Estoque) */
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Celulares Vinculados (Prime)</h3>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="animate-spin text-emerald-400" size={24} />
              <span className="text-xs text-zinc-500">Buscando celulares...</span>
            </div>
          ) : primeDevices.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">Nenhum aparelho associado a investidores Prime no momento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-4 px-4">Aparelho</th>
                    <th className="py-4 px-4">IMEI</th>
                    <th className="py-4 px-4">Investidor Prime</th>
                    <th className="py-4 px-4 text-center">Part. Lucro</th>
                    <th className="py-4 px-4 text-center">Taxa Adm</th>
                    <th className="py-4 px-4">Preço Venda</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {primeDevices.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">{d.brand} {d.model}</td>
                      <td className="py-4 px-4 font-mono text-zinc-400 select-all">{d.imei || '-'}</td>
                      <td className="py-4 px-4 text-zinc-300 font-semibold">{d.profiles?.full_name || 'Investidor'}</td>
                      <td className="py-4 px-4 text-center font-bold text-indigo-400">{(Number(d.prime_profit_share || 0.60) * 100).toFixed(0)}%</td>
                      <td className="py-4 px-4 text-center text-zinc-400">{(Number(d.prime_admin_fee || 0.10) * 100).toFixed(0)}%</td>
                      <td className="py-4 px-4 font-bold text-emerald-400">R$ {Number(d.sale_price || d.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${d.status === 'sold'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                          {d.status === 'sold' ? 'Vendido' : 'Disponível'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleUnlinkPrime(d.id)}
                          className="p-1 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                          title="Desvincular Investidor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activePanelTab === 'renda' ? (
        /* Aba Renda (Recebíveis) */
        <div className="space-y-6">
          <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Recebíveis Vendidos (Renda)</h3>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="animate-spin text-emerald-400" size={24} />
                <span className="text-xs text-zinc-500">Buscando recebíveis...</span>
              </div>
            ) : rendaPurchases.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">Nenhum recebível vendido a investidores Renda até o momento.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                      <th className="py-4 px-4">Aparelho / Contrato</th>
                      <th className="py-4 px-4">Investidor Renda</th>
                      <th className="py-4 px-4">Preço Pago (À Vista)</th>
                      <th className="py-4 px-4">Recebível Nominal</th>
                      <th className="py-4 px-4 text-center">Fração Comprada</th>
                      <th className="py-4 px-4">Data Aquisição</th>
                      <th className="py-4 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {rendaPurchases.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-bold text-white block">
                            {r.sales?.device ? `${r.sales.device.brand} ${r.sales.device.model}` : 'Aparelho'}
                          </span>
                          <span className="text-[11px] text-zinc-400 block font-medium">
                            Cliente: {r.sales?.customer?.name || 'Contrato'}
                          </span>
                          {r.sales?.device?.imei && (
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              IMEI: {r.sales.device.imei}
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-500 block font-mono">ID Venda: #{r.sale_id.slice(0, 8)}</span>
                        </td>
                        <td className="py-4 px-4 text-zinc-300 font-semibold">{r.profiles?.full_name || 'Investidor'}</td>
                        <td className="py-4 px-4 font-bold text-indigo-400">R$ {Number(r.purchase_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 font-bold text-emerald-400">R$ {Number(r.total_receivable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-center font-black text-white">{(Number(r.ownership_percentage || 1) * 100).toFixed(0)}%</td>
                        <td className="py-4 px-4 text-zinc-500">{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRendaPurchase(r.id)}
                            className="p-1 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                            title="Estornar Recebível"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Solicitações de Compra Pendentes</h3>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs">Nenhuma solicitação de compra pendente.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                      <th className="py-4 px-4">Aparelho / Contrato</th>
                      <th className="py-4 px-4">Investidor</th>
                      <th className="py-4 px-4">Preço Pago (À Vista)</th>
                      <th className="py-4 px-4">Recebível Nominal</th>
                      <th className="py-4 px-4 text-center">Fração</th>
                      <th className="py-4 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {pendingRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-bold text-white block">
                            {req.sales?.device ? `${req.sales.device.brand} ${req.sales.device.model}` : 'Aparelho'}
                          </span>
                          <span className="text-[11px] text-zinc-400 block font-medium">
                            Cliente: {req.sales?.customer?.name || 'Contrato'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-zinc-300 font-semibold">{req.profiles?.full_name || 'Investidor'}</td>
                        <td className="py-4 px-4 font-bold text-indigo-400">R$ {Number(req.purchase_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 font-bold text-emerald-400">R$ {Number(req.total_receivable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-center font-black text-white">{(Number(req.ownership_percentage || 1) * 100).toFixed(0)}%</td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleApproveRendaPurchase(req.id)}
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase text-[9px] rounded-lg transition-all cursor-pointer border-0"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleRejectRendaPurchase(req.id)}
                            className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold uppercase text-[9px] rounded-lg transition-all cursor-pointer border-0"
                          >
                            Rejeitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activePanelTab === 'withdrawals' ? (
        /* Aba de Resgates Pix */
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Solicitações de Resgate Pix</h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="animate-spin text-emerald-400" size={24} />
              <span className="text-xs text-zinc-500">Buscando solicitações...</span>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">Nenhuma solicitação de saque Pix registrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-4 px-4">Investidor</th>
                    <th className="py-4 px-4">Valor</th>
                    <th className="py-4 px-4">Tipo Chave</th>
                    <th className="py-4 px-4">Chave Pix</th>
                    <th className="py-4 px-4">Data Solicitação</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">{w.profiles?.full_name || 'Investidor'}</td>
                      <td className="py-4 px-4 font-extrabold text-emerald-400">R$ {Number(w.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 text-zinc-300">{w.pix_key_type}</td>
                      <td className="py-4 px-4 text-zinc-400 font-mono select-all">{w.pix_key}</td>
                      <td className="py-4 px-4 text-zinc-500">{new Date(w.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${w.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : w.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                          {w.status === 'PENDING' ? 'Pendente' : w.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {w.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveWithdrawal(w.id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer border-0"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleRejectWithdrawal(w.id)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer"
                            >
                              Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-600">
                            Processado em {w.processed_at ? new Date(w.processed_at).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activePanelTab === 'investors' ? (
        /* Aba de Investidores / Parceiros */
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Parceiros Investidores Cadastrados</h3>
          </div>

          {isLoadingUsersList ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="animate-spin text-emerald-400" size={24} />
              <span className="text-xs text-zinc-500">Carregando lista de investidores...</span>
            </div>
          ) : allUsersList.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">Nenhum parceiro investidor cadastrado no momento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                    <th className="py-4 px-4">Nome / Categoria</th>
                    <th className="py-4 px-4">E-mail</th>
                    <th className="py-4 px-4">Parâmetros Juros</th>
                    <th className="py-4 px-4">Perfil</th>
                    <th className="py-4 px-4 text-right">Saldo Disponível</th>
                    <th className="py-4 px-4 text-right">Recebíveis Futuros</th>
                    <th className="py-4 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {allUsersList.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-white block">{u.full_name}</span>
                        {u.investment_category && (
                          <span className={`text-[8px] font-black uppercase tracking-wider block mt-0.5 ${u.investment_category === 'gold' ? 'text-amber-400' :
                              u.investment_category === 'silver' ? 'text-zinc-300' : 'text-amber-700'
                            }`}>
                            {u.investment_category === 'gold' ? '🏆 Ouro' :
                              u.investment_category === 'silver' ? '🥈 Prata' : '🥉 Bronze'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-zinc-400">{u.email}</td>
                      <td className="py-4 px-4 font-mono">
                        <span className="text-zinc-300 block">
                          Taxa: {u.custom_interest_rate !== null && u.custom_interest_rate !== undefined ? `${Number(u.custom_interest_rate).toFixed(1)}%` : 'Categoria'}
                        </span>
                        <span className="text-[9px] text-zinc-500 block">
                          Reinvestir: {u.auto_reinvest ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${u.investor_profile === 'conservador'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : u.investor_profile === 'arrojado_vista'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                          {u.investor_profile === 'conservador' 
                            ? 'Sem Risco (Apenas A Vista)' 
                            : u.investor_profile === 'arrojado_vista'
                              ? 'Com Risco (Avista)'
                              : 'Com Risco (A Prazo)'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-400 font-mono">R$ {Number(u.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 text-right font-bold text-zinc-300 font-mono">R$ {Number(u.future_receipts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditInvestorClick(u)}
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer transition-all"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInvestorClick(u.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer border-0 bg-transparent"
                            title="Excluir Investidor"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Aba de Financeira */
        <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Rendimentos da Financeira (Taxa Adm & Margem)</h3>
          </div>

          {isFinanceiraLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="animate-spin text-emerald-400" size={24} />
              <span className="text-xs text-zinc-500">Carregando relatório financeira...</span>
            </div>
          ) : !financeiraReport ? (
            <div className="text-center py-12 text-zinc-500 text-xs">Nenhum dado disponível.</div>
          ) : (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block mb-1">Total Pago por Clientes</span>
                  <span className="text-lg font-black text-white font-mono">
                    R$ {Number(financeiraReport.summary.totalPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block mb-1">Total Repassado Investidores</span>
                  <span className="text-lg font-black text-indigo-400 font-mono">
                    R$ {Number(financeiraReport.summary.totalRepassed).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                  <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black block mb-1">Rendimento Líquido Financeira</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    R$ {Number(financeiraReport.summary.totalRetained).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Tabela de Transações */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-black">
                      <th className="py-4 px-4">Data Pagamento</th>
                      <th className="py-4 px-4">Cliente</th>
                      <th className="py-4 px-4">Produto</th>
                      <th className="py-4 px-4 text-center">Modelo</th>
                      <th className="py-4 px-4 text-center">Parcela</th>
                      <th className="py-4 px-4 text-right">Valor Pago</th>
                      <th className="py-4 px-4 text-right">Repasse Investidor</th>
                      <th className="py-4 px-4 text-right pr-4">Rendimento Financeira</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {financeiraReport.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-500 text-xs">
                          Nenhum rendimento registrado até o momento.
                        </td>
                      </tr>
                    ) : (
                      financeiraReport.rows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-800/10 transition-colors">
                          <td className="py-4 px-4 text-zinc-500">
                            {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                          </td>
                          <td className="py-4 px-4 font-bold text-white uppercase">{row.customerName}</td>
                          <td className="py-4 px-4 text-zinc-300 uppercase">{row.productName}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${row.type === 'PRIME'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-zinc-400">{row.installmentNumber}</td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-white">
                            R$ {Number(row.customerPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-indigo-400">
                            R$ {Number(row.repasse).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400 pr-4">
                            R$ {Number(row.retained).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Cadastrar Novo Investidor */}
      {isCreateInvestorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateInvestorSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-2xl rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cadastrar Novo Investidor</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={investorFormData.full_name}
                  onChange={(e) => setInvestorFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: joao@investidor.com"
                  value={investorFormData.email}
                  onChange={(e) => setInvestorFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={investorFormData.password}
                  onChange={(e) => setInvestorFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Ex: 48991234567"
                  value={investorFormData.phone}
                  onChange={(e) => setInvestorFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Perfil do Investidor</label>
                <select
                  value={investorFormData.investor_profile || 'arrojado'}
                  onChange={(e) => setInvestorFormData(prev => ({ ...prev, investor_profile: e.target.value }))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                >
                  <option value="arrojado_vista" className="bg-[#121214]">COM RISCO (AVISTA)</option>
                  <option value="arrojado" className="bg-[#121214]">COM RISCO (A PRAZO)</option>
                  <option value="conservador" className="bg-[#121214]">SEM RISCO (APENAS A VISTA)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Categorização (Categoria)</label>
                <select
                  required
                  value={investorFormData.manual_category}
                  onChange={(e) => setInvestorFormData(prev => ({ ...prev, manual_category: e.target.value }))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                >
                  <option value="Bronze" className="bg-[#121214]">🥉 Bronze (2.0% a.m.)</option>
                  <option value="Prata" className="bg-[#121214]">🥈 Prata (2.3% a.m.)</option>
                  <option value="Ouro" className="bg-[#121214]">🏆 Ouro (2.6% a.m.)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateInvestorOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingInvestor}
                className="flex-1 py-3.5 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {isSavingInvestor ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Editar Investidor */}
      {isEditInvestorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditInvestorSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Editar Investidor</h3>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva"
                value={editInvestorFormData.full_name}
                onChange={(e) => setEditInvestorFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">E-mail</label>
              <input
                type="email"
                required
                placeholder="Ex: joao@investidor.com"
                value={editInvestorFormData.email}
                onChange={(e) => setEditInvestorFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Telefone / WhatsApp</label>
              <input
                type="text"
                placeholder="Ex: 48991234567"
                value={editInvestorFormData.phone}
                onChange={(e) => setEditInvestorFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Perfil do Investidor</label>
              <select
                value={editInvestorFormData.investor_profile || 'arrojado'}
                onChange={(e) => setEditInvestorFormData(prev => ({ ...prev, investor_profile: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              >
                <option value="arrojado_vista" className="bg-[#121214]">COM RISCO (AVISTA)</option>
                <option value="arrojado" className="bg-[#121214]">COM RISCO (A PRAZO)</option>
                <option value="conservador" className="bg-[#121214]">SEM RISCO (APENAS A VISTA)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Categorização (Categoria)</label>
              <select
                value={editInvestorFormData.manual_category || 'auto'}
                onChange={(e) => setEditInvestorFormData(prev => ({ ...prev, manual_category: e.target.value }))}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
              >
                <option value="auto" className="bg-[#121214]">Automático (Baseado no valor investido)</option>
                <option value="Bronze" className="bg-[#121214]">🥉 Bronze (2.0% a.m.)</option>
                <option value="Prata" className="bg-[#121214]">🥈 Prata (2.3% a.m.)</option>
                <option value="Ouro" className="bg-[#121214]">🏆 Ouro (2.6% a.m.)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Taxa de Retorno Opcional (% a.m.)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Padrão da Categoria"
                  value={editInvestorFormData.custom_interest_rate}
                  onChange={(e) => setEditInvestorFormData(prev => ({ ...prev, custom_interest_rate: e.target.value }))}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2 flex flex-col justify-center pl-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1 mb-2">Reinvestimento Automático</label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editInvestorFormData.auto_reinvest}
                    onChange={(e) => setEditInvestorFormData(prev => ({ ...prev, auto_reinvest: e.target.checked }))}
                    className="accent-primary h-4 w-4"
                  />
                  <span>Ativar Automático</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditInvestorOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingInvestor}
                className="flex-1 py-3.5 bg-primary hover:bg-primary/80 text-on-primary font-black uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {isSavingInvestor ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Vincular Aparelhos do Estoque */}
      {isLinkDevicesOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleLinkDevicesSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setIsLinkDevicesOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vincular Celulares ao Lote</h3>
            <p className="text-xs text-zinc-400">
              Selecione os smartphones disponíveis em estoque (sem lote associado) que farão parte deste lote SCP:
            </p>

            <div className="flex-1 overflow-y-auto min-h-[250px] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/40 p-2">
              {availableDevices.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">Nenhum aparelho livre localizado no estoque.</div>
              ) : (
                availableDevices.map((d) => (
                  <label key={d.id} className="flex items-center gap-3 p-3 hover:bg-zinc-800/20 rounded-xl transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDeviceIds.includes(d.id)}
                      onChange={() => toggleDeviceSelection(d.id)}
                      className="accent-emerald-500"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-white block">{d.brand} {d.model}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">IMEI: {d.imei || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-400 block">Custo: R$ {Number(d.cost_price).toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-emerald-400 font-bold block">Venda: R$ {Number(d.sale_price).toLocaleString('pt-BR')}</span>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsLinkDevicesOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedDeviceIds.length === 0}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar Vinculação'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Editar Link do Contrato */}
      {isContractUrlOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateContractSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsContractUrlOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider pr-6">Vincular Contrato SCP</h3>
            <p className="text-xs text-zinc-400">
              Cole o link direto do arquivo PDF do contrato de participação (hospedado no Supabase Storage, Google Drive ou Dropbox) para que o investidor consiga baixá-lo no seu painel:
            </p>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">URL do Contrato PDF</label>
              <input
                type="url"
                required
                placeholder="https://example.com/contrato.pdf"
                value={contractUrl}
                onChange={(e) => setContractUrl(e.target.value)}
                className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsContractUrlOpen(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Salvar Contrato'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Vincular Celular a Investidor Prime */}
      {isLinkPrimeOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleLinkPrimeSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-4xl rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setIsLinkPrimeOpen(false);
                setPrimeSelectedDeviceIds([]);
                setPrimeDeviceImeis({});
                setPrimeSelectedQuantities({});
                setDeviceSearchQuery('');
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer z-10"
            >
              <X size={18} />
            </button>

            {/* Header (Fixo) */}
            <div className="mb-4 pr-8 shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vincular Celulares Prime</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Associe aparelhos em estoque diretamente a um Investidor Prime selecionando-os por IMEI.
              </p>
            </div>

            {/* Conteúdo rolável se ultrapassar 90vh */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Investidor Prime</label>
                <select
                  required
                  value={primeInvestorId}
                  onChange={(e) => setPrimeInvestorId(e.target.value)}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="" disabled className="bg-[#121214]">-- Escolha o Investidor --</option>
                  {investors.map((inv) => (
                    <option key={inv.id} value={inv.id} className="bg-[#121214]">{inv.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Valor de Aporte (Amortização)</label>
                <select
                  value={primeValuationType}
                  onChange={(e) => setPrimeValuationType(e.target.value as any)}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="sale" className="bg-[#121214]">Preço de Venda (Loja)</option>
                  <option value="cost" className="bg-[#121214]">Preço de Custo (Compra)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Filtrar Aparelhos</label>
                <input
                  type="text"
                  placeholder="Pesquise por marca, modelo ou IMEI..."
                  value={deviceSearchQuery}
                  onChange={(e) => setDeviceSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="border border-zinc-800/80 rounded-2xl p-3 min-h-[200px] bg-black/10">
                {filteredAvailableDevices.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">Nenhum aparelho disponível localizado.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAvailableDevices.map((d) => (
                      <div key={d.id} className="flex flex-col p-3 bg-white/2 hover:bg-white/6 border border-white/5 rounded-2xl transition-all">
                        <div
                          className="flex items-center gap-3 w-full cursor-pointer"
                          onClick={() => {
                            setPrimeSelectedDeviceIds(prev => {
                              const isSelected = prev.includes(d.id);
                              if (isSelected) {
                                return prev.filter(id => id !== d.id);
                              } else {
                                setPrimeSelectedQuantities(qPrev => ({ ...qPrev, [d.id]: 1 }));
                                setPrimeDeviceImeis(iPrev => ({ ...iPrev, [d.id]: [d.imei || ''] }));
                                return [...prev, d.id];
                              }
                            });
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={primeSelectedDeviceIds.includes(d.id)}
                            readOnly
                            className="accent-emerald-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-white block truncate uppercase">{d.brand} {d.model}</span>
                            <span className="text-[9px] text-zinc-500 font-mono block truncate">
                              IMEI atual: {d.imei || 'Não informado'}
                            </span>
                            <span className="text-[9px] text-zinc-400 block mt-0.5">
                              Estoque: {d.stock_quantity ?? 1} {(d.stock_quantity ?? 1) > 1 ? 'unidades' : 'unidade'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            {primeValuationType === 'cost' ? (
                              <span className="text-[10px] text-indigo-400 font-bold block font-mono">Custo: R$ {Number(d.cost_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold block font-mono">À Vista: R$ {Number(d.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            )}
                          </div>
                        </div>

                        {/* Seletor de quantidade e inputs de IMEI */}
                        {primeSelectedDeviceIds.includes(d.id) && (
                          <div className="mt-2 pt-2 border-t border-white/5 w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                            {(d.stock_quantity || 1) > 1 && (
                              <div className="flex items-center justify-between">
                                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Qtd a vincular (Max {d.stock_quantity})</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={d.stock_quantity}
                                  value={primeSelectedQuantities[d.id] || 1}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.min(d.stock_quantity || 1, parseInt(e.target.value) || 1));
                                    setPrimeSelectedQuantities(prev => ({ ...prev, [d.id]: val }));
                                    setPrimeDeviceImeis(prev => {
                                      const currentList = prev[d.id] || [];
                                      const newList = Array.from({ length: val }, (_, i) => currentList[i] || '');
                                      return { ...prev, [d.id]: newList };
                                    });
                                  }}
                                  className="w-16 bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs text-white text-center outline-none transition-all"
                                />
                              </div>
                            )}

                            <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Preencher/Alterar IMEI(s)</label>
                            {Array.from({ length: primeSelectedQuantities[d.id] || 1 }).map((_, idx) => (
                              <input
                                key={idx}
                                type="text"
                                placeholder={`IMEI da unidade ${idx + 1}...`}
                                value={primeDeviceImeis[d.id]?.[idx] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPrimeDeviceImeis(prev => {
                                    const currentList = [...(prev[d.id] || [])];
                                    currentList[idx] = val;
                                    return { ...prev, [d.id]: currentList };
                                  });
                                }}
                                className="w-full bg-black/40 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none transition-all font-mono"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Part. Lucro (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    step="any"
                    value={primeProfitShare}
                    onChange={(e) => {
                      const pctVal = e.target.value;
                      setPrimeProfitShare(pctVal === '' ? '' : parseFloat(pctVal));
                      if (pctVal === '' || isNaN(parseFloat(pctVal))) {
                        setPrimeProfitShareVal('');
                      } else {
                        setPrimeProfitShareVal((netProfit * (parseFloat(pctVal) / 100)).toFixed(2));
                      }
                    }}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Part. Lucro (R$)</label>
                  <input
                    type="number"
                    step="any"
                    disabled={primeSelectedDeviceIds.length === 0 || netProfit <= 0}
                    value={primeProfitShareVal}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      setPrimeProfitShareVal(valStr);
                      const val = parseFloat(valStr);
                      if (!isNaN(val) && netProfit > 0) {
                        const pct = Math.min(100, Math.max(0, parseFloat(((val / netProfit) * 100).toFixed(2))));
                        setPrimeProfitShare(pct);
                      } else if (valStr === '') {
                        setPrimeProfitShare('');
                      }
                    }}
                    placeholder={primeSelectedDeviceIds.length === 0 ? "Escolha..." : "R$ 0,00"}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Taxa Adm (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={primeAdminFee}
                    onChange={(e) => setPrimeAdminFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {primeSelectedDeviceIds.length > 0 && (
                <div className="bg-white/2 border border-zinc-800 p-3 rounded-2xl text-[10px] space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Valor Total Financiado (À Vista):</span>
                    <span className="font-bold text-white">R$ {salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800/60 pt-1.5 mt-1.5 text-emerald-400">
                    <span>Repasse Estimado (Investidor):</span>
                    <span className="font-extrabold">R$ {estimatedProfitVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({Number(primeProfitShare || 0).toFixed(1)}%)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer (Fixo com botões de ação) */}
            <div className="flex gap-2 pt-4 border-t border-zinc-800/80 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsLinkPrimeOpen(false);
                  setPrimeSelectedDeviceIds([]);
                  setPrimeDeviceImeis({});
                  setDeviceSearchQuery('');
                }}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || primeSelectedDeviceIds.length === 0 || !primeInvestorId}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar Vínculo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Vender Recebíveis de Contrato (Renda) */}
      {isSellReceivableOpen && (() => {
        const selectedSale = availableSales.find(s => s.id === selectedSaleId);
        const installments = selectedSale ? (selectedSale.unpaid_installments_count ?? selectedSale.installments_count) : 12;
        const imei = selectedSale?.device?.imei || 'N/A';
        const brandModel = selectedSale?.device ? `${selectedSale.device.brand} ${selectedSale.device.model}` : 'N/A';
        const saleTotal = selectedSale ? Number(selectedSale.remaining_receivable_value ?? selectedSale.total_value) : 0;
        const monthlyEstimate = totalReceivableVal ? (Number(totalReceivableVal) * (ownershipPercentage / 100)) / installments : 0;
        const totalAdquiridoVal = Number(totalReceivableVal || 0) * (ownershipPercentage / 100);
        const lucroTotalEstimado = totalAdquiridoVal - (Number(purchasePrice) || 0);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={handleSellReceivableSubmit} className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl relative">
              <button
                type="button"
                onClick={() => {
                  setIsSellReceivableOpen(false);
                  setSelectedSaleId('');
                  setPurchasePrice('');
                  setTotalReceivableVal('');
                  setInterestRateInput('');
                  setOwnershipPercentage(100);
                }}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>

              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vender Recebíveis</h3>
              <p className="text-xs text-zinc-400">
                Venda os recebíveis de um contrato de venda ativo para um Investidor Renda.
              </p>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Selecione o Contrato</label>
                <select
                  required
                  value={selectedSaleId}
                  onChange={(e) => {
                    const saleId = e.target.value;
                    setSelectedSaleId(saleId);
                    const sSale = availableSales.find(s => s.id === saleId);
                    if (sSale) {
                      const sVal = Number(sSale.remaining_receivable_value ?? sSale.total_value);
                      setTotalReceivableVal(sVal);
                      setPurchasePrice(sVal);
                      setInterestRateInput(0);
                    }
                  }}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="" disabled className="bg-[#121214]">-- Escolha o Contrato --</option>
                  {availableSales.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#121214]">
                      {s.customer_name} - {s.device ? `${s.device.brand} ${s.device.model}` : 'Celular'} (Restante: R$ {Number(s.remaining_receivable_value ?? s.total_value).toLocaleString('pt-BR')} | {s.unpaid_installments_count ?? s.installments_count}x)
                    </option>
                  ))}
                </select>
              </div>

              {selectedSale && (
                <div className="bg-white/2 border border-zinc-800/80 p-3 rounded-2xl text-[10px] space-y-1 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Equipamento:</span>
                    <span className="font-bold text-white">{brandModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IMEI do Equipamento:</span>
                    <span className="font-mono font-bold text-white select-all">{imei}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor Original da Venda:</span>
                    <span className="font-bold text-white">R$ {Number(selectedSale.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {selectedSale.unpaid_installments_count !== undefined && (
                    <div className="flex justify-between text-indigo-400">
                      <span>Valor Restante (Em Aberto):</span>
                      <span className="font-extrabold">R$ {Number(selectedSale.remaining_receivable_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Parcelas Restantes:</span>
                    <span className="font-bold text-white">{installments}x</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Selecione o Investidor Renda</label>
                <select
                  required
                  value={rendaInvestorId}
                  onChange={(e) => setRendaInvestorId(e.target.value)}
                  className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="" disabled className="bg-[#121214]">-- Escolha o Investidor --</option>
                  {investors.map((inv) => (
                    <option key={inv.id} value={inv.id} className="bg-[#121214]">{inv.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Valor Nominal Receber</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    placeholder="Valor total"
                    value={totalReceivableVal}
                    onChange={(e) => {
                      const recVal = parseFloat(e.target.value) || 0;
                      setTotalReceivableVal(e.target.value === '' ? '' : recVal);
                      if (interestRateInput !== '' && interestRateInput >= 0) {
                        const price = recVal / (1 + (Number(interestRateInput) / 100));
                        setPurchasePrice(parseFloat(price.toFixed(2)));
                      }
                    }}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Taxa de Juros / Retorno (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    placeholder="Ex: 10"
                    value={interestRateInput}
                    onChange={(e) => {
                      const rate = e.target.value === '' ? '' : parseFloat(e.target.value);
                      setInterestRateInput(rate);
                      if (rate !== '' && rate >= 0 && totalReceivableVal) {
                        const price = Number(totalReceivableVal) / (1 + (rate / 100));
                        setPurchasePrice(parseFloat(price.toFixed(2)));
                      }
                    }}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Desembolso Imediato (Preço Pago)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    placeholder="Preço pago"
                    value={purchasePrice}
                    onChange={(e) => {
                      const price = e.target.value === '' ? '' : parseFloat(e.target.value);
                      setPurchasePrice(price);
                      if (price !== '' && price > 0 && totalReceivableVal) {
                        const rate = ((Number(totalReceivableVal) - price) / price) * 100;
                        setInterestRateInput(parseFloat(rate.toFixed(2)));
                      }
                    }}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block pl-1">Porcentagem Adquirida (%)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={ownershipPercentage}
                    onChange={(e) => setOwnershipPercentage(parseInt(e.target.value) || 100)}
                    className="w-full bg-white/5 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {selectedSale && totalReceivableVal !== '' && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-2xl text-[10px] space-y-1.5 text-indigo-300 shrink-0">
                  <div className="flex justify-between font-bold">
                    <span>Recebimento Mensal Estimado:</span>
                    <span>R$ {monthlyEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-400 border-t border-zinc-800/60 pt-1.5 mt-1.5">
                    <span>Lucro Total Estimado do Investidor:</span>
                    <span>R$ {lucroTotalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal uppercase">
                    * Estimado em {installments} parcelas mensais de R$ {(Number(totalReceivableVal) * (ownershipPercentage / 100) / installments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsSellReceivableOpen(false);
                    setSelectedSaleId('');
                    setPurchasePrice('');
                    setTotalReceivableVal('');
                    setInterestRateInput('');
                    setOwnershipPercentage(100);
                  }}
                  className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer border-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSaleId || !rendaInvestorId}
                  className="flex-1 py-3.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold uppercase tracking-widest text-[9px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0"
                >
                  {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar Venda'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
}
