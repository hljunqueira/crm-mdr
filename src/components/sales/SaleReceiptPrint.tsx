import React from 'react';
import { formatCPF, formatPhone, resolveUnitInfo } from '../../lib/utils';

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
    created_at?: string;
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
  installments?: any[];
  layout?: 'thermal' | 'a4';
  isPreview?: boolean;
}

export default function SaleReceiptPrint({
  sale,
  customer,
  unit,
  installmentValue,
  firstInstallmentValue,
  sellerName,
  installments,
  layout = 'a4',
  isPreview = false
}: SaleReceiptPrintProps) {
  const resolvedUnit = resolveUnitInfo(unit);
  const today = new Date().toLocaleDateString('pt-BR');
  
  const formatPaymentDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
      return new Date(cleanStr).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const saleDateFormatted = formatPaymentDate(sale.date || sale.created_at) || today;
  const basePrice = sale.total_value - (sale.service_fee || 0);
  const originalPrice = sale.original_price && sale.original_price > 0 ? sale.original_price : basePrice;
  const discountValue = originalPrice > basePrice ? originalPrice - basePrice : 0;
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

  const renderThermalReceipt = () => {
    const cleanUnitName = (resolvedUnit.name || 'MDR').replace(/MDR\s*(Informática\s*(e|&)\s*Celulares)?\s*-\s*/gi, '').toUpperCase();
    return (
      <div className="thermal-receipt">
        <div className="copy-indicator">COMPROVANTE DE VENDA</div>
        <div className="header-center">
          <div className="brand-name">MDR</div>
          <div className="brand-sub">INFORMÁTICA & CELULARES</div>
          <div className="unit-details" style={{ fontSize: '9px', lineHeight: '1.25', color: '#333' }}>
            <strong>LOJA: {cleanUnitName}</strong>
            {resolvedUnit.cnpj && <> | CNPJ: {resolvedUnit.cnpj}</>}
            {resolvedUnit.phone && <> | Tel: {formatPhone(resolvedUnit.phone)}</>}
            <br />
            {resolvedUnit.address}
          </div>
        </div>

        <div className="double-divider"></div>

        <div className="header-center">
          <div className="receipt-title">NOTA DE VENDA</div>
          <div className="receipt-date" style={{ fontSize: '9px', marginTop: '2px' }}>
            N° #{receiptNumber} | DATA: {saleDateFormatted} {sellerName ? `| ATENDENTE: ${sellerName.toUpperCase()}` : ''}
          </div>
        </div>

        <div className="divider"></div>

        <div className="section-title">DADOS DO CLIENTE</div>
        <div className="row">
          <span>Nome:</span>
          <span className="align-right">{customer.name?.toUpperCase()}</span>
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
            <span className="align-right">{customer.address?.toUpperCase()}</span>
          </div>
        )}

        <div className="divider"></div>

        <div className="section-title">PRODUTOS E SERVIÇOS</div>
        <div className="row">
          <span>Aparelho:</span>
          <span className="align-right">{sale.device_model?.toUpperCase()}</span>
        </div>
        <div className="row">
          <span>IMEI/Serial:</span>
          <span className="align-right font-mono">{sale.imei || '—'}</span>
        </div>
        {sale.device_color && (
          <div className="row">
            <span>Cor:</span>
            <span className="align-right">{sale.device_color?.toUpperCase()}</span>
          </div>
        )}
        {(() => {
          const cleanedAccessories = sale.accessories
            ? sale.accessories
                .split('|')
                .map(item => item.trim())
                .filter(item => item && !(item.startsWith('[') && item.endsWith(']')))
                .join(' | ')
            : '';
          if (!cleanedAccessories) return null;
          return (
            <div className="row">
              <span>Acessórios:</span>
              <span className="align-right text-small">{cleanedAccessories?.toUpperCase()}</span>
            </div>
          );
        })()}
        <div className="row">
          <span>Pagamento:</span>
          <span className="align-right">{getPaymentLabel(sale.payment_type)}</span>
        </div>

        <div className="divider"></div>

        <div className="section-title">RESUMO FINANCEIRO</div>
        {discountValue > 0 && (
          <>
            <div className="row">
              <span>Valor Original:</span>
              <span className="align-right font-mono">R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="row" style={{ color: '#16a34a', fontWeight: 'bold' }}>
              <span>Desconto:</span>
              <span className="align-right font-mono">- R$ {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
        <div className="row">
          <span>Preço de Venda:</span>
          <span className="align-right font-mono">R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>

        {sale.down_payment > 0 && sale.payment_type !== 'vista' && sale.payment_type !== 'debit' && (
          <>
            <div className="row">
              <span>Entrada:</span>
              <span className="align-right font-mono">R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {sale.down_payment_method === 'trade' && (
              <div className="trade-box">
                Recebido: {sale.trade_device_model?.toUpperCase()} (IMEI: {sale.trade_device_imei || 'N/A'})
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
              Troca: {sale.trade_in_device_brand?.toUpperCase()} {sale.trade_in_device_model?.toUpperCase()} {sale.trade_in_device_imei ? `(IMEI: ${sale.trade_in_device_imei})` : ''}
            </div>
          </>
        )}

        {sale.payment_type === 'crediario' && (
          <>
            <div className="row">
              <span>Saldo Financiado:</span>
              <span className="align-right font-mono">R$ {financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {(() => {
              if (installments && installments.length > 0) {
                const firstVal = installments[0].value;
                const allSame = installments.every(inst => inst.value === firstVal);
                if (allSame) {
                  return (
                    <div className="row">
                      <span>Parcelas:</span>
                      <span className="align-right font-mono">{sale.installments}x de R$ {firstVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                }
                const rest = installments.slice(1);
                const restVal = rest[0]?.value;
                const restAllSame = rest.every(inst => inst.value === restVal);
                if (restAllSame && restVal !== undefined) {
                  return (
                    <>
                      <div className="row">
                        <span>1ª Parcela:</span>
                        <span className="align-right font-mono">R$ {firstVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {sale.installments > 1 && (
                        <div className="row">
                          <span>Parcelas 2-{sale.installments}:</span>
                          <span className="align-right font-mono">{sale.installments - 1}x de R$ {restVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </>
                  );
                }
                return (
                  <div className="space-y-0.5">
                    {installments.map((inst, idx) => (
                      <div className="row text-small" key={idx}>
                        <span>Parcela {inst.number || idx + 1}:</span>
                        <span className="align-right font-mono">R$ {inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              
              if (hasGracePeriod) {
                return (
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
                );
              }
              return (
                <div className="row">
                  <span>Parcelas:</span>
                  <span className="align-right font-mono">{sale.installments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })()}
            <div className="row">
              <span>1º Vencimento:</span>
              <span className="align-right font-mono">
                {(() => {
                  if (installments && installments.length > 0) {
                    const sorted = [...installments].sort((a, b) => a.number - b.number);
                    const targetInst = sale.down_payment > 0 && sorted.length > 1 ? sorted[1] : sorted[0];
                    const firstDate = (targetInst as any).due_date || (targetInst as any).dueDate;
                    if (firstDate) {
                      const cleanStr = firstDate.includes('T') ? firstDate : `${firstDate}T12:00:00`;
                      return new Date(cleanStr).toLocaleDateString('pt-BR');
                    }
                  }
                  return new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR');
                })()}
              </span>
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

        <div className="total-box">
          <div className="total-label">VALOR TOTAL</div>
          <div className="total-val">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>

        <div className="divider"></div>

        {sale.payment_type === 'crediario' && (
          <>
            <div style={{ height: '40px' }}></div>
            <div className="sig-line-box">
              <div className="sig-line"></div>
              <span className="sig-label">{resolvedUnit.name?.toUpperCase()}<br />Vendedor / Responsável</span>
            </div>

            <div style={{ height: '55px' }}></div>

            <div className="sig-line-box">
              <div className="sig-line"></div>
              <span className="sig-label">{customer.name?.toUpperCase()}<br />Comprador</span>
            </div>
          </>
        )}

        <div className="divider"></div>

        <div className="footer-note">
          Comprovante interno emitido por {resolvedUnit.name?.toUpperCase()}.<br />
          {sale.payment_type === 'crediario' ? (
            <>O aparelho é propriedade do vendedor até a quitação total das parcelas.<br />Pagamentos via PIX/Dinheiro/Transferência.</>
          ) : (
            <strong>Obrigado pela preferência!</strong>
          )}
        </div>
      </div>
    );
  };

  const renderA4Receipt = () => {
    return (
      <div className="a4-receipt">
        {/* Header Block */}
        <div className="receipt-header">
          <div className="header-left">
            <h1 className="header-brand">MDR</h1>
            <p className="header-tagline">INFORMÁTICA & CELULARES</p>
            <div className="header-unit-info">
              <span className="unit-badge">LOJA AUTORIZADA</span>
              <p><strong>{resolvedUnit.name.toUpperCase()}</strong></p>
              {resolvedUnit.cnpj && <p>CNPJ: {resolvedUnit.cnpj}</p>}
              {resolvedUnit.phone && <p>Telefone: {formatPhone(resolvedUnit.phone)}</p>}
              <p>{resolvedUnit.address?.toUpperCase()}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="document-badge">
              <h2>NOTA DE VENDA</h2>
              <p className="doc-num">Nº #{receiptNumber}</p>
            </div>
            <div className="metadata-table">
              <div className="meta-row">
                <span className="meta-label">Data de Emissão:</span>
                <span className="meta-value font-mono">{saleDateFormatted}</span>
              </div>
              {sellerName && (
                <div className="meta-row">
                  <span className="meta-label">Atendente:</span>
                  <span className="meta-value">{sellerName.toUpperCase()}</span>
                </div>
              )}
              <div className="meta-row">
                <span className="meta-label">Tipo Pagamento:</span>
                <span className="meta-value highlight">{getPaymentLabel(sale.payment_type)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Box */}
        <div className="receipt-section">
          <h3 className="section-heading">DADOS DO CLIENTE</h3>
          <div className="client-grid">
            <div>
              <span className="field-label">NOME COMPLETO</span>
              <span className="field-value font-semibold">{customer.name?.toUpperCase()}</span>
            </div>
            <div>
              <span className="field-label">CPF / CNPJ</span>
              <span className="field-value font-mono">{formatCPF(customer.cpf)}</span>
            </div>
            <div>
              <span className="field-label">TELEFONE / WHATSAPP</span>
              <span className="field-value font-mono">{formatPhone(customer.phone)}</span>
            </div>
            {customer.address && (
              <div className="col-span-3">
                <span className="field-label">ENDEREÇO</span>
                <span className="field-value">{customer.address?.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="receipt-section">
          <h3 className="section-heading">PRODUTOS E SERVIÇOS</h3>
          <table className="products-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Descrição do Item</th>
                <th style={{ width: '25%' }}>IMEI / Serial</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Qtd</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="prod-name">{sale.device_model?.toUpperCase()}</div>
                  {sale.device_color && <div className="prod-meta">Cor: {sale.device_color?.toUpperCase()}</div>}
                  {(() => {
                    const cleanedAccessories = sale.accessories
                      ? sale.accessories
                          .split('|')
                          .map(item => item.trim())
                          .filter(item => item && !(item.startsWith('[') && item.endsWith(']')))
                          .join(' | ')
                      : '';
                    if (!cleanedAccessories) return null;
                    return <div className="prod-meta text-primary">Acessórios inclusos: {cleanedAccessories?.toUpperCase()}</div>;
                  })()}
                </td>
                <td className="font-mono">{sale.imei || '—'}</td>
                <td style={{ textAlign: 'center' }}>1</td>
                <td className="font-mono" style={{ textAlign: 'right' }}>R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary and Payment Schedule */}
        <div className="summary-section">
          {/* Payment Schedule (Crediário) */}
          <div className="schedule-box">
            {sale.payment_type === 'crediario' ? (
              <>
                <h4 className="schedule-title">📅 CRONOGRAMA DE VENCIMENTOS (CREDIÁRIO)</h4>
                <div className="installments-grid">
                  {(() => {
                    const instList = installments && installments.length > 0 
                      ? installments 
                      : Array.from({ length: sale.installments }).map((_, idx) => {
                          const dateObj = new Date((sale.date || new Date().toISOString()) + 'T12:00:00');
                          dateObj.setMonth(dateObj.getMonth() + idx);
                          return {
                            number: idx + 1,
                            due_date: dateObj.toISOString().split('T')[0],
                            value: idx === 0 ? firstInstValue : instValue
                          };
                        });
                    
                    return instList.map((inst, idx) => (
                      <div className="inst-badge" key={idx}>
                        <span className="inst-num">{String(inst.number || idx + 1).padStart(2, '0')}</span>
                        <span className="inst-date font-mono">
                          {(() => {
                            const dateVal = inst.due_date || inst.dueDate || inst.date;
                            if (!dateVal) return '';
                            const cleanStr = dateVal.includes('T') ? dateVal : `${dateVal}T12:00:00`;
                            return new Date(cleanStr).toLocaleDateString('pt-BR');
                          })()}
                        </span>
                        <span className="inst-val font-mono">R$ {inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ));
                  })()}
                </div>
              </>
            ) : sale.payment_type === 'card' ? (
              <div className="payment-info-box">
                <p><strong>FORMA DE PARCELAMENTO:</strong></p>
                <p className="mt-1">Parcelado em <strong>{sale.installments}x</strong> no Cartão de Crédito.</p>
              </div>
            ) : (
              <div className="payment-info-box">
                <p><strong>FORMA DE PAGAMENTO:</strong></p>
                <p className="mt-1">Pagamento integral à vista no momento da venda.</p>
              </div>
            )}
          </div>

          {/* Financial summary values */}
          <div className="values-box">
            {discountValue > 0 && (
              <>
                <div className="val-row">
                  <span>Valor Original:</span>
                  <span className="font-mono">R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="val-row font-bold" style={{ color: '#16a34a' }}>
                  <span>Desconto:</span>
                  <span className="font-mono">- R$ {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            <div className="val-row">
              <span>Valor Base:</span>
              <span className="font-mono">R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>

            {sale.down_payment > 0 && sale.payment_type !== 'vista' && sale.payment_type !== 'debit' && (
              <div className="val-row">
                <span>Entrada recebida:</span>
                <span className="font-mono">- R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {sale.is_trade_in && (
              <div className="val-row text-red-600">
                <span>Valor de Troca:</span>
                <span className="font-mono">- R$ {Number(sale.trade_valuation ?? sale.trade_in_valuation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {sale.payment_type === 'crediario' && (
              <div className="val-row">
                <span>Saldo Financiado:</span>
                <span className="font-mono">R$ {financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {(sale.payment_type === 'vista' || sale.payment_type === 'debit') && (sale as any).amount_paid > 0 && (
              <>
                <div className="val-row">
                  <span>Valor Pago:</span>
                  <span className="font-mono">R$ {(sale as any).amount_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="val-row">
                  <span>Troco:</span>
                  <span className="font-mono">R$ {(sale as any).change_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}

            <div className="grand-total-row">
              <span className="lbl">VALOR TOTAL DA NOTA</span>
              <span className="val font-mono">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes & Terms */}
        <div className="receipt-terms">
          <p><strong>CONDIÇÕES GERAIS E DECLARAÇÃO DE RECEBIMENTO</strong></p>
          <p className="mt-1">
            Declaramos para os devidos fins que os produtos e/ou serviços acima descritos foram devidamente entregues e testados em perfeito estado de funcionamento.
            {sale.payment_type === 'crediario' && ' O aparelho celular/notebook descrito nesta nota permanece sob reserva de domínio e propriedade do vendedor até a quitação integral de todas as parcelas acordadas no cronograma de vencimentos acima.'}
          </p>
        </div>

        {/* Signatures */}
        <div className="signatures-block">
          <div className="sig-col">
            <div className="sig-line"></div>
            <p className="sig-name">{resolvedUnit.name.toUpperCase()}</p>
            <p className="sig-title">Representante de Vendas</p>
          </div>
          <div className="sig-col">
            <div className="sig-line"></div>
            <p className="sig-name">{customer.name.toUpperCase()}</p>
            <p className="sig-title">Cliente / Comprador</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="sale-receipt" className={isPreview ? "" : "hidden"}>
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            margin: 0;
            size: ${layout === 'thermal' ? '80mm auto' : 'A4'};
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
        }

        /* Thermal receipt styles */
        .thermal-receipt {
          width: 80mm;
          margin: 0 auto;
          padding: 3mm;
          box-sizing: border-box;
          font-family: 'Inter', Arial, sans-serif;
          font-size: 10.5px;
          color: #000;
          background: #fff;
          line-height: 1.3;
          font-weight: bold;
        }
        .thermal-receipt .copy-indicator {
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          border: 1px solid #000;
          padding: 2px;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .thermal-receipt .header-center {
          text-align: center;
          margin-bottom: 6px;
        }
        .thermal-receipt .brand-name {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -1px;
          margin-bottom: 2px;
        }
        .thermal-receipt .brand-sub {
          font-size: 8px;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }
        .thermal-receipt .unit-details {
          font-size: 9px;
          color: #333;
        }
        .thermal-receipt .receipt-title {
          font-size: 14px;
          font-weight: bold;
          margin-top: 4px;
        }
        .thermal-receipt .receipt-date {
          font-size: 10px;
        }
        .thermal-receipt .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .thermal-receipt .double-divider {
          border-top: 1px double #000;
          border-bottom: 1px double #000;
          height: 3px;
          margin: 6px 0;
        }
        .thermal-receipt .section-title {
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 4px;
          font-size: 10px;
          letter-spacing: 0.5px;
          text-decoration: underline;
        }
        .thermal-receipt .row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .thermal-receipt .align-right {
          text-align: right;
          max-width: 60%;
          word-wrap: break-word;
        }
        .thermal-receipt .font-mono {
          font-family: 'Courier New', Courier, monospace;
        }
        .thermal-receipt .text-small {
          font-size: 9px;
        }
        .thermal-receipt .trade-box {
          background: #f0f0f0;
          border: 1px dashed #000;
          padding: 4px;
          margin: 2px 0;
          font-size: 9px;
        }
        .thermal-receipt .total-box {
          border: 2px solid #000;
          padding: 6px;
          margin: 8px 0;
          text-align: center;
        }
        .thermal-receipt .total-label {
          font-size: 9px;
          font-weight: bold;
        }
        .thermal-receipt .total-val {
          font-size: 18px;
          font-weight: bold;
        }
        .thermal-receipt .sig-line-box {
          margin-top: 25px;
          text-align: center;
        }
        .thermal-receipt .sig-line {
          border-top: 1px solid #000;
          width: 80%;
          margin: 0 auto 4px auto;
        }
        .thermal-receipt .sig-label {
          font-size: 9px;
          line-height: 1.1;
          display: block;
        }
        .thermal-receipt .footer-note {
          font-size: 8px;
          text-align: center;
          margin-top: 8px;
          line-height: 1.2;
        }

        /* A4 Premium layout styles */
        .a4-receipt {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm 15mm;
          box-sizing: border-box;
          font-family: 'Inter', Arial, sans-serif;
          font-size: 12px;
          color: #1e293b;
          background: #ffffff;
          line-height: 1.5;
        }
        .a4-receipt .receipt-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 6mm;
          margin-bottom: 8mm;
        }
        .a4-receipt .header-brand {
          font-size: 32px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
          letter-spacing: -1.5px;
          margin: 0;
        }
        .a4-receipt .header-tagline {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #64748b;
          margin: 2px 0 0 0;
          text-transform: uppercase;
        }
        .a4-receipt .header-unit-info {
          margin-top: 4mm;
          font-size: 11px;
          color: #475569;
          line-height: 1.4;
        }
        .a4-receipt .unit-badge {
          display: inline-block;
          background: #f1f5f9;
          color: #0f172a;
          font-size: 8px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .a4-receipt .document-badge {
          text-align: right;
        }
        .a4-receipt .document-badge h2 {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .a4-receipt .document-badge .doc-num {
          font-size: 14px;
          font-weight: 700;
          color: #3b82f6;
          margin: 2px 0 0 0;
        }
        .a4-receipt .metadata-table {
          margin-top: 6mm;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
        }
        .a4-receipt .meta-row {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .a4-receipt .meta-label {
          color: #64748b;
          font-weight: 500;
        }
        .a4-receipt .meta-value {
          font-weight: 700;
          color: #0f172a;
          min-width: 100px;
          text-align: right;
        }
        .a4-receipt .meta-value.highlight {
          color: #3b82f6;
          text-transform: uppercase;
        }

        .a4-receipt .receipt-section {
          margin-bottom: 8mm;
        }
        .a4-receipt .section-heading {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #0f172a;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 4px;
          margin-bottom: 4mm;
          text-transform: uppercase;
        }
        .a4-receipt .client-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4mm;
          background: #f8fafc;
          padding: 4mm;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }
        .a4-receipt .field-label {
          display: block;
          font-size: 8px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .a4-receipt .field-value {
          font-size: 11.5px;
          color: #0f172a;
        }
        .a4-receipt .col-span-3 {
          grid-column: span 3;
        }

        .a4-receipt .products-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .a4-receipt .products-table th {
          background: #0f172a;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 3mm 4mm;
        }
        .a4-receipt .products-table td {
          padding: 4mm;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
          font-size: 11.5px;
        }
        .a4-receipt .prod-name {
          font-weight: 700;
          color: #0f172a;
        }
        .a4-receipt .prod-meta {
          font-size: 10px;
          color: #64748b;
          margin-top: 1px;
        }

        .a4-receipt .summary-section {
          display: grid;
          grid-template-columns: 1.3fr 0.7fr;
          gap: 8mm;
          margin-top: 6mm;
          align-items: start;
        }
        .a4-receipt .schedule-box {
          background: #f8fafc;
          padding: 5mm;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .a4-receipt .schedule-title {
          font-size: 10px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4mm;
        }
        .a4-receipt .installments-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2.5mm;
        }
        .a4-receipt .inst-badge {
          display: flex;
          align-items: center;
          background: #ffffff;
          padding: 2.5mm 3mm;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          justify-content: space-between;
          font-size: 10.5px;
        }
        .a4-receipt .inst-num {
          font-weight: 800;
          color: #64748b;
          background: #f1f5f9;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 9px;
        }
        .a4-receipt .inst-date {
          color: #475569;
          font-weight: 500;
        }
        .a4-receipt .inst-val {
          font-weight: 700;
          color: #0f172a;
        }
        .a4-receipt .payment-info-box {
          font-size: 11px;
          color: #475569;
        }

        .a4-receipt .values-box {
          display: flex;
          flex-direction: column;
          gap: 3mm;
          padding-left: 2mm;
        }
        .a4-receipt .val-row {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          color: #475569;
        }
        .a4-receipt .grand-total-row {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          border-top: 2px solid #0f172a;
          padding-top: 4mm;
          margin-top: 2mm;
        }
        .a4-receipt .grand-total-row .lbl {
          font-size: 9px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.5px;
        }
        .a4-receipt .grand-total-row .val {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
        }

        .a4-receipt .receipt-terms {
          margin-top: 10mm;
          font-size: 9.5px;
          color: #64748b;
          line-height: 1.4;
          text-align: justify;
          background: #f8fafc;
          padding: 4mm;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .a4-receipt .signatures-block {
          margin-top: 15mm;
          display: flex;
          justify-content: space-between;
          gap: 15mm;
        }
        .a4-receipt .sig-col {
          flex: 1;
          text-align: center;
        }
        .a4-receipt .sig-line {
          border-top: 1.5px solid #0f172a;
          margin-bottom: 2mm;
        }
        .a4-receipt .sig-name {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .a4-receipt .sig-title {
          font-size: 9px;
          color: #64748b;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      {layout === 'thermal' ? renderThermalReceipt() : renderA4Receipt()}
    </div>
  );
}
