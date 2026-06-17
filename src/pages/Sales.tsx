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
import { useFinanceStore, Installment } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { useUnitStore } from '../store/useUnitStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { useCashStore } from '../store/useCashStore';
import { formatCPF, formatPhone, resolveUnitInfo } from '../lib/utils';
import SaleForm from '../components/sales/SaleForm';
import ContractPrint from '../components/sales/ContractPrint';
import PixBoletoPrint from '../components/finance/PixBoletoPrint';

function SyncButton({ instId }: { instId: string }) {
  const [loading, setLoading] = useState(false);
  const { syncAsaas } = useFinanceStore();

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          await syncAsaas(instId);
        } catch (err) {
          // handled
        } finally {
          setLoading(false);
        }
      }}
      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
    >
      {loading ? "Gerando..." : "Gerar"}
    </button>
  );
}

const InstallmentRow: React.FC<{ inst: any }> = ({ inst }) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<{
    barcode: string | null;
    pixPayload: string | null;
    pixImage: string | null;
    invoiceUrl: string | null;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'pix' | 'boleto'>('pix');
  const [copiedType, setCopiedType] = useState<'pix' | 'barcode' | null>(null);
  const { fetchAsaasDetails } = useFinanceStore();

  const handleToggle = async () => {
    if (!expanded && !details && inst.asaas_invoice_url) {
      setLoading(true);
      try {
        const res = await fetchAsaasDetails(inst.id);
        setDetails(res);
      } catch (err) {
        console.error("Error fetching details:", err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  const handleCopy = (text: string, type: 'pix' | 'barcode') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="border-b border-gray-100 last:border-0 py-3">
      <div className="flex justify-between items-center">
        <div className="text-left">
          <p className="text-xs font-black text-gray-800">Parcela {inst.number} de {inst.total}</p>
          <p className="text-[10px] text-gray-500 font-mono">Vencimento: {new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex items-center gap-2">
          {inst.asaas_invoice_url ? (
            <button
              type="button"
              onClick={handleToggle}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            >
              {expanded ? "Recolher" : "Visualizar ↗"}
            </button>
          ) : (
            <SyncButton instId={inst.id} />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Carregando...</span>
            </div>
          ) : details ? (
            <div className="space-y-3 text-left">
              {/* Mini Tabs */}
              <div className="flex bg-gray-200/60 p-0.5 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('pix')}
                  className={`flex-1 py-1 rounded-md font-bold uppercase tracking-wider text-[8px] transition-all ${activeTab === 'pix' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  PIX
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('boleto')}
                  className={`flex-1 py-1 rounded-md font-bold uppercase tracking-wider text-[8px] transition-all ${activeTab === 'boleto' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  Boleto
                </button>
              </div>

              {activeTab === 'pix' ? (
                <div className="text-center space-y-3">
                  {details.pixImage ? (
                    <div className="bg-white p-2 rounded-xl inline-block border border-gray-100">
                      <img
                        src={`data:image/png;base64,${details.pixImage}`}
                        className="w-32 h-32 mx-auto"
                        alt="Pix QR Code"
                      />
                    </div>
                  ) : (
                    <div className="py-4 text-[9px] text-gray-400">QR Code indisponível neste ambiente</div>
                  )}
                  {details.pixPayload && (
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider font-bold text-left">Pix Copia e Cola</p>
                      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-2">
                        <span className="text-[9px] text-gray-700 font-mono break-all line-clamp-1 text-left flex-1 select-all">
                          {details.pixPayload}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(details.pixPayload || '', 'pix')}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-600 transition-all shrink-0"
                        >
                          {copiedType === 'pix' ? <span className="text-green-600 font-bold text-[8px]">Copiado!</span> : <span className="text-[8px] uppercase font-bold">Copiar</span>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {details.barcode ? (
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-500 uppercase tracking-wider font-bold text-left">Código de Barras</p>
                      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-2">
                        <span className="text-[9px] text-gray-700 font-mono break-all line-clamp-1 text-left flex-1 select-all">
                          {details.barcode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(details.barcode || '', 'barcode')}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-600 transition-all shrink-0"
                        >
                          {copiedType === 'barcode' ? <span className="text-green-600 font-bold text-[8px]">Copiado!</span> : <span className="text-[8px] uppercase font-bold">Copiar</span>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-[9px] text-gray-400">Código de barras indisponível</div>
                  )}
                </div>
              )}

              <div className="text-center">
                <a
                  href={inst.asaas_invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[8px] font-black uppercase tracking-wider text-blue-600 hover:underline"
                >
                  Abrir fatura completa no navegador ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-[9px] text-gray-400">Não foi possível carregar os detalhes do pagamento.</div>
          )}
        </div>
      )}
    </div>
  );
}


// Componente para Visualização Interativa e Edição Livre de Contrato / Nota de Venda
function SaleDocumentViewer({
  sale,
  customer,
  unit,
  hideModal,
  showNotification
}: {
  sale: Sale;
  customer: any;
  unit: any;
  hideModal: () => void;
  showNotification: any;
}) {
  const { installments: storeInstallments, fetchInstallments } = useFinanceStore();

  useEffect(() => {
    fetchInstallments(sale.unit_id);
  }, [sale.id, sale.unit_id, fetchInstallments]);

  const installments = storeInstallments.filter(inst => inst.sale_id === sale.id);

  const [allAsaasDetails, setAllAsaasDetails] = useState<Record<string, { barcode: string | null; pixPayload: string | null; pixImage: string | null; invoiceUrl: string | null }>>({});
  const [loadingAllDetails, setLoadingAllDetails] = useState(false);
  const { fetchAsaasDetails } = useFinanceStore();

  const resolvedUnit = resolveUnitInfo(unit);
  const [activeTab, setActiveTab] = useState<'contract' | 'receipt' | 'pix_carne'>(
    sale.payment_type === 'vista' ? 'receipt' : 'contract'
  );

  useEffect(() => {
    if (activeTab === 'pix_carne' && installments.length > 0) {
      const installmentsToFetch = installments.filter(inst => inst.asaas_invoice_url && !allAsaasDetails[inst.id]);
      if (installmentsToFetch.length > 0) {
        setLoadingAllDetails(true);
        Promise.all(
          installmentsToFetch.map(inst =>
            fetchAsaasDetails(inst.id)
              .then(data => ({ id: inst.id, data }))
              .catch(err => {
                console.error(`Failed to fetch for ${inst.id}`, err);
                return { id: inst.id, data: null };
              })
          )
        ).then(results => {
          setAllAsaasDetails(prev => {
            const next = { ...prev };
            results.forEach(res => {
              if (res.data) {
                next[res.id] = res.data;
              }
            });
            return next;
          });
          setLoadingAllDetails(false);
        }).catch(() => {
          setLoadingAllDetails(false);
        });
      }
    }
  }, [activeTab, installments, fetchAsaasDetails]);
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
                .contract-page, .pix-slip-page {
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
                .contract-page:last-child, .pix-slip-page:last-child {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
        <div className="flex flex-wrap sm:flex-nowrap bg-white/5 p-1.5 rounded-2xl border border-white/5 gap-1">
          {sale.payment_type !== 'vista' ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('contract')}
                className={`px-4 sm:px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all ${activeTab === 'contract' ? 'bg-white text-black' : 'text-on-surface-variant hover:text-white'
                  }`}
              >
                Contrato de Venda
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('receipt')}
                className={`px-4 sm:px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all ${activeTab === 'receipt' ? 'bg-white text-black' : 'text-on-surface-variant hover:text-white'
                  }`}
              >
                Nota de Venda
              </button>
              {sale.payment_type === 'crediario' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pix_carne')}
                  className={`px-4 sm:px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all ${activeTab === 'pix_carne' ? 'bg-white text-black' : 'text-on-surface-variant hover:text-white'
                    }`}
                >
                  Boleto / Pix da MDR
                </button>
              )}
            </>
          ) : (
            <span className="px-6 py-2.5 text-white font-black uppercase tracking-widest text-[10px]">
              Nota de Venda
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 self-start sm:self-auto">
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
            <ContractPrint
              sale={{
                id: sale.id,
                device_model: (sale as any).device_model_manual || sale.device_model || '',
                imei: (sale as any).imei_manual || sale.imei || '',
                total_value: sale.total_value,
                original_price: sale.original_price,
                down_payment: sale.down_payment,
                installments: sale.installments,
                service_fee: sale.service_fee,
                date: sale.date || '',
                device_color: (sale as any).device_color,
                accessories: sale.accessories,
                payment_type: sale.payment_type,
                down_payment_method: downPaymentMethod,
                trade_device_model: tradeDeviceModel,
                trade_device_imei: tradeDeviceImei,
                interest_table: interestTable
              }}
              customer={customer}
              unit={unit}
              installmentValue={instValue}
              firstInstallmentValue={firstInstValue}
              isPreview={true}
            />
          ) : activeTab === 'pix_carne' ? (
            <div className="p-4 w-full bg-white text-black font-sans space-y-6 text-left" id="print-carne-container">
              <div className="text-center space-y-1 no-print">
                <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Carnê de Pagamento (Boleto/Pix)</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Este documento contém as faturas integradas prontas para impressão e pagamento.</p>
              </div>
              {loadingAllDetails ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 no-print">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Carregando detalhes das parcelas...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {installments
                    .sort((a, b) => a.number - b.number)
                    .map((inst) => {
                      const details = allAsaasDetails[inst.id];
                      return (
                        <div key={inst.id} className="pix-slip-page border border-gray-300 rounded-2xl p-6 bg-white text-black font-sans space-y-4 shadow-sm relative" style={{ pageBreakInside: 'avoid', borderStyle: 'dashed', borderWidth: '1px' }}>
                          {/* Header */}
                          <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                            <div>
                              <p className="font-bold text-sm tracking-wider uppercase text-gray-900">MDR Informática & Celulares</p>
                              <p className="text-[9px] text-gray-500">Emitente: {resolvedUnit.name || 'MDR'} | CNPJ: {resolvedUnit.cnpj || '___'}</p>
                              <p className="text-[9px] text-gray-500">Endereço: {resolvedUnit.address || '___'} | Telefone: {resolvedUnit.phone || '___'}</p>
                            </div>
                            <div className="text-right">
                              <span className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                                Parcela {inst.number} de {inst.total}
                              </span>
                              <p className="text-[9px] text-gray-400 mt-1">Ref. Contrato: {contractNumber}</p>
                            </div>
                          </div>

                          {/* Customer Info */}
                          <div className="text-[10px] text-gray-700 bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                            <p><strong>Cliente / Pagador:</strong> {customer.name}</p>
                            <p><strong>CPF/CNPJ:</strong> {formatCPF(customer.cpf)}</p>
                            {customer.address && <p><strong>Endereço:</strong> {customer.address}</p>}
                          </div>

                          {/* Box grid for Due date and Value */}
                          <div className="grid grid-cols-2 gap-4 col-gap-4">
                            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/20 text-center">
                              <p className="text-[9px] text-gray-500 uppercase font-black tracking-wider mb-0.5">Vencimento</p>
                              <p className="text-sm font-bold text-gray-900">{new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/20 text-center">
                              <p className="text-[9px] text-gray-500 uppercase font-black tracking-wider mb-0.5">Valor da Parcela</p>
                              <p className="text-sm font-bold text-blue-700">R$ {inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>

                          {/* Payment Instructions */}
                          <div className="border-t border-gray-100 pt-3 flex flex-col md:flex-row gap-6 items-center">
                            {/* QR Code */}
                            {inst.asaas_invoice_url ? (
                              details?.pixImage ? (
                                <div className="flex flex-col items-center shrink-0 bg-white border border-gray-200 p-2 rounded-xl">
                                  <img
                                    src={`data:image/png;base64,${details.pixImage}`}
                                    className="w-24 h-24"
                                    alt="Pix QR Code"
                                  />
                                  <span className="text-[7.5px] font-black uppercase text-gray-500 tracking-wider mt-1 font-sans">Pague com Pix</span>
                                </div>
                              ) : (
                                <div className="w-24 h-24 flex items-center justify-center border border-gray-200 bg-gray-50 rounded-xl shrink-0 text-[9px] text-gray-400">Carregando...</div>
                              )
                            ) : (
                              <div className="w-24 h-24 flex items-center justify-center border border-dashed border-gray-200 bg-gray-50 rounded-xl shrink-0 text-[9px] text-gray-400">Não Gerado</div>
                            )}

                            {/* Payment lines */}
                            <div className="flex-1 space-y-2.5 w-full">
                              <div>
                                <p className="text-[9px] font-bold text-gray-700 uppercase">Linha Digitável do Boleto:</p>
                                {inst.asaas_invoice_url ? (
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-[9px] break-all leading-tight text-gray-800 font-bold select-all">
                                    {details?.barcode || "Carregando linha digitável..."}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between bg-yellow-50 border border-yellow-100 rounded-lg p-2">
                                    <span className="text-[8px] text-yellow-800">Esta parcela não está integrada com o Asaas.</span>
                                    <SyncButton instId={inst.id} />
                                  </div>
                                )}
                              </div>

                              {details?.pixPayload && (
                                <div>
                                  <p className="text-[9px] font-bold text-gray-700 uppercase">Código Pix Copia e Cola:</p>
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-[9px] break-all leading-tight text-gray-800 select-all line-clamp-1">
                                    {details.pixPayload}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Decorative Barcode Pattern for Print */}
                          {inst.asaas_invoice_url && details?.barcode && (
                            <div className="pt-2 flex flex-col items-center justify-center">
                              <div className="w-full max-w-md h-8 bg-black flex overflow-hidden opacity-95" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 8px)' }} />
                              <span className="text-[8px] font-mono text-gray-500 mt-1">{details.barcode}</span>
                            </div>
                          )}

                          {/* Cut line helper */}
                          <div className="absolute -bottom-4 left-0 right-0 border-t border-dashed border-gray-300 no-print flex justify-center">
                            <span className="bg-white px-3 text-[8px] text-gray-400 uppercase font-black tracking-widest mt-[-6px]">Recortar Parcela</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
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
                const cleanUnitName = (resolvedUnit.name || 'MDR').replace(/MDR\s*(Informática\s*(e|&)\s*Celulares)?\s*-\s*/gi, '').toUpperCase();
                return (
                  <div className="header-center">
                    <div className="brand-name">MDR</div>
                    <div className="brand-sub">INFORMÁTICA &amp; CELULARES</div>
                    <div className="unit-details" style={{ fontSize: '9px', lineHeight: '1.25', color: '#333' }}>
                      <strong>LOJA: {cleanUnitName}</strong>
                      {resolvedUnit.cnpj && <> | CNPJ: {resolvedUnit.cnpj}</>}
                      {resolvedUnit.phone && <> | Tel: {formatPhone(resolvedUnit.phone)}</>}
                      <br />
                      {resolvedUnit.address}
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
                    <span className="align-right text-small">{cleanedAccessories}</span>
                  </div>
                );
              })()}
              <div className="row">
                <span>Pagamento:</span>
                <span className="align-right">{getPaymentLabel(sale.payment_type)}</span>
              </div>

              <div className="divider"></div>

              {/* Financial Details */}
              <div className="section-title">RESUMO FINANCEIRO</div>
              <div className="row">
                <span>Preço Base:</span>
                <span className="align-right font-mono">R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {sale.down_payment > 0 && (
                <>
                  <div className="row">
                    <span>Entrada:</span>
                    <span className="align-right font-mono">R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    <span className="align-right font-mono">R$ {financed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="row">
                    <span>Parcelas:</span>
                    <span className="align-right font-mono">{sale.installments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    <span className="align-right font-mono">R$ {(sale as any).amount_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="row">
                    <span>Troco:</span>
                    <span className="align-right font-mono">R$ {(sale as any).change_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              <div className="divider"></div>

              {/* Total Box */}
              <div className="total-box">
                <div className="total-label">VALOR TOTAL</div>
                <div className="total-val">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="divider"></div>

              {/* Signatures */}
              <div className="sig-line-box" style={{ marginTop: '50px' }}>
                <div className="sig-line"></div>
                <span className="sig-label">{resolvedUnit.name || 'MDR Informática & Celulares'}<br />Vendedor / Responsável</span>
              </div>

              <div className="sig-line-box" style={{ marginTop: '50px' }}>
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

function ConfirmPickupModal({ sale, onConfirm }: { sale: Sale; onConfirm: (method: string, type: string) => Promise<void> }) {
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentType, setPaymentType] = useState('vista');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(paymentMethod, paymentType);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <p className="text-xs text-on-surface-variant leading-relaxed">
        Selecione a forma de pagamento que o cliente está utilizando para a retirada do aparelho <strong className="text-white">{sale.device_model}</strong> no valor de <strong className="text-white">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>:
      </p>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Tipo de Pagamento</label>
        <select
          value={paymentType}
          onChange={(e) => {
            const val = e.target.value;
            setPaymentType(val);
            if (val === 'debit') {
              setPaymentMethod('card');
            } else if (val === 'card') {
              setPaymentMethod('card');
            } else {
              setPaymentMethod('pix');
            }
          }}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
        >
          <option value="vista" className="bg-[#121214]">À Vista (Dinheiro ou Pix)</option>
          <option value="card" className="bg-[#121214]">Cartão de Crédito</option>
          <option value="debit" className="bg-[#121214]">Cartão de Débito</option>
        </select>
      </div>

      {paymentType === 'vista' && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Forma de Recebimento</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:border-primary outline-none transition-all appearance-none"
          >
            <option value="pix" className="bg-[#121214]">PIX (Digital)</option>
            <option value="money" className="bg-[#121214]">Dinheiro (Físico)</option>
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 rounded-2xl bg-success text-on-success text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Confirmando...
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            Confirmar Retirada e Recebimento
          </>
        )}
      </button>
    </form>
  );
}

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting_pickup' | 'completed' | 'overdue'>('all');
  const { sales, fetchSales, deleteSale, isLoading } = useSaleStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { installments, fetchInstallments } = useFinanceStore();
  const { units, fetchAllUnits } = useUnitStore();
  const { profile } = useAuthStore();
  const { showNotification, showModal, hideModal } = useUI();
  const { hasPermission, fetchUserPermissions } = usePermissionStore();
  const { activeShift, fetchActiveShift } = useCashStore();

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  useEffect(() => {
    const unitId = profile?.unit_id || undefined;
    fetchSales(unitId);
    fetchCustomers(unitId);
    fetchInstallments(unitId);
    fetchAllUnits();
    if (profile?.unit_id) {
      fetchActiveShift(profile.unit_id);
    }
  }, [profile?.unit_id, fetchSales, fetchCustomers, fetchInstallments, fetchAllUnits, fetchActiveShift]);

  const filteredSales = sales.filter(s => {
    const matchesSearch = (s.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      s.device_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.imei.includes(searchTerm);

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  const handlePrintContract = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customer_id);

    if (!customer) {
      showNotification('error', 'Erro', 'Cliente não encontrado para esta venda.');
      return;
    }

    const saleUnit = units.find(u => u.id === sale.unit_id) || units[0] || {
      name: 'MDR Celulares',
      cnpj: '____________________',
      address: '____________________',
      phone: '____________________'
    };

    showModal({
      title: 'Visualizar & Imprimir Documentos',
      children: (
        <SaleDocumentViewer
          sale={sale}
          customer={customer}
          unit={saleUnit}
          hideModal={hideModal}
          showNotification={showNotification}
        />
      )
    });
  };

  const handleDeleteSale = (sale: Sale) => {
    showModal({
      title: 'Excluir Venda',
      children: (
        <div className="space-y-3">
          <p>Tem certeza que deseja excluir a venda de <strong className="text-white">{sale.device_model}</strong> para <strong className="text-white">{sale.customer_name}</strong>?</p>
          <p className="text-[10px] text-warning uppercase tracking-widest font-black bg-warning/10 p-3 rounded-xl border border-warning/20">
            ⚠️ O produto/acessório correspondente retornará automaticamente ao estoque da loja como "Disponível".
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Excluir Venda',
      onConfirm: async () => {
        try {
          await deleteSale(sale.id);
          showNotification('success', 'Venda Removida', 'A venda foi removida e a quantidade foi devolvida ao estoque com sucesso.');
        } catch (error) {
          showNotification('error', 'Erro ao Excluir', 'Não foi possível excluir a venda.');
        }
      }
    });
  };

  const handleEditSale = async (sale: Sale) => {
    if (profile?.role !== 'admin') {
      let currentShift = activeShift;
      if (profile?.unit_id) {
        currentShift = await fetchActiveShift(profile.unit_id);
      }
      if (!currentShift) {
        showNotification('error', 'Caixa Fechado', 'Abra o caixa para editar/lançar vendas.');
        return;
      }
    }
    showModal({
      title: 'Editar Venda',
      children: (
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <SaleForm
            initialData={sale}
            onSuccess={() => {
              hideModal();
              fetchSales(profile?.unit_id || undefined);
              fetchInstallments(profile?.unit_id || undefined);
            }}
            onCancel={() => hideModal()}
          />
        </div>
      ),
    });
  };

  const handleConfirmPickup = async (sale: Sale) => {
    let currentShift = activeShift;
    if (profile?.unit_id) {
      currentShift = await fetchActiveShift(profile.unit_id);
    }
    
    if (!currentShift) {
      showNotification('error', 'Caixa Fechado', 'Não existe um caixa aberto para esta unidade. Abra o caixa antes de confirmar a retirada.');
      return;
    }

    showModal({
      title: 'Confirmar Retirada e Recebimento',
      children: (
        <ConfirmPickupModal
          sale={sale}
          onConfirm={async (paymentMethod, paymentType) => {
            try {
              await useSaleStore.getState().confirmPickup(sale.id, paymentMethod, paymentType);
              showNotification('success', 'Retirada Confirmada', 'A retirada do aparelho e o recebimento foram registrados com sucesso.');
              hideModal();
              fetchSales(profile?.unit_id || undefined);
            } catch (err: any) {
              showNotification('error', 'Erro na Retirada', err.message || 'Falha ao confirmar retirada.');
            }
          }}
        />
      )
    });
  };

  const handleNewSale = async () => {
    if (profile?.role !== 'admin') {
      let currentShift = activeShift;
      if (profile?.unit_id) {
        currentShift = await fetchActiveShift(profile.unit_id);
      }
      if (!currentShift) {
        showNotification('error', 'Caixa Fechado', 'Abra o caixa para registrar novas vendas.');
        return;
      }
    }
    showModal({
      title: 'Registrar Nova Venda',
      children: (
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <SaleForm
            onSuccess={() => {
              hideModal();
              fetchSales(profile?.unit_id || undefined);
              fetchInstallments(profile?.unit_id || undefined);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {[
          { id: 'all', label: 'Volume de Vendas', value: `R$ ${sales.reduce((acc, s) => acc + s.total_value, 0).toLocaleString('pt-BR')}`, icon: ShoppingBag, color: 'text-primary', activeBorder: 'border-primary/50 shadow-primary/5', activeBar: 'bg-primary' },
          { id: 'waiting_pickup', label: 'Aguardando Retirada', value: sales.filter(s => s.status === 'waiting_pickup').length.toString(), icon: Clock, color: 'text-warning', activeBorder: 'border-warning/50 shadow-warning/5', activeBar: 'bg-warning' },
          { id: 'completed', label: 'Entregues / Em Dia', value: sales.filter(s => s.status === 'completed').length.toString(), icon: CheckCircle2, color: 'text-success', activeBorder: 'border-success/50 shadow-success/5', activeBar: 'bg-success' },
          { id: 'overdue', label: 'Contratos Atrasados', value: sales.filter(s => s.status === 'overdue').length.toString(), icon: ShieldCheck, color: 'text-error', activeBorder: 'border-error/50 shadow-error/5', activeBar: 'bg-error' },
        ].map((stat, idx) => {
          const isActive = statusFilter === stat.id;
          return (
            <div
              key={idx}
              onClick={() => setStatusFilter(stat.id as any)}
              className={`bg-white/[0.02] p-6 rounded-[32px] border relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.04] ${isActive ? stat.activeBorder : 'border-white/5'}`}
            >
              {isActive && (
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stat.activeBar}`} />
              )}
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color} mb-4 border border-white/10`}>
                <stat.icon size={20} />
              </div>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
              <h3 className="text-2xl font-black text-on-surface leading-none tracking-tight">{stat.value}</h3>
            </div>
          );
        })}
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
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        sale.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                        sale.status === 'processing' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                        sale.status === 'waiting_pickup' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-error/10 text-error border-error/20'
                      }`}>
                        <div className="w-1 h-1 rounded-full bg-current" />
                        {sale.status === 'completed' ? 'Em dia' :
                          sale.status === 'processing' ? 'Pendente' :
                          sale.status === 'waiting_pickup' ? 'Aguardando Retirada' : 'Atrasado'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sale.status === 'waiting_pickup' && (
                          <button
                            onClick={() => handleConfirmPickup(sale)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-success text-on-success rounded-xl font-black uppercase tracking-widest text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-success/10"
                            title="Confirmar Retirada e Recebimento"
                          >
                            <CheckCircle2 size={12} />
                            Confirmar Retirada
                          </button>
                        )}
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
