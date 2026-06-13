import React from 'react';
import { formatCPF, formatPhone } from '../../lib/utils';

export interface PixInstallment {
  id: string;
  number: number;
  total: number;
  value: number;
  due_date: string;
  status: string;
  customer_name?: string;
  paid_at?: string;
  payment_method?: string;
}

interface PixBoletoPrintProps {
  installments: PixInstallment[];
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
}

export default function PixBoletoPrint({ installments, customer, unit }: PixBoletoPrintProps) {
  const today = new Date().toLocaleDateString('pt-BR');
  const PIX_PAYLOAD = '00020126360014BR.GOV.BCB.PIX0114+55489990358545204000053039865802BR5901N6001C62160512MaykondaRosa6304AC2B';

  const calculateOverdueFees = (value: number, dueDateStr: string, status: string) => {
    if (status === 'paid') {
      return { multa: 0, juros: 0, total: value, daysLate: 0, isLate: false };
    }
    const dueDate = new Date(dueDateStr + 'T12:00:00');
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const isPastDue = dueDate < todayDate;
    if (!isPastDue) {
      return { multa: 0, juros: 0, total: value, daysLate: 0, isLate: false };
    }
    const diffMs = todayDate.getTime() - dueDate.getTime();
    const daysLate = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const monthsLate = daysLate / 30;
    const multa = value * 0.02;
    const juros = value * 0.01 * monthsLate;
    const total = value + multa + juros;
    return { multa, juros, total, daysLate, isLate: true };
  };

  return (
    <div className="pix-boleto-print-wrapper select-text" contentEditable={true} suppressContentEditableWarning={true}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .pix-boleto-print-wrapper {
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          background: #ffffff;
        }

        .pix-slip-page {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm 15mm;
          box-sizing: border-box;
          background: #ffffff;
          position: relative;
          page-break-after: always;
          break-after: page;
        }

        .pix-slip-page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }

        .pix-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }

        .pix-brand-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pix-logo-img {
          height: 38px;
          width: auto;
          filter: grayscale(1) contrast(1.5);
        }

        .pix-brand-title {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .pix-brand-sub {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #64748b;
          text-transform: uppercase;
        }

        .pix-doc-title {
          text-align: right;
        }

        .pix-doc-title h1 {
          font-size: 16px;
          font-weight: 900;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .pix-doc-title p {
          font-size: 9px;
          color: #64748b;
          margin: 2px 0 0 0;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .pix-grid-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }

        .pix-grid-table td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          vertical-align: top;
          font-size: 10px;
          color: #1e293b;
        }

        .pix-grid-table tr:nth-child(even) td {
          background-color: #f8fafc;
        }

        .pix-grid-table td.pix-table-header {
          background-color: #f1f5f9;
          color: #0f172a;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 9px;
          border-bottom: 2px solid #0f172a;
          letter-spacing: 0.5px;
        }

        .pix-cell-label {
          font-size: 7.5px;
          color: #64748b;
          text-transform: uppercase;
          display: block;
          margin-bottom: 3px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .pix-cell-value {
          font-weight: 600;
          font-size: 10px;
          color: #0f172a;
        }

        .pix-payment-section {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 16px;
          margin-top: 20px;
          background: #f8fafc;
        }

        .pix-payment-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 8px;
        }

        .pix-payment-header h3 {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0.5px;
        }

        .pix-payment-grid {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 20px;
          align-items: start;
        }

        .pix-qr-box {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px;
          background: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .pix-qr-img {
          width: 120px;
          height: 120px;
          object-fit: contain;
        }

        .pix-instructions {
          font-size: 9.5px;
          line-height: 1.5;
          color: #334155;
        }

        .pix-copia-cola-box {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 8.5px;
          word-break: break-all;
          margin-top: 8px;
          color: #0f172a;
          max-height: 50px;
          overflow: hidden;
        }

        .pix-warning-alert {
          margin-top: 12px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 700;
          line-height: 1.4;
        }

        .pix-footer-receipt {
          margin-top: 40px;
          border-top: 1px dashed #64748b;
          padding-top: 24px;
        }

        .pix-receipt-ticket {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 9.5px;
        }

        .pix-receipt-header {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 9px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }

        .pix-receipt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .pix-receipt-sig {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          gap: 40px;
        }

        .pix-sig-col {
          flex: 1;
          text-align: center;
        }

        .pix-sig-line {
          border-top: 1px solid #94a3b8;
          margin-bottom: 4px;
          margin-top: 25px;
        }

        .pix-sig-sub {
          font-size: 8px;
          color: #64748b;
          font-weight: 600;
        }

        @media print {
          body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body > *:not(#print-mount-point) { display: none !important; }
          #print-mount-point { display: block !important; }
          #print-mount-point .pix-boleto-print-wrapper { display: block !important; }
          .pix-slip-page {
            border: none !important;
            margin: 0 !important;
            padding: 15mm 12mm 15mm 12mm !important;
            height: 297mm !important;
            width: 210mm !important;
            box-sizing: border-box !important;
          }
          @page {
            size: A4;
            margin: 0 !important;
          }
        }
      `}} />

      {installments.map((inst, index) => {
        const fees = calculateOverdueFees(inst.value, inst.due_date, inst.status);
        const formatValue = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const cleanUnitName = (unit.name || 'MDR').replace(/MDR\s*(Informática\s*(e|&)\s*Celulares)?\s*-\s*/gi, '').toUpperCase();

        return (
          <div key={inst.id} className="pix-slip-page">
            {/* Header */}
            <div className="pix-header">
              <div className="pix-brand-box">
                <img 
                  src="/logo-mdr.png" 
                  alt="MDR Logo" 
                  className="pix-logo-img"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <div className="pix-brand-title">MDR</div>
                  <div className="pix-brand-sub">Informática &amp; Celulares</div>
                </div>
              </div>
              <div className="pix-doc-title">
                <h1>Recibo / Boleto Pix</h1>
                <p>Parcela {inst.number} de {inst.total}</p>
              </div>
            </div>

            {/* Creditor info */}
            <table className="pix-grid-table">
              <thead>
                <tr>
                  <td colSpan={3} className="pix-table-header">I. Beneficiário (Credor)</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ width: '45%' }}>
                    <span className="pix-cell-label">Razão Social / Nome Fantasia</span>
                    <span className="pix-cell-value">{unit.name || 'MDR Informática & Celulares'}</span>
                  </td>
                  <td style={{ width: '30%' }}>
                    <span className="pix-cell-label">CNPJ / CPF</span>
                    <span className="pix-cell-value">{unit.cnpj || '_____________________'}</span>
                  </td>
                  <td style={{ width: '25%' }}>
                    <span className="pix-cell-label">Telefone / WhatsApp</span>
                    <span className="pix-cell-value">{unit.phone ? formatPhone(unit.phone) : '_____________________'}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3}>
                    <span className="pix-cell-label">Endereço da Loja</span>
                    <span className="pix-cell-value">{unit.address || '_____________________'}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Debtor info */}
            <table className="pix-grid-table">
              <thead>
                <tr>
                  <td colSpan={3} className="pix-table-header">II. Pagador (Cliente)</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ width: '45%' }}>
                    <span className="pix-cell-label">Nome do Cliente</span>
                    <span className="pix-cell-value">{customer.name}</span>
                  </td>
                  <td style={{ width: '30%' }}>
                    <span className="pix-cell-label">CPF / CNPJ</span>
                    <span className="pix-cell-value">{formatCPF(customer.cpf)}</span>
                  </td>
                  <td style={{ width: '25%' }}>
                    <span className="pix-cell-label">Telefone / WhatsApp</span>
                    <span className="pix-cell-value">{formatPhone(customer.phone)}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3}>
                    <span className="pix-cell-label">Endereço Residencial</span>
                    <span className="pix-cell-value">{customer.address || '__________________________________________________________________'}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Installment details */}
            <table className="pix-grid-table">
              <thead>
                <tr>
                  <td colSpan={4} className="pix-table-header">III. Demonstrativo do Débito</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ width: '25%' }}>
                    <span className="pix-cell-label">Identificação Parcela</span>
                    <span className="pix-cell-value">Parcela {inst.number}/{inst.total}</span>
                  </td>
                  <td style={{ width: '25%' }}>
                    <span className="pix-cell-label">Vencimento Original</span>
                    <span className="pix-cell-value">{new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </td>
                  <td style={{ width: '25%' }}>
                    <span className="pix-cell-label">Dias em Atraso</span>
                    <span className="pix-cell-value">{fees.daysLate} dia(s)</span>
                  </td>
                  <td style={{ width: '25%' }}>
                    <span className="pix-cell-label">Valor Original Parcela</span>
                    <span className="pix-cell-value">R$ {formatValue(inst.value)}</span>
                  </td>
                </tr>
                {fees.isLate && (
                  <tr>
                    <td>
                      <span className="pix-cell-label">Multa por Atraso (2%)</span>
                      <span className="pix-cell-value text-red-600">+ R$ {formatValue(fees.multa)}</span>
                    </td>
                    <td>
                      <span className="pix-cell-label">Juros de Mora (1%/mês)</span>
                      <span className="pix-cell-value text-red-600">+ R$ {formatValue(fees.juros)}</span>
                    </td>
                    <td colSpan={2}>
                      <span className="pix-cell-label">Valor Atualizado a Pagar</span>
                      <span className="pix-cell-value font-bold text-red-600" style={{ fontSize: '12px' }}>R$ {formatValue(fees.total)}</span>
                    </td>
                  </tr>
                )}
                {!fees.isLate && (
                  <tr>
                    <td colSpan={4}>
                      <span className="pix-cell-label">Valor Total a Pagar</span>
                      <span className="pix-cell-value font-bold text-green-700" style={{ fontSize: '12px' }}>R$ {formatValue(inst.value)}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pix Payment Section */}
            <div className="pix-payment-section">
              <div className="pix-payment-header">
                <h3>IV. Instruções de Pagamento via PIX</h3>
              </div>
              <div className="pix-payment-grid">
                <div className="pix-qr-box">
                  <img src="/Pix.png" alt="PIX QR Code" className="pix-qr-img" />
                </div>
                <div className="pix-instructions">
                  <p style={{ margin: '0 0 6px 0' }}>
                    Para efetuar o pagamento, abra o aplicativo do seu banco, escolha a opção <strong>PIX</strong> e aponte a câmera para o QR Code ao lado ou clique na caixa de texto abaixo para copiar o código Pix Copia-e-Cola:
                  </p>
                  <div className="pix-copia-cola-box">
                    {PIX_PAYLOAD}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '9px', color: '#64748b' }}>
                    Beneficiário do Pix: <strong>Maykon da Rosa</strong>
                  </div>
                </div>
              </div>

              <div className="pix-warning-alert">
                Atenção: Ao ler o QR Code ou utilizar o Pix Copia-e-Cola, você deverá preencher manualmente o valor exato da parcela atualizada de R$ {formatValue(fees.total)} no aplicativo do seu banco.
              </div>
            </div>

            {/* Ficha de Compensação Visual no Rodapé */}
            <div className="pix-footer-receipt">
              <div className="pix-receipt-ticket">
                <div className="pix-receipt-header">
                  <span>Recibo do Sacado — Via do Cliente</span>
                  <span>MDR - LOJA: {cleanUnitName}</span>
                </div>
                <div className="pix-receipt-row">
                  <div><strong>Pagador:</strong> {customer.name}</div>
                  <div><strong>Parcela:</strong> {inst.number}/{inst.total}</div>
                </div>
                <div className="pix-receipt-row">
                  <div><strong>Vencimento:</strong> {new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                  <div><strong>Valor Documento:</strong> R$ {formatValue(inst.value)}</div>
                </div>
                <div className="pix-receipt-row">
                  <div><strong>Valor Atualizado:</strong> R$ {formatValue(fees.total)}</div>
                  <div><strong>Data de Emissão:</strong> {today}</div>
                </div>
                <div className="pix-receipt-sig">
                  <div className="pix-sig-col">
                    <div className="pix-sig-line"></div>
                    <span className="pix-sig-sub">Assinatura do Cliente / Pagador</span>
                  </div>
                  <div className="pix-sig-col">
                    <div className="pix-sig-line"></div>
                    <span className="pix-sig-sub">{unit.name || 'MDR Informática'}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
