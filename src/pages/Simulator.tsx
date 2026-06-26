import React, { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Simulator() {
  const [simAmountToFinance, setSimAmountToFinance] = useState<number | ''>('');
  const [simDownPayment, setSimDownPayment] = useState<number | ''>('');
  const [simInstallmentCount, setSimInstallmentCount] = useState<number>(12);
  const [simRiskProfile, setSimRiskProfile] = useState<'BOM' | 'MEDIO' | 'RUIM'>('MEDIO');

  // Cálculos das tabelas do simulador
  const simCalculations = useMemo(() => {
    const amount = Number(simAmountToFinance) || 0;
    const down = Number(simDownPayment) || 0;
    const financed = Math.max(0, amount - down);
    const n = simInstallmentCount || 12;

    const riskMultiplier = 
      simRiskProfile === 'RUIM' ? 1.15 :
      simRiskProfile === 'MEDIO' ? 1.05 : 1.00;

    const calculatePMT = (financedAmount: number, rate: number, n: number) => {
      if (financedAmount <= 0) return 0;
      if (n <= 0) return 0;
      if (rate <= 0) return financedAmount / n;
      return financedAmount * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    };

    // Tabelas: premium (5%), standard (8%), flex (12%)
    const tables = [
      { name: 'Tabela Premium', rate: 0.05, label: 'PREMIUM (5%)', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
      { name: 'Tabela Standard', rate: 0.08, label: 'STANDARD (8%)', color: 'text-sky-400', border: 'border-sky-500/20', bg: 'bg-sky-500/5' },
      { name: 'Tabela Flex', rate: 0.12, label: 'FLEX (12%)', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' }
    ];

    return tables.map(t => {
      const finalRate = t.rate * riskMultiplier;
      const basePMT = calculatePMT(financed, finalRate, n);
      // Inclui a taxa de crediário de 1.99 padrão por parcela
      const installmentValue = financed > 0 ? Number((basePMT + 1.99).toFixed(2)) : 0;
      const totalPaid = installmentValue * n;
      const totalInterest = Math.max(0, totalPaid - financed);

      return {
        ...t,
        installmentValue,
        totalPaid,
        totalInterest,
        financed
      };
    });
  }, [simAmountToFinance, simDownPayment, simInstallmentCount, simRiskProfile]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/5">
          <Calculator size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Simulador de Parcelas</h1>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mt-0.5">Comparativo de Tabelas de Crédito e Risco</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel de Configurações da Simulação */}
        <div className="lg:col-span-1 bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">Configurações</h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-black block pl-1">Valor do Aparelho (R$)</label>
              <input 
                type="number"
                step="any"
                value={simAmountToFinance}
                onChange={(e) => setSimAmountToFinance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-2xl px-4 py-3.5 text-sm text-white outline-none transition-colors font-mono font-bold"
                placeholder="Ex: 1500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-black block pl-1">Valor da Entrada (R$)</label>
              <input 
                type="number"
                step="any"
                value={simDownPayment}
                onChange={(e) => setSimDownPayment(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-2xl px-4 py-3.5 text-sm text-white outline-none transition-colors font-mono font-bold"
                placeholder="Ex: 300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-black block pl-1">Nº de Parcelas</label>
              <select
                value={simInstallmentCount}
                onChange={(e) => setSimInstallmentCount(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-2xl px-4 py-3.5 text-sm text-white outline-none transition-colors font-bold"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(n => (
                  <option key={n} value={n} className="bg-[#121214]">{n}x</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-black block pl-1">Perfil de Risco</label>
              <select
                value={simRiskProfile}
                onChange={(e) => setSimRiskProfile(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-2xl px-4 py-3.5 text-sm text-white outline-none transition-colors font-bold"
              >
                <option value="BOM" className="bg-[#121214]">BOM (Juros normal)</option>
                <option value="MEDIO" className="bg-[#121214]">MEDIO (Juros +5%)</option>
                <option value="RUIM" className="bg-[#121214]">RUIM (Juros +15%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Exibição Comparativa das Tabelas */}
        <div className="lg:col-span-3 bg-white/[0.02] border border-outline-variant/30 rounded-[40px] p-6 space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">Comparativo de Tabelas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {simCalculations.map((calc, idx) => (
              <div key={idx} className={cn(
                "border rounded-[32px] p-6 space-y-4 flex flex-col justify-between transition-all hover:scale-[1.02]",
                calc.bg,
                calc.border
              )}>
                <div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-white">{calc.name}</span>
                    <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-white/5 font-mono", calc.color)}>
                      {calc.label}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-on-surface-variant">
                    <div className="flex justify-between">
                      <span>Financiado:</span>
                      <span className="font-mono text-white font-bold">
                        {calc.financed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Juros:</span>
                      <span className="font-mono text-white font-bold">
                        {calc.totalInterest.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2.5 mt-2.5">
                      <span>Total Geral:</span>
                      <span className="font-mono text-white font-black text-sm">
                        {calc.totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">Valor da Parcela</span>
                  <h4 className={cn("text-xl font-black font-mono leading-none", calc.color)}>
                    {simInstallmentCount}x de {calc.installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </h4>
                  <span className="text-[9px] text-on-surface-variant/70 block mt-1 font-mono uppercase">
                    Com taxa de R$ 1,99 inclusa
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
