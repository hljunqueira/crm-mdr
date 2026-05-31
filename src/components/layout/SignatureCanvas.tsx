import React, { useRef, useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SignatureCanvasProps {
  onSave: (signatureBase64: string) => void;
  onCancel?: () => void;
  title?: string;
}

export default function SignatureCanvas({ onSave, onCancel, title = "Assinatura Digital do Cliente" }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Ajustar tamanho do canvas ao container de forma reativa
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolução ajustada para alta definição (telas retina)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Estilos padrão do traço
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#4BE277'; // Cor primária (Verde)
    ctx.lineWidth = 3;
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Se for evento touch
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    // Se for evento mouse
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    // Converte o desenho para PNG Base64
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-4 w-full bg-[#121215] border border-white/10 rounded-[32px] p-6 max-w-lg mx-auto shadow-2xl">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-black uppercase tracking-widest text-white">{title}</h4>
        {!isEmpty && (
          <span className="text-[8px] font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
            Rubrica Pronta
          </span>
        )}
      </div>

      <div className="relative w-full h-48 bg-black/40 border border-white/5 rounded-2xl overflow-hidden cursor-crosshair group">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block absolute inset-0 z-10"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Assine ou rabisque aqui</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={clearCanvas}
          disabled={isEmpty}
          className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        >
          <RotateCcw size={12} /> Limpar
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all flex items-center justify-center gap-2"
          >
            Cancelar
          </button>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isEmpty}
          className="flex-[2] py-3 px-4 bg-primary text-on-primary rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
        >
          <CheckCircle2 size={12} /> Confirmar Assinatura
        </button>
      </div>
    </div>
  );
}
