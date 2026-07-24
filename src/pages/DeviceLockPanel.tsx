import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Search, 
  Smartphone, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw,
  Clock,
  UserCheck,
  Building,
  QrCode,
  X,
  Loader2
} from 'lucide-react';
import { useDeviceLockStore, DeviceLock } from '../store/useDeviceLockStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUI } from '../context/UIContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function DeviceLockPanel() {
  const { deviceLocks, isLoading, fetchDeviceLocks, lockDevice, unlockDevice, updateDeviceLock } = useDeviceLockStore();
  const { profile } = useAuthStore();
  const { showNotification } = useUI();
  
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'active' | 'quitado'>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'icloud' | 'android'>('all');
  const [selectedLock, setSelectedLock] = useState<DeviceLock | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeviceLocks();
  }, [fetchDeviceLocks]);

  // States para Google EMM
  const [showEmmModal, setShowEmmModal] = useState(false);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [isEnterpriseLoading, setIsEnterpriseLoading] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [enrollmentQr, setEnrollmentQr] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const fetchEnterpriseId = async () => {
    try {
      setIsEnterpriseLoading(true);
      const res = await fetch('/api/device-locks/enterprise');
      if (res.ok) {
        const data = await res.json();
        setEnterpriseId(data.enterpriseId);
      }
    } catch (e) {
      console.error('[DeviceLockPanel] Erro ao buscar Enterprise ID:', e);
    } finally {
      setIsEnterpriseLoading(false);
    }
  };

  const fetchEnrollmentToken = async () => {
    try {
      setIsGeneratingQr(true);
      const res = await fetch('/api/device-locks/enterprise/enrollment-token', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.qrCodePayload) {
          setEnrollmentQr(data.qrCodePayload);
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error('[DeviceLockPanel] Erro ao obter token de provisionamento:', e);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  useEffect(() => {
    fetchEnterpriseId();
  }, []);

  useEffect(() => {
    if (enterpriseId && showEmmModal) {
      fetchEnrollmentToken();
    }
  }, [enterpriseId, showEmmModal]);

  const handleGenerateSignupUrl = async () => {
    try {
      setIsGeneratingLink(true);
      const res = await fetch('/api/device-locks/enterprise/signup-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackUrl: window.location.origin + '/api/device-locks/callback'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
          showNotification('info', 'Inscrição Iniciada', 'Complete o fluxo na janela do Google que foi aberta.');
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      showNotification('error', 'Erro', 'Não foi possível gerar a URL de inscrição.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleUnlinkEnterprise = async () => {
    if (!window.confirm('Tem certeza que deseja desvincular o Google Enterprise ID? Isso removerá as configurações de provisionamento.')) return;
    try {
      const res = await fetch('/api/device-locks/enterprise', {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification('success', 'Vínculo Removido', 'A conta Google Enterprise foi desvinculada com sucesso.');
        setEnterpriseId(null);
        setEnrollmentQr(null);
      } else {
        throw new Error();
      }
    } catch (e) {
      showNotification('error', 'Erro', 'Não foi possível desvincular a conta.');
    }
  };

  // Helper: check if a customer has overdue installments
  const getInstallmentStatus = (lock: DeviceLock) => {
    const installments = lock.sale?.installments || [];
    const hasOverdue = installments.some(i => i.status === 'overdue');
    const allPaid = installments.length > 0 && installments.every(i => i.status === 'paid');
    
    if (allPaid) return 'quitado';
    if (hasOverdue) return 'overdue';
    return 'active';
  };

  // Filter locks based on criteria
  const filteredLocks = deviceLocks.filter(lock => {
    const matchesPlatform = platformFilter === 'all' || lock.lock_type === platformFilter;
    const status = getInstallmentStatus(lock);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    const customerName = lock.sale?.customer?.name || '';
    const customerCpf = lock.sale?.customer?.cpf || '';
    const deviceModel = lock.device?.model || lock.sale?.device_model_manual || '';
    const imei = lock.device?.imei || lock.sale?.imei_manual || '';
    const matchesSearch = 
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerCpf.includes(searchTerm) ||
      deviceModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imei.includes(searchTerm);
      
    return matchesPlatform && matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const totalCrediario = deviceLocks.length;
  const totalLocked = deviceLocks.filter(l => l.lock_type === 'icloud' ? l.icloud_locked : l.mdm_locked).length;
  const pendingActions = deviceLocks.filter(l => {
    const status = getInstallmentStatus(l);
    const isLocked = l.lock_type === 'icloud' ? l.icloud_locked : l.mdm_locked;
    if (status === 'overdue') {
      return !isLocked; // Inadimplente mas ainda não bloqueado
    }
    if (status === 'quitado') {
      return isLocked; // Quitado mas bloqueio ainda ativo
    }
    return false;
  }).length;

  const handleOpenLockModal = (lock: DeviceLock) => {
    setSelectedLock(lock);
    setCustomMessage(`MDR Informática e Celulares: Aparelho bloqueado por atraso no crediário. Por favor, entre em contato com nosso financeiro para regularizar e desbloquear na hora.`);
    setShowLockModal(true);
  };

  const handleTriggerLock = async () => {
    if (!selectedLock) return;
    setActionLoadingId(selectedLock.id);
    setShowLockModal(false);
    
    try {
      const response = await lockDevice(
        selectedLock.id, 
        customMessage, 
        selectedLock.sale?.customer?.id, 
        profile?.id
      );
      
      showNotification('success', 'Ação Concluída', response.message);
      fetchDeviceLocks();
    } catch (err: any) {
      showNotification('error', 'Falha na Operação', err.message || 'Não foi possível bloquear o aparelho.');
    } finally {
      setActionLoadingId(null);
      setSelectedLock(null);
    }
  };

  const handleTriggerUnlock = async (lock: DeviceLock) => {
    const isIos = lock.lock_type === 'icloud';
    const systemName = isIos ? 'iPhone' : 'Android';
    
    if (window.confirm(`Tem certeza que deseja registrar a liberação manual para o ${systemName} de ${lock.sale?.customer?.name}?`)) {
      setActionLoadingId(lock.id);
      try {
        const response = await unlockDevice(lock.id, lock.sale?.customer?.id);
        showNotification('success', 'Aparelho Liberado', response.message);
        fetchDeviceLocks();
      } catch (err: any) {
        showNotification('error', 'Falha no Desbloqueio', err.message || 'Não foi possível liberar o aparelho.');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const handleConfirmLockRemoval = async (lock: DeviceLock) => {
    const isIos = lock.lock_type === 'icloud';
    const deviceName = isIos ? 'iPhone' : 'aparelho Android';
    const serviceName = isIos ? 'iCloud corporativo' : 'Google Device Lock Controller';
    
    if (window.confirm(`Você confirma que o ${serviceName} foi desvinculado/removido fisicamente do ${deviceName} de ${lock.sale?.customer?.name}?`)) {
      setActionLoadingId(lock.id);
      try {
        if (isIos) {
          await updateDeviceLock(lock.id, {
            icloud_email: undefined, // Limpa o vínculo do iCloud para arquivar
            icloud_locked: false,
            icloud_lock_confirmed_at: undefined,
            icloud_lock_confirmed_by: undefined
          });
        } else {
          await updateDeviceLock(lock.id, {
            mdm_device_id: undefined,
            mdm_locked: false,
            mdm_last_sync_at: undefined
          });
        }
        showNotification('success', 'Vínculo Arquivado', 'O vínculo de segurança deste aparelho foi removido e arquivado com sucesso.');
        fetchDeviceLocks();
      } catch (err: any) {
        showNotification('error', 'Erro', 'Não foi possível arquivar o vínculo.');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <ShieldCheck className="text-primary w-8 h-8" />
            Controle de Bloqueio de Celulares (MDM)
          </h1>
          <p className="text-xs text-on-surface-variant max-w-xl">
            Plataforma Financeira: Controle manual das ordens de trava e destrava remota para smartphones (Android MDM / Knox & iPhone) vinculados a boletos em atraso.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEmmModal(true)}
            className="p-3 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-2xl transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
          >
            <QrCode size={14} />
            {enterpriseId ? 'QR Code Android' : 'Conectar Android EMM'}
          </button>

          <button
            onClick={() => { fetchDeviceLocks(); showNotification('info', 'Atualizando', 'Sincronizando status dos aparelhos...'); }}
            disabled={isLoading}
            className="p-3 bg-white/2 border border-white/5 rounded-2xl hover:bg-white/6 text-white transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
            Atualizar Dados
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/2 border border-white/5 rounded-4xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-linear-to-tr from-white/1 to-white/3 opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
            <Smartphone size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Aparelhos em Crediário</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1">{totalCrediario}</h3>
          </div>
        </div>

        <div className="p-6 bg-white/2 border border-white/5 rounded-4xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-linear-to-tr from-white/1 to-white/3 opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
            <Lock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Aparelhos Bloqueados</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1">{totalLocked}</h3>
          </div>
        </div>

        <div className="p-6 bg-white/2 border border-white/5 rounded-4xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-linear-to-tr from-white/1 to-white/3 opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Pendências de Ação</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1">{pendingActions}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center bg-white/1 border border-white/5 p-4 rounded-[28px]">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Buscar por cliente, IMEI ou modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/2 border border-white/5 rounded-2xl text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Buttons filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Platform filter */}
          <div className="flex bg-white/2 border border-white/5 p-1 rounded-2xl">
            {(['all', 'icloud', 'android'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setPlatformFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all uppercase tracking-wide",
                  platformFilter === filter 
                    ? "bg-white/10 text-white shadow" 
                    : "text-on-surface-variant hover:text-white"
                )}
              >
                {filter === 'all' && 'Todos SO'}
                {filter === 'icloud' && '🍏 iOS'}
                {filter === 'android' && '🤖 Android'}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex bg-white/2 border border-white/5 p-1 rounded-2xl">
            {(['all', 'overdue', 'active', 'quitado'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all uppercase tracking-wide",
                  statusFilter === filter 
                    ? "bg-white/10 text-white shadow" 
                    : "text-on-surface-variant hover:text-white"
                )}
              >
                {filter === 'all' && 'Todos Status'}
                {filter === 'overdue' && '🔴 Atrasados'}
                {filter === 'active' && '🟢 Em dia'}
                {filter === 'quitado' && '🏆 Quitados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/2 border border-white/5 rounded-[40px] overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/1">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Cliente</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Plataforma / Aparelho</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Status Financ.</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Vínculo Segurança</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Trava</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant text-center">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {filteredLocks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-on-surface-variant font-medium">
                      Nenhum aparelho em crediário encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredLocks.map((lock) => {
                    const status = getInstallmentStatus(lock);
                    const isIos = lock.lock_type === 'icloud';
                    const isLocked = isIos ? lock.icloud_locked : lock.mdm_locked;
                    const hasLinkInfo = isIos ? !!lock.icloud_email : !!lock.mdm_device_id;
                    
                    return (
                      <tr key={lock.id} className="hover:bg-white/1 transition-all group">
                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/2 border border-white/5 rounded-xl text-on-surface-variant">
                              <Users size={16} />
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">{lock.sale?.customer?.name || 'Cliente Manual'}</p>
                              <p className="text-[10px] text-on-surface-variant mt-0.5">CPF: {lock.sale?.customer?.cpf || 'Não Informado'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Device / IMEI */}
                        <td className="px-6 py-4">
                          <div>
                            <span className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs">{isIos ? '🍏 iOS' : '🤖 Android'}</span>
                            </span>
                            <p className="font-semibold text-white text-sm">{lock.device?.model || lock.sale?.device_model_manual || 'Modelo Desconhecido'}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">IMEI: {lock.device?.imei || lock.sale?.imei_manual || 'Não Informado'}</p>
                          </div>
                        </td>

                        {/* Installment Status */}
                        <td className="px-6 py-4">
                          {status === 'overdue' && (
                            <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                              🔴 Atrasado
                            </span>
                          )}
                          {status === 'active' && (
                            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                              🟢 Em Dia
                            </span>
                          )}
                          {status === 'quitado' && (
                            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                              🏆 Quitado
                            </span>
                          )}
                        </td>

                        {/* Vínculo Corporativo */}
                        <td className="px-6 py-4">
                          <div className="text-xs text-white max-w-45 truncate font-medium">
                            {isIos ? (
                              <span className="flex items-center gap-1" title={lock.icloud_email}>
                                <Building size={12} className="text-on-surface-variant" />
                                {lock.icloud_email || <span className="text-red-500/60 italic">iCloud não vinculado!</span>}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1" title={lock.mdm_device_id}>
                                <Building size={12} className="text-on-surface-variant" />
                                {lock.mdm_device_id || <span className="text-amber-500/70 font-semibold">Google Device Lock</span>}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Trava Status */}
                        <td className="px-6 py-4">
                          {isLocked ? (
                            <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-fit animate-pulse">
                              <Lock size={10} /> BLOQUEADO
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                              <Unlock size={10} /> ATIVO / LIBERADO
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Se o crediário estiver quitado, incentivar remoção do vínculo de segurança */}
                            {status === 'quitado' && hasLinkInfo ? (
                              <button
                                onClick={() => handleConfirmLockRemoval(lock)}
                                disabled={actionLoadingId === lock.id}
                                className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-semibold text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                              >
                                <Unlock size={12} />
                                {isIos ? 'Registrar Remoção iCloud' : 'Registrar Remoção Google'}
                              </button>
                            ) : (
                              <>
                                {/* Link externo para console de bloqueio */}
                                {isIos && (
                                  <a
                                    href="https://www.icloud.com/find"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-2 bg-white/4 border border-white/5 hover:bg-white/8 text-white rounded-xl transition-all font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                                  >
                                    Abrir Buscar <ExternalLink size={12} />
                                  </a>
                                )}

                                {!isLocked ? (
                                  <button
                                    onClick={() => handleOpenLockModal(lock)}
                                    disabled={actionLoadingId === lock.id}
                                    className="px-3.5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-semibold text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-red-500/15"
                                  >
                                    <Lock size={12} /> Confirmar Bloqueio
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleTriggerUnlock(lock)}
                                    disabled={actionLoadingId === lock.id}
                                    className="px-3.5 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-semibold text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/15"
                                  >
                                    <Unlock size={12} /> Confirmar Desbloqueio
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lock Kiosk Modal */}
      {showLockModal && selectedLock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-surface-container-high border border-white/5 p-6 rounded-[36px] space-y-4 shadow-2xl relative"
          >
            {/* Botão de Fechar */}
            <button
              onClick={() => { setShowLockModal(false); setSelectedLock(null); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/5 transition-all z-10"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg">Bloquear Celular</h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Confirmação de Ação Restritiva</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {selectedLock.lock_type === 'icloud' ? (
                <>
                  Você está prestes a registrar o bloqueio do aparelho de <strong>{selectedLock.sale?.customer?.name}</strong>. Lembre-se de primeiro ativar o <strong>"Modo Perdido"</strong> no site icloud.com para esta conta iCloud antes de confirmar aqui.
                </>
              ) : (
                <>
                  Você está prestes a registrar o bloqueio do aparelho de <strong>{selectedLock.sale?.customer?.name}</strong>. Lembre-se de primeiro realizar o bloqueio do dispositivo no painel/console do <strong>Google Device Lock Controller</strong> antes de confirmar aqui.
                </>
              )}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowLockModal(false); setSelectedLock(null); }}
                className="flex-1 py-3.5 bg-white/4 hover:bg-white/8 text-white rounded-2xl font-semibold text-xs cursor-pointer transition-all border border-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleTriggerLock}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold text-xs cursor-pointer transition-all shadow-lg shadow-red-500/15"
              >
                Confirmar Bloqueio
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Google EMM Config / QR Code Modal */}
      {showEmmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-surface-container-high border border-white/10 p-8 rounded-[40px] space-y-6 shadow-2xl relative text-left"
          >
            <button
              onClick={() => setShowEmmModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/5 transition-all z-10"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Android Enterprise (EMM)</h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black opacity-60">Provisionamento de novos celulares e controle EMM</p>
              </div>
            </div>

            <div className="space-y-6">
              {isEnterpriseLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Carregando status...</span>
                </div>
              ) : enterpriseId ? (
                <div className="space-y-6">
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Google EMM Vinculado</p>
                      <h4 className="font-mono text-xs text-white font-bold mt-0.5">{enterpriseId}</h4>
                    </div>
                    <button
                      onClick={handleUnlinkEnterprise}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      Desvincular
                    </button>
                  </div>

                  {enrollmentQr ? (
                    <div className="p-6 bg-white/2 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                      <div className="p-4 bg-white rounded-2xl shrink-0">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(enrollmentQr)}`} 
                          alt="Android Enterprise Provisioning QR Code" 
                          className="w-40 h-40"
                        />
                      </div>
                      <div className="space-y-3 text-left">
                        <h4 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                          <QrCode size={14} className="text-primary" />
                          QR Code de Provisionamento
                        </h4>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">
                          Para vincular novos celulares, faça o reset de fábrica no celular. Na primeira tela inicial de boas-vindas, toque <strong>6 vezes seguidas</strong> e leia este QR Code com a câmera que abrirá.
                        </p>
                        <div className="pt-3 border-t border-white/5 space-y-2">
                          <h5 className="text-[9px] font-black text-white uppercase tracking-widest opacity-80">Como funciona o bloqueio após a instalação?</h5>
                          <ul className="text-[10px] text-on-surface-variant/80 list-disc pl-4 space-y-1 leading-relaxed">
                            <li><strong>Vínculo EMM:</strong> O celular baixa os agentes de controle do Google e é associado de forma oculta e segura ao CRM.</li>
                            <li><strong>Comando de Bloqueio:</strong> Ao clicar em "Confirmar Bloqueio" no painel, a API do Google ativa o <strong>Modo Quiosque</strong> no dispositivo.</li>
                            <li><strong>Efeito no Celular:</strong> A tela é bloqueada imediatamente, exibindo apenas a mensagem personalizada configurada e o botão de suporte.</li>
                            <li><strong>Desbloqueio Automático:</strong> Ao realizar o desbloqueio no painel, a restrição é removida via internet em poucos segundos.</li>
                          </ul>
                        </div>
                        <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">
                          ⚠️ Este QR Code é confidencial e contém um token de vinculação direta com a MDR.
                        </p>
                        <button
                          onClick={fetchEnrollmentToken}
                          disabled={isGeneratingQr}
                          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border border-white/10 transition-all"
                        >
                          {isGeneratingQr ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Atualizar QR Code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Obtendo token de provisionamento...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Google EMM Pendente</p>
                    <p className="text-xs text-on-surface-variant mt-1">Sua conta do Google Enterprise ID ainda não está vinculada a este CRM.</p>
                  </div>

                  <div className="bg-white/1 border border-white/5 p-5 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Como Vincular:</h4>
                    <ol className="text-[11px] text-on-surface-variant/90 space-y-2 list-decimal pl-4 leading-relaxed">
                      <li>Use uma conta do Google corporativa limpa (que nunca tenha sido cadastrada no Android Enterprise).</li>
                      <li>Clique no botão abaixo para ir até o painel de cadastro oficial do Google.</li>
                      <li>Siga as telas do Google e confirme. Ao final, a conta será integrada automaticamente.</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleGenerateSignupUrl}
                    disabled={isGeneratingLink}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50"
                  >
                    {isGeneratingLink ? <Loader2 className="animate-spin" size={14} /> : <QrCode size={14} />}
                    Vincular Conta Google Enterprise EMM
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
