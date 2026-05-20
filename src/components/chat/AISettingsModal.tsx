import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Save, Check } from 'lucide-react';

interface AISettingsModalProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

export default function AISettingsModal({ channelId, channelName, onClose }: AISettingsModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [maxTokens, setMaxTokens] = useState(500);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Buscar configurações de IA
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/ai/settings/${channelId}`);
        if (res.ok) {
          const data = await res.json();
          setEnabled(data.enabled || false);
          setProvider(data.provider || 'groq');
          setApiKey(data.api_key || '');
          setSystemPrompt(data.system_prompt || 'Você é um atendente virtual da MDR Informática e Celulares. Responda de forma educada, objetiva e profissional. Ajude com dúvidas sobre produtos, preços, prazos e serviços.');
          setMaxTokens(data.max_tokens || 500);
        }
      } catch (err) {
        console.error('Erro ao buscar configurações de IA:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [channelId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/ai/settings/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          provider,
          api_key: apiKey,
          system_prompt: systemPrompt,
          max_tokens: maxTokens
        })
      });

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Erro ao salvar configurações de IA:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-container-high border border-white/10 rounded-[36px] shadow-2xl relative overflow-hidden">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30"></div>

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary animate-pulse">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-display font-black text-white text-lg uppercase tracking-tight">Configurações de IA</h3>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">Canal: {channelName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/5 rounded-full text-on-surface-variant hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Carregando Configurações...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Enabled Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-white">Ativar Auto-Responder</span>
                <p className="text-[9px] text-on-surface-variant font-bold uppercase mt-0.5 opacity-55">Responder novos contatos com inteligência artificial</p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${
                  enabled ? 'bg-primary' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform duration-200 ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Provider Selection */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-primary pl-1">Provedor de IA</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-primary outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="groq" className="bg-surface">Groq (Llama-3.3-70b-versatile - RECOMENDADO)</option>
                <option value="gemini" className="bg-surface">Google Gemini</option>
                <option value="openai" className="bg-surface">OpenAI GPT</option>
              </select>
            </div>

            {/* Custom API Key */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-primary pl-1">API Key Opcional (Usa a padrão por padrão)</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Insira sua chave personalizada caso tenha"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-primary outline-none transition-all font-mono"
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-primary pl-1">Instruções da IA (Prompt do Sistema)</label>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={4}
                placeholder="Ex: Você é o atendente virtual da MDR Informática..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-primary outline-none transition-all resize-none"
                required
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-primary pl-1">Tamanho Máximo da Resposta (Tokens)</label>
              <input
                type="number"
                value={maxTokens}
                onChange={e => setMaxTokens(parseInt(e.target.value) || 200)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Salvando...
                  </>
                ) : showSuccess ? (
                  <>
                    <Check size={14} />
                    Salvo!
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Salvar Configurações
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
