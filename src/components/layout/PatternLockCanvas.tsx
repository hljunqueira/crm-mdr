import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';

interface PatternLockCanvasProps {
  onSave: (patternBase64: string) => void;
  onClear?: () => void;
  defaultValue?: string;
  title?: string;
}

const NODES = [
  { id: 1, x: 48, y: 48 },
  { id: 2, x: 128, y: 48 },
  { id: 3, x: 208, y: 48 },
  { id: 4, x: 48, y: 128 },
  { id: 5, x: 128, y: 128 },
  { id: 6, x: 208, y: 128 },
  { id: 7, x: 48, y: 208 },
  { id: 8, x: 128, y: 208 },
  { id: 9, x: 208, y: 208 }
];

const COLLISION_RADIUS = 24; // Sensibilidade de detecção ao passar o dedo/mouse

export default function PatternLockCanvas({ onSave, onClear, defaultValue, title = "Desenhar Padrão de Desbloqueio" }: PatternLockCanvasProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Limpa o padrão
  const clearPattern = () => {
    setSelected([]);
    setIsDrawing(false);
    setMousePos(null);
    if (onClear) onClear();
  };

  const getSvgCoordinates = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    // Converter a posição real da tela para o espaço de coordenadas coordenadas viewBox 0 0 256 256
    const x = ((e.clientX - rect.left) / rect.width) * 256;
    const y = ((e.clientY - rect.top) / rect.height) * 256;
    return { x, y };
  };

  const checkCollision = (x: number, y: number) => {
    for (const node of NODES) {
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist < COLLISION_RADIUS) {
        return node.id;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    const coords = getSvgCoordinates(e);
    const hitNodeId = checkCollision(coords.x, coords.y);
    
    setIsDrawing(true);
    setMousePos(coords);
    if (hitNodeId) {
      setSelected([hitNodeId]);
    } else {
      setSelected([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getSvgCoordinates(e);
    setMousePos(coords);

    const hitNodeId = checkCollision(coords.x, coords.y);
    if (hitNodeId && !selected.includes(hitNodeId)) {
      setSelected(prev => [...prev, hitNodeId]);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setMousePos(null);

    if (selected.length > 0) {
      exportSvgAsBase64();
    }
  };

  const exportSvgAsBase64 = () => {
    if (!svgRef.current) return;
    
    // Criar um SVG limpo para exportar, garantindo fundo branco e linhas pretas para impressão
    const activeNodes = selected;
    const linesHtml = activeNodes.map((nodeId, idx) => {
      if (idx === 0) return '';
      const start = NODES.find(n => n.id === activeNodes[idx - 1])!;
      const end = NODES.find(n => n.id === nodeId)!;
      return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#000000" stroke-width="4" stroke-linecap="round" />`;
    }).join('\n');

    const circlesHtml = NODES.map(node => {
      const isSelected = activeNodes.includes(node.id);
      return `<circle cx="${node.x}" cy="${node.y}" r="${isSelected ? 8 : 5}" fill="${isSelected ? '#000000' : '#888888'}" />`;
    }).join('\n');

    // Montar o arquivo SVG puro em alta resolução e fundo branco
    const cleanSvgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
        <rect width="256" height="256" fill="#ffffff" />
        ${linesHtml}
        ${circlesHtml}
      </svg>
    `.trim();

    try {
      // Converte para base64
      const base64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(cleanSvgString)))}`;
      onSave(base64);
    } catch (err) {
      console.error('Falha ao serializar SVG:', err);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-[#121215] border border-white/10 rounded-[32px] p-5 max-w-xs mx-auto shadow-2xl">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white">{title}</h4>
        {selected.length > 0 && (
          <span className="text-[8px] font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck size={10} /> Salvo
          </span>
        )}
      </div>

      <div className="relative w-64 h-64 bg-black/40 border border-white/5 rounded-2xl overflow-hidden cursor-crosshair mx-auto touch-none">
        <svg
          ref={svgRef}
          viewBox="0 0 256 256"
          className="w-full h-full select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Fundo do Grid */}
          <rect width="256" height="256" fill="transparent" />

          {/* Linhas desenhadas */}
          {selected.map((nodeId, idx) => {
            if (idx === 0) return null;
            const startNode = NODES.find(n => n.id === selected[idx - 1])!;
            const endNode = NODES.find(n => n.id === nodeId)!;
            return (
              <line
                key={`line-${idx}`}
                x1={startNode.x}
                y1={startNode.y}
                x2={endNode.x}
                y2={endNode.y}
                className="stroke-primary"
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}

          {/* Linha temporária do mouse/touch */}
          {isDrawing && selected.length > 0 && mousePos && (
            <line
              x1={NODES.find(n => n.id === selected[selected.length - 1])!.x}
              y1={NODES.find(n => n.id === selected[selected.length - 1])!.y}
              x2={mousePos.x}
              y2={mousePos.y}
              className="stroke-primary/55"
              strokeWidth="3"
              strokeDasharray="4 2"
              strokeLinecap="round"
            />
          )}

          {/* Círculos do Grid */}
          {NODES.map(node => {
            const isNodeSelected = selected.includes(node.id);
            return (
              <g key={`node-group-${node.id}`}>
                {/* Zona invisível maior para detecção de colisão */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={COLLISION_RADIUS}
                  fill="transparent"
                  className="cursor-pointer"
                />
                {/* Círculo visual interno */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isNodeSelected ? 8 : 5}
                  className={isNodeSelected ? "fill-primary transition-all duration-150 scale-125" : "fill-white/30 transition-all duration-150"}
                />
                {/* Efeito luminoso para selecionados */}
                {isNodeSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="15"
                    className="fill-primary/20 stroke-primary/30 animate-ping"
                    strokeWidth="1"
                    style={{ animationDuration: '3s' }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {selected.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <p className="text-[8px] font-black uppercase tracking-widest text-white text-center px-4">
              Arraste e conecte os pontos para desenhar
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={clearPattern}
          disabled={selected.length === 0}
          className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={10} /> Resetar Padrão
        </button>
      </div>
    </div>
  );
}
