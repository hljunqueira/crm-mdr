import React from 'react';
import { 
  Check, 
  Clock, 
  ThumbsUp, 
  Wrench, 
  CheckCircle2, 
  HelpCircle, 
  XCircle,
  Smartphone
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface RepairTimelineProps {
  status: string;
  deviceModel: string;
  deviceBrand: string;
  deviceCategory?: string;
  estimatedDelivery?: string;
  warrantyPeriod?: number;
  osNumber: number;
}

const OS_STEPS = [
  { status: 'budget_pending', label: 'Entrada / Orçamento', icon: Clock, desc: 'Aparelho recebido em laboratório técnico para triagem e testes.' },
  { status: 'awaiting_approval', label: 'Aguardando Aprovação', icon: ThumbsUp, desc: 'Orçamento gerado! Aguardando sua aprovação para iniciarmos os reparos.' },
  { status: 'in_progress', label: 'Em Conserto', icon: Wrench, desc: 'Reparos aprovados. Técnico responsável trabalhando no seu dispositivo.' },
  { status: 'ready', label: 'Pronto para Retirada', icon: CheckCircle2, desc: 'Seu aparelho foi consertado, aprovado nos testes de qualidade e está pronto para ser retirado na loja!' },
  { status: 'delivered', label: 'Retirado / Entregue', icon: Check, desc: 'Aparelho retirado por você. Cobertura da garantia de peças/serviço ativa!' }
];

export default function RepairTimeline({ 
  status, 
  deviceModel, 
  deviceBrand, 
  deviceCategory,
  estimatedDelivery,
  warrantyPeriod = 90,
  osNumber
}: RepairTimelineProps) {

  // Determine current active step index in standard workflow
  let currentStepIndex = OS_STEPS.findIndex(step => step.status === status);
  
  // Handle special/terminal statuses
  const isCanceled = status === 'canceled';
  const isReturnedNoFix = status === 'returned_no_fix';
  const isSpecialStatus = isCanceled || isReturnedNoFix;

  if (status === 'delivered') {
    currentStepIndex = 4;
  } else if (status === 'ready') {
    currentStepIndex = 3;
  } else if (status === 'in_progress') {
    currentStepIndex = 2;
  } else if (status === 'awaiting_approval') {
    currentStepIndex = 1;
  } else if (status === 'budget_pending') {
    currentStepIndex = 0;
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getDeviceDisplayName = () => {
    const brand = deviceBrand?.trim();
    const model = deviceModel?.trim();
    
    if ((!brand || brand === '-') && (!model || model === '-')) {
      const cat = deviceCategory?.toLowerCase();
      switch (cat) {
        case 'notebook': return 'Notebook';
        case 'desktop': return 'Computador PC';
        case 'smartphone': return 'Smartphone';
        case 'tablet': return 'Tablet';
        case 'printer': return 'Impressora';
        case 'console': return 'Console';
        default: return 'Equipamento';
      }
    }
    return `${brand || ''} ${model || ''}`.trim();
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Device Header Card */}
      <div className="p-6 bg-white/[0.02] border border-white/10 rounded-3xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <Smartphone size={24} />
          </div>
          <div>
            <h3 className="font-black text-white uppercase tracking-tight text-md">
              {getDeviceDisplayName()}
            </h3>
            <p className="text-[9px] text-on-surface-variant font-mono uppercase mt-0.5">
              Ordem de Serviço: <strong className="text-white font-normal">#{String(osNumber).padStart(4, '0')}</strong>
            </p>
          </div>
        </div>

        {/* Dynamic overall status badge */}
        <div className="text-right">
          <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest block leading-none">Previsão</span>
          <span className="text-xs font-black text-white font-mono block mt-1">
            {isSpecialStatus ? 'Encerrado' : estimatedDelivery ? formatDate(estimatedDelivery) : 'Em diagnóstico'}
          </span>
        </div>
      </div>

      {/* Special/Terminal Status Warnings */}
      {isSpecialStatus && (
        <div className={cn(
          "p-5 rounded-3xl border flex items-start gap-4 animate-in zoom-in duration-300",
          isCanceled ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-neutral-500/10 border-neutral-500/20 text-neutral-400"
        )}>
          <div className="shrink-0 mt-0.5">
            {isCanceled ? <XCircle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider leading-none">
              {isCanceled ? 'Manutenção Cancelada' : 'Aparelho Devolvido Sem Conserto'}
            </h4>
            <p className="text-[10px] leading-relaxed mt-1.5 opacity-80">
              {isCanceled 
                ? 'Esta Ordem de Serviço foi cancelada e arquivada por solicitação técnica ou do cliente.' 
                : 'O diagnóstico técnico constatou inviabilidade de reparo do aparelho. O dispositivo já foi devolvido.'}
            </p>
          </div>
        </div>
      )}

      {/* Active Timeline Steps */}
      {!isSpecialStatus && (
        <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
          {OS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;
            const StepIcon = step.icon;

            return (
              <div 
                key={step.status} 
                className={cn(
                  "relative transition-all duration-300",
                  isActive ? "scale-[1.01]" : ""
                )}
              >
                {/* Visual marker node */}
                <div 
                  className={cn(
                    "absolute -left-8 top-0.5 w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300 z-10",
                    isCompleted ? "bg-success border-success text-on-success shadow-lg shadow-success/10" :
                    isActive ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/20 animate-pulse" :
                    "bg-[#0e0e11] border-white/10 text-on-surface-variant/40"
                  )}
                >
                  <StepIcon size={12} strokeWidth={isCompleted ? 4 : 2} />
                </div>

                {/* Content */}
                <div 
                  className={cn(
                    "p-5 rounded-2xl border transition-all duration-300",
                    isActive ? "bg-white/[0.03] border-white/20" :
                    isCompleted ? "bg-white/[0.01] border-white/5 opacity-80" :
                    "bg-transparent border-transparent opacity-40"
                  )}
                >
                  <h4 
                    className={cn(
                      "text-xs font-black uppercase tracking-wider leading-none",
                      isActive ? "text-primary" : "text-white"
                    )}
                  >
                    {step.label}
                  </h4>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed mt-2 font-display">
                    {step.desc}
                  </p>

                  {/* Highlight warranty active on delivered */}
                  {step.status === 'delivered' && isCompleted && (
                    <div className="mt-4 p-3 bg-success/5 border border-success/15 rounded-xl flex items-center gap-2 text-success text-[9px] font-black uppercase tracking-widest">
                      🛡️ Cobertura de Garantia Ativa por {warrantyPeriod} Dias!
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
