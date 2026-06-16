import React from 'react';
import { formatCPF, formatPhone, resolveUnitInfo, generatePixPayload, formatPixKey } from '../../lib/utils';

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
    pix_key?: string;
  };
}

export default function PixBoletoPrint({ installments, customer, unit }: PixBoletoPrintProps) {
  const resolvedUnit = resolveUnitInfo(unit);
  const today = new Date().toLocaleDateString('pt-BR');

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

  // Divide as parcelas em grupos de no máximo 4 para caberem em uma página A4
  const chunkedInstallments = [];
  for (let i = 0; i < installments.length; i += 4) {
    chunkedInstallments.push(installments.slice(i, i + 4));
  }

  return (
    <div className="pix-boleto-print-wrapper select-text" contentEditable={true} suppressContentEditableWarning={true}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .pix-boleto-print-wrapper {
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 0;
          margin: 0;
        }

        .pix-carne-page {
          width: 210mm;
          height: 297mm;
          padding: 10mm 12mm;
          box-sizing: border-box;
          background: #ffffff;
          position: relative;
          page-break-after: always;
          break-after: page;
          display: flex;
          flex-direction: column;
          gap: 3mm;
        }

        .pix-carne-page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }

        .pix-carne-row {
          display: flex;
          width: 100%;
          height: 62mm;
          border: 1.5px solid #000000;
          border-radius: 6px;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
        }

        /* Canhoto (narrow left slip) */
        .pix-canhoto {
          width: 50mm;
          border-right: 1.5px dashed #000000;
          padding: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          background-color: #f8fafc;
        }

        .pix-canhoto-title {
          font-size: 11px;
          font-weight: 900;
          color: #000000;
          text-transform: uppercase;
          border-bottom: 1.5px solid #000000;
          padding-bottom: 3px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pix-canhoto-info {
          font-size: 10px;
          line-height: 1.3;
          margin: 4px 0;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
        }

        .pix-canhoto-field {
          margin-bottom: 2px;
        }

        .pix-canhoto-label {
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          font-size: 8px;
          display: block;
        }

        .pix-canhoto-value {
          font-weight: bold;
          color: #000000;
        }

        .pix-canhoto-sig {
          border-top: 1.5px solid #000000;
          text-align: center;
          padding-top: 2px;
          font-size: 7.5px;
          font-weight: bold;
          color: #475569;
          text-transform: uppercase;
          margin-top: auto;
        }

        /* Corpo (wide right slip) */
        .pix-corpo {
          flex: 1;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          box-sizing: border-box;
          background: #ffffff;
        }

        .pix-corpo-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-right: 10px;
        }

        .pix-corpo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1.5px solid #000000;
          padding-bottom: 4px;
        }

        .pix-brand-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pix-brand-title {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .pix-brand-sub {
          font-size: 8.5px;
          font-weight: 800;
          color: #475569;
        }

        .pix-doc-title {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          color: #000000;
        }

        .pix-corpo-details {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 6px;
          margin-top: 4px;
        }

        .pix-corpo-field {
          background-color: #f8fafc;
          border: 1.5px solid #000000;
          border-radius: 4px;
          padding: 3px 6px;
        }

        .pix-corpo-label {
          font-size: 8.5px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          display: block;
        }

        .pix-corpo-value {
          font-size: 10.5px;
          font-weight: 700;
          color: #000000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pix-instructions-box {
          margin-top: 4px;
          border: 1.5px solid #000000;
          background-color: #fdfdfd;
          border-radius: 4px;
          padding: 4px;
          font-size: 10px;
          line-height: 1.3;
          color: #000000;
        }

        .pix-copia-cola-box {
          background: #f1f5f9;
          border: 1.5px solid #000000;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 8px;
          word-break: break-all;
          margin-top: 2px;
          color: #000000;
          max-height: 22px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pix-corpo-right {
          width: 130px;
          border-left: 1.5px dashed #000000;
          padding-left: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }

        .pix-qr-box {
          border: 1.5px solid #000000;
          border-radius: 4px;
          padding: 4px;
          background: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .pix-qr-img {
          width: 85px;
          height: 85px;
          object-fit: contain;
        }

        .pix-payment-info {
          font-size: 8.5px;
          color: #000000;
          text-align: center;
          line-height: 1.2;
        }

        .pix-cut-line {
          height: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #94a3b8;
          user-select: none;
          margin-top: 1mm;
          margin-bottom: 1mm;
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
          .pix-carne-page {
            border: none !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            height: 297mm !important;
            width: 210mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .pix-carne-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          @page {
            size: A4;
            margin: 0 !important;
          }
        }
      `}} />      {chunkedInstallments.map((group, pageIndex) => (
        <div key={pageIndex} className="pix-carne-page">
          {group.map((inst, idx) => {
            const fees = calculateOverdueFees(inst.value, inst.due_date, inst.status);
            const formatValue = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const rawPixKey = unit.pix_key || resolvedUnit.phone || '+5548999035854';
            const cleanKey = formatPixKey(rawPixKey);
            const cleanName = resolvedUnit.name || 'MDR';
            const cleanCity = resolvedUnit.city ? resolvedUnit.city.split('/')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9 ]/gi, '').trim().substring(0, 15).toUpperCase() : 'ARARANGUA';
            
            const payload = generatePixPayload(cleanKey, cleanName, cleanCity, fees.total, `MDR${inst.number}`);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(payload)}`;

            return (
              <React.Fragment key={inst.id}>
                <div className="pix-carne-row">
                  {/* CANHOTO (STUB) */}
                  <div className="pix-canhoto">
                    <div className="pix-canhoto-title">
                      <span>MDR</span>
                      <span style={{ fontSize: '7.5px' }}>PARC. {inst.number}/{inst.total}</span>
                    </div>
                    <div className="pix-canhoto-info">
                      <div className="pix-canhoto-field">
                        <span className="pix-canhoto-label">Vencimento</span>
                        <span className="pix-canhoto-value">{new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="pix-canhoto-field">
                        <span className="pix-canhoto-label">Valor Parcela</span>
                        <span className="pix-canhoto-value">R$ {formatValue(inst.value)}</span>
                      </div>
                      {fees.isLate && (
                        <div className="pix-canhoto-field">
                          <span className="pix-canhoto-label" style={{ color: '#ef4444' }}>Atraso / Total</span>
                          <span className="pix-canhoto-value" style={{ color: '#ef4444' }}>R$ {formatValue(fees.total)}</span>
                        </div>
                      )}
                      <div className="pix-canhoto-field">
                        <span className="pix-canhoto-label">Pagador</span>
                        <span className="pix-canhoto-value" style={{ fontSize: '7.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '40mm' }}>
                          {customer.name}
                        </span>
                      </div>
                    </div>
                    <div className="pix-canhoto-sig">
                      Assinatura / Visto
                    </div>
                  </div>

                  {/* CORPO DO BOLETO */}
                  <div className="pix-corpo">
                    <div className="pix-corpo-left">
                      {/* Header */}
                      <div className="pix-corpo-header">
                        <div className="pix-brand-box">
                          <span className="pix-brand-title">MDR</span>
                          <span className="pix-brand-sub">INFORMÁTICA & CELULARES</span>
                        </div>
                        <div className="pix-doc-title">
                          RECIBO / BOLETO PIX
                        </div>
                      </div>

                      {/* Dados do sacado/cedente */}
                      <div className="pix-corpo-details">
                        <div className="pix-corpo-field">
                          <span className="pix-corpo-label">Beneficiário</span>
                          <div className="pix-corpo-value">{resolvedUnit.name}</div>
                        </div>
                        <div className="pix-corpo-field">
                          <span className="pix-corpo-label">CNPJ / CPF</span>
                          <div className="pix-corpo-value">{resolvedUnit.cnpj || '—'}</div>
                        </div>
                        <div className="pix-corpo-field">
                          <span className="pix-corpo-label">WhatsApp</span>
                          <div className="pix-corpo-value">{resolvedUnit.phone ? formatPhone(resolvedUnit.phone) : '—'}</div>
                        </div>

                        <div className="pix-corpo-field" style={{ gridColumn: 'span 2' }}>
                          <span className="pix-corpo-label">Pagador</span>
                          <div className="pix-corpo-value">{customer.name} - CPF: {formatCPF(customer.cpf)}</div>
                        </div>
                        <div className="pix-corpo-field">
                          <span className="pix-corpo-label">WhatsApp</span>
                          <div className="pix-corpo-value">{formatPhone(customer.phone)}</div>
                        </div>
                      </div>

                      {/* Instruções */}
                      <div className="pix-instructions-box">
                        <strong>Instruções de Pagamento:</strong> Acesse seu banco, vá em PIX e aponte a câmera para o QR Code ao lado ou utilize o Pix Copia-e-Cola abaixo:
                        <div className="pix-copia-cola-box" title="Clique para selecionar e copiar">
                          {payload}
                        </div>
                      </div>
                    </div>

                    <div className="pix-corpo-right">
                      <div className="pix-qr-box">
                        <img src={qrUrl} alt="PIX QR Code" className="pix-qr-img" />
                      </div>
                      <div className="pix-payment-info">
                        <span className="pix-corpo-label">PARCELA</span>
                        <strong style={{ fontSize: '10px' }}>{inst.number} / {inst.total}</strong>
                      </div>
                      <div className="pix-payment-info">
                        <span className="pix-corpo-label">VENCIMENTO</span>
                        <strong style={{ fontSize: '9px' }}>{new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                      </div>
                      <div className="pix-payment-info">
                        <span className="pix-corpo-label">VALOR A PAGAR</span>
                        <strong style={{ fontSize: '11px', color: fees.isLate ? '#ef4444' : '#15803d' }}>
                          R$ {formatValue(fees.total)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
                {idx < group.length - 1 && (
                  <div className="pix-cut-line">
                    <span>✂️ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
}
