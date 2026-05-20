import React from 'react';
import { formatCPF, formatPhone } from '../../lib/utils';

interface SaleReceiptPrintProps {
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
  };
  installmentValue?: number;
}

// MDR Logo as inline SVG – always renders even offline/print
const MDRLogo = () => (
  <svg width="120" height="44" viewBox="0 0 240 88" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="240" height="88" rx="12" fill="#1a1a2e"/>
    <text x="12" y="60" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="52" fill="#6C63FF" letterSpacing="-2">MDR</text>
    <rect x="12" y="66" width="216" height="3" rx="1.5" fill="#6C63FF" opacity="0.6"/>
    <text x="12" y="82" fontFamily="Arial, sans-serif" fontSize="10" fill="#aaa" letterSpacing="3">INFORMÁTICA &amp; CELULARES</text>
  </svg>
);

export default function SaleReceiptPrint({ sale, customer, unit, installmentValue }: SaleReceiptPrintProps) {
  const today = new Date().toLocaleDateString('pt-BR');
  const basePrice = sale.original_price ?? sale.total_value;
  const financed = basePrice - sale.down_payment;
  const instValue = installmentValue ?? (sale.installments > 0 ? financed / sale.installments : 0);
  const paymentLabel = sale.payment_type === 'card' ? 'Cartão de Crédito' : 'Crediário da Loja';
  const receiptNumber = Math.floor(Math.random() * 900000 + 100000);

  return (
    <div id="sale-receipt" className="hidden">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body > *:not(#sale-receipt) { display: none !important; }
          #sale-receipt { display: block !important; font-family: Arial, sans-serif; color: #111; }
        }
        #sale-receipt {
          width: 210mm;
          min-height: 148mm;
          padding: 12mm 14mm;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #111;
          background: #fff;
        }
        #sale-receipt .receipt-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #6C63FF; }
        #sale-receipt .receipt-title { font-size: 18px; font-weight: 900; color: #1a1a2e; letter-spacing: -0.5px; }
        #sale-receipt .receipt-subtitle { font-size: 9px; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        #sale-receipt .receipt-meta { text-align: right; font-size: 10px; color: #555; }
        #sale-receipt .receipt-meta strong { color: #1a1a2e; }
        #sale-receipt .section { margin: 10px 0; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; }
        #sale-receipt .section-title { font-size: 9px; font-weight: 900; color: #6C63FF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; }
        #sale-receipt .row { display: flex; justify-content: space-between; margin: 3px 0; }
        #sale-receipt .row span { color: #555; }
        #sale-receipt .row strong { color: #111; }
        #sale-receipt .value-box { background: #f5f3ff; border: 2px solid #6C63FF; border-radius: 6px; padding: 8px 12px; margin: 8px 0; text-align: center; }
        #sale-receipt .value-box .label { font-size: 9px; color: #6C63FF; text-transform: uppercase; letter-spacing: 2px; font-weight: 900; }
        #sale-receipt .value-box .amount { font-size: 24px; font-weight: 900; color: #1a1a2e; letter-spacing: -1px; }
        #sale-receipt .installment-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px; }
        #sale-receipt .installment-grid .inst-card { border: 1px solid #ddd; border-radius: 4px; padding: 5px 8px; text-align: center; }
        #sale-receipt .inst-card .inst-num { font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
        #sale-receipt .inst-card .inst-val { font-size: 11px; font-weight: 900; color: #1a1a2e; }
        #sale-receipt .signature-area { display: flex; justify-content: space-between; margin-top: 14px; gap: 20px; }
        #sale-receipt .sig-box { flex: 1; }
        #sale-receipt .sig-line { border-top: 1.5px solid #bbb; margin-top: 30px; padding-top: 5px; font-size: 9px; color: #666; text-align: center; }
        #sale-receipt .footer-note { font-size: 8px; color: #aaa; text-align: center; margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 6px; }
      `}</style>

      <div className="receipt-header">
        <div>
          <MDRLogo />
          <div style={{ marginTop: 4, fontSize: 9, color: '#888' }}>
            {unit.cnpj && <span>CNPJ: {unit.cnpj} | </span>}
            {unit.address && <span>{unit.address}</span>}
          </div>
        </div>
        <div className="receipt-meta">
          <div className="receipt-title">NOTA DE VENDA</div>
          <div className="receipt-subtitle">Recibo de Compra</div>
          <div style={{ marginTop: 6 }}>
            <div>N° <strong>#{receiptNumber}</strong></div>
            <div>Data: <strong>{today}</strong></div>
            {unit.phone && <div>Tel: <strong>{unit.phone}</strong></div>}
          </div>
        </div>
      </div>

      {/* Buyer Info */}
      <div className="section">
        <div className="section-title">Dados do Comprador</div>
        <div className="row"><span>Nome:</span><strong>{customer.name}</strong></div>
        <div className="row"><span>CPF:</span><strong>{formatCPF(customer.cpf)}</strong></div>
        <div className="row"><span>Telefone:</span><strong>{formatPhone(customer.phone)}</strong></div>
        {customer.address && <div className="row"><span>Endereço:</span><strong>{customer.address}</strong></div>}
      </div>

      {/* Device Info */}
      <div className="section">
        <div className="section-title">Produto Adquirido</div>
        <div className="row"><span>Aparelho:</span><strong>{sale.device_model}</strong></div>
        <div className="row"><span>IMEI / Serial:</span><strong>{sale.imei || '—'}</strong></div>
        {sale.device_color && <div className="row"><span>Cor:</span><strong>{sale.device_color}</strong></div>}
        {sale.accessories && <div className="row"><span>Acessórios:</span><strong>{sale.accessories}</strong></div>}
        <div className="row"><span>Forma de Pagamento:</span><strong>{paymentLabel}</strong></div>
      </div>

      {/* Financial Summary */}
      <div className="value-box">
        <div className="label">Valor Total da Venda</div>
        <div className="amount">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        {sale.original_price && sale.original_price !== sale.total_value && (
          <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
            Preço base: R$ {sale.original_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + juros/serviços: R$ {((sale.service_fee ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-title">Resumo Financeiro</div>
        <div className="row"><span>Preço à Vista (base):</span><strong>R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
        <div className="row"><span>Entrada Paga:</span><strong>R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
        <div className="row"><span>Saldo Financiado:</span><strong>R$ {financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
        <div className="row"><span>Parcelado em:</span><strong>{sale.installments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
        <div className="row"><span>1° Vencimento:</span><strong>{new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></div>
      </div>

      {/* Signature */}
      <div className="signature-area">
        <div className="sig-box">
          <div className="sig-line">{unit.name || 'MDR Informática & Celulares'}<br /><span style={{ fontSize: 8 }}>Vendedor / Responsável</span></div>
        </div>
        <div className="sig-box">
          <div className="sig-line">{customer.name}<br /><span style={{ fontSize: 8 }}>Comprador — CPF: {formatCPF(customer.cpf)}</span></div>
        </div>
      </div>

      <div className="footer-note">
        Este documento é um comprovante interno de venda emitido por {unit.name || 'MDR Informática & Celulares'}.
        Guarde este recibo. O celular é propriedade do vendedor até a quitação total das parcelas.
        Pagamentos via PIX/Dinheiro/Transferência na data de vencimento de cada parcela.
      </div>
    </div>
  );
}
