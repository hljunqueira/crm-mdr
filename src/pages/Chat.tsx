import React, { useState } from 'react';
import { Loader2, MessageSquare, ExternalLink } from 'lucide-react';

export default function Chat() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-full h-[calc(100dvh-64px)] md:h-screen bg-[#0c0c0e] flex flex-col relative overflow-hidden">
      {/* Top Banner / Integration Indicator */}
      <div className="h-12 bg-[#121215] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] font-display">
            Central Multicanal — Chatwoot Enterprise
          </h2>
        </div>
        <a 
          href="https://chat.mdrinformaticaecelulares.com.br" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-all bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg"
        >
          <ExternalLink size={10} />
          Abrir em Nova Aba
        </a>
      </div>

      {/* Main Iframe container */}
      <div className="flex-1 relative w-full h-full bg-[#121215]">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0c0c0e] z-10 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant animate-pulse">
              Carregando Central de Atendimento...
            </span>
          </div>
        )}
        
        <iframe
          src="https://chat.mdrinformaticaecelulares.com.br"
          title="Chatwoot Multicanal"
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          allow="microphone; camera; clipboard-read; clipboard-write; geolocation"
        />
      </div>
    </div>
  );
}

