import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useUI } from '../../context/UIContext';
import { cn } from '../../lib/utils';
import { 
  Search, Bell, User, Key, LogOut, Loader2, X, 
  ChevronDown, Camera, Users, Wrench, UserSearch 
} from 'lucide-react';

export default function TopBar() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const { showNotification } = useUI();

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    leads: any[];
    serviceOrders: any[];
  }>({ customers: [], leads: [], serviceOrders: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Dropdown State
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Edit Profile / Password Modal States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Edit Profile Form States
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update form fields when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  // Debounced Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ customers: [], leads: [], serviceOrders: [] });
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const delay = setTimeout(async () => {
      try {
        const query = searchQuery.trim();

        // 1. Search customers
        const { data: custs } = await supabase
          .from('customers')
          .select('id, name, phone, cpf')
          .or(`name.ilike.%${query}%,phone.ilike.%${query}%,cpf.ilike.%${query}%`)
          .limit(3);

        // 2. Search leads
        const { data: lds } = await supabase
          .from('leads')
          .select('id, name, phone')
          .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(3);

        // 3. Search service orders
        const osQuery = Number(query) || 0;
        const { data: orders } = await supabase
          .from('service_orders')
          .select('id, os_number, device_brand, device_model, customers(name)')
          .or(`device_model.ilike.%${query}%,device_brand.ilike.%${query}%${osQuery ? `,os_number.eq.${osQuery}` : ''}`)
          .limit(3);

        setSearchResults({
          customers: custs || [],
          leads: lds || [],
          serviceOrders: orders || []
        });
      } catch (err) {
        console.error('Error performing global search:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Image Upload to Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotification('error', 'Erro', 'A imagem deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          avatar_url: avatarUrl
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao atualizar perfil');
      }

      showNotification('success', 'Sucesso', 'Perfil atualizado com sucesso!');
      setIsEditProfileOpen(false);

      // Force refresh profile state in AuthStore
      useAuthStore.getState().initialize();
    } catch (err: any) {
      showNotification('error', 'Erro', err.message || 'Erro ao salvar perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotification('error', 'Erro', 'As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      showNotification('error', 'Erro', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      showNotification('success', 'Sucesso', 'Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangePasswordOpen(false);
    } catch (err: any) {
      showNotification('error', 'Erro', err.message || 'Erro ao alterar senha.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSearchResultClick = (type: 'customer' | 'lead' | 'os', queryValue: string) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    if (type === 'customer') {
      navigate(`/customers?search=${encodeURIComponent(queryValue)}`);
    } else if (type === 'lead') {
      navigate(`/leads?search=${encodeURIComponent(queryValue)}`);
    } else {
      navigate(`/service-orders?search=${encodeURIComponent(queryValue)}`);
    }
  };

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U';

  const userDisplayName = profile?.full_name || user?.email?.split('@')[0] || 'Colaborador';

  const hasResults = searchResults.customers.length > 0 || 
                     searchResults.leads.length > 0 || 
                     searchResults.serviceOrders.length > 0;

  return (
    <>
      <header className="h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-8 z-20 shrink-0 relative">
        {/* Global Search Input Area */}
        <div ref={searchContainerRef} className="flex-1 max-w-xl relative">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              autoComplete="one-time-code"
              placeholder="Pesquisar leads, serviços ou clientes..."
              value={searchQuery}
              onFocus={() => setShowSearchDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-10 py-2 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Dropdown Overlay */}
          {showSearchDropdown && (searchQuery.trim() || searchLoading) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#121224] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-96 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
              {searchLoading ? (
                <div className="p-8 flex items-center justify-center gap-3 text-on-surface-variant">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider">Pesquisando registros...</span>
                </div>
              ) : !hasResults ? (
                <div className="p-8 text-center text-on-surface-variant">
                  <span className="text-xs font-black uppercase tracking-wider">Nenhum resultado encontrado</span>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {/* Service Orders Section */}
                  {searchResults.serviceOrders.length > 0 && (
                    <div className="p-3 text-left">
                      <span className="text-[9px] font-black text-primary uppercase tracking-wider px-3 block mb-1">Ordens de Serviço (OS)</span>
                      {searchResults.serviceOrders.map(os => (
                        <button
                          key={os.id}
                          onClick={() => handleSearchResultClick('os', String(os.os_number))}
                          className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition-all flex items-center justify-between text-xs text-white uppercase font-bold"
                        >
                          <div className="flex items-center gap-2">
                            <Wrench size={14} className="text-on-surface-variant" />
                            <span>OS #{String(os.os_number).padStart(4, '0')} — {os.device_brand} {os.device_model}</span>
                          </div>
                          <span className="text-[9px] text-on-surface-variant tracking-tight font-medium">Cli: {os.customers?.name || '—'}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Customers Section */}
                  {searchResults.customers.length > 0 && (
                    <div className="p-3 text-left">
                      <span className="text-[9px] font-black text-success uppercase tracking-wider px-3 block mb-1">Clientes</span>
                      {searchResults.customers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSearchResultClick('customer', c.name)}
                          className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition-all flex items-center justify-between text-xs text-white uppercase font-bold"
                        >
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-on-surface-variant" />
                            <span>{c.name}</span>
                          </div>
                          <span className="text-[9px] text-on-surface-variant tracking-tight font-mono">{c.phone || c.cpf || ''}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Leads Section */}
                  {searchResults.leads.length > 0 && (
                    <div className="p-3 text-left">
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider px-3 block mb-1">Leads</span>
                      {searchResults.leads.map(l => (
                        <button
                          key={l.id}
                          onClick={() => handleSearchResultClick('lead', l.name)}
                          className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition-all flex items-center justify-between text-xs text-white uppercase font-bold"
                        >
                          <div className="flex items-center gap-2">
                            <UserSearch size={14} className="text-on-surface-variant" />
                            <span>{l.name}</span>
                          </div>
                          <span className="text-[9px] text-on-surface-variant tracking-tight font-mono">{l.phone || ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User profile section */}
        <div className="flex items-center gap-6 ml-8">
          <div className="h-8 w-px bg-outline-variant opacity-40"></div>

          <div ref={dropdownRef} className="relative">
            {/* Clickable Profile trigger */}
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left cursor-pointer group"
            >
              {/* Profile image or initials */}
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={userDisplayName} 
                  className="w-9 h-9 rounded-xl object-cover border border-white/10 group-hover:border-primary/40 transition-colors"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs font-display group-hover:bg-primary/20 transition-all">
                  {userInitials}
                </div>
              )}

              <div className="hidden sm:flex flex-col select-none pr-1">
                <span className="text-xs font-black text-white leading-none group-hover:text-primary transition-colors">{userDisplayName}</span>
                <span className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mt-0.5 leading-none opacity-60">
                  {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'technician' ? 'Técnico' : 'Atendente'}
                </span>
              </div>
              
              <ChevronDown size={14} className={cn("text-on-surface-variant opacity-50 group-hover:text-white transition-all", showProfileDropdown && "transform rotate-180")} />
            </button>

            {/* Profile Dropdown panel */}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-[#121214] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                <div className="px-4 py-2 border-b border-white/5 mb-1.5 select-none">
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Acesso Autenticado</p>
                  <p className="text-[10px] text-on-surface-variant truncate font-semibold mt-1">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    setIsEditProfileOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-xs text-on-surface hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors text-left"
                >
                  <User size={14} className="text-on-surface-variant" />
                  <span>Editar Perfil</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-xs text-on-surface hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors text-left"
                >
                  <Key size={14} className="text-on-surface-variant" />
                  <span>Alterar Senha</span>
                </button>

                <div className="h-px bg-white/5 my-1.5"></div>

                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    signOut();
                  }}
                  className="w-full px-4 py-2.5 text-xs text-error hover:bg-error/10 flex items-center gap-3 transition-colors text-left font-bold"
                >
                  <LogOut size={14} />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MODAL: EDITAR PERFIL */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-[32px] w-full max-w-md p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-md font-black text-white uppercase tracking-wider font-display">Editar Perfil</h3>
              <button 
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 hover:bg-white/5 rounded-lg text-on-surface-variant hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Image Selection */}
              <div className="flex flex-col items-center space-y-2">
                <div className="relative group">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Preview" 
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/30"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-black text-2xl font-display">
                      {userInitials}
                    </div>
                  )}
                  <label 
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-bold cursor-pointer transition-all border border-primary/50"
                  >
                    <Camera size={16} className="mb-1" />
                    <span>Alterar</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="hidden" 
                    />
                  </label>
                </div>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-[9px] text-error hover:underline uppercase font-bold"
                  >
                    Remover Foto
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile || !fullName}
                  className="flex-[2] py-3 bg-primary text-on-primary rounded-xl font-black uppercase tracking-widest text-[9px] hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? <Loader2 size={12} className="animate-spin" /> : 'Salvar Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR SENHA */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-[32px] w-full max-w-md p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-md font-black text-white uppercase tracking-wider font-display">Alterar Senha</h3>
              <button 
                onClick={() => setIsChangePasswordOpen(false)}
                className="p-1 hover:bg-white/5 rounded-lg text-on-surface-variant hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              {/* Prevent Chrome Autofill */}
              <input type="text" name="chrome_prevent_email" style={{ display: 'none' }} />
              <input type="password" name="chrome_prevent_pass" style={{ display: 'none' }} />

              <div className="space-y-1">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nova Senha</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword || !newPassword || !confirmPassword}
                  className="flex-[2] py-3 bg-primary text-on-primary rounded-xl font-black uppercase tracking-widest text-[9px] hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {isSavingPassword ? <Loader2 size={12} className="animate-spin" /> : 'Alterar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
