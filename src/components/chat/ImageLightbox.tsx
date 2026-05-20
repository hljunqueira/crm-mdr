import React from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = React.useState(1);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  
  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mdr-midia-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      // Fallback
      window.open(src, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Header Controls */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/50">{alt || 'Visualizador de Mídia'}</span>
        
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1.5 backdrop-blur-xl">
          <button 
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all"
            title="Reduzir Zoom"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-[10px] font-mono font-bold text-white/40 px-2 select-none">{Math.round(scale * 100)}%</span>
          <button 
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all"
            title="Aumentar Zoom"
          >
            <ZoomIn size={16} />
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
          <button 
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all"
            title="Baixar Arquivo"
          >
            <Download size={16} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white text-black rounded-full transition-all"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Image Display */}
      <div 
        className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-hidden cursor-zoom-out select-none"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          style={{ transform: `scale(${scale})` }}
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl transition-transform duration-200"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
        />
      </div>
    </div>
  );
}
