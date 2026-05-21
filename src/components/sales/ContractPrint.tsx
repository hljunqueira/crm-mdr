import React from 'react';
import { formatCPF, formatPhone } from '../../lib/utils';

interface ContractPrintProps {
  sale: {
    device_model: string;
    imei: string;
    total_value: number;
    original_price?: number;
    down_payment: number;
    installments: number;
    service_fee?: number;
    date: string;
    device_color?: string;
    accessories?: string;
    payment_type?: string;
    down_payment_method?: string;
    trade_device_model?: string;
    trade_device_imei?: string;
    interest_table?: string;
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
}

// MDR Logo as inline SVG – always renders even offline/print
const MDRLogoContract = () => (
  <svg width="140" height="52" viewBox="0 0 280 104" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="280" height="104" rx="10" fill="#1a1a2e"/>
    <text x="14" y="72" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="62" fill="#6C63FF" letterSpacing="-2">MDR</text>
    <rect x="14" y="78" width="252" height="4" rx="2" fill="#6C63FF" opacity="0.6"/>
    <text x="14" y="96" fontFamily="Arial, sans-serif" fontSize="11" fill="#aaa" letterSpacing="3">INFORMÁTICA &amp; CELULARES</text>
  </svg>
);

export default function ContractPrint({ sale, customer, unit, installmentValue }: ContractPrintProps) {
  const basePrice = sale.original_price ?? sale.total_value;
  const financed = basePrice - sale.down_payment;
  const instValue = installmentValue ?? (sale.installments > 0 ? financed / sale.installments : 0);
  const totalWithFee = sale.total_value; // Already the final value including fees
  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <div id="sale-contract" className="hidden">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body > *:not(#sale-contract) { display: none !important; }
          #sale-contract { display: block !important; }
        }
        #sale-contract {
          width: 210mm;
          padding: 12mm 16mm;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #111;
          background: #fff;
          line-height: 1.6;
        }
        #sale-contract .contract-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 3px solid #6C63FF; }
        #sale-contract .contract-title-block { text-align: right; }
        #sale-contract .contract-title { font-size: 14px; font-weight: 900; color: #1a1a2e; text-transform: uppercase; letter-spacing: 1px; }
        #sale-contract .contract-subtitle { font-size: 8px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        #sale-contract h2 { font-size: 10px; font-weight: 900; color: #6C63FF; text-transform: uppercase; letter-spacing: 2px; margin: 14px 0 5px; border-bottom: 1px solid #e8e8ff; padding-bottom: 3px; }
        #sale-contract .section { margin: 10px 0; }
        #sale-contract .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0; }
        #sale-contract p { margin: 3px 0; }
        #sale-contract .data-field { font-weight: 700; color: #1a1a2e; }
        #sale-contract .highlight-box { background: #f5f3ff; border: 1.5px solid #6C63FF; border-radius: 6px; padding: 8px 12px; margin: 10px 0; }
        #sale-contract .highlight-box p { margin: 2px 0; font-size: 11px; }
        #sale-contract .footer { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 12px; }
        #sale-contract .signature-box { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
        #sale-contract .signature-line { border-top: 1.5px solid #aaa; padding-top: 6px; font-size: 9.5px; color: #555; text-align: center; }
        #sale-contract .legal-note { font-size: 8px; color: #999; text-align: center; margin-top: 10px; }
      `}</style>

      {/* Header */}
      <div className="contract-header">
        <MDRLogoContract />
        <div className="contract-title-block">
          <div className="contract-title">Contrato de Compra e Venda</div>
          <div className="contract-subtitle">Celular a Prazo — Via Original</div>
          <div style={{ fontSize: 9, color: '#666', marginTop: 4 }}>Data: <strong>{today}</strong></div>
        </div>
      </div>

      {/* Section 1: Parties */}
      <div className="section">
        <h2>1. Partes</h2>
        <div className="grid">
          <div>
            <p><strong>Vendedor:</strong> <span className="data-field">{unit.name || 'MDR Informática & Celulares'}</span></p>
            <p><strong>CNPJ:</strong> <span className="data-field">{unit.cnpj || '____________________'}</span></p>
            <p><strong>Endereço:</strong> <span className="data-field">{unit.address || '____________________'}</span></p>
            <p><strong>Telefone:</strong> <span className="data-field">{unit.phone || '____________________'}</span></p>
          </div>
          <div>
            <p><strong>Comprador:</strong> <span className="data-field">{customer.name}</span></p>
            <p><strong>CPF/RG:</strong> <span className="data-field">{formatCPF(customer.cpf)}</span></p>
            <p><strong>Endereço:</strong> <span className="data-field">{customer.address || '____________________'}</span></p>
            <p><strong>Telefone:</strong> <span className="data-field">{formatPhone(customer.phone)}</span></p>
          </div>
        </div>
      </div>

      {/* Section 2: Product */}
      <div className="section">
        <h2>2. Produto</h2>
        <p><strong>Aparelho:</strong> <span className="data-field">{sale.device_model}</span></p>
        <p><strong>IMEI:</strong> <span className="data-field">{sale.imei || '____________________'}</span></p>
        <p><strong>Cor:</strong> <span className="data-field">{sale.device_color || '____________________'}</span> | <strong>Acessórios:</strong> <span className="data-field">{sale.accessories || '____________________'}</span></p>
        <p><strong>Avarias no ato da venda:</strong> <span className="data-field">________________________________________</span></p>
      </div>

      {/* Section 3: Financial */}
      <div className="section">
        <h2>3. Preço e Forma de Pagamento</h2>
        <div className="highlight-box">
          <p><strong>Valor à Vista (base):</strong> <span className="data-field">R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
          <p><strong>Entrada Paga:</strong> <span className="data-field">R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
          {sale.down_payment_method === 'trade' && (
            <div style={{ margin: '4px 0', padding: '4px 8px', background: 'rgba(108, 99, 255, 0.05)', borderRadius: '4px', borderLeft: '3px solid #6C63FF' }}>
              <p><strong>Entrada em Troca:</strong> <span className="data-field">{sale.trade_device_model}</span></p>
              <p><strong>IMEI / Serial (Troca):</strong> <span className="data-field">{sale.trade_device_imei || 'N/A'}</span></p>
            </div>
          )}
          <p><strong>Saldo Financiado:</strong> <span className="data-field">R$ {financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> em <span className="data-field">{sale.installments}</span> parcelas de <span className="data-field">R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> cada.</p>
          <p><strong>Valor Total do Contrato:</strong> <span className="data-field">R$ {totalWithFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
          <p><strong>Vencimento:</strong> Todo dia <span className="data-field">{new Date(sale.date + 'T12:00:00').getDate()}</span> do mês, com início em <span className="data-field">{new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>.</p>
          <p><strong>Forma de Pagamento:</strong> <span className="data-field">{sale.payment_type === 'card' ? 'Cartão de Crédito' : 'PIX / Dinheiro / Transferência'}</span></p>
        </div>
      </div>

      {/* Section 4: Early Payment Discounts */}
      <div className="section">
        <h2>4. Desconto por Antecipação de Parcelas</h2>
        <p>O Comprador poderá obter descontos ao antecipar o pagamento de suas parcelas (descontos aplicados sobre o juro embutido):</p>
        <p>• <strong>Antecipação de 1 parcela:</strong> Desconto de <strong>3%</strong></p>
        <p>• <strong>Antecipação de 2 parcelas:</strong> Desconto de <strong>5%</strong></p>
        <p>• <strong>Antecipação de 3 parcelas ou mais:</strong> Desconto de <strong>8%</strong></p>
        <p>• <strong>Quitação de saldo devedor (acima de 50% das parcelas restantes):</strong> Negociação especial com abatimento proporcional dos juros.</p>
      </div>

      {/* Section 5: Late Payment */}
      <div className="section">
        <h2>5. Atraso no Pagamento</h2>
        <p>Caso alguma parcela não seja paga em até <strong>5 dias</strong> após o vencimento:</p>
        <p>• <strong>Multa:</strong> 2% sobre o valor da parcela + juros de 1% ao mês.</p>
        <p>• <strong>Inadimplência:</strong> Se houver parcelas em atraso, o saldo total passa a ser devido imediatamente. O Vendedor poderá solicitar a devolução do aparelho.</p>
      </div>

      {/* Section 6: Warranty */}
      <div className="section">
        <h2>6. Garantia e Termos Adicionais</h2>
        {unit.warranty_terms ? (
          <p className="whitespace-pre-line">{unit.warranty_terms}</p>
        ) : (
          <>
            <p>• O celular continua sendo propriedade do Vendedor até a quitação total.</p>
            <p>• O Comprador assume responsabilidade por perda, roubo ou danos após a entrega.</p>
            <p>• O Vendedor não se responsabiliza por garantia após <strong>90 dias</strong>, exceto garantia do fabricante se for novo.</p>
          </>
        )}
      </div>

      {/* Section 7: Additional Clauses */}
      <div className="section">
        <h2>7. Cláusulas Adicionais e Rescisão</h2>
        {unit.contract_terms ? (
          <p className="whitespace-pre-line text-xs">{unit.contract_terms}</p>
        ) : (
          <>
            <p>• Efetuar os pagamentos nas datas combinadas.</p>
            <p>• Não vender, penhorar ou transferir o celular antes da quitação.</p>
            <p>• Se o Comprador ficar inadimplente e não pagar após notificação, o Vendedor poderá retomar o aparelho ou cobrar judicialmente o saldo restante.</p>
            <p>• Valores já pagos não serão devolvidos, podendo ser retidos como taxa de uso/aluguel.</p>
          </>
        )}
      </div>

      <div className="footer">
        <p className="legal-note">Este contrato é regido pela lei brasileira. Qualquer conflito será resolvido no foro da comarca de Balneário Arroio do Silva/SC.</p>

        <div className="signature-box">
          <div className="signature-line">
            {unit.name || 'MDR Informática'}<br />
            <span style={{ fontSize: 8.5 }}>Vendedor / Responsável</span><br />
            <span style={{ fontSize: 8 }}>Data: {today}</span>
          </div>
          <div className="signature-line">
            {customer.name}<br />
            <span style={{ fontSize: 8.5 }}>Comprador — CPF: {formatCPF(customer.cpf)}</span><br />
            <span style={{ fontSize: 8 }}>Data: {today}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
