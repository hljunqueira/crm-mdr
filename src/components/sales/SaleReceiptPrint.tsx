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
    down_payment_method?: string;
    trade_device_model?: string;
    trade_device_imei?: string;
    interest_table?: string;
    is_trade_in?: boolean;
    trade_in_device_brand?: string;
    trade_in_device_model?: string;
    trade_in_device_imei?: string;
    trade_in_valuation?: number;
    trade_valuation?: number;
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
  firstInstallmentValue?: number;
  sellerName?: string;
}

export default function SaleReceiptPrint({ sale, customer, unit, installmentValue, firstInstallmentValue, sellerName }: SaleReceiptPrintProps) {
  const today = new Date().toLocaleDateString('pt-BR');
  const basePrice = sale.original_price ?? sale.total_value;
  const tradeInVal = sale.is_trade_in ? (Number(sale.trade_in_valuation) || 0) : 0;
  const financed = basePrice - sale.down_payment - tradeInVal;
  const instValue = installmentValue ?? (sale.installments > 0 ? financed / sale.installments : 0);
  const firstInstValue = firstInstallmentValue ?? instValue;
  const hasGracePeriod = firstInstallmentValue !== undefined && firstInstallmentValue > instValue;

  const getPaymentLabel = (type?: string) => {
    switch (type) {
      case 'pix': return 'PIX';
      case 'money': return 'Dinheiro';
      case 'card': return 'Cartão de Crédito';
      case 'debit': return 'Cartão de Débito';
      case 'crediario': return 'Crediário da Loja';
      case 'vista': return 'À Vista (Dinheiro/Pix)';
      default: return type ? type.toUpperCase() : 'Não Informado';
    }
  };

  const receiptNumber = Math.floor(Math.random() * 900000 + 100000);

  const renderReceiptCopy = (copyTitle: string) => {
    return (
      <div className="thermal-receipt">
        {/* Copy Indicator */}
        <div className="copy-indicator">{copyTitle}</div>

        {/* Company Header */}
        {(() => {
          const cleanUnitName = (unit.name || 'MDR').replace(/MDR\s*(Informática\s*(e|&)\s*Celulares)?\s*-\s*/gi, '').toUpperCase();
          return (
            <div className="header-center">
              <div className="brand-name">MDR</div>
              <div className="brand-sub">INFORMÁTICA & CELULARES</div>
              <div className="unit-details" style={{ fontSize: '9px', lineHeight: '1.25', color: '#333' }}>
                <strong>LOJA: {cleanUnitName}</strong>
                {unit.cnpj && <> | CNPJ: {unit.cnpj}</>}
                {unit.phone && <> | Tel: {formatPhone(unit.phone)}</>}
                <br />
                {unit.address}
              </div>
            </div>
          );
        })()}

        <div className="double-divider"></div>

        {/* Title and Meta */}
        <div className="header-center">
          <div className="receipt-title">NOTA DE VENDA</div>
          <div className="receipt-date" style={{ fontSize: '9px', marginTop: '2px' }}>
            N° #{receiptNumber} | DATA: {today} {sellerName ? `| ATENDENTE: ${sellerName.toUpperCase()}` : ''}
          </div>
        </div>

        <div className="divider"></div>

        {/* Buyer Section */}
        <div className="section-title">DADOS DO CLIENTE</div>
        <div className="row">
          <span>Nome:</span>
          <span className="align-right">{customer.name}</span>
        </div>
        <div className="row">
          <span>CPF:</span>
          <span className="align-right font-mono">{formatCPF(customer.cpf)}</span>
        </div>
        <div className="row">
          <span>Tel:</span>
          <span className="align-right font-mono">{formatPhone(customer.phone)}</span>
        </div>
        {customer.address && (
          <div className="row">
            <span>Endereço:</span>
            <span className="align-right">{customer.address}</span>
          </div>
        )}

        <div className="divider"></div>

        {/* Product Section */}
        <div className="section-title">PRODUTOS E SERVIÇOS</div>
        <div className="row">
          <span>Aparelho:</span>
          <span className="align-right">{sale.device_model}</span>
        </div>
        <div className="row">
          <span>IMEI/Serial:</span>
          <span className="align-right font-mono">{sale.imei || '—'}</span>
        </div>
        {sale.device_color && (
          <div className="row">
            <span>Cor:</span>
            <span className="align-right">{sale.device_color}</span>
          </div>
        )}
        {sale.accessories && (
          <div className="row">
            <span>Acessórios:</span>
            <span className="align-right text-small">{sale.accessories}</span>
          </div>
        )}
        <div className="row">
          <span>Pagamento:</span>
          <span className="align-right">{getPaymentLabel(sale.payment_type)}</span>
        </div>

        <div className="divider"></div>

        {/* Financial Details */}
        <div className="section-title">RESUMO FINANCEIRO</div>
        <div className="row">
          <span>Preço Base:</span>
          <span className="align-right font-mono">R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>

        {sale.down_payment > 0 && (
          <>
            <div className="row">
              <span>Entrada:</span>
              <span className="align-right font-mono">R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {sale.down_payment_method === 'trade' && (
              <div className="trade-box">
                Recebido: {sale.trade_device_model} (IMEI: {sale.trade_device_imei || 'N/A'})
              </div>
            )}
          </>
        )}

        {sale.is_trade_in && (
          <>
            <div className="row text-primary">
              <span>Valor da Troca (Dedução):</span>
              <span className="align-right font-mono">- R$ {Number(sale.trade_valuation ?? sale.trade_in_valuation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="trade-box">
              Troca: {sale.trade_in_device_brand} {sale.trade_in_device_model} {sale.trade_in_device_imei ? `(IMEI: ${sale.trade_in_device_imei})` : ''}
            </div>
          </>
        )}

        {sale.payment_type === 'crediario' && (
          <>
            <div className="row">
              <span>Saldo Financiado:</span>
              <span className="align-right font-mono">R$ {financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {hasGracePeriod ? (
              <>
                <div className="row">
                  <span>1ª Parcela (Carência):</span>
                  <span className="align-right font-mono">R$ {firstInstValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {sale.installments > 1 && (
                  <div className="row">
                    <span>Parcelas 2-{sale.installments}:</span>
                    <span className="align-right font-mono">{sale.installments - 1}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="row">
                <span>Parcelas:</span>
                <span className="align-right font-mono">{sale.installments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="row">
              <span>1º Vencimento:</span>
              <span className="align-right font-mono">{new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
          </>
        )}

        {sale.payment_type === 'card' && (
          <div className="row">
            <span>Parcelamento:</span>
            <span className="align-right font-mono">
              {sale.installments}x {instValue > 0 ? `de R$ ${instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} no Cartão
            </span>
          </div>
        )}

        {(sale.payment_type === 'vista' || sale.payment_type === 'debit') && (sale as any).amount_paid > 0 && (
          <>
            <div className="row">
              <span>Valor Recebido:</span>
              <span className="align-right font-mono">R$ {(sale as any).amount_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="row">
              <span>Troco:</span>
              <span className="align-right font-mono">R$ {(sale as any).change_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}

        <div className="divider"></div>

        {/* Total Box */}
        <div className="total-box">
          <div className="total-label">VALOR TOTAL</div>
          <div className="total-val">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>

        {/* Discount Policy */}
        {sale.payment_type === 'crediario' && (
          <div className="discount-info">
            <span className="discount-title">POLÍTICA DE ANTECIPAÇÃO:</span><br />
            • 1 parc.: 3% de desc. nos juros<br />
            • 2 parc.: 5% de desc. nos juros<br />
            • 3+ parc.: 8% de desc. nos juros<br />
            • Quitação total: Negociação
          </div>
        )}

        <div className="divider"></div>

        {/* Signatures */}
        {sale.payment_type === 'crediario' && (
          <>
            <div className="sig-line-box" style={{ marginTop: '25px' }}>
              <div className="sig-line"></div>
              <span className="sig-label">{unit.name || 'MDR Informática & Celulares'}<br />Vendedor / Responsável</span>
            </div>

            <div className="sig-line-box" style={{ marginTop: '60px' }}>
              <div className="sig-line"></div>
              <span className="sig-label">{customer.name}<br />Comprador</span>
            </div>
          </>
        )}

        <div className="divider"></div>

        {/* Footer Note */}
        <div className="footer-note">
          Comprovante interno emitido por {unit.name || 'MDR Informática & Celulares'}.<br />
          {sale.payment_type === 'crediario' ? (
            <>O aparelho é propriedade do vendedor até a quitação total das parcelas.<br />Pagamentos via PIX/Dinheiro/Transferência.</>
          ) : (
            <strong>Obrigado pela preferência!</strong>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="sale-receipt" className="hidden">
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body > *:not(#print-mount-point) { display: none !important; }
          #print-mount-point { display: block !important; }
          @page {
            margin: 0;
            size: auto;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
        }
        .thermal-receipt {
          width: 80mm;
          margin: 0 auto;
          padding: 3mm;
          box-sizing: border-box;
          font-family: 'Inter', Arial, Helvetica, sans-serif;
          font-size: 10.5px;
          color: #000;
          background: #fff;
          line-height: 1.3;
          font-weight: bold;
        }
        .copy-indicator {
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          border: 1px solid #000;
          padding: 2px;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .header-center {
          text-align: center;
          margin-bottom: 6px;
        }
        .brand-name {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -1px;
          margin-bottom: 2px;
        }
        .brand-sub {
          font-size: 8px;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }
        .unit-details {
          font-size: 9px;
          color: #333;
        }
        .receipt-title {
          font-size: 14px;
          font-weight: bold;
          margin-top: 4px;
        }
        .receipt-num {
          font-size: 11px;
          font-weight: bold;
        }
        .receipt-date {
          font-size: 10px;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .double-divider {
          border-top: 1px double #000;
          border-bottom: 1px double #000;
          height: 3px;
          margin: 6px 0;
        }
        .section-title {
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 4px;
          font-size: 10px;
          letter-spacing: 0.5px;
          text-decoration: underline;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .align-right {
          text-align: right;
          max-width: 60%;
          word-wrap: break-word;
        }
        .font-mono {
          font-family: 'Courier New', Courier, monospace;
        }
        .text-small {
          font-size: 9px;
        }
        .trade-box {
          background: #f0f0f0;
          border: 1px dashed #000;
          padding: 4px;
          margin: 2px 0;
          font-size: 9px;
        }
        .total-box {
          border: 2px solid #000;
          padding: 6px;
          margin: 8px 0;
          text-align: center;
        }
        .total-label {
          font-size: 9px;
          font-weight: bold;
        }
        .total-val {
          font-size: 18px;
          font-weight: bold;
        }
        .discount-info {
          font-size: 9px;
          border: 1px dotted #000;
          padding: 4px;
          margin-top: 6px;
          line-height: 1.2;
        }
        .discount-title {
          font-weight: bold;
        }
        .sig-line-box {
          margin-top: 25px;
          text-align: center;
        }
        .sig-line {
          border-top: 1px solid #000;
          width: 80%;
          margin: 0 auto 4px auto;
        }
        .sig-label {
          font-size: 9px;
          line-height: 1.1;
          display: block;
        }
        .footer-note {
          font-size: 8px;
          text-align: center;
          margin-top: 8px;
          line-height: 1.2;
        }
        .receipt-separator {
          text-align: center;
          margin: 15px 0;
          border-top: 2px dashed #000;
          padding-top: 15px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 9px;
          color: #555;
          page-break-inside: avoid;
        }
      `}</style>

      {renderReceiptCopy("COMPROVANTE DE VENDA")}
    </div>
  );
}
