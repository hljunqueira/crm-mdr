import React from 'react';
import { formatCPF, formatPhone, resolveUnitInfo } from '../../lib/utils';

interface ContractPrintProps {
  sale: {
    id?: string;
    device_model: string;
    imei: string;
    total_value: number;
    original_price?: number;
    down_payment: number;
    installments: number;
    service_fee?: number;
    date: string;
    created_at?: string;
    device_color?: string;
    accessories?: string;
    payment_type?: string;
    down_payment_method?: string;
    trade_device_model?: string;
    trade_device_imei?: string;
    interest_table?: string;
    is_trade_in?: boolean;
    trade_in_valuation?: number;
    trade_in_device_brand?: string;
    trade_in_device_model?: string;
    trade_in_device_imei?: string;
  };
  customer: {
    name: string;
    cpf: string;
    address?: string;
    phone: string;
  };
  unit: {
    name: string;
    cnpj?: string;
    address?: string;
    phone?: string;
    contract_terms?: string;
    warranty_terms?: string;
  };
  installmentValue?: number;
  firstInstallmentValue?: number;
  isPreview?: boolean;
  installments?: any[];
}

// Clean helper to format dates safely without shifting
const formatPaymentDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
    return new Date(cleanStr).toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

export default function ContractPrint({ sale, customer, unit, installmentValue, firstInstallmentValue, isPreview, installments }: ContractPrintProps) {
  const resolvedUnit = resolveUnitInfo(unit);
  const basePrice = sale.original_price ?? sale.total_value;
  const tradeInVal = sale.is_trade_in ? (Number(sale.trade_in_valuation) || 0) : 0;
  const financed = basePrice - sale.down_payment - tradeInVal;
  const instValue = installmentValue ?? (
    sale.installments > 0 
      ? (sale.down_payment > 0 && sale.installments > 1 
          ? financed / (sale.installments - 1) 
          : financed / sale.installments)
      : 0
  );
  const firstInstValue = firstInstallmentValue ?? instValue;
  const totalWithFee = sale.total_value;
  const today = new Date().toLocaleDateString('pt-BR');

  const contractNumber = sale.id ? sale.id.split('-')[0].toUpperCase() : '85429496';

  // Interest calculations
  const getInterestRate = () => {
    if (sale.payment_type === 'card') return 4.00;
    const accStr = sale.accessories || '';
    if (accStr.includes('SEM JUROS') || sale.interest_table === 'no_interest') return 0.00;
    if (accStr.includes('PREMIUM (5%)') || sale.interest_table === 'premium') return 5.00;
    if (accStr.includes('FLEX (12%)') || sale.interest_table === 'flex') return 12.00;
    return 8.00; // Default Standard (8%)
  };

  const getRealInterestRate = () => {
    const nominal = getInterestRate();
    if (!installments || installments.length === 0 || financed <= 0) return nominal;

    // Calcular TIR (Taxa Interna de Retorno / IRR) real das parcelas
    // Fluxo de caixa: [-financed, p1, p2, p3, ...]
    const cashFlow = [-financed];
    const dates = [new Date((sale.date || new Date().toISOString()) + 'T12:00:00')];

    const sortedInsts = [...installments].sort((a, b) => a.number - b.number);
    sortedInsts.forEach((inst) => {
      if (sale.down_payment > 0 && inst.number === 1) return; // skip down payment in cashflow as it is already subtracted from financed
      cashFlow.push(inst.value);
      const dateVal = inst.due_date || inst.dueDate || inst.date;
      dates.push(dateVal ? new Date(dateVal.includes('T') ? dateVal : `${dateVal}T12:00:00`) : new Date());
    });

    // Solver numérico IRR usando método de Newton-Raphson
    const irrMonthly = () => {
      let r = nominal / 100; // chute inicial
      const maxIteration = 100;
      const precision = 1e-6;

      for (let i = 0; i < maxIteration; i++) {
        let f = cashFlow[0];
        let df = 0;

        for (let j = 1; j < cashFlow.length; j++) {
          // Diferença de dias dividida por 30 para obter a taxa mensal equivalente
          const diffDays = Math.max(1, (dates[j].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24));
          const months = diffDays / 30;
          f += cashFlow[j] / Math.pow(1 + r, months);
          df -= months * cashFlow[j] / Math.pow(1 + r, months + 1);
        }

        if (Math.abs(df) < 1e-12) break;
        const nextR = r - f / df;
        if (Math.abs(nextR - r) < precision) return nextR * 100;
        r = nextR;
      }
      return nominal; // fallback
    };

    try {
      const rate = irrMonthly();
      // Garantir que a taxa não fique inconsistente (ex: negativa ou excessivamente alta)
      if (rate > 0 && rate < 100) return Number(rate.toFixed(2));
    } catch (e) {
      console.warn("Erro ao calcular TIR:", e);
    }
    return nominal;
  };

  const interestRate = getRealInterestRate();
  const interestRateYear = (Math.pow(1 + interestRate / 100, 12) - 1) * 100;

  const cetMonth = 0; // N/A
  const cetYear = 0; // N/A

  // Finance division
  const valorLiquido = financed;
  const fee = Math.max(0, totalWithFee - basePrice);
  const iof = 0;
  const custoEmissao = 0;
  const valorCredito = totalWithFee;

  // Dates
  const issueDateFormatted = formatPaymentDate(sale.created_at || sale.date) || today;

  const getInstallmentDates = () => {
    if (installments && installments.length > 0) {
      const sorted = [...installments].sort((a, b) => a.number - b.number);
      return sorted.map((inst: any) => {
        const dateVal = inst.due_date || inst.dueDate || inst.date;
        if (!dateVal) return '';
        const cleanStr = dateVal.includes('T') ? dateVal : `${dateVal}T12:00:00`;
        return new Date(cleanStr).toLocaleDateString('pt-BR');
      });
    }

    const dates: string[] = [];
    const baseDate = new Date((sale.date || new Date().toISOString()) + 'T12:00:00');
    for (let i = 0; i < sale.installments; i++) {
      const d = new Date(baseDate);
      d.setMonth(baseDate.getMonth() + i);
      dates.push(d.toLocaleDateString('pt-BR'));
    }
    return dates;
  };

  const installmentDates = getInstallmentDates();
  const lastInstallmentDate = installmentDates.length > 0 ? installmentDates[installmentDates.length - 1] : today;

  // Render header for pages 2 to 9
  const renderPageHeader = (pageNum: number) => (
    <div className="flex justify-between items-center border-b border-black pb-2 mb-4 no-print-border">
      <div className="flex items-center gap-2">
        <img
          src="/logo-mdr.png"
          alt="MDR"
          className="print:block"
          style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <span className="font-bold text-[9px] text-black">MDR INFORMÁTICA &amp; CELULARES</span>
      </div>
      <div className="text-right">
        <span className="text-[7px] font-mono text-black uppercase tracking-widest">Contrato de Venda a Prazo nº {contractNumber}</span>
      </div>
    </div>
  );

  // Render footer for all pages
  const renderPageFooter = (pageNum: number) => (
    <div className="absolute bottom-6 left-12 right-12 border-t border-black pt-2 flex justify-between items-center text-[7px] text-black font-sans no-print-border">
      <span>Esta página é parte integrante do Contrato de Venda a Prazo nº {contractNumber}, tendo como Emitente {customer.name} e CPF/CNPJ: {formatCPF(customer.cpf)}</span>
      <span className="font-bold">Página {pageNum} de 6</span>
    </div>
  );

  return (
    <div id="sale-contract" className={isPreview ? "" : "hidden"}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page {
            size: A4;
            margin: 0 !important;
          }
          body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #1e293b !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body > *:not(#sale-contract):not(#print-mount-point):not(#sale-document-preview-area) { display: none !important; }
          #sale-contract, #print-mount-point, #sale-document-preview-area { display: block !important; }
          .contract-page {
            page-break-after: always !important;
            break-after: page !important;
            height: 297mm !important;
            width: 210mm !important;
            box-sizing: border-box !important;
            position: relative !important;
            padding: 15mm 12mm 20mm 12mm !important;
            background-color: #ffffff !important;
            color: #1e293b !important;
            margin: 0 !important;
            font-family: 'Inter', Arial, sans-serif !important;
          }
          .contract-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
        
        .contract-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 12mm 20mm 12mm;
          box-sizing: border-box;
          font-family: 'Inter', Arial, sans-serif;
          font-size: 12px;
          color: #000000;
          background: #fff;
          line-height: 1.25;
          position: relative;
          border: 1px solid #cbd5e1;
          margin-bottom: 20px;
        }

        .contract-page h1, .contract-page h2, .contract-page h3, .contract-page h4 {
          color: #000000 !important;
        }

        .contract-page table.ccb-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-family: 'Inter', Arial, sans-serif;
        }
        .contract-page table.ccb-table td {
          border: 1.5px solid #000000;
          padding: 6px 10px;
          vertical-align: top;
          font-size: 11.5px;
          color: #000000;
        }
        .contract-page table.ccb-table tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .contract-page table.ccb-table td.header-cell {
          background-color: #000000;
          color: #ffffff;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
          border-bottom: 1.5px solid #000000;
          padding: 6px 10px;
          letter-spacing: 0.5px;
        }
        .contract-page table.ccb-table .label {
          font-size: 8px;
          color: #475569;
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .contract-page table.ccb-table .value {
          font-weight: 700;
          font-size: 11px;
          color: #000000;
        }
        .contract-page .clause-title {
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 10px;
          margin-bottom: 4px;
          color: #000000;
          border-bottom: 1.5px solid #000000;
          padding-bottom: 2px;
          letter-spacing: 0.5px;
        }
        .contract-page .clause-text {
          font-size: 10.5px;
          text-align: justify;
          margin-bottom: 6px;
          color: #000000;
          line-height: 1.25;
        }
        .contract-page .signature-box-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-top: 50px;
        }
        .contract-page .signature-line-block {
          border-top: 1.5px solid #000000;
          padding-top: 6px;
          font-size: 10px;
          text-align: center;
          color: #000000;
        }
      `}</style>

      {/* ─── PAGE 1 ─── */}
      <div className="contract-page">
        {/* Large Header */}
        <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo-mdr.png"
              alt="MDR"
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="text-left font-black tracking-tighter text-lg leading-none">
              MDR<br />
              <span className="text-[7px] font-sans tracking-widest text-gray-500 font-bold uppercase">Informática &amp; Celulares</span>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black text-black uppercase tracking-tight leading-none">Cédula de Crédito Bancário</h1>
            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Nº {contractNumber} | Tipo: CDC</span>
          </div>
        </div>

        {/* Section I */}
        <table className="ccb-table">
          <thead>
            <tr>
              <td colSpan={3} className="header-cell">I. Credor (Vendedor)</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: '40%' }}>
                <span className="label">Razão Social / Nome Fantasia</span>
                <span className="value">{resolvedUnit.name}</span>
              </td>
              <td style={{ width: '30%' }}>
                <span className="label">CNPJ / CPF</span>
                <span className="value">{resolvedUnit.cnpj}</span>
              </td>
              <td style={{ width: '30%' }}>
                <span className="label">Telefone / WhatsApp</span>
                <span className="value">{formatPhone(resolvedUnit.phone)}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={3}>
                <span className="label">Endereço do Estabelecimento</span>
                <span className="value">{resolvedUnit.address}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section II */}
        <table className="ccb-table">
          <thead>
            <tr>
              <td colSpan={3} className="header-cell">II. Emitente (Comprador)</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: '40%' }}>
                <span className="label">Nome / Razão Social</span>
                <span className="value">{customer.name}</span>
              </td>
              <td style={{ width: '30%' }}>
                <span className="label">CPF / CNPJ</span>
                <span className="value">{formatCPF(customer.cpf)}</span>
              </td>
              <td style={{ width: '30%' }}>
                <span className="label">Telefone / WhatsApp</span>
                <span className="value">{formatPhone(customer.phone)}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={3}>
                <span className="label">Endereço Residencial Completo</span>
                <span className="value">{customer.address || '____________________'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section III */}
        <table className="ccb-table">
          <thead>
            <tr>
              <td colSpan={4} className="header-cell">III. Características da Operação</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: '25%' }}>
                <span className="label">Preço Total a Prazo</span>
                <span className="value">R$ {valorCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </td>
              <td style={{ width: '25%' }}>
                <span className="label">Valor de IOF</span>
                <span className="value">R$ 0,00 (Isento)</span>
              </td>
              <td style={{ width: '25%' }}>
                <span className="label">Custo de Emissão</span>
                <span className="value">R$ 0,00</span>
              </td>
              <td style={{ width: '25%' }}>
                <span className="label">Preço à Vista</span>
                <span className="value">R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="label">Taxa Juros Efetiva (a.m)</span>
                <span className="value">{interestRate.toFixed(2)}%</span>
              </td>
              <td>
                <span className="label">Taxa Juros Efetiva (a.a)</span>
                <span className="value">{interestRateYear.toFixed(2)}%</span>
              </td>
              <td>
                <span className="label">Custo Efetivo Total (a.m)</span>
                <span className="value">N/A</span>
              </td>
              <td>
                <span className="label">Custo Efetivo Total (a.a)</span>
                <span className="value">N/A</span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="label">Encargos Financeiros</span>
                <span className="value">Pré-Fixado</span>
              </td>
              <td>
                <span className="label">Indexador</span>
                <span className="value">Pré-Fixado</span>
              </td>
              <td>
                <span className="label">Prazo</span>
                <span className="value">Mensal - Vide Item VII</span>
              </td>
              <td>
                <span className="label">Tarifa de Liq. Antecipada</span>
                <span className="value">0,00</span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="label">Número de Parcelas</span>
                <span className="value">{sale.installments}</span>
              </td>
              <td>
                <span className="label">Data da 1ª Parcela</span>
                <span className="value">{(sale.down_payment > 0 && installmentDates.length > 1 ? installmentDates[1] : installmentDates[0]) || today}</span>
              </td>
              <td>
                <span className="label">Data da Última Parcela</span>
                <span className="value">{lastInstallmentDate}</span>
              </td>
              <td>
                <span className="label">Valor das Parcelas</span>
                <span className="value">
                  {(() => {
                    if (installments && installments.length > 0) {
                      const firstVal = installments[0].value;
                      const allSame = installments.every(inst => inst.value === firstVal);
                      if (allSame) {
                        return `R$ ${firstVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                      const rest = installments.slice(1);
                      const restVal = rest[0]?.value;
                      const restAllSame = rest.every(inst => inst.value === restVal);
                      if (restAllSame && restVal !== undefined) {
                        return `1ª de R$ ${firstVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + ${sale.installments - 1}x de R$ ${restVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                      }
                      return `Variadas (vide item VII)`;
                    }
                    if (firstInstValue !== instValue) {
                      return `1ª de R$ ${firstInstValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + ${sale.installments - 1}x de R$ ${instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    }
                    return `R$ ${instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  })()}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="label">Data de Emissão</span>
                <span className="value">{issueDateFormatted}</span>
              </td>
              <td>
                <span className="label">Praça de Pagamento</span>
                <span className="value">{resolvedUnit.city}</span>
              </td>
              <td colSpan={2}>
                <span className="label">Data de Vencimento</span>
                <span className="value">{lastInstallmentDate}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section IV */}
        <div className="font-bold text-[7.5px] uppercase tracking-wider mt-2 mb-1">IV. Condições para Desembolso do Valor Líquido do Crédito</div>
        <div className="text-[7px] text-justify mb-2 leading-relaxed">
          A entrega do equipamento eletrônico de telefonia móvel identificado no item V ao EMITENTE equivale à liberação integral do Valor Líquido do Crédito ao EMITENTE. O EMITENTE autoriza expressamente a destinação do Valor Líquido Liberado diretamente para a quitação do preço do aparelho eletrônico junto ao CREDOR.
        </div>

        {/* Section V */}
        <table className="ccb-table">
          <thead>
            <tr>
              <td colSpan={2} className="header-cell">V. Garantias</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: '60%' }}>
                <span className="label">Marca e modelo do Equipamento</span>
                <span className="value">{sale.device_model}</span>
              </td>
              <td style={{ width: '40%' }}>
                <span className="label">Número de série / IMEI</span>
                <span className="value">{sale.imei || '____________________'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section VI */}
        <table className="ccb-table">
          <thead>
            <tr>
              <td colSpan={3} className="header-cell">VI. Bancários para Desembolso</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: '40%' }}>
                <span className="label">Titular</span>
                <span className="value">{resolvedUnit.name}</span>
              </td>
              <td style={{ width: '30%' }}>
                <span className="label">CPF / CNPJ</span>
                <span className="value">{resolvedUnit.cnpj}</span>
              </td>
              <td style={{ width: '30%' }}>
                <span className="label">Banco / Agência / Conta</span>
                <span className="value">MDR Celulares</span>
              </td>
            </tr>
          </tbody>
        </table>

        {renderPageFooter(1)}
      </div>

      {/* ─── PAGE 2 ─── */}
      <div className="contract-page">
        {renderPageHeader(2)}

        <div className="font-bold text-[8.5px] uppercase mb-2">VII. Fluxo de Pagamentos</div>
        {installmentDates.length > 12 ? (
          <div className="flex gap-4 mb-3" style={{ maxWidth: '600px', margin: '0 auto 12px' }}>
            <table className="ccb-table text-center flex-1">
              <thead>
                <tr style={{ backgroundColor: '#eaeaea', fontWeight: 'bold' }}>
                  <td style={{ padding: '2px' }}>Parcela</td>
                  <td style={{ padding: '2px' }}>Vencimento</td>
                  <td style={{ padding: '2px' }}>Valor R$</td>
                </tr>
              </thead>
              <tbody>
                {installmentDates.slice(0, 12).map((date, idx) => {
                  const currentVal = installments && installments[idx] 
                    ? installments[idx].value 
                    : (idx === 0 ? firstInstValue : instValue);
                  return (
                    <tr key={idx}>
                      <td style={{ padding: '2px' }}>{String(idx + 1).padStart(3, '0')}</td>
                      <td style={{ padding: '2px' }}>{date}</td>
                      <td style={{ padding: '2px' }}>R$ {currentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <table className="ccb-table text-center flex-1">
              <thead>
                <tr style={{ backgroundColor: '#eaeaea', fontWeight: 'bold' }}>
                  <td style={{ padding: '2px' }}>Parcela</td>
                  <td style={{ padding: '2px' }}>Vencimento</td>
                  <td style={{ padding: '2px' }}>Valor R$</td>
                </tr>
              </thead>
              <tbody>
                {installmentDates.slice(12).map((date, idx) => {
                  const realIdx = idx + 12;
                  const currentVal = installments && installments[realIdx] 
                    ? installments[realIdx].value 
                    : instValue;
                  return (
                    <tr key={realIdx}>
                      <td style={{ padding: '2px' }}>{String(realIdx + 1).padStart(3, '0')}</td>
                      <td style={{ padding: '2px' }}>{date}</td>
                      <td style={{ padding: '2px' }}>R$ {currentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="ccb-table text-center" style={{ maxWidth: '400px', margin: '0 auto 12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#eaeaea', fontWeight: 'bold' }}>
                <td style={{ padding: '2px' }}>Parcela</td>
                <td style={{ padding: '2px' }}>Data de Vencimento</td>
                <td style={{ padding: '2px' }}>Valor R$</td>
              </tr>
            </thead>
            <tbody>
              {installmentDates.map((date, idx) => {
                const currentVal = installments && installments[idx] 
                  ? installments[idx].value 
                  : (idx === 0 ? firstInstValue : instValue);
                return (
                  <tr key={idx}>
                    <td style={{ padding: '2px' }}>{String(idx + 1).padStart(3, '0')}</td>
                    <td style={{ padding: '2px' }}>{date}</td>
                    <td style={{ padding: '2px' }}>R$ {currentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="text-center font-bold text-[9px] uppercase tracking-wider my-3">
          CONDIÇÕES GERAIS – CONTRATO DE COMPRA E VENDA A PRAZO COM RESERVA DE DOMÍNIO
        </div>

        <div className="clause-title">1. DO PARCELAMENTO E PAGAMENTO</div>
        <div className="clause-text">
          1.1. Pelo presente instrumento, o COMPRADOR compra a prazo do VENDEDOR o(s) dispositivo(s) móvel(eis) descrito(s) neste contrato e se obriga a pagar as parcelas indicadas na tabela VII nas correspondentes datas de vencimento.
          <br /><br />
          1.2. O COMPRADOR se obriga a efetuar o pagamento do valor das parcelas por meio de boleto bancário, PIX, dinheiro ou outra forma de pagamento previamente aceita e disponibilizada pelo VENDEDOR.
          <br /><br />
          1.3. O COMPRADOR declara ter plena ciência de que os juros e encargos aplicados sobre o parcelamento próprio estão descritos no Quadro Características da Operação, tendo concordado com as condições previamente à assinatura do contrato.
        </div>

        <div className="clause-title">2. DA RESERVA DE DOMÍNIO E GARANTIA DE SEGURANÇA</div>
        <div className="clause-text">
          2.1. Nos termos do artigo 521 da Lei nº 10.406/2002 (Código Civil), as partes pactuam a Reserva de Domínio, de modo que o VENDEDOR reserva para si a propriedade do(s) aparelho(s) celular(es) vendido(s) até que ocorra o pagamento integral de todas as parcelas deste crediário.
        </div>

        {renderPageFooter(2)}
      </div>

      {/* ─── PAGE 3 ─── */}
      <div className="contract-page">
        {renderPageHeader(3)}

        <div className="clause-text">
          2.2. Como garantia do cumprimento das obrigações financeiras pactuadas, o COMPRADOR concorda e autoriza a instalação de aplicativo/dispositivo de bloqueio no celular adquirido. Em caso de atraso no pagamento de qualquer parcela, o VENDEDOR fica expressamente autorizado a realizar o bloqueio remoto do uso do aparelho.
          <br /><br />
          2.3. O bloqueio atinge única e exclusivamente as funções do aparelho celular, não afetando os direitos de uso do chip (cartão SIM) ou da linha da operadora telefônica do cliente, que poderá ser utilizada normalmente em qualquer outro dispositivo.
          <br /><br />
          2.4. A garantia de bloqueio e a reserva de domínio cessarão por completo com o pagamento integral e quitação de todas as obrigações previstas neste contrato, inexistindo possibilidade de bloqueios futuros. Com a quitação, o COMPRADOR passa a deter a propriedade plena do bem e receberá as instruções para desinstalação definitiva da ferramenta de segurança.
        </div>

        <div className="clause-title">3. DO ATRASO E VENCIMENTO ANTECIPADO</div>
        <div className="clause-text">
          3.1. O descumprimento de qualquer obrigação de pagamento por prazo superior a 30 (trinta) dias autoriza o VENDEDOR a considerar vencido antecipadamente todo o saldo devedor remanescente, podendo exigir o pagamento integral imediato ou reaver a posse do bem nos termos da lei.
          <br /><br />
          3.2. As parcelas pagas in atraso serão acrescidas de multa moratória de 2% (dois por cento) sobre o valor da prestação e juros de mora de 1% (um por cento) ao mês pro-rata temporis calculados desde o vencimento até o efetivo pagamento, além de despesas geradas com a cobrança administrativa.
        </div>

        {renderPageFooter(3)}
      </div>

      {/* ─── PAGE 4 ─── */}
      <div className="contract-page">
        {renderPageHeader(4)}

        <div className="clause-title">4. DA LIQUIDAÇÃO ANTECIPADA</div>
        <div className="clause-text">
          4.1. O COMPRADOR poderá, a qualquer tempo, liquidar antecipadamente, de forma total ou parcial, as suas obrigações pendentes decorrentes deste contrato, mediante solicitação ao VENDEDOR, oportunidade em que terá direito à redução proporcional dos juros correspondentes ao período antecipado.
          <br /><br />
          4.2. Sempre que solicitado, o VENDEDOR apresentará ao COMPRADOR o demonstrativo de cálculo do saldo devedor com o respectivo desconto de antecipação para fins de amortização ou quitação.
        </div>

        <div className="clause-title">5. DAS DECLARAÇÕES E AUTORIZAÇÕES</div>
        <div className="clause-text">
          5.1. As Partes declaram sob as penas da lei que:
          <br /><br />
          a) possuem capacidade e legitimidade civil para celebrar este contrato e cumprir todas as obrigações assumidas;
          <br />
          b) a assinatura deste contrato foi realizada de livre e espontânea vontade, após leitura e plena compreensão de todas as cláusulas financeiras e operacionais;
          <br />
          c) este contrato constitui obrigação legal, válida e vinculante entre COMPRADOR e VENDEDOR de acordo com as leis comerciais vigentes no Brasil.
          <br /><br />
          5.2. O COMPRADOR autoriza o VENDEDOR a realizar consultas aos serviços de proteção ao crédito (SPC, Serasa e afins) bem como registrar a inadimplência em caso de descumprimento do presente contrato.
        </div>

        {renderPageFooter(4)}
      </div>

      {/* ─── PAGE 5 ─── */}
      <div className="contract-page">
        {renderPageHeader(5)}

        <div className="clause-title">6. DISPOSIÇÕES GERAIS</div>
        <div className="clause-text">
          6.1. A tolerância de qualquer das partes quanto ao descumprimento temporário de alguma obrigação não importará em renúncia ou novação, podendo o direito ser exercido a qualquer tempo.
          <br /><br />
          6.2. Se qualquer cláusula deste contrato for considerada inválida ou inexequível, as demais disposições permanecerão válidas e plenamente eficazes.
          <br /><br />
          6.3. As partes concordam com a assinatura física ou com a formalização e coleta de assinatura eletrônica/digital capturada pelo sistema do VENDEDOR, reconhecendo-a como plenamente válida e dotada de eficácia executiva.
          <br /><br />
          6.4. Foro: Para dirimir qualquer questão ou controvérsia decorrente do presente contrato, fica eleito o foro da Comarca de {resolvedUnit.city}, com a exclusão de qualquer outro por mais privilegiado que seja.
        </div>

        <div className="mt-4 font-bold">
          Local e data: {resolvedUnit.city}, {issueDateFormatted}
        </div>

        <div className="font-bold text-[9px] uppercase tracking-wider mt-4 mb-2">Assinaturas:</div>

        <div className="signature-box-grid">
          <div className="signature-line-block">
            <strong>{resolvedUnit.name.toUpperCase()}</strong><br />
            Representante Credor / Vendedor<br />
            CNPJ: {resolvedUnit.cnpj}
          </div>
          <div className="signature-line-block">
            <strong>{customer.name.toUpperCase()}</strong><br />
            Emitente / Comprador<br />
            CPF: {formatCPF(customer.cpf)}
          </div>
        </div>

        <div className="signature-box-grid" style={{ marginTop: '50px' }}>
          <div className="signature-line-block">
            Testemunha 1: ______________________________<br />
            Nome:<br />
            CPF:
          </div>
          <div className="signature-line-block">
            Testemunha 2: ______________________________<br />
            Nome:<br />
            CPF:
          </div>
        </div>

        {renderPageFooter(6)}
      </div>
    </div>
  );
}
