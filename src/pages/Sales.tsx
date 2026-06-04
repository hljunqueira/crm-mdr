import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Smartphone, ShoppingBag, Clock,
  CheckCircle2, AlertCircle, MoreVertical, Filter,
  DollarSign, Calendar, Layers, ShieldCheck, Tag,
  Package, ArrowRight, Edit, Trash2, TrendingUp,
  Printer, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSaleStore, Sale } from '../store/useSaleStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUI } from '../context/UIContext';
import { useAuthStore } from '../store/useAuthStore';
import { useUnitStore } from '../store/useUnitStore';
import { formatCPF, formatPhone } from '../lib/utils';
import SaleForm from '../components/sales/SaleForm';
import SaleContract from '../components/sales/SaleContract';

// Componente para Visualização Interativa e Edição Livre de Contrato / Nota
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
  const [activeTab, setActiveTab] = useState<'contract' | 'receipt'>('contract');
  const today = new Date().toLocaleDateString('pt-BR');

  const basePrice = sale.original_price ?? sale.total_value;
  const financed = basePrice - sale.down_payment;
  const instValue = installments.length > 0 ? installments[0].value : (sale.installments > 0 ? financed / sale.installments : 0);

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

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão - CRM MDR</title>
          ${styles}
          <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background: #fff !important; color: #000 !important; font-family: sans-serif; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
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

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
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
      <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar border border-white/10 rounded-3xl bg-white text-black">
        <div
          id="sale-document-preview-area"
          contentEditable={true}
          suppressContentEditableWarning={true}
          className="p-8 font-sans text-xs leading-relaxed outline-none"
        >
          {activeTab === 'contract' ? (
            /* Contrato */
            <div className="font-serif max-w-[800px] mx-auto text-sm leading-relaxed text-black bg-white">
              <style dangerouslySetInnerHTML={{ __html: `
                #sale-document-preview-area table.ccb-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 10px;
                  line-height: 1.3;
                }
                #sale-document-preview-area table.ccb-table td {
                  border: 1px solid #333;
                  padding: 4px 6px;
                  vertical-align: top;
                  font-size: 9.5px;
                  color: #000;
                }
                #sale-document-preview-area table.ccb-table td.header-cell {
                  background-color: #f3f3f3;
                  font-weight: bold;
                  font-size: 9.5px;
                  text-transform: uppercase;
                  border-bottom: 1.5px solid #000;
                  padding: 6px;
                }
                #sale-document-preview-area table.ccb-table .label {
                  font-size: 8px;
                  color: #555;
                  text-transform: uppercase;
                  display: block;
                  margin-bottom: 2px;
                  font-weight: bold;
                }
                #sale-document-preview-area table.ccb-table .value {
                  font-weight: bold;
                  font-size: 9.5px;
                  color: #000;
                }
                #sale-document-preview-area .clause-title {
                  font-size: 9.5px;
                  font-weight: bold;
                  text-transform: uppercase;
                  margin-top: 8px;
                  margin-bottom: 3px;
                  color: #1a1a2e;
                  border-bottom: 1px solid #ddd;
                  padding-bottom: 1px;
                }
                #sale-document-preview-area .clause-text {
                  font-size: 9px;
                  text-align: justify;
                  margin-bottom: 5px;
                  color: #222;
                }
              `}} />

              <div className="text-center mb-10 border-b-2 border-black pb-6">
                <h1 className="text-2xl font-bold uppercase text-black">Cédula de Compra e Venda a Prazo</h1>
                <p className="text-sm font-bold uppercase text-gray-700 tracking-wider">Com Cláusula de Reserva de Domínio</p>
              </div>

              {/* Section 1: Credor Table */}
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

              {/* Section 2: Emitente Table */}
              <table className="ccb-table">
                <thead>
                  <tr>
                    <td colSpan={3} className="header-cell">II. Emitente (Comprador)</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '40%' }}>
                      <span className="label">Nome Completo</span>
                      <span className="value">{customer.name}</span>
                    </td>
                    <td style={{ width: '30%' }}>
                      <span className="label">CPF</span>
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

              {/* Section 3: Financial Characteristics Table */}
              <table className="ccb-table">
                <thead>
                  <tr>
                    <td colSpan={4} className="header-cell">III. Características da Operação de Venda a Prazo</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '25%' }}>
                      <span className="label">Valor do Aparelho (À Vista)</span>
                      <span className="value">R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td style={{ width: '25%' }}>
                      <span className="label">Valor de Entrada Paga</span>
                      <span className="value">R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td style={{ width: '25%' }}>
                      <span className="label">Saldo Financiado (MDR)</span>
                      <span className="value">R$ {financed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td style={{ width: '25%' }}>
                      <span className="label">Valor Total do Contrato</span>
                      <span className="value">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="label">Nº de Parcelas</span>
                      <span className="value">{sale.installments} parcelas</span>
                    </td>
                    <td>
                      <span className="label">Valor da Parcela</span>
                      <span className="value">R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td>
                      <span className="label">Vencimento das Parcelas</span>
                      <span className="value">Todo dia {new Date(sale.date + 'T12:00:00').getDate()}</span>
                    </td>
                    <td>
                      <span className="label">Forma de Pagamento</span>
                      <span className="value">{sale.payment_type === 'card' ? 'Cartão de Crédito' : sale.payment_type === 'vista' ? 'À Vista (Dinheiro/Pix)' : 'PIX / Dinheiro / Transferência'}</span>
                    </td>
                  </tr>
                  {downPaymentMethod === 'trade' && (
                    <tr>
                      <td colSpan={2}>
                        <span className="label">Entrada em Permuta (Aparelho Recebido)</span>
                        <span className="value">{tradeDeviceModel}</span>
                      </td>
                      <td colSpan={2}>
                        <span className="label">IMEI / Número de Série (Permuta)</span>
                        <span className="value">{tradeDeviceImei || 'N/A'}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Section 4: Object and Guarantees Table */}
              <table className="ccb-table">
                <thead>
                  <tr>
                    <td colSpan={3} className="header-cell">IV. Objeto Financiado e Garantias</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '40%' }}>
                      <span className="label">Marca e Modelo do Equipamento</span>
                      <span className="value">{sale.device_model}</span>
                    </td>
                    <td style={{ width: '30%' }}>
                      <span className="label">IMEI / Número de Série (Garantia)</span>
                      <span className="value">{sale.imei || '____________________'}</span>
                    </td>
                    <td style={{ width: '30%' }}>
                      <span className="label">Cor do Dispositivo</span>
                      <span className="value">{sale.device_color || '____________________'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <span className="label">Acessórios Entregues</span>
                      <span className="value">{sale.accessories || 'Nenhum'}</span>
                    </td>
                    <td>
                      <span className="label">Software de Gestão e Bloqueio Remoto</span>
                      <span className="value">Instalado e Ativo no Aparelho</span>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <span className="label">Avarias / Observações Visuais no Ato da Entrega</span>
                      <span className="value">__________________________________________________________________________________________</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <h2 style={{ fontSize: '10px', color: '#6C63FF', borderBottom: '2px solid #6C63FF', paddingBottom: '3px', marginTop: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                CONDIÇÕES GERAIS E CLÁUSULAS CONTRATUAIS
              </h2>

              <div className="clause-title">1. Da Reserva de Domínio e Fiel Depositário</div>
              <div className="clause-text">
                1.1. <strong>RESERVA DE DOMÍNIO (Art. 521 da Lei nº 10.406/2002 - Código Civil):</strong> O VENDEDOR reserva para si a propriedade e o domínio resolúvel do dispositivo eletrônico identificado no item IV até que ocorra o pagamento integral de todas as parcelas avençadas neste instrumento.
                <br />
                1.2. A posse direta do bem é transferida neste ato ao COMPRADOR, que assume, de forma irrevogável, a condição de fiel depositário do dispositivo eletrônico, responsabilizando-se civil e criminalmente por sua guarda e conservação, bem como respondendo integralmente por perdas, danos, deteriorações, extravio, furto ou roubo do bem a partir da data de recebimento do equipamento.
              </div>

              <div className="clause-title">2. Do Consentimento de Bloqueio Remoto e Independência do SIM Card</div>
              <div className="clause-text">
                2.1. <strong>AUTORIZAÇÃO DE BLOQUEIO REMOTO:</strong> Em consonância com a garantia do domínio resolúvel do VENDEDOR, o COMPRADOR declara ter ciência e **presta consentimento expresso, irrevogável e inequívoco** para que o VENDEDOR realize o **bloqueio remoto imediato** das funcionalidades do dispositivo eletrônico caso ocorra atraso superior a 5 (cinco) dias no pagamento de qualquer parcela avençada.
                <br />
                2.2. **INDEPENDÊNCIA DO SIM CARD:** O COMPRADOR reconhece e concorda que o bloqueio remoto incidirá exclusivamente nas funcionalidades de software e interface do dispositivo eletrônico, **não afetando, em nenhuma hipótese, os direitos de telecomunicação do chip SIM (cartão da operadora)**. O chip de telefonia móvel poderá ser retirado e utilizado normalmente pelo COMPRADOR em qualquer outro aparelho celular.
                <br />
                2.3. O bloqueio remoto perdurará por todo o período de inadimplemento. O VENDEDOR compromete-se a liberar o acesso ao dispositivo no prazo de até 24 (vinte e quatro) horas úteis contadas da efetiva compensação bancária do pagamento em atraso.
                <br />
                2.4. A garantia de bloqueio remoto cessará por completo mediante o adimplemento integral de todas as obrigações pecuniárias previstas neste contrato, momento em que o COMPRADOR poderá desinstalar definitivamente o aplicativo de gestão e passará a deter a propriedade plena do bem.
              </div>

              <div className="clause-title">3. Do Vencimento Antecipado da Dívida e Encargos de Mora</div>
              <div className="clause-text">
                3.1. <strong>VENCIMENTO ANTECIPADO:</strong> O atraso no pagamento de qualquer parcela por período superior a 5 (cinco) dias constituirá o COMPRADOR in mora de pleno direito e autorizará o VENDEDOR, a seu exclusivo critério, a declarar antecipadamente vencidas todas as parcelas vincendas, exigindo a quitação imediata do saldo devedor remanescente ou a devolução imediata do dispositivo eletrônico no estado de conservação em que se encontra, sem prejuízo da cobrança judicial ou extrajudicial aplicável.
                <br />
                3.2. Sobre as parcelas pagas in atraso incidirá multa penal de 2% (dois por cento) sobre o valor da parcela vencida, acrescida de juros de mora de 1% (um por cento) ao mês calculados *pro-rata temporis*.
              </div>

              <div className="clause-title">4. Do Desconto por Antecipação e Liquidação Antecipada (Art. 52, § 2º do CDC)</div>
              <div className="clause-text">
                4.1. É garantido ao COMPRADOR, a qualquer tempo, o direito de efetuar a liquidação antecipada (total ou parcial) do saldo devedor, mediante redução proporcional dos juros e encargos financeiros embutidos nas parcelas vincendas.
                <br />
                4.2. Conforme a política comercial da MDR, são aplicados os seguintes descontos promocionais fixos sobre os juros das parcelas antecipadas:
                • Antecipação de 1 parcela: desconto de <strong>3%</strong>;
                • Antecipação de 2 parcelas: desconto de <strong>5%</strong>;
                • Antecipação de 3 parcelas ou mais: desconto de <strong>8%</strong>.
              </div>

              <div className="clause-title">5. Da Proteção ao Crédito e Banco Central (SCR)</div>
              <div className="clause-text">
                5.1. O COMPRADOR autoriza expressamente o VENDEDOR a consultar seus dados restritivos e histórico de crédito junto aos órgãos de proteção ao crédito (SPC, Serasa e afins) e ao Sistema de Informações de Crédito (SCR) gerido pelo Banco Central do Brasil (BACEN).
                <br />
                5.2. Em caso de atraso superior a 5 (cinco) dias, fica o VENDEDOR autorizado a registrar a inadimplência e o nome do COMPRADOR nos cadastros restritivos de crédito e no SCR/BACEN, conforme legislação em vigor.
              </div>

              <div className="clause-title">6. Da Validade da Assinatura Eletrônica e do Título Executivo</div>
              <div className="clause-text">
                6.1. As partes declaram e reconhecem a plena validade jurídica da assinatura eletrônica/digital realizada neste instrumento coletada de forma eletrônica no ato de fechamento da venda, atestando sua autoria, integridade e concordância com os termos aqui pactuados, nos termos do art. 10, § 2º da Medida Provisória nº 2.200-2/2001.
                <br />
                6.2. Este contrato constitui Título Executivo Extrajudicial, nos termos do artigo 784, inciso III do Código de Processo Civil brasileiro, apto a instruir ação de execução direta em caso de descumprimento das obrigações pecuniárias.
              </div>

              <div className="mt-20 flex justify-between gap-10">
                <div className="flex-1 border-t border-black pt-2 text-center text-[10px]">
                  <p>{unit.name ? unit.name.toUpperCase() : 'MDR CELULARES'}</p>
                  <p>Vendedor / Responsável</p>
                </div>
                <div className="flex-1 border-t border-black pt-2 text-center text-[10px]">
                  <p>{customer.name.toUpperCase()}</p>
                  <p>Comprador — CPF: {formatCPF(customer.cpf)}</p>
                </div>
              </div>

              <p className="text-center mt-10 text-[10px] text-gray-400">Gerado em {today} pelo Sistema MDR Gestão.</p>
            </div>
          ) : (
            /* Nota de Venda / Recibo */
            <div className="font-sans max-w-[800px] mx-auto text-sm leading-relaxed text-black bg-white">
              <div className="flex justify-between items-start mb-6 pb-6 border-b-2 border-black">
                <div>
                  <h1 className="text-2xl font-bold uppercase text-black">{unit.name || 'MDR Celulares'}</h1>
                  <p className="text-xs text-gray-600">{unit.address || 'BALNEÁRIO ARROIO DO SILVA / SC'}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-black">NOTA DE VENDA</h2>
                  <p className="text-xs text-gray-600">Recibo de Compra</p>
                  <p className="text-xs font-mono mt-1">Data: <strong>{today}</strong></p>
                </div>
              </div>

              <section className="mb-6">
                <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">Dados do Comprador</h2>
                <p><strong>Nome:</strong> {customer.name}</p>
                <p><strong>CPF:</strong> {formatCPF(customer.cpf)}</p>
                <p><strong>Telefone:</strong> {formatPhone(customer.phone) || '—'}</p>
              </section>

              <section className="mb-6">
                <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">Produto Adquirido</h2>
                <p><strong>Aparelho:</strong> {sale.device_model}</p>
                <p><strong>IMEI / Serial:</strong> {sale.imei || '—'}</p>
                <p><strong>Cor:</strong> {sale.device_color || '—'}</p>
                <p><strong>Acessórios:</strong> {sale.accessories || '—'}</p>
              </section>

              <section className="mb-6">
                <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">Resumo Financeiro</h2>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center mb-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Valor Total da Venda</p>
                  <p className="text-3xl font-black text-black font-mono">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                {sale.payment_type === 'vista' ? (
                  <p>• <strong>Forma de Pagamento:</strong> À Vista (Dinheiro/Pix)</p>
                ) : (
                  <>
                    <p>• <strong>Entrada Paga:</strong> R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p>• <strong>Financiamento:</strong> {sale.installments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </>
                )}
              </section>

              {sale.payment_type === 'crediario' && (
                <section className="mb-6">
                  <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">⚡ Desconto Garantido por Antecipação</h2>
                  <p className="text-[10px]">• ✅ <strong>1 parcela adiantada:</strong> Desconto de <strong>3%</strong> nos juros da parcela.</p>
                  <p className="text-[10px]">• ✅ <strong>2 parcelas adiantadas:</strong> Desconto de <strong>5%</strong> nos juros das parcelas.</p>
                  <p className="text-[10px]">• ✅ <strong>3 parcelas adiantadas ou mais:</strong> Desconto de <strong>8%</strong> nos juros das parcelas.</p>
                  <p className="text-[10px]">• ✅ <strong>Quitação acima de 50%:</strong> Abatimento especial negociado.</p>
                </section>
              )}

              <div className="mt-20 flex justify-between gap-10">
                <div className="flex-1 border-t border-black pt-2 text-center text-[10px]">
                  <p>{unit.name ? unit.name.toUpperCase() : 'MDR CELULARES'}</p>
                  <p>Vendedor / Responsável</p>
                </div>
                <div className="flex-1 border-t border-black pt-2 text-center text-[10px]">
                  <p>{customer.name.toUpperCase()}</p>
                  <p>Comprador / CPF: {formatCPF(customer.cpf)}</p>
                </div>
              </div>

              <p className="text-center mt-10 text-[10px] text-gray-400">Gerado em {today} pelo Sistema MDR Gestão.</p>
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
        <SaleDocumentViewer
          sale={sale}
          customer={customer}
          installments={saleInstallments}
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
        <button
          onClick={handleNewSale}
          className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
        >
          <Smartphone size={18} />
          Nova Venda
        </button>
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
                        <button
                          onClick={() => handlePrintContract(sale)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-all text-on-surface-variant hover:text-white"
                          title="Imprimir Contrato"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleEditSale(sale)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-all text-on-surface-variant hover:text-primary"
                          title="Editar Venda"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="p-2 hover:bg-error/10 rounded-xl transition-all text-on-surface-variant hover:text-error"
                          title="Excluir Venda"
                        >
                          <Trash2 size={16} />
                        </button>
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
