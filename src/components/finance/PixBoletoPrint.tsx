import React, { useState, useEffect } from 'react';
import { formatCPF, formatPhone, resolveUnitInfo, generatePixPayload, formatPixKey } from '../../lib/utils';
import { useFinanceStore } from '../../store/useFinanceStore';

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
  asaas_invoice_url?: string;
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

// Componente para renderizar o código de barras Intercalado 2 de 5 (I25) em SVG
function BarcodeI25({ code }: { code: string }) {
  const cleanCode = code.replace(/\D/g, '');
  if (cleanCode.length !== 44) return null;

  const PATTERNS = [
    "00110", // 0
    "10001", // 1
    "01001", // 2
    "11000", // 3
    "00101", // 4
    "10100", // 5
    "01100", // 6
    "00011", // 7
    "10010", // 8
    "01010"  // 9
  ];

  const elements: { type: 'bar' | 'space'; wide: boolean }[] = [];
  
  // Start pattern: NnNn
  elements.push({ type: 'bar', wide: false });
  elements.push({ type: 'space', wide: false });
  elements.push({ type: 'bar', wide: false });
  elements.push({ type: 'space', wide: false });

  for (let i = 0; i < cleanCode.length; i += 2) {
    const d1 = parseInt(cleanCode[i], 10);
    const d2 = parseInt(cleanCode[i + 1], 10);
    const p1 = PATTERNS[d1];
    const p2 = PATTERNS[d2];

    for (let j = 0; j < 5; j++) {
      elements.push({ type: 'bar', wide: p1[j] === '1' });
      elements.push({ type: 'space', wide: p2[j] === '1' });
    }
  }

  // Stop pattern: WnN
  elements.push({ type: 'bar', wide: true });
  elements.push({ type: 'space', wide: false });
  elements.push({ type: 'bar', wide: false });

  const narrowWidth = 1.5;
  const wideWidth = 3.5;
  let currentX = 0;
  const rects: React.ReactNode[] = [];

  elements.forEach((el, idx) => {
    const width = el.wide ? wideWidth : narrowWidth;
    if (el.type === 'bar') {
      rects.push(
        React.createElement('rect', {
          key: idx,
          x: currentX,
          y: 0,
          width: width,
          height: 40,
          fill: '#000000'
        })
      );
    }
    currentX += width;
  });

  return React.createElement(
    'svg',
    {
      width: '100%',
      height: '100%',
      viewBox: `0 0 ${currentX} 40`,
      preserveAspectRatio: 'none',
      style: { display: 'block', width: '100%', height: '100%' }
    },
    rects
  );
}

export default function PixBoletoPrint({ installments, customer, unit }: PixBoletoPrintProps) {
  const resolvedUnit = resolveUnitInfo(unit);
  const today = new Date().toLocaleDateString('pt-BR');
  
  const { fetchAsaasDetails } = useFinanceStore();
  const [detailsMap, setDetailsMap] = useState<Record<string, { barcode: string | null; barCodeNumber: string | null; pixPayload: string | null; pixImage: string | null; invoiceUrl: string | null }>>({});

  useEffect(() => {
    const installmentsToFetch = installments.filter(inst => inst.asaas_invoice_url && !detailsMap[inst.id]);
    if (installmentsToFetch.length > 0) {
      Promise.all(
        installmentsToFetch.map(inst =>
          fetchAsaasDetails(inst.id)
            .then(data => ({ id: inst.id, data }))
            .catch(err => {
              console.error(`Failed to fetch details for ${inst.id}`, err);
              return { id: inst.id, data: null };
            })
        )
      ).then(results => {
        setDetailsMap(prev => {
          const next = { ...prev };
          results.forEach(res => {
            if (res.data) {
              next[res.id] = res.data;
            }
          });
          return next;
        });
      });
    }
  }, [installments, fetchAsaasDetails]);

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
          width: 100%;
          max-width: 210mm;
          height: 297mm;
          padding: 0 15mm;
          box-sizing: border-box;
          background: #ffffff;
          position: relative;
          page-break-after: always;
          break-after: page;
          display: flex;
          flex-direction: column;
        }

        .pix-carne-page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }

        .pix-installment-slot {
          height: 68mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .pix-carne-row {
          display: flex;
          width: 100%;
          height: 60mm;
          border: 1.5px solid #000000;
          border-radius: 6px;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
        }

        /* Canhoto (narrow left slip) */
        .pix-canhoto {
          width: 42mm;
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
          min-width: 0;
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
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
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
          font-size: 9.5px;
          font-weight: 700;
          color: #000000;
          white-space: normal;
          line-height: 1.15;
          word-break: break-word;
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
          font-size: 7.5px;
          word-break: break-all;
          margin-top: 2px;
          color: #000000;
          white-space: normal;
          line-height: 1.1;
        }

        .pix-corpo-right {
          width: 35mm;
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
          width: 26mm;
          height: 26mm;
          object-fit: contain;
        }

        .pix-payment-info {
          font-size: 8.5px;
          color: #000000;
          text-align: center;
          line-height: 1.2;
        }

        .pix-cut-line {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 0;
          border-top: 1px dashed #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #475569;
          user-select: none;
        }

        .pix-cut-line span {
          background: #ffffff;
          padding: 0 12px;
          position: absolute;
          top: -6px;
          font-weight: bold;
        }

        @media print {
          body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .pix-carne-page {
            border: none !important;
            margin: 0 !important;
            padding: 0 15mm !important;
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
      `}} />
      {chunkedInstallments.map((group, pageIndex) => (
        <div key={pageIndex} className="pix-carne-page">
          {group.map((inst, idx) => {
            const fees = calculateOverdueFees(inst.value, inst.due_date, inst.status);
            const formatValue = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            return (
              <div key={inst.id} className="pix-installment-slot">
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

                        <div className="pix-corpo-field" style={{ gridColumn: 'span 2' }}>
                          <span className="pix-corpo-label">Pagador</span>
                          <div className="pix-corpo-value">{customer.name} - CPF: {formatCPF(customer.cpf)}</div>
                        </div>
                      </div>

                      {/* Instruções */}
                      <div className="pix-instructions-box">
                        <strong>Instruções de Pagamento:</strong> Acesse seu banco, vá em PIX e aponte a câmera para o QR Code ao lado.
                      </div>

                      {/* Barcode Pattern / SVG */}
                      {inst.asaas_invoice_url && detailsMap[inst.id]?.barCodeNumber ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '6px' }}>
                          <div style={{ width: '100%', maxWidth: '380px', height: '24px', display: 'flex', overflow: 'hidden' }}>
                            <BarcodeI25 code={detailsMap[inst.id].barCodeNumber} />
                          </div>
                          <span style={{ fontSize: '7.5px', fontFamily: 'monospace', color: '#6b7280', marginTop: '1px' }}>{detailsMap[inst.id].barcode}</span>
                        </div>
                      ) : inst.asaas_invoice_url && detailsMap[inst.id]?.barcode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '6px' }}>
                          <div style={{ width: '100%', maxWidth: '380px', height: '20px', backgroundColor: '#000000', display: 'flex', overflow: 'hidden', opacity: 0.95, backgroundImage: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 8px)' }} />
                          <span style={{ fontSize: '7.5px', fontFamily: 'monospace', color: '#6b7280', marginTop: '1px' }}>{detailsMap[inst.id].barcode}</span>
                        </div>
                      ) : inst.asaas_invoice_url ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30px', fontSize: '8px', color: '#6b7280' }}>
                          Carregando código de barras...
                        </div>
                      ) : null}
                    </div>

                    <div className="pix-corpo-right">
                      <div className="pix-qr-box" style={{ width: '32mm', height: '32mm', padding: '2px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {inst.asaas_invoice_url ? (
                          detailsMap[inst.id]?.pixImage ? (
                            <img
                              src={`data:image/png;base64,${detailsMap[inst.id].pixImage}`}
                              alt="PIX QR Code"
                              style={{ width: '30mm', height: '30mm', objectFit: 'contain', display: 'block' }}
                            />
                          ) : (
                            <span style={{ fontSize: '7px', color: '#6b7280' }}>Carregando...</span>
                          )
                        ) : (
                          <span style={{ fontSize: '7px', color: '#6b7280', textAlign: 'center' }}>Pix Manual<br />(Use chave Pix da loja)</span>
                        )}
                      </div>
                      <div className="pix-payment-info" style={{ marginTop: '2px' }}>
                        <span className="pix-corpo-label">PARCELA</span>
                        <strong style={{ fontSize: '9px' }}>{inst.number} / {inst.total}</strong>
                      </div>
                      <div className="pix-payment-info">
                        <span className="pix-corpo-label">VENCIMENTO</span>
                        <strong style={{ fontSize: '8px' }}>{new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                      </div>
                      <div className="pix-payment-info">
                        <span className="pix-corpo-label">VALOR A PAGAR</span>
                        <strong style={{ fontSize: '10px', color: fees.isLate ? '#ef4444' : '#15803d' }}>
                          R$ {formatValue(fees.total)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
                {idx < group.length - 1 && (
                  <div className="pix-cut-line">
                    <span>✂️ DOBRAR / CORTAR AQUI</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
