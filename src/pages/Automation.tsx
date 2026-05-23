import React, { useEffect, useState } from 'react';
import {
  MessageCircle,
  Instagram,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Globe,
  Save,
  X,
  Building2,
  Lock,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useUnitStore } from '../store/useUnitStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUI } from '../context/UIContext';

// ─── helpers ───────────────────────────────────────────────────────────────

/** Build a WhatsApp Web direct-open URL from a raw number */
function buildWppUrl(number: string): string {
  // Strip everything that isn't a digit
  const digits = number.replace(/\D/g, '');
  if (!digits) return 'https://web.whatsapp.com/';
  return `https://wa.me/${digits}`;
}

/** Build an Instagram Direct URL from a username */
function buildIgUrl(username: string): string {
  const clean = username.replace(/^@/, '').trim();
  if (!clean) return 'https://www.instagram.com/direct/inbox/';
  return `https://www.instagram.com/${clean}/`;
}

// ─── sub-components ────────────────────────────────────────────────────────

interface ConnectionCardProps {
  key?: string;
  unit: {
    id: string;
    name: string;
    whatsapp_number?: string;
    instagram_username?: string;
  };
  isCurrentUnit: boolean;
  isAdmin: boolean;
  onEdit: (unitId: string) => void;
}

function ConnectionCard({ unit, isCurrentUnit, isAdmin, onEdit }: ConnectionCardProps) {
  const hasWpp = !!unit.whatsapp_number?.trim();
  const hasIg = !!unit.instagram_username?.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface-container-low p-6 rounded-[32px] border relative overflow-hidden ${
        isCurrentUnit ? 'border-primary/30' : 'border-outline-variant/30'
      }`}
    >
      {isCurrentUnit && (
        <div className="absolute top-4 right-16 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
          <span className="text-[8px] font-black text-primary uppercase tracking-widest">Sua Unidade</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/5 rounded-2xl">
            <Building2 size={20} className="text-on-surface-variant" />
          </div>
          <div>
            <h3 className="text-sm font-display font-black text-on-surface uppercase tracking-tight leading-none">
              {unit.name}
            </h3>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => onEdit(unit.id)}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-on-surface-variant hover:text-white"
          >
            <Edit3 size={16} />
          </button>
        )}
      </div>

      {/* Connections */}
      <div className="space-y-3">
        {/* WhatsApp */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
          hasWpp
            ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10 group cursor-pointer'
            : 'bg-white/[0.02] border-white/5 opacity-50'
        }`}
          onClick={hasWpp ? () => window.open(buildWppUrl(unit.whatsapp_number!), '_blank') : undefined}
        >
          <div className={`p-2 rounded-xl ${hasWpp ? 'bg-green-500/10' : 'bg-white/5'}`}>
            <MessageCircle size={18} className={hasWpp ? 'text-green-400' : 'text-on-surface-variant'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">WhatsApp</p>
            <p className={`text-xs font-bold truncate mt-0.5 ${hasWpp ? 'text-white' : 'text-on-surface-variant'}`}>
              {hasWpp ? unit.whatsapp_number : 'Não configurado'}
            </p>
          </div>
          {hasWpp ? (
            <ExternalLink size={14} className="text-green-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          ) : (
            <AlertCircle size={14} className="text-on-surface-variant shrink-0 opacity-40" />
          )}
        </div>

        {/* Instagram */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
          hasIg
            ? 'bg-pink-500/5 border-pink-500/20 hover:bg-pink-500/10 group cursor-pointer'
            : 'bg-white/[0.02] border-white/5 opacity-50'
        }`}
          onClick={hasIg ? () => window.open(buildIgUrl(unit.instagram_username!), '_blank') : undefined}
        >
          <div className={`p-2 rounded-xl ${hasIg ? 'bg-pink-500/10' : 'bg-white/5'}`}>
            <Instagram size={18} className={hasIg ? 'text-pink-400' : 'text-on-surface-variant'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Instagram</p>
            <p className={`text-xs font-bold truncate mt-0.5 ${hasIg ? 'text-white' : 'text-on-surface-variant'}`}>
              {hasIg ? `@${unit.instagram_username!.replace(/^@/, '')}` : 'Não configurado'}
            </p>
          </div>
          {hasIg ? (
            <ExternalLink size={14} className="text-pink-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          ) : (
            <AlertCircle size={14} className="text-on-surface-variant shrink-0 opacity-40" />
          )}
        </div>
      </div>

      {/* Quick status row */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
        <div className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${
          hasWpp ? 'text-green-400' : 'text-on-surface-variant opacity-40'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${hasWpp ? 'bg-green-400 animate-pulse' : 'bg-on-surface-variant'}`} />
          WhatsApp {hasWpp ? 'Configurado' : 'Pendente'}
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${
          hasIg ? 'text-pink-400' : 'text-on-surface-variant opacity-40'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${hasIg ? 'bg-pink-400 animate-pulse' : 'bg-on-surface-variant'}`} />
          Instagram {hasIg ? 'Configurado' : 'Pendente'}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Quick Access Panel (for non-admin: see own unit & open directly) ──────

interface QuickAccessProps {
  unit: { name: string; whatsapp_number?: string; instagram_username?: string };
}

function QuickAccessPanel({ unit }: QuickAccessProps) {
  const hasWpp = !!unit.whatsapp_number?.trim();
  const hasIg = !!unit.instagram_username?.trim();

  return (
    <div className="mb-10 p-6 bg-primary/5 border border-primary/20 rounded-[32px]">
      <div className="flex items-center gap-3 mb-6">
        <Zap size={18} className="text-primary" />
        <h2 className="text-[10px] font-black text-primary uppercase tracking-widest">
          Acesso Rápido — {unit.name}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => window.open(
            hasWpp ? buildWppUrl(unit.whatsapp_number!) : 'https://web.whatsapp.com/',
            '_blank'
          )}
          className="flex items-center gap-4 p-5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-2xl transition-all group text-left"
        >
          <div className="p-3 bg-green-500/10 rounded-xl">
            <MessageCircle size={24} className="text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black text-green-400/60 uppercase tracking-widest">Abrir</p>
            <p className="text-sm font-black text-white">WhatsApp Web</p>
            {hasWpp && (
              <p className="text-[10px] text-green-400 font-mono mt-0.5">{unit.whatsapp_number}</p>
            )}
          </div>
          <ExternalLink size={16} className="text-green-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>

        <button
          onClick={() => window.open(
            hasIg ? buildIgUrl(unit.instagram_username!) : 'https://www.instagram.com/direct/inbox/',
            '_blank'
          )}
          className="flex items-center gap-4 p-5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-2xl transition-all group text-left"
        >
          <div className="p-3 bg-pink-500/10 rounded-xl">
            <Instagram size={24} className="text-pink-400" />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black text-pink-400/60 uppercase tracking-widest">Abrir</p>
            <p className="text-sm font-black text-white">Instagram Direct</p>
            {hasIg && (
              <p className="text-[10px] text-pink-400 font-mono mt-0.5">@{unit.instagram_username!.replace(/^@/, '')}</p>
            )}
          </div>
          <ExternalLink size={16} className="text-pink-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// ─── Edit Modal ─────────────────────────────────────────────────────────────

interface EditModalProps {
  unit: { id: string; name: string; whatsapp_number?: string; instagram_username?: string };
  onSave: (id: string, wpp: string, ig: string) => Promise<void>;
  onClose: () => void;
}

function EditModal({ unit, onSave, onClose }: EditModalProps) {
  const [wpp, setWpp] = useState(unit.whatsapp_number || '');
  const [ig, setIg] = useState(unit.instagram_username || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(unit.id, wpp, ig);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-surface-container-high p-10 rounded-[48px] border border-white/10 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-on-surface-variant hover:text-white transition-all">
          <X size={22} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Building2 size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-[9px] font-black text-primary uppercase tracking-widest">Configurar Conexões</p>
            <h2 className="text-lg font-display font-black text-white uppercase tracking-tight leading-none">
              {unit.name}
            </h2>
          </div>
        </div>

        <div className="space-y-5">
          {/* WhatsApp */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[9px] font-black text-green-400 uppercase tracking-widest pl-1">
              <MessageCircle size={12} />
              Número WhatsApp
            </label>
            <input
              type="tel"
              value={wpp}
              onChange={e => setWpp(e.target.value)}
              placeholder="5548999999999 (DDI+DDD+Número)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-green-400 outline-none transition-all font-mono"
            />
            <p className="text-[9px] text-on-surface-variant pl-1">
              Ex: <span className="font-mono text-white/50">5548999990000</span> — inclua DDI (55) + DDD + número
            </p>
          </div>

          {/* Instagram */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[9px] font-black text-pink-400 uppercase tracking-widest pl-1">
              <Instagram size={12} />
              Username Instagram
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant font-black">@</span>
              <input
                type="text"
                value={ig.replace(/^@/, '')}
                onChange={e => setIg(e.target.value.replace(/^@/, ''))}
                placeholder="mdr_informatica"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-5 py-3.5 text-sm text-white focus:border-pink-400 outline-none transition-all font-mono"
              />
            </div>
            <p className="text-[9px] text-on-surface-variant pl-1">
              Apenas o usuário, sem o @ — o sistema abre o perfil diretamente
            </p>
          </div>

          {/* Preview */}
          {(wpp.trim() || ig.trim()) && (
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Preview dos Links</p>
              {wpp.trim() && (
                <div className="flex items-center gap-2 text-[10px] text-green-400">
                  <MessageCircle size={10} />
                  <span className="font-mono truncate">{buildWppUrl(wpp)}</span>
                </div>
              )}
              {ig.trim() && (
                <div className="flex items-center gap-2 text-[10px] text-pink-400">
                  <Instagram size={10} />
                  <span className="font-mono truncate">{buildIgUrl(ig)}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-primary text-black rounded-2xl font-display font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Automation() {
  const { profile } = useAuthStore();
  const { units, unit, fetchAllUnits, fetchUnit, updateUnit } = useUnitStore();
  const { showNotification } = useUI();

  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const init = async () => {
      if (isAdmin) {
        await fetchAllUnits();
      } else if (profile?.unit_id) {
        await fetchUnit(profile.unit_id);
      }
      setLoading(false);
    };
    init();
  }, [isAdmin, profile?.unit_id]);

  const handleSave = async (unitId: string, wpp: string, ig: string) => {
    await updateUnit(unitId, {
      whatsapp_number: wpp.trim(),
      instagram_username: ig.replace(/^@/, '').trim()
    });
    showNotification('success', 'Conexões Salvas', 'Configurações atualizadas com sucesso.');
    if (isAdmin) await fetchAllUnits();
    else if (profile?.unit_id) await fetchUnit(profile.unit_id);
  };

  const editingUnit = isAdmin
    ? units.find(u => u.id === editingUnitId)
    : (unit?.id === editingUnitId ? unit : undefined);

  // Displayed units
  const displayUnits = isAdmin ? units : (unit ? [unit] : []);
  const currentUnitId = profile?.unit_id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Carregando...</p>
        </div>
      </div>
    );
  }

  // For non-admin, if only one unit, show quick access prominently
  const myUnit = !isAdmin && unit ? unit : null;

  return (
    <div className="p-8 space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-on-surface uppercase tracking-tighter leading-none mb-3">
            Conexões WPP / IG
          </h1>
          <p className="text-on-surface-variant font-display text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">
            Acesso direto ao WhatsApp Web e Instagram Direct de cada unidade
          </p>
        </div>
        <div className="flex items-center gap-4 px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
          <Globe size={16} className="text-on-surface-variant" />
          <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
            {displayUnits.length} {displayUnits.length === 1 ? 'Unidade' : 'Unidades'}
          </span>
        </div>
      </header>

      {/* How it works — info banner */}
      <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl flex items-start gap-4">
        <Smartphone size={18} className="text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Como funciona</p>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Clique no botão da unidade para abrir diretamente o <strong className="text-white">WhatsApp Web</strong> ou o{' '}
            <strong className="text-white">Instagram Direct</strong> no navegador.
            Cada unidade atende pelo seu próprio número e perfil — sem APIs intermediárias, sem reconexões, sem complexidade.
          </p>
        </div>
      </div>

      {/* Quick Access for non-admin */}
      {myUnit && <QuickAccessPanel unit={myUnit} />}

      {/* Admin: all units or non-admin just their unit */}
      {isAdmin && (
        <div>
          <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-5 flex items-center gap-2">
            <Lock size={10} />
            Administrador — Todas as Unidades
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayUnits.map(u => (
              <ConnectionCard
                key={u.id}
                unit={u}
                isCurrentUnit={u.id === currentUnitId}
                isAdmin={isAdmin}
                onEdit={setEditingUnitId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Non-admin: just their unit as a card too */}
      {!isAdmin && myUnit && (
        <div>
          <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-5">
            Detalhes da Conexão
          </p>
          <ConnectionCard
            unit={myUnit}
            isCurrentUnit={true}
            isAdmin={false}
            onEdit={setEditingUnitId}
          />
        </div>
      )}

      {/* Edit Modal */}
      {editingUnitId && editingUnit && (
        <EditModal
          unit={editingUnit}
          onSave={handleSave}
          onClose={() => setEditingUnitId(null)}
        />
      )}
    </div>
  );
}
