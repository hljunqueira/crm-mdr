import React, { useState } from 'react';
import { Loader2, MessageSquare, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export default function Automation() {
  const [iframeLoading, setIframeLoading] = useState(true);

  return (
    <div className="w-full h-full bg-[#0c0c0e] flex flex-col relative overflow-hidden">
      {/* Top Banner / Integration Indicator */}
      <div className="h-16 bg-[#121215] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
            <MessageSquare size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-display font-black text-white uppercase tracking-tight leading-none">
              Central Multicanal
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                Chatwoot Enterprise Integrado
              </span>
            </div>
          </div>
        </div>
        <a 
          href="https://chat.mdrinformaticaecelulares.com.br" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-all bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-2 rounded-xl"
        >
          <ExternalLink size={12} />
          Abrir em Nova Aba
        </a>
      </div>

      {/* Main Iframe container */}
      <div className="flex-1 relative w-full h-[calc(100vh-140px)] bg-[#121215]">
        {iframeLoading && (
          <div className="absolute inset-0 bg-[#0c0c0e] z-10 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant animate-pulse">
              Conectando com o servidor Chatwoot...
            </span>
          </div>
        )}
        
        <iframe
          src="https://chat.mdrinformaticaecelulares.com.br"
          title="Chatwoot Multicanal"
          className="w-full h-full border-none"
          onLoad={() => setIframeLoading(false)}
          allow="microphone; camera; clipboard-read; clipboard-write; geolocation"
        />
      </div>
    </div>
  );
}
