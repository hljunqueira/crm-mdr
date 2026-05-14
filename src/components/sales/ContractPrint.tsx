import React from 'react';
import { formatCPF, formatPhone } from '../../lib/utils';

interface ContractPrintProps {
  sale: {
    device_model: string;
    imei: string;
    total_value: number;
    down_payment: number;
    installments: number;
    date: string;
    service_fee?: number;
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
    contract_terms?: string;
    warranty_terms?: string;
  };
}

export default function ContractPrint({ sale, customer, unit }: ContractPrintProps) {
  const financedValue = sale.total_value - sale.down_payment;
  const installmentValue = financedValue / sale.installments;
  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <div id="sale-contract" className="hidden">
      <h1>CONTRATO DE COMPRA E VENDA DE CELULAR A PRAZO</h1>

      <div className="section">
        <h2>1. Partes</h2>
        <div className="grid">
          <div>
            <p><strong>Vendedor:</strong> <span className="data-field">{unit.name || 'MDR Informática & Celulares'}</span></p>
            <p><strong>CNPJ:</strong> <span className="data-field">{unit.cnpj || '____________________'}</span></p>
            <p><strong>Endereço:</strong> <span className="data-field">{unit.address || '____________________'}</span></p>
            <p><strong>Telefone:</strong> <span className="data-field">{unit.phone || '____________________'}</span></p>
          </div>
          <div>
            <p><strong>Comprador:</strong> <span className="data-field">{customer.name}</span></p>
            <p><strong>CPF/RG:</strong> <span className="data-field">{formatCPF(customer.cpf)}</span></p>
            <p><strong>Endereço:</strong> <span className="data-field">{customer.address || '____________________'}</span></p>
            <p><strong>Telefone:</strong> <span className="data-field">{formatPhone(customer.phone)}</span></p>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>2. Produto</h2>
        <p><strong>Aparelho:</strong> <span className="data-field">{sale.device_model}</span></p>
        <p><strong>IMEI:</strong> <span className="data-field">{sale.imei}</span></p>
        <p><strong>Cor:</strong> <span className="data-field">____________________</span></p>
        <p><strong>Estado:</strong> <span className="data-field">Novo/Seminovo</span> | <strong>Acessórios:</strong> <span className="data-field">____________________</span></p>
        <p><strong>Avarias no ato da venda:</strong> <span className="data-field">________________________________________</span></p>
      </div>

      <div className="section">
        <h2>3. Preço e Forma de Pagamento</h2>
        <p><strong>Valor Total:</strong> <span className="data-field">R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        <p><strong>Entrada:</strong> <span className="data-field">R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        <p><strong>Saldo:</strong> <span className="data-field">R$ {financedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> a ser pago em <span className="data-field">{sale.installments}</span> parcelas de <span className="data-field">R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> cada.</p>
        <p><strong>Vencimento:</strong> Todo dia <span className="data-field">{new Date(sale.date).getDate()}</span> do mês, com início em <span className="data-field">{new Date(sale.date).toLocaleDateString('pt-BR')}</span>.</p>
        <p><strong>Forma de Pagamento:</strong> <span className="data-field">PIX / Dinheiro / Transferência</span></p>
      </div>

      <div className="section">
        <h2>4. Atraso no Pagamento</h2>
        <p>Caso alguma parcela não seja paga em até <strong>5 dias</strong> após o vencimento:</p>
        <p>• <strong>Multa:</strong> 2% sobre o valor da parcela + juros de 1% ao mês.</p>
        <p>• <strong>Inadimplência:</strong> Se houver parcelas em atraso, o saldo total passa a ser devido imediatamente. O Vendedor poderá solicitar a devolução do aparelho.</p>
      </div>

      <div className="section">
        <h2>5. Garantia e Termos Adicionais</h2>
        {unit.warranty_terms ? (
          <p className="whitespace-pre-line">{unit.warranty_terms}</p>
        ) : (
          <>
            <p>• O celular continua sendo propriedade do Vendedor até a quitação total.</p>
            <p>• O Comprador assume responsabilidade por perda, roubo ou danos após a entrega.</p>
            <p>• O Vendedor não se responsabiliza por garantia após <strong>90 dias</strong>, exceto garantia do fabricante se for novo.</p>
          </>
        )}
      </div>

      <div className="section">
        <h2>6. Cláusulas Adicionais e Rescisão</h2>
        {unit.contract_terms ? (
          <p className="whitespace-pre-line text-xs">{unit.contract_terms}</p>
        ) : (
          <>
            <p>• Efetuar os pagamentos nas datas combinadas.</p>
            <p>• Não vender, penhorar ou transferir o celular antes da quitação.</p>
            <p>• Se o Comprador ficar inadimplente e não pagar após notificação, o Vendedor poderá retomar o aparelho ou cobrar judicialmente o saldo restante.</p>
            <p>• Valores já pagos não serão devolvidos, podendo ser retidos como taxa de uso/aluguel.</p>
          </>
        )}
      </div>

      <div className="footer">
        <p>Este contrato é regido pela lei brasileira. Qualquer conflito será resolvido no foro da comarca de Balneário Arroio do Silva/SC.</p>
        
        <div className="signature-box">
          <div className="signature-line">
            Vendedor: {unit.name || 'MDR Informática'}
            <br />Data: {today}
          </div>
          <div className="signature-line">
            Comprador: {customer.name}
            <br />Data: {today}
          </div>
        </div>
      </div>
    </div>
  );
}
