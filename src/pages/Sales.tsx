import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Smartphone, ShoppingBag, Clock,
  CheckCircle2, AlertCircle, MoreVertical, Filter,
  DollarSign, Calendar, Layers, ShieldCheck, Tag,
  Package, ArrowRight, Edit, Trash2, TrendingUp,
  Printer, Loader2, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSaleStore, Sale } from '../store/useSaleStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { useUnitStore } from '../store/useUnitStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { formatCPF, formatPhone } from '../lib/utils';
import SaleForm from '../components/sales/SaleForm';
import SaleContract from '../components/sales/SaleContract';

// Componente para Visualização Interativa e Edição Livre de Contrato / Nota de Venda
function SaleDocumentViewer({
  sale,
  customer,
  installments,
  unit,
  hideModal,
  showNotification
}: {
  sale: Sale;
  customer: any;
  installments: any[];
  unit: any;
  hideModal: () => void;
  showNotification: any;
}) {
  const [activeTab, setActiveTab] = useState<'contract' | 'receipt'>(
    sale.payment_type === 'vista' ? 'receipt' : 'contract'
  );
  const today = new Date().toLocaleDateString('pt-BR');

  const basePrice = sale.original_price ?? sale.total_value;
  const financed = basePrice - sale.down_payment;
  const instValue = installments.length > 0 ? installments[0].value : (sale.installments > 0 ? financed / sale.installments : 0);
  const firstInstValue = installments.length > 0 ? installments[0].value : instValue;

  let downPaymentMethod = (sale as any).down_payment_method;
  let tradeDeviceModel = (sale as any).trade_device_model;
  let tradeDeviceImei = (sale as any).trade_device_imei;

  if (!downPaymentMethod && sale.accessories) {
    const match = sale.accessories.match(/\[Entrada:\s*Troca\s*-\s*([^\(]+)\s*(?:\(IMEI:\s*([^\)]+)\))?\]/i);
    if (match) {
      downPaymentMethod = 'trade';
      tradeDeviceModel = match[1]?.trim();
      tradeDeviceImei = match[2]?.trim();
    }
  }

  // Contract variables
  const contractNumber = sale.id ? sale.id.split('-')[0].toUpperCase() : '85429496';
  const interestTable = (sale as any).interest_table || 'standard';
  const interestRate = sale.payment_type === 'card'
    ? 4.00
    : (interestTable === 'premium' ? 5.00 : interestTable === 'flex' ? 12.00 : 8.00);
  const interestRateYear = (Math.pow(1 + interestRate / 100, 12) - 1) * 100;
  const cetMonth = interestRate + 1.25;
  const cetYear = (Math.pow(1 + cetMonth / 100, 12) - 1) * 100;

  const valorLiquido = financed;
  const fee = Math.max(0, sale.total_value - basePrice);
  const iof = fee * 0.15;
  const custoEmissao = fee * 0.85;
  const valorCredito = valorLiquido + fee;

  const formatPaymentDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
      return new Date(cleanStr).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const issueDateFormatted = formatPaymentDate(sale.date) || today;

  const getInstallmentDates = () => {
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

  const receiptNumber = sale.id ? parseInt(sale.id.replace(/[^0-9]/g, '').substring(0, 6)) || 100000 : 100000;

  const handlePrint = () => {
    const element = document.getElementById('sale-document-preview-area');
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('error', 'Bloqueador de Popups', 'Por favor, libere os popups do seu navegador para imprimir.');
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(styleNode => styleNode.outerHTML)
      .join('\n');

    const isReceipt = activeTab === 'receipt';

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão - MDR Informática e Celulares</title>
          ${styles}
          <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background: #fff !important; color: #000 !important; font-family: sans-serif; margin: 0; padding: 0; }
            @media print {
              .no-print { display: none; }
              ${isReceipt ? `
                @page { size: 80mm auto; margin: 0; }
                body { width: 80mm; }
                .thermal-receipt, html, body { page-break-inside: avoid !important; break-inside: avoid !important; }
              ` : `
                @page { size: A4; margin: 0 !important; }
                body { margin: 0 !important; padding: 0 !important; }
                .contract-page {
                  page-break-after: always !important;
                  break-after: page !important;
                  height: 297mm !important;
                  width: 210mm !important;
                  box-sizing: border-box !important;
                  position: relative !important;
                  padding: 15mm 12mm 20mm 12mm !important;
                  background-color: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                }
                .contract-page:last-child {
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                }
              `}
            }
          </style>
        </head>
        <body>
          <div id="sale-document-preview-area" style="${isReceipt ? 'width: 80mm; margin: 0;' : 'max-width: 800px; margin: 0 auto;'}">
            ${element.innerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Render header for pages 2 to 9
  const renderPageHeader = (pageNum: number) => (
    <div className="flex justify-between items-center border-b border-black pb-2 mb-4 no-print-border">
      <div className="flex items-center gap-2">
        <img 
          src="/logo-mdr.png" 
          alt="MDR" 
          className="h-8 w-auto filter grayscale contrast-150 object-contain" 
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <span className="font-bold text-[9px] text-black">MDR INFORMÁTICA &amp; CELULARES</span>
      </div>
      <div className="text-right">
        <span className="text-[7px] font-mono text-black uppercase tracking-widest">Cédula de Crédito Bancário nº {contractNumber}</span>
      </div>
    </div>
  );

  // Render footer for all pages
  const renderPageFooter = (pageNum: number) => (
    <div className="absolute bottom-6 left-12 right-12 border-t border-black pt-2 flex justify-between items-center text-[7px] text-black font-sans no-print-border">
      <span>Esta página é parte integrante da Cédula de Crédito Bancário nº {contractNumber}, tendo como Emitente {customer.name} e CPF/CNPJ: {formatCPF(customer.cpf)}</span>
      <span className="font-bold">Página {pageNum} de 6</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
          {sale.payment_type !== 'vista' ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('contract')}
                className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'contract' ? 'bg-white text-black' : 'text-on-surface-variant hover:text-white'
                  }`}
              >
                Contrato de Venda
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('receipt')}
                className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'receipt' ? 'bg-white text-black' : 'text-on-surface-variant hover:text-white'
                  }`}
              >
                Nota de Venda
              </button>
            </>
          ) : (
            <span className="px-6 py-2.5 text-white font-black uppercase tracking-widest text-[10px]">
              Nota de Venda
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none">Visualização Ativa</span>
        </div>
      </div>

      {/* Info message */}
      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
        <span className="text-primary mt-0.5 shrink-0">💡</span>
        <p className="text-[10px] text-on-surface-variant leading-relaxed opacity-90">
          <strong>Modo Interativo:</strong> Você pode clicar e **editar qualquer parte do texto** diretamente na pré-visualização abaixo antes de mandar imprimir!
        </p>
      </div>

      {/* Document Area */}
      <div className="max-h-[50vh] overflow-auto w-full custom-scrollbar border border-white/10 rounded-3xl bg-white text-black flex justify-center">
        <div
          id="sale-document-preview-area"
          contentEditable={true}
          suppressContentEditableWarning={true}
          className="p-4 outline-none w-full flex justify-center"
        >
          {activeTab === 'contract' ? (
            /* Contrato de 9 paginas */
            <div className="bg-white text-black text-left" style={{ width: '210mm', fontFamily: 'Arial, sans-serif', padding: '10px' }}>
              <style dangerouslySetInnerHTML={{ __html: `
                #sale-document-preview-area table.ccb-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 8px;
                }
                #sale-document-preview-area table.ccb-table td {
                  border: 1px solid #000;
                  padding: 3px 5px;
                  vertical-align: top;
                  font-size: 8.5px;
                  color: #000;
                }
                #sale-document-preview-area table.ccb-table td.header-cell {
                  background-color: #eaeaea;
                  font-weight: bold;
                  font-size: 9px;
                  text-transform: uppercase;
                  border-bottom: 1.5px solid #000;
                  padding: 4px 6px;
                }
                #sale-document-preview-area table.ccb-table .label {
                  font-size: 7px;
                  color: #333;
                  text-transform: uppercase;
                  display: block;
                  margin-bottom: 1px;
                  font-weight: bold;
                }
                #sale-document-preview-area table.ccb-table .value {
                  font-weight: bold;
                  font-size: 8.5px;
                  color: #000;
                }
                #sale-document-preview-area .clause-title {
                  font-size: 9px;
                  font-weight: bold;
                  text-transform: uppercase;
                  margin-top: 6px;
                  margin-bottom: 2px;
                  color: #000;
                  border-bottom: 1px solid #000;
                  padding-bottom: 1px;
                }
                #sale-document-preview-area .clause-text {
                  font-size: 8px;
                  text-align: justify;
                  margin-bottom: 4px;
                  color: #000;
                }
                #sale-document-preview-area .contract-page {
                  page-break-after: always;
                  break-after: page;
                  min-height: 297mm;
                  box-sizing: border-box;
                  position: relative;
                  padding: 15mm 12mm 20mm 12mm;
                  background-color: #ffffff;
                  color: #000000;
                  border-bottom: 1px dashed #ccc;
                  margin-bottom: 20px;
                }
                #sale-document-preview-area .contract-page:last-child {
                  page-break-after: avoid;
                  break-after: avoid;
                  border-bottom: none;
                  margin-bottom: 0;
                }
                #sale-document-preview-area .signature-box-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 25px;
                  margin-top: 15px;
                }
                #sale-document-preview-area .signature-line-block {
                  border-top: 1px solid #000;
                  padding-top: 4px;
                  font-size: 8px;
                  text-align: center;
                }
              `}} />

              {/* ─── PAGE 1 ─── */}
              <div className="contract-page">
                <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/logo-mdr.png" 
                      alt="MDR" 
                      className="h-10 w-auto filter grayscale contrast-150 object-contain" 
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
                        <span className="value">{unit.name || 'MDR Informática & Celulares'}</span>
                      </td>
                      <td style={{ width: '30%' }}>
                        <span className="label">CNPJ / CPF</span>
                        <span className="value">{unit.cnpj || '____________________'}</span>
                      </td>
                      <td style={{ width: '30%' }}>
                        <span className="label">Telefone / WhatsApp</span>
                        <span className="value">{unit.phone || '____________________'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3}>
                        <span className="label">Endereço do Estabelecimento</span>
                        <span className="value">{unit.address || '____________________'}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

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

                <table className="ccb-table">
                  <thead>
                    <tr>
                      <td colSpan={4} className="header-cell">III. Características da Operação</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ width: '25%' }}>
                        <span className="label">Valor do Crédito</span>
                        <span className="value">R$ {valorCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td style={{ width: '25%' }}>
                        <span className="label">Valor de IOF</span>
                        <span className="value">R$ {iof.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td style={{ width: '25%' }}>
                        <span className="label">Custo de Emissão</span>
                        <span className="value">R$ {custoEmissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td style={{ width: '25%' }}>
                        <span className="label">Valor Líquido do Crédito</span>
                        <span className="value">R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                        <span className="value">{cetMonth.toFixed(2)}%</span>
                      </td>
                      <td>
                        <span className="label">Custo Efetivo Total (a.a)</span>
                        <span className="value">{cetYear.toFixed(2)}%</span>
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
                        <span className="value">{installmentDates[0] || today}</span>
                      </td>
                      <td>
                        <span className="label">Data da Última Parcela</span>
                        <span className="value">{lastInstallmentDate}</span>
                      </td>
                      <td>
                        <span className="label">Valor das Parcelas</span>
                        <span className="value">R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="label">Data de Emissão</span>
                        <span className="value">{issueDateFormatted}</span>
                      </td>
                      <td>
                        <span className="label">Praça de Pagamento</span>
                        <span className="value">Balneário Arroio do Silva/SC</span>
                      </td>
                      <td colSpan={2}>
                        <span className="label">Data de Vencimento</span>
                        <span className="value">{lastInstallmentDate}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="font-bold text-[7.5px] uppercase tracking-wider mt-2 mb-1">IV. Condições para Desembolso do Valor Líquido do Crédito</div>
                <div className="text-[7px] text-justify mb-2 leading-relaxed">
                  A entrega do equipamento eletrônico de telefonia móvel identificado no item V ao EMITENTE equivale à liberação integral do Valor Líquido do Crédito ao EMITENTE. O EMITENTE autoriza expressamente a destinação do Valor Líquido Liberado diretamente para a quitação do preço do aparelho eletrônico junto ao CREDOR.
                </div>

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
                        <span className="value">{unit.name || 'MDR Informática'}</span>
                      </td>
                      <td style={{ width: '30%' }}>
                        <span className="label">CPF / CNPJ</span>
                        <span className="value">{unit.cnpj || '____________________'}</span>
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
                <table className="ccb-table text-center" style={{ maxWidth: '400px', margin: '0 auto 12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#eaeaea', fontWeight: 'bold' }}>
                      <td style={{ padding: '2px' }}>Parcela</td>
                      <td style={{ padding: '2px' }}>Data de Vencimento</td>
                      <td style={{ padding: '2px' }}>Valor R$</td>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentDates.map((date, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '2px' }}>{String(idx + 1).padStart(3, '0')}</td>
                        <td style={{ padding: '2px' }}>{date}</td>
                        <td style={{ padding: '2px' }}>R$ {(idx === 0 ? firstInstValue : instValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-center font-bold text-[9px] uppercase tracking-wider my-3">
                  CONDIÇÕES GERAIS – CÉDULA DE CRÉDITO BANCÁRIO
                </div>

                <div className="clause-title">1. DA CONCESSÃO DO CRÉDITO</div>
                <div className="clause-text">
                  1.1. Pela presente CÉDULA DE CRÉDITO BANCÁRIO, disciplinada pela legislação aplicável à espécie e pelas cláusulas e condições abaixo constantes, declara o EMITENTE, já devidamente qualificado, que pagará por esta CCB ao CREDOR ou a quem este vier a indicar, em moeda corrente nacional, a quantia líquida, certa e exigível, acrescida dos juros à taxa indicada nesta CÉDULA DE CRÉDITO BANCÁRIO (“CCB” ou “CEDULA”) emitida nos termos da Lei 10.931/2004 e demais legislação vigente, capitalizados mensalmente, conforme previsão em lei, e demais encargos devidos, conforme o disposto na presente CCB.
                  <br /><br />
                  1.2. O EMITENTE declara e garante que assumiu todas as obrigações aqui pactuadas e cumprirá todos os seus termos e condições até quitação final de todas as obrigações estabelecidas, uma vez que as obrigações pecuniárias assumidas nesta CCB são compatíveis com a sua capacidade econômico-financeira.
                  <br /><br />
                  1.3. O EMITENTE tem expresso conhecimento de que os juros ajustados para a venda parcelada a que se refere à presente CCB são calculados, sempre e invariavelmente, de forma diária e capitalizada, conforme permitido pela legislação aplicável.
                  <br /><br />
                  1.4. O EMITENTE declara que tomou conhecimento de todos os termos financeiros indicados no Quadro Características da Operação, previamente à contratação por meio da presente CCB.
                  <br /><br />
                  1.5. O EMITENTE se obriga a efetuar o pagamento do valor principal, acrescido dos encargos incidentes, mediante o pagamento das parcelas acordadas, nas correspondentes periodicidades e datas de vencimento, nos termos da tabela VII acima, por meio de boleto bancário, PIX, dinheiro ou outra forma acordada e previamente anuída pelo CREDOR ou seu sucessor.
                  <br /><br />
                  1.5.1. Sem prejuízo das hipóteses previstas na Cláusula 3 desta CCB, o CREDOR poderá, a seu exclusivo critério, reduzir a periodicidade do pagamento das parcelas em caso de inadimplemento pelo EMITENTE de 4 parcelas, sucessivas ou não, mediante simples notificação ao EMITENTE. Neste caso, a periodicidade dos vencimentos mensais poderá passar a ser quinzenal ou semanal.
                </div>

                <div className="clause-title">2. DA GARANTIA</div>
                <div className="clause-text">
                  2.1. Para fins de cumprimento do disposto no artigo 1.362 da Lei nº 10.406, de 10 de janeiro de 2002, conforme alterada (“Código Civil”), no artigo 27 da Lei nº 10.931, de 02 de agosto de 2004, conforme alterada, e no artigo 66-B da Lei no 4.728, de 14 de julho de 1965, conforme alterada (“Lei 4.728”), são descritas no Quadro “Garantias” desta CCB as características que compreendem todas as obrigações principais, acessórias, moratórias ou de garantia do dispositivo móvel.
                </div>

                {renderPageFooter(2)}
              </div>

              {/* ─── PAGE 3 ─── */}
              <div className="contract-page">
                {renderPageHeader(3)}

                <div className="clause-text">
                  2.2. No caso da aquisição de aparelhos de telefonia móvel (celular) com os recursos oriundos desta CCB, o EMITENTE declara ter ciência e autoriza desde já o CREDOR, em caso de inadimplemento de quaisquer obrigações constantes desta CCB, a realizar o bloqueio do mencionado aparelho por meio de dispositivo a ser instalado no aparelho, sem prévia necessidade de notificação ao EMITENTE. O referido bloqueio do aparelho - e jamais dos direitos de telecomunicação constantes do chip (cartão SIM) da operadora telefônica, que pode ser utilizado normalmente em qualquer outro aparelho de telefonia móvel (celular) - perdurará por todo o período em que o EMITENTE estiver inadimplente com as suas obrigações nos termos desta CCB.
                  <br /><br />
                  2.3. A garantia cessará por completo mediante o adimplemento integral das obrigações previstas na presente CCB, inexistindo possibilidade de bloqueios futuros. Com o pagamento integral, o EMITENTE poderá desinstalar o dispositivo de bloqueio instalado em seu aparelho de telefonia móvel (celular) seguindo as instruções de desinstalação indicadas dentro do aplicativo MDR e/ou por meio dos canais de atendimento, passando a deter a propriedade plena do bem.
                </div>

                <div className="clause-title">3. DO VENCIMENTO ANTECIPADO</div>
                <div className="clause-text">
                  3.1. Além das demais hipóteses estabelecidas em lei e nesta CCB, a dívida aqui contraía pelo EMITENTE, a partir do primeiro dia útil da liberação do Valor Líquido do Crédito, reputar-se-á antecipadamente vencida, facultando-se ao CREDOR exigir a imediata e integral satisfação de seu crédito, independentemente de aviso ou notificação judicial ou extrajudicial de qualquer espécie, na ocorrência de qualquer das hipóteses previstas nos artigos 333 e 1.425 do Código Civil Brasileiro e, ainda, nas:
                  <br /><br />
                  a) Se ocorrer inadimplemento de qualquer obrigação assumida pelo EMITENTE ou pelo(s) eventual(ais) garantidor(es), em consonância com as cláusulas e condições aqui estabelecidas, principalmente no que tange ao pagamento das parcelas devidas;
                  <br />
                  b) Se for protestado qualquer título de responsabilidade do EMITENTE, em razão do inadimplemento de obrigação cujo valor individual ou em conjunto seja igual ou superior a R$ 10.000,00 (dez mil reais), sem que a justificativa para tal medida tenha sido apresentada ao credor da CCB, no prazo que lhe tiver sido solicitado;
                  <br />
                  c) Se o EMITENTE for inscrito no Cadastro de Emitentes de Cheques sem Fundo – CCF, ou, ainda, constem informações negativas a seu respeito no Sistema de Informações de Crédito do Banco Central, que, a critério do credor da CCB, possa afetar a sua capacidade de cumprir as obrigações assumidas na presente CCB;
                  <br />
                  d) Se o EMITENTE tornar-se insolvente, requerer ou tiver, falência, insolvência civil, recuperação judicial ou extrajudicial decretada, sofrer intervenções, regime de administração especial temporária, ou liquidação judicial ou extrajudicial;
                  <br />
                  e) Se for comprovada a falsidade de qualquer declaração, informação ou documento que houver sido respectivamente firmada, prestada ou entregue pelo EMITENTE;
                  <br />
                  f) Se o EMITENTE sofrer qualquer medida judicial ou extrajudicial que por qualquer forma, possa afetar negativamente os créditos do financiamento e/ou as garantias conferidas ao credor da CCB;
                  <br />
                  g) Se a garantia da CCB, ora constituída por qualquer fato atinente ao seu objeto se tornar inábil, imprópria, ou insuficiente para assegurar o pagamento da dívida, e desde que não seja substituída ou complementada;
                  <br />
                  h) Se, sem o expresso consentimento do CREDOR da CCB ocorrer a transferência a terceiros dos direitos e obrigações do EMITENTE previstos nesta CCB;
                  <br />
                  i) Se, sem o expresso consentimento do credor da CCB ocorrer alienação, cessão, doação ou transferência, por qualquer meio, de bens, ativos ou direitos de propriedade do EMITENTE;
                  <br />
                  j) Se o EMITENTE sofrer qualquer medida judicial ou extrajudicial que por qualquer forma, possa afetar negativamente os créditos e/ou as garantias conferidas ao credor da CCB.
                </div>

                <div className="clause-title">4. LIQUIDAÇÃO ANTECIPADA</div>
                <div className="clause-text">
                  4.1. O EMITENTE poderá, a qualquer tempo, liquidar antecipadamente, total ou parcialmente, suas obrigações decorrentes desta CCB,
                </div>

                {renderPageFooter(3)}
              </div>

              {/* ─── PAGE 4 ─── */}
              <div className="contract-page">
                {renderPageHeader(4)}

                <div className="clause-text">
                  mediante requerimento enviado ao CREDOR com antecedência de 05 (cinco) dias, oportunidade em que o valor presente do pagamento antecipado será calculado conforme preceitua a legislação e a regulamentação vigentes, incluindo, mas não se limitando, a Resolução do Conselho Monetário Nacional nº 3.516 de 6 de dezembro de 2007.
                  <br /><br />
                  4.2. Se indicada a Tarifa de Liquidação Antecipada no Quadro Características da Operação, o EMITENTE, desde já, se obriga a pagar ao CREDOR ou seu cessionário/endossatário, na data da liquidação, a Tarifa de Liquidação Antecipada sobre o valor efetivamente pago antecipadamente, a título de indenização pelos custos relacionados com a quebra de captação de recursos.
                  <br /><br />
                  4.3. Nas situações em que as despesas associadas à contratação realizada por meio desta CCB forem também objeto de financiamento, essas despesas integrarão igualmente a operação para apuração do valor presente para fins de amortização, total ou parcial, da dívida ainda em aberto.
                  <br /><br />
                  4.4. Sempre que for necessário, a apuração do saldo devedor do EMITENTE, seja para fins de amortização ou para simples ciência, o CREDOR apresentará ao EMITENTE planilha de cálculo detalhada e atualizada.
                </div>

                <div className="clause-title">5. DAS DECLARAÇÕES</div>
                <div className="clause-text">
                  5.1. As Partes signatárias, cada uma por si, declaram e garantem que:
                  <br /><br />
                  a) possuem plena capacidade e legitimidade para celebrar a presente CCB, realizar todas as operações e cumprir todas as obrigações assumidas tendo tomado todas as medidas necessárias para autorizar a sua celebração, implementação e cumprimento de todas as obrigações constituídas;
                  <br />
                  b) a celebração desta CCB e o cumprimento das obrigações de cada uma das Partes: (a) não violam qualquer disposição contida nos seus documentos societários; (b) não violam qualquer lei, regulamento, decisão judicial, administrativa ou arbitral, aos quais a respectiva Parte esteja vinculada; (c) não exigem qualquer consentimento, ação ou autorização, prévia ou posterior, de terceiros;
                  <br />
                  c) esta CCB é validamente celebrada e constitui obrigação legal, válida, vinculante e exequível contra cada uma das Partes, de acordo com os seus termos;
                  <br />
                  d) cada Parte está apta a cumprir as obrigações ora previstas nesta CCB e agirá em relação à mesma de boa-fé e com lealdade;
                  <br />
                  e) nenhuma Parte depende economicamente da outra;
                  <br />
                  f) nenhuma das Partes se encontra em estado de necessidade ou sob coação para celebrar esta CCB e/ou quaisquer contratos e compromissos a ela relacionados e acessórios;
                  <br />
                  g) as discussões sobre o objeto contratual, crédito, encargos incidentes e obrigações acessórias, oriundos desta CCB, foram feitas, conduzidas e implementadas por livre iniciativa das Partes;
                  <br />
                  h) o CREDOR, o EMITENTE e todas as demais Partes envolvidas nesta CCB são pessoas devidamente estruturadas, qualificadas e capacitadas para entender a estrutura financeira e jurídica objeto desta CCB, e estão acostumadas a celebrar contratos semelhantes, não havendo entre as Partes qualquer relação de hipossuficiência ou ainda natureza de consumo na relação aqui tratada.
                  <br />
                  i) Anuem com a formalização desta CCB por meio de todas as formas em direito admitidas, incluindo meios eletrônicos e plenamente eficazes, ainda que seja estabelecida assinatura e aceitação eletrônica ou certificação fora dos padrões ICP – Brasil, conforme disposto pelo art. 10 da Medida Provisória nº 2.200/2001 em vigor no Brasil.
                </div>

                <div className="clause-title">6. DISPOSIÇÕES FINAIS</div>
                <div className="clause-text">
                  6.1. Sempre que for necessário, a apuração do saldo devedor do EMITENTE será realizada pelo CREDOR mediante planilha de cálculo, que constituirá documento integrante e inseparável da presente CÉDULA.
                  <br /><br />
                  6.2. A abstenção ou tolerância, por parte do CREDOR, de quaisquer direitos outorgados nesta CÉDULA ou pela lei, ao cumprimento de obrigações pelo EMITENTE, não significará renúncia, perdão, novação ou alteração do que foi aqui pactuado.
                  <br /><br />
                  6.3. Tolerância: A tolerância não implica perdão, renúncia, novação ou alteração da dívida ou das condições aqui previstas e o pagamento do principal, mesmo sem ressalvas, não será considerado ou presumido a quitação dos encargos. Dessa forma, as Partes acordam que qualquer prática diversa da aqui pactuada, mesmo que reiterada, não poderá ser interpretada como novação.
                  <br /><br />
                  6.4. Independência das Cláusulas: Se qualquer item ou cláusula desta CCB vier a ser considerado ilegal, inexequível ou, por qualquer motivo, ineficaz, todos os demais itens e cláusulas continuarão em vigor, plenamente válidos e eficazes. As Partes, desde já, se comprometem a negociar, no menor prazo possível, item ou cláusula que venha a substituir o item ou cláusula ineficaz.
                  <br /><br />
                  6.5. Comunicação aos Serviços de Proteção ao Crédito: Na hipótese de ocorrer descumprimento de qualquer obrigação ou atraso no pagamento, o CREDOR ou a quem este estiver autorizado poderá comunicar o fato a qualquer serviço de proteção ao crédito, como Serasa Experian ou qualquer outro órgão encarregado de cadastrar atraso nos pagamentos e o descumprimento de obrigações contratuais.
                  <br /><br />
                  6.6. Alteração da CCB: A presente CCB somente poderá ser alterada mediante aditivo próprio devidamente assinado pelas Partes.
                </div>

                {renderPageFooter(4)}
              </div>

              {/* ─── PAGE 5 ─── */}
              <div className="contract-page">
                {renderPageHeader(5)}

                <div className="clause-text">
                  6.7. Comunicação ao Sistema de Informação de Créditos (“SCR”): O CREDOR, neste ato, comunica ao EMITENTE que a presente operação de parcelamento, poderá ser registrada no SCR gerido pelo Banco Central do Brasil (“BACEN”), que tem por finalidade subsidiar o BACEN para fins de supervisão de risco de crédito a que estão expostas as instituições financeiras e ainda intercambiar informações entre as instituições financeiras.
                  <br /><br />
                  6.8. O EMITENTE poderá ter acesso aos dados constantes em seu SCR, por meio de central de atendimento ao público do BACEN.
                  <br /><br />
                  6.9. Em caso de discordância quanto às informações do SCR, bem como pedidos de correções, o EMITENTE deverá entrar em contato com a Ouvidoria do CREDOR.
                  <br /><br />
                  6.10. O EMITENTE autoriza o CREDOR ou a quem este indicar, a qualquer tempo: a (i) efetuar consultas ao Sistema de Informações de Crédito – SCR – do Banco Central do Brasil (“SCR”), nos termos da Resolução nº 3.658, do Conselho Monetário Nacional, de 17.12.2008, conforme alterada e os serviços de proteção ao crédito SPC, Serasa e outras em que o CREDOR seja cadastrado; (ii) fornecer ao Banco Central do Brasil informações sobre esta CCB, para integrar o SCR; (iii) proceder conforme disposições que advierem de novas exigências feitas pelo Banco Central do Brasil ou autoridades.
                  <br /><br />
                  6.11. Efeitos da CCB: As Partes convencionam que as obrigações pecuniárias estipuladas na presente CCB passam a vigorar a partir da liberação do bem pelo CREDOR.
                  <br /><br />
                  6.12. Irrevogabilidade e Irretratabilidade: A presente CCB é firmada em caráter irrevogável e irretratável, obrigando as Partes, seus herdeiros e/ou sucessores.
                  <br /><br />
                  6.13. Base de Dados: O EMITENTE declara e concorda expressamente que ao firmar a presente CCB passará a fazer parte integrante da base de clientes do CREDOR ou a quem este vier a indicar, autorizando, assim através das informações cadastrais o oferecimento de produtos e/ou serviços da marca.
                  <br /><br />
                  6.14. Ouvidoria: O EMITENTE declara ter ciência de que o CREDOR disponibiliza um canal de Ouvidoria para que sejam feitas sugestões e/ou reclamações.
                  <br /><br />
                  6.15. Legislação: Aplica-se à presente CCB, as disposições da Lei 10.931, de 02 de agosto de 2004, e posteriores alterações (“Lei 10.931”), declarando o EMITENTE ter conhecimento que a presente CCB é um título executivo extrajudicial e representa dívida em dinheiro, certa, líquida e exigível, seja pela soma nela indicada, seja pelo saldo EMITENTE demonstrado em planilha de cálculo ou nos extratos de Conta, a serem emitidos consoante o que preceitua a aludida Lei 10.931.
                  <br /><br />
                  6.16. O EMITENTE declara ter ciência que as taxas de juros cobradas nas operações financeiras realizadas pelo CREDOR, incluindo a presente CCB, não estão submetidas ao limite de 12% (doze por cento) ao ano, sendo legítima a cobrança de juros e encargos contratuais.
                  <br /><br />
                  6.17. Se vier a tornar impossível a aplicação das regras previstas nesta CCB, seja por força de eventual caráter cogente de imperativos legais que venham a ser baixados, seja em decorrência de ausência de consenso entre as Partes, considerar-se-á rescindida esta CCB e, em consequência, a dívida dela oriunda se considerará antecipadamente vencida, da mesma forma e com os mesmos efeitos previstos, efetivando-se a cobrança de juros “pro-rata temporis”.
                  <br /><br />
                  6.18. Cessão ou Endosso: O CREDOR fica expressamente autorizado a qualquer tempo, a seu exclusivo critério e independentemente da prévia anuência do EMITENTE, mediante simples comunicação pelo CREDOR meramente informativa, a ceder a terceiros os direitos de crédito que detém em razão desta CCB, bem como a transferi-la a terceiros mediante endosso da “via negociável”, sendo certo que a cessão ou o endosso não caracterizarão violação do sigilo em relação ao EMITENTE. Ocorrendo a cessão ou o endosso, o cessionário/endossatário desta CCB assumirá automaticamente a qualidade de credor desta CCB, passando a ser titular de todos os direitos e obrigações dela decorrentes.
                  <br /><br />
                  6.19. Após a cessão ou endosso pelo CREDOR desta CCB, o EMITENTE desde já, reconhece a validade da emissão e do endosso desta CCB de forma física ou eletrônica, o que é feito com base no art. 889, §3º, do Código Civil.
                  <br /><br />
                  6.20. Na hipótese de transferência da presente CCB, o seu novo titular ficará automaticamente sub-rogado em todos os direitos e garantias que cabiam ao CREDOR original, independentemente de qualquer formalidade, passando a ter acesso livre e direto a todas as informações relacionadas à operação e respectivas garantias e/ou direitos creditórios, permanecendo válida a presente autorização durante todo o tempo em que subsistir em aberto e não liquidadas as obrigações decorrentes da presente CCB.
                  <br /><br />
                  6.21. A cessão dos direitos sempre compreenderá os acessórios, títulos, instrumentos que os representam e anexos. De tal forma, ao formalizar a cessão dos direitos de crédito, o CREDOR estará cedendo, automaticamente, todos os direitos, privilégios, preferências, prerrogativas, garantias e ações, legal e contratualmente previstas, que sejam inerentes ao direito de crédito cedido.
                </div>

                {renderPageFooter(5)}
              </div>

              {/* ─── PAGE 6 ─── */}
              <div className="contract-page">
                {renderPageHeader(6)}

                <div className="clause-text">
                  6.22. O EMITENTE está integralmente ciente e de acordo com o seguinte: (i) qualquer litígio ou questionamento, judicial ou extrajudicial, que possa vir a ser ajuizado, deverá ser ajuizado, àquele portador endossatário da CCB na data do ajuizamento do litígio ou questionamento; (ii) o ajuizamento de qualquer ação contra o CREDOR, após o mesmo ter endossado esta CCB para terceiro, sujeitará ao pagamento de indenização por perdas e danos e ressarcimento de custos decorrentes.
                  <br /><br />
                  6.23. Emissão de Certificados de CCB: O CREDOR ou a quem este vier a indicar poderá emitir certificados de CCB com lastro no presente título, podendo negociá-los livremente no mercado.
                  <br /><br />
                  6.24. Caso haja a emissão do certificado referido, a presente CCB ficará custodiada em instituição autorizada, a qual passará a proceder às cobranças dos valores devidos, junto ao EMITENTE. O EMITENTE, desde já se declara de acordo com a emissão do certificado referido na cláusula acima, obrigando-se a atender às solicitações da instituição custodiante.
                  <br /><br />
                  6.25. Assinatura Eletrônica: Em caso de contratação eletrônica, o EMITENTE ratifica que admite como válido, para fins de comprovação de autoria e integridade, a assinatura e informações constantes no presente documento, as quais foram capturadas de forma eletrônica e utilizadas nesta CCB, constituindo título executivo extrajudicial nos termos do artigo 28 da Lei nº 10.931/2004 e para todos os fins de direito, ainda que seja estabelecida com assinatura eletrônica ou certificação fora dos padrões ICP-BRASIL, conforme disposto pelo art. 10 da Medida Provisória nº 2.200/2001.
                  <br /><br />
                  6.26. Foro: Ajustam as Partes que será sempre competente para conhecer e dirimir qualquer questão oriunda ou decorrente da presente CCB, o foro da Comarca de Balneário Arroio do Silva/SC, com a exclusão de qualquer outro, por mais privilegiado que seja, reservando-se o credor da CCB o direito de optar, a seu exclusivo critério, pelo foro do domicílio do EMITENTE.
                  <br /><br />
                  6.27. A presente CCB é emitida e firmada em 2 (DUAS) vias, constando em apenas 01(uma) via a expressão “Via Negociável”.
                </div>

                <div className="mt-4 font-bold">
                  Local e data: Balneário Arroio do Silva/SC, {issueDateFormatted}
                </div>

                <div className="font-bold text-[9px] uppercase tracking-wider mt-4 mb-2">Assinaturas:</div>
                
                <div className="signature-box-grid">
                  <div className="signature-line-block">
                    <strong>{unit.name ? unit.name.toUpperCase() : 'MDR INFORMÁTICA & CELULARES'}</strong><br />
                    Representante Credor / Vendedor<br />
                    CNPJ: {unit.cnpj || '____________________'}
                  </div>
                  <div className="signature-line-block">
                    <strong>{customer.name.toUpperCase()}</strong><br />
                    Emitente / Comprador<br />
                    CPF: {formatCPF(customer.cpf)}
                  </div>
                </div>

                <div className="signature-box-grid" style={{ marginTop: '20px' }}>
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
          ) : (
            /* Nota de Venda / Recibo de 80mm */
            <div className="thermal-receipt bg-white text-black text-left" style={{ width: '80mm', fontFamily: 'Arial, sans-serif', padding: '10px' }}>
              <style dangerouslySetInnerHTML={{ __html: `
                #sale-document-preview-area .thermal-receipt {
                  width: 80mm;
                  margin: 0 auto;
                  padding: 3mm;
                  box-sizing: border-box;
                  font-family: Arial, sans-serif;
                  font-size: 10.5px;
                  color: #000;
                  background: #fff;
                  line-height: 1.3;
                  font-weight: bold;
                }
                #sale-document-preview-area .copy-indicator {
                  text-align: center;
                  font-weight: bold;
                  font-size: 10px;
                  border: 1px solid #000;
                  padding: 2px;
                  margin-bottom: 8px;
                  letter-spacing: 1px;
                }
                #sale-document-preview-area .header-center {
                  text-align: center;
                  margin-bottom: 6px;
                }
                #sale-document-preview-area .brand-name {
                  font-size: 18px;
                  font-weight: 900;
                  letter-spacing: -1px;
                  margin-bottom: 2px;
                }
                #sale-document-preview-area .brand-sub {
                  font-size: 8px;
                  letter-spacing: 1px;
                  margin-bottom: 6px;
                }
                #sale-document-preview-area .unit-details {
                  font-size: 9px;
                  color: #333;
                }
                #sale-document-preview-area .receipt-title {
                  font-size: 13px;
                  font-weight: bold;
                  margin-top: 4px;
                }
                #sale-document-preview-area .receipt-num {
                  font-size: 10px;
                  font-weight: bold;
                }
                #sale-document-preview-area .receipt-date {
                  font-size: 9px;
                }
                #sale-document-preview-area .divider {
                  border-top: 1px dashed #000;
                  margin: 6px 0;
                }
                #sale-document-preview-area .double-divider {
                  border-top: 1px double #000;
                  border-bottom: 1px double #000;
                  height: 3px;
                  margin: 6px 0;
                }
                #sale-document-preview-area .section-title {
                  font-weight: bold;
                  text-transform: uppercase;
                  margin-bottom: 4px;
                  font-size: 9px;
                  letter-spacing: 0.5px;
                  text-decoration: underline;
                }
                #sale-document-preview-area .row {
                  display: flex;
                  justify-content: space-between;
                  margin: 2px 0;
                }
                #sale-document-preview-area .align-right {
                  text-align: right;
                  max-width: 60%;
                  word-wrap: break-word;
                }
                #sale-document-preview-area .font-mono {
                  font-family: monospace;
                }
                #sale-document-preview-area .text-small {
                  font-size: 8.5px;
                }
                #sale-document-preview-area .trade-box {
                  background: #f0f0f0;
                  border: 1px dashed #000;
                  padding: 4px;
                  margin: 2px 0;
                  font-size: 8.5px;
                }
                #sale-document-preview-area .total-box {
                  border: 2px solid #000;
                  padding: 5px;
                  margin: 6px 0;
                  text-align: center;
                }
                #sale-document-preview-area .total-label {
                  font-size: 8.5px;
                  font-weight: bold;
                }
                #sale-document-preview-area .total-val {
                  font-size: 16px;
                  font-weight: bold;
                }
                #sale-document-preview-area .discount-info {
                  font-size: 8.5px;
                  border: 1px dotted #000;
                  padding: 4px;
                  margin-top: 6px;
                  line-height: 1.2;
                }
                #sale-document-preview-area .discount-title {
                  font-weight: bold;
                }
                #sale-document-preview-area .sig-line-box {
                  margin-top: 20px;
                  text-align: center;
                }
                #sale-document-preview-area .sig-line {
                  border-top: 1px solid #000;
                  width: 80%;
                  margin: 0 auto 4px auto;
                }
                #sale-document-preview-area .sig-label {
                  font-size: 8.5px;
                  line-height: 1.1;
                  display: block;
                }
                #sale-document-preview-area .footer-note {
                  font-size: 8px;
                  text-align: center;
                  margin-top: 8px;
                  line-height: 1.2;
                }
              `}} />

              {/* Copy Indicator */}
              <div className="copy-indicator">COMPROVANTE DE VENDA</div>

              {/* Company Header */}
              {(() => {
                const cleanUnitName = (unit.name || 'MDR').replace(/MDR\s*(Informática\s*(e|&)\s*Celulares)?\s*-\s*/gi, '').toUpperCase();
                return (
                  <div className="header-center">
                    <div className="brand-name">MDR</div>
                    <div className="brand-sub">INFORMÁTICA &amp; CELULARES</div>
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
                <div className="receipt-num">N° #{receiptNumber}</div>
                <div className="receipt-date">Data: {today}</div>
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
                  {downPaymentMethod === 'trade' && (
                    <div className="trade-box">
                      Recebido: {tradeDeviceModel} (IMEI: {tradeDeviceImei || 'N/A'})
                    </div>
                  )}
                </>
              )}

              {sale.payment_type === 'crediario' && (
                <>
                  <div className="row">
                    <span>Saldo Financiado:</span>
                    <span className="align-right font-mono">R$ {financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="row">
                    <span>Parcelas:</span>
                    <span className="align-right font-mono">{sale.installments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="row">
                    <span>1º Vencimento:</span>
                    <span className="align-right font-mono">{installmentDates[0] || today}</span>
                  </div>
                </>
              )}

              {sale.payment_type === 'card' && (
                <div className="row">
                  <span>Parcelamento:</span>
                  <span className="align-right font-mono">{sale.installments}x no Cartão</span>
                </div>
              )}

              {sale.payment_type === 'vista' && (sale as any).amount_paid > 0 && (
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
              <div className="sig-line-box" style={{ marginTop: '25px' }}>
                <div className="sig-line"></div>
                <span className="sig-label">{unit.name || 'MDR Informática & Celulares'}<br />Vendedor / Responsável</span>
              </div>

              <div className="sig-line-box" style={{ marginTop: '35px' }}>
                <div className="sig-line"></div>
                <span className="sig-label">{customer.name}<br />Comprador</span>
              </div>

              <div className="divider"></div>

              {/* Footer Note */}
              <div className="footer-note">
                Comprovante emitido por MDR Informática e Celulares.<br />
                O aparelho é propriedade do vendedor até a quitação total das parcelas.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={hideModal}
          className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Printer size={16} />
          Imprimir
        </button>
      </div>
    </div>
  );
}

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState('');
  const { sales, fetchSales, deleteSale, isLoading } = useSaleStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { installments, fetchInstallments } = useFinanceStore();
  const { units, fetchAllUnits } = useUnitStore();
  const { profile } = useAuthStore();
  const { showNotification, showModal, hideModal } = useUI();
  const { hasPermission, fetchUserPermissions } = usePermissionStore();

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  useEffect(() => {
    fetchSales(profile?.unit_id || undefined);
    fetchCustomers(profile?.unit_id || undefined);
    fetchInstallments(profile?.unit_id || undefined);
    fetchAllUnits();
  }, [profile?.unit_id, fetchSales, fetchCustomers, fetchInstallments, fetchAllUnits]);

  const filteredSales = sales.filter(s =>
    (s.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    s.device_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.imei.includes(searchTerm)
  );

  const handlePrintContract = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customer_id);

    if (!customer) {
      showNotification('error', 'Erro', 'Cliente não encontrado para esta venda.');
      return;
    }

    const saleInstallments = installments.filter(inst => inst.sale_id === sale.id);

    const saleUnit = units.find(u => u.id === sale.unit_id) || units[0] || {
      name: 'MDR Celulares',
      cnpj: '____________________',
      address: '____________________',
      phone: '____________________'
    };

    showModal({
      title: 'Visualizar & Imprimir Documentos',
      children: (
        <div className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
          <SaleDocumentViewer
            sale={sale}
            customer={customer}
            installments={saleInstallments}
            unit={saleUnit}
            hideModal={hideModal}
            showNotification={showNotification}
          />
        </div>
      )
    });
  };

  const handleDeleteSale = (sale: Sale) => {
    showModal({
      title: 'Excluir Venda',
      children: `Tem certeza que deseja excluir a venda de ${sale.device_model} para ${sale.customer_name}?`,
      type: 'danger',
      confirmText: 'Excluir',
      onConfirm: async () => {
        await deleteSale(sale.id);
        showNotification('success', 'Venda Removida');
      }
    });
  };

  const handleEditSale = (sale: Sale) => {
    showModal({
      title: 'Editar Venda',
      children: (
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <SaleForm
            initialData={sale}
            onSuccess={() => {
              hideModal();
              fetchSales(profile?.unit_id || undefined);
            }}
            onCancel={() => hideModal()}
          />
        </div>
      ),
    });
  };

  const handleNewSale = () => {
    showModal({
      title: 'Registrar Nova Venda',
      children: (
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <SaleForm
            onSuccess={() => {
              hideModal();
              fetchSales(profile?.unit_id || undefined);
            }}
            onCancel={() => hideModal()}
          />
        </div>
      ),
    });
  };

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface uppercase tracking-tight">Vendas & Contratos</h1>
          <p className="text-on-surface-variant font-display uppercase tracking-widest text-[10px] opacity-60 mt-1">Aparelhos e Financeiro</p>
        </div>
        {hasPermission(profile, 'Vendas - Registrar Nova Venda') && (
          <button
            onClick={handleNewSale}
            className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            <Smartphone size={18} />
            Nova Venda
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary mb-4 border border-white/10">
            <ShoppingBag size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Volume de Vendas</p>
          <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">R$ {sales.reduce((acc, s) => acc + s.total_value, 0).toLocaleString('pt-BR')}</h3>
        </div>

        <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white mb-4 border border-white/10">
            <Smartphone size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Aparelhos Vendidos</p>
          <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{sales.length}</h3>
        </div>

        <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-error mb-4 border border-white/10">
            <ShieldCheck size={24} />
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Contratos Atrasados</p>
          <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{sales.filter(s => s.status === 'overdue').length}</h3>
        </div>
      </div>

      <div className="bg-white/[0.02] rounded-[40px] border border-outline-variant/30 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Buscar por cliente, modelo ou IMEI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-12 pr-6 py-4 text-sm focus:border-white outline-none transition-all font-display"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
              <Loader2 className="animate-spin" size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Vendas...</span>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
              <ShoppingBag size={48} className="text-on-surface-variant mb-2 opacity-20" />
              <p className="text-sm font-display font-bold text-on-surface-variant uppercase tracking-widest">Nenhuma venda encontrada</p>
              <p className="text-[10px] font-display text-on-surface-variant opacity-70">Nenhuma venda corresponde aos seus critérios de busca ou sua lista está vazia.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Cliente</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Aparelho</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Condições</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSales.map((sale) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none group-hover:text-white transition-colors">{sale.customer_name}</p>
                        <p className="text-[9px] font-mono text-primary font-black uppercase tracking-widest mt-1 opacity-60">ID: {sale.id.split('-')[0]}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-on-surface-variant border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-on-surface uppercase tracking-tight">{sale.device_model}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono uppercase opacity-60">{sale.imei}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-on-surface">R$ {sale.total_value.toLocaleString('pt-BR')}</p>
                        <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-tight opacity-60">
                          {sale.payment_type === 'vista'
                            ? 'À Vista'
                            : sale.payment_type === 'debit'
                              ? 'Cartão de Débito'
                              : sale.payment_type === 'card'
                                ? `${sale.installments}x no Cartão`
                                : `${sale.installments}x de R$ ${sale.installments > 0 ? (sale.total_value / sale.installments).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${sale.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                        sale.status === 'processing' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                          'bg-error/10 text-error border-error/20'
                        }`}>
                        <div className="w-1 h-1 rounded-full bg-current" />
                        {sale.status === 'completed' ? 'Em dia' :
                          sale.status === 'processing' ? 'Pendente' : 'Atrasado'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission(profile, 'Vendas - Visualizar Contrato/Recibo') && (
                          <button
                            onClick={() => handlePrintContract(sale)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all text-on-surface-variant hover:text-white"
                            title={(sale.payment_type === 'vista' || sale.payment_type === 'debit') ? "Imprimir Nota de Venda" : "Imprimir Contrato / Recibo"}
                          >
                            {(sale.payment_type === 'vista' || sale.payment_type === 'debit') ? <Receipt size={16} /> : <Printer size={16} />}
                          </button>
                        )}
                        {hasPermission(profile, 'Vendas - Registrar Nova Venda') && (
                          <button
                            onClick={() => handleEditSale(sale)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all text-on-surface-variant hover:text-primary"
                            title="Editar Venda"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {hasPermission(profile, 'Vendas - Cancelar Venda') && (
                          <button
                            onClick={() => handleDeleteSale(sale)}
                            className="p-2 hover:bg-error/10 rounded-xl transition-all text-on-surface-variant hover:text-error"
                            title="Excluir Venda"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
