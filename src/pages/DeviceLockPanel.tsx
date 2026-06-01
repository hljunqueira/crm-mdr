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
  Building
} from 'lucide-react';
import { useDeviceLockStore, DeviceLock } from '../store/useDeviceLockStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUI } from '../hooks/useUI';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeviceLockPanel() {
  const { deviceLocks, isLoading, fetchDeviceLocks, lockDevice, unlockDevice, updateDeviceLock } = useDeviceLockStore();
  const { profile } = useAuthStore();
  const { showNotification } = useUI();
  
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'active' | 'quitado'>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'icloud' | 'headwind'>('all');
  const [selectedLock, setSelectedLock] = useState<DeviceLock | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeviceLocks();
  }, [fetchDeviceLocks]);

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
    const status = getInstallmentStatus(lock);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || lock.lock_type === platformFilter;
    
    const customerName = lock.sale?.customer?.name || '';
    const customerCpf = lock.sale?.customer?.cpf || '';
    const deviceModel = lock.device?.model || '';
    const imei = lock.device?.imei || '';
    const matchesSearch = 
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerCpf.includes(searchTerm) ||
      deviceModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imei.includes(searchTerm);
      
    return matchesStatus && matchesPlatform && matchesSearch;
  });

  // KPI Calculations
  const totalCrediario = deviceLocks.length;
  const totalLocked = deviceLocks.filter(l => l.lock_type === 'headwind' ? l.mdm_locked : l.icloud_locked).length;
  const pendingActions = deviceLocks.filter(l => {
    const status = getInstallmentStatus(l);
    if (status === 'overdue') {
      const isCurrentlyLocked = l.lock_type === 'headwind' ? l.mdm_locked : l.icloud_locked;
      return !isCurrentlyLocked; // Inadimplente mas ainda não bloqueado
    }
    if (status === 'quitado') {
      const isCurrentlyLocked = l.lock_type === 'headwind' ? l.mdm_locked : l.icloud_locked;
      return isCurrentlyLocked || l.lock_type === 'icloud'; // Quitado mas iCloud ainda vinculado
    }
    return false;
  }).length;

  const handleOpenLockModal = (lock: DeviceLock) => {
    setSelectedLock(lock);
    setCustomMessage(`MDR Celulares: Aparelho bloqueado por atraso no crediário. Por favor, entre em contato com nosso financeiro para regularizar e desbloquear na hora.`);
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
    if (window.confirm(`Tem certeza que deseja enviar o comando de desbloqueio para o aparelho de ${lock.sale?.customer?.name}?`)) {
      setActionLoadingId(lock.id);
      try {
        const response = await unlockDevice(lock.id, lock.sale?.customer?.id);
        showNotification('success', 'Aparelho Desbloqueado', response.message);
        fetchDeviceLocks();
      } catch (err: any) {
        showNotification('error', 'Falha no Desbloqueio', err.message || 'Não foi possível liberar o aparelho.');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const handleConfirmIcloudRemoval = async (lock: DeviceLock) => {
    if (window.confirm(`Você confirma que o iCloud corporativo foi removido fisicamente do iPhone de ${lock.sale?.customer?.name}?`)) {
      setActionLoadingId(lock.id);
      try {
        await updateDeviceLock(lock.id, {
          icloud_email: undefined, // Limpa o vínculo do iCloud para arquivar
          icloud_locked: false,
          icloud_lock_confirmed_at: undefined,
          icloud_lock_confirmed_by: undefined
        });
        showNotification('success', 'Vínculo Arquivado', 'O vínculo de iCloud deste aparelho foi removido e arquivado com sucesso.');
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
            Controle de Bloqueio de Celulares
          </h1>
          <p className="text-xs text-on-surface-variant max-w-xl">
            Gestão híbrida de adimplência do crediário MDR: iCloud manual para iPhones e automação via API Headwind MDM para celulares Android.
          </p>
        </div>
        
        <button
          onClick={() => { fetchDeviceLocks(); showNotification('info', 'Atualizando', 'Sincronizando status dos aparelhos...'); }}
          disabled={isLoading}
          className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.06] text-white transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
          Atualizar Dados
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-white/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
            <Smartphone size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Aparelhos em Crediário</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1">{totalCrediario}</h3>
          </div>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-white/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
            <Lock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Aparelhos Bloqueados</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1">{totalLocked}</h3>
          </div>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-white/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-500" />
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
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.01] border border-white/5 p-4 rounded-[28px]">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Buscar por cliente, IMEI ou modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Buttons filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-2xl">
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
                {filter === 'all' && 'Todos'}
                {filter === 'overdue' && '🔴 Atrasados'}
                {filter === 'active' && '🟢 Em dia'}
                {filter === 'quitado' && '🏆 Quitados'}
              </button>
            ))}
          </div>

          {/* Platform filter */}
          <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-2xl">
            {(['all', 'icloud', 'headwind'] as const).map((filter) => (
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
                {filter === 'all' && 'Todos'}
                {filter === 'icloud' && '🍏 iOS'}
                {filter === 'headwind' && '🤖 Android'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Cliente</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Aparelho / IMEI</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Tipo</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Status Financ.</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Vínculo Segurança</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Trava</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant text-center">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {filteredLocks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-xs text-on-surface-variant font-medium">
                      Nenhum aparelho em crediário encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredLocks.map((lock) => {
                    const status = getInstallmentStatus(lock);
                    const isLocked = lock.lock_type === 'headwind' ? lock.mdm_locked : lock.icloud_locked;
                    
                    return (
                      <tr key={lock.id} className="hover:bg-white/[0.01] transition-all group">
                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-on-surface-variant">
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
                            <p className="font-semibold text-white text-sm">{lock.device?.model || 'Modelo Desconhecido'}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">IMEI: {lock.device?.imei || 'Não Informado'}</p>
                          </div>
                        </td>

                        {/* Lock Type Badge */}
                        <td className="px-6 py-4">
                          {lock.lock_type === 'icloud' ? (
                            <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
                              🍏 iOS (iCloud)
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
                              🤖 Android (MDM)
                            </span>
                          )}
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
                          <div className="text-xs text-white max-w-[180px] truncate font-medium">
                            {lock.lock_type === 'icloud' ? (
                              <span className="flex items-center gap-1" title={lock.icloud_email}>
                                <Building size={12} className="text-on-surface-variant" />
                                {lock.icloud_email || <span className="text-red-500/60 italic">Não vinculado!</span>}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <QrCode size={12} className="text-cyan-400" />
                                ID: {lock.mdm_device_id || 'Não cadastrado'}
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
                            {/* Headwind Android Actions */}
                            {lock.lock_type === 'headwind' && (
                              <>
                                {!lock.mdm_locked ? (
                                  <button
                                    onClick={() => handleOpenLockModal(lock)}
                                    disabled={actionLoadingId === lock.id}
                                    className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-semibold text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-red-500/15"
                                  >
                                    <Lock size={12} />
                                    Travar Aparelho
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleTriggerUnlock(lock)}
                                    disabled={actionLoadingId === lock.id}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-semibold text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/15"
                                  >
                                    <Unlock size={12} />
                                    Desbloquear
                                  </button>
                                )}
                              </>
                            )}

                            {/* iOS iCloud Actions */}
                            {lock.lock_type === 'icloud' && (
                              <>
                                {/* Se o crediário estiver quitado, incentivar remoção do iCloud corporativo */}
                                {status === 'quitado' && lock.icloud_email ? (
                                  <button
                                    onClick={() => handleConfirmIcloudRemoval(lock)}
                                    disabled={actionLoadingId === lock.id}
                                    className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-semibold text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Unlock size={12} />
                                    Registrar Remoção iCloud
                                  </button>
                                ) : (
                                  <>
                                    {/* Link externo para o Buscar iPhone */}
                                    <a
                                      href="https://www.icloud.com/find"
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3.5 py-2 bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] text-white rounded-xl transition-all font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                      Abrir Buscar <ExternalLink size={12} />
                                    </a>

                                    {!lock.icloud_locked ? (
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
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </AnimatePresence>
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
            className="w-full max-w-md bg-surface-container-high border border-white/5 p-6 rounded-[36px] space-y-4 shadow-2xl"
          >
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
              Você está prestes a bloquear o aparelho de <strong>{selectedLock.sale?.customer?.name}</strong>. 
              {selectedLock.lock_type === 'headwind' ? (
                ' O bloqueio via API enviará um comando de Kiosk travando a tela do Android.'
              ) : (
                ' Lembre-se de primeiro ativar o "Modo Perdido" no site icloud.com para esta conta iCloud antes de confirmar aqui.'
              )}
            </p>

            {selectedLock.lock_type === 'headwind' && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">Mensagem Exibida na Tela</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-red-500 transition-all resize-none"
                  placeholder="Mensagem exibida na tela bloqueada..."
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowLockModal(false); setSelectedLock(null); }}
                className="flex-1 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-2xl font-semibold text-xs cursor-pointer transition-all border border-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleTriggerLock}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold text-xs cursor-pointer transition-all shadow-lg shadow-red-500/15"
              >
                Executar Bloqueio
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
