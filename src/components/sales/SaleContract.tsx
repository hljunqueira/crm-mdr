import React from 'react';
import { Sale } from '../../store/useSaleStore';
import { Customer } from '../../store/useCustomerStore';
import { Installment } from '../../store/useFinanceStore';
import { useUnitStore } from '../../store/useUnitStore';
import { formatCPF, formatPhone, resolveUnitInfo } from '../../lib/utils';

interface SaleContractProps {
  sale: Sale;
  customer: Customer;
  installments: Installment[];
}

export default function SaleContract({ sale, customer, installments }: SaleContractProps) {
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
  const { unit } = useUnitStore();

  const basePrice = sale.original_price ?? sale.total_value;
  const financed = basePrice - sale.down_payment;
  const instValue = installments.length > 0 ? installments[0].value : (sale.installments > 0 ? financed / sale.installments : 0);
  const totalWithFee = sale.total_value;

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

  const currentUnit = resolveUnitInfo(unit || { name: 'MDR Informática' });

  return (
    <div id="contract-print-area" className="p-8 text-black bg-white font-sans max-w-[800px] mx-auto text-xs leading-relaxed">
      <style dangerouslySetInnerHTML={{
        __html: `
        #contract-print-area table.ccb-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          line-height: 1.3;
        }
        #contract-print-area table.ccb-table td {
          border: 1px solid #333;
          padding: 4px 6px;
          vertical-align: top;
          font-size: 9.5px;
          color: #000;
        }
        #contract-print-area table.ccb-table td.header-cell {
          background-color: #f3f3f3;
          font-weight: bold;
          font-size: 9.5px;
          text-transform: uppercase;
          border-bottom: 1.5px solid #000;
          padding: 6px;
        }
        #contract-print-area table.ccb-table .label {
          font-size: 8px;
          color: #555;
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
          font-weight: bold;
        }
        #contract-print-area table.ccb-table .value {
          font-weight: bold;
          font-size: 9.5px;
          color: #000;
        }
        #contract-print-area .clause-title {
          font-size: 9.5px;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 8px;
          margin-bottom: 3px;
          color: #1a1a2e;
          border-bottom: 1px solid #ddd;
          padding-bottom: 1px;
        }
        #contract-print-area .clause-text {
          font-size: 9px;
          text-align: justify;
          margin-bottom: 5px;
          color: #222;
        }
        @media print {
          body * { visibility: hidden; }
          #contract-print-area, #contract-print-area * { visibility: visible; }
          #contract-print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100% !important;
            padding: 0;
            margin: 0;
          }
        }
      `}} />

      <div className="text-center mb-10 border-b-2 border-black pb-6">
        <h1 className="text-2xl font-bold uppercase text-black">Cédula de Compra e Venda a Prazo</h1>
        <p className="text-sm font-bold uppercase text-gray-700 tracking-wider">Com Cláusula de Reserva de Domínio</p>
        <p className="text-xs font-mono mt-1">Data da venda: <strong>{saleDateFormatted}</strong></p>
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
              <span className="value">{currentUnit.name}</span>
            </td>
            <td style={{ width: '30%' }}>
              <span className="label">CNPJ / CPF</span>
              <span className="value">{currentUnit.cnpj || '____________________'}</span>
            </td>
            <td style={{ width: '30%' }}>
              <span className="label">Telefone / WhatsApp</span>
              <span className="value">{currentUnit.phone || '____________________'}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={3}>
              <span className="label">Endereço do Estabelecimento</span>
              <span className="value">{currentUnit.address || '____________________'}</span>
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
              <span className="value">R$ {totalWithFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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

      <h2 style={{ fontSize: '10px', color: '#000', borderBottom: '2px solid #000', paddingBottom: '3px', marginTop: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
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
          <p>{currentUnit.name.toUpperCase()}</p>
          <p>Representante Vendedor</p>
        </div>
        <div className="flex-1 border-t border-black pt-2 text-center text-[10px]">
          <p>{customer.name.toUpperCase()}</p>
          <p>Comprador — CPF: {formatCPF(customer.cpf)}</p>
        </div>
      </div>

      <p className="text-center mt-10 text-[10px] text-gray-400">Gerado em {today} pelo Sistema MDR Gestão.</p>
    </div>
  );
}
