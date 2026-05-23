import React from 'react';
import { Sale } from '../../store/useSaleStore';
import { Customer } from '../../store/useCustomerStore';
import { Installment } from '../../store/useFinanceStore';
import { useUnitStore } from '../../store/useUnitStore';

interface SaleContractProps {
  sale: Sale;
  customer: Customer;
  installments: Installment[];
}

export default function SaleContract({ sale, customer, installments }: SaleContractProps) {
  const today = new Date().toLocaleDateString('pt-BR');
  const { unit } = useUnitStore();

  return (
    <div id="contract-print-area" className="p-8 text-black bg-white font-serif max-w-[800px] mx-auto text-sm leading-relaxed">
      <div className="text-center mb-10 border-b-2 border-black pb-6">
        <h1 className="text-2xl font-bold uppercase">Contrato de Compra e Venda de Equipamento Eletrônico</h1>
      </div>

      <section className="mb-6">
        <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs">1. Das Partes</h2>
        <p><strong>VENDEDOR:</strong> {unit?.name || 'MDR Celulares'}, com sede em {unit?.address || '[Endereço da Loja]'}, inscrito no CNPJ sob o nº {unit?.cnpj || '[CNPJ]'}.</p>
        <p className="mt-2"><strong>COMPRADOR:</strong> {customer.name}, CPF: {customer.cpf}, residente em {customer.address || "Endereço não informado"}.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs">2. Do Objeto</h2>
        <p>O presente contrato tem como objeto a venda do seguinte dispositivo:</p>
        <div className="mt-2 pl-4">
          <p>• <strong>Modelo:</strong> {sale.device_model}</p>
          <p>• <strong>IMEI:</strong> {sale.imei}</p>
          <p>• <strong>Cor:</strong> {sale.device_color || 'N/A'}</p>
          <p>• <strong>Acessórios:</strong> {sale.accessories || 'Nenhum'}</p>
          <p>• <strong>Data da Venda:</strong> {new Date(sale.date).toLocaleDateString('pt-BR')}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs">3. Do Preço e Pagamento</h2>
        <p>O valor total da transação é de <strong>R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, conforme as seguintes condições:</p>
        <p className="mt-1">• Entrada: R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p className="mt-1">• Parcelas: {sale.installments}x de R$ {( (sale.total_value - sale.down_payment) / sale.installments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        
        {installments.length > 0 && (
          <table className="w-full mt-4 border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-1 text-left">Parcela</th>
                <th className="border p-1 text-left">Vencimento</th>
                <th className="border p-1 text-left">Valor</th>
              </tr>
            </thead>
            <tbody>
              {installments.sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(inst => (
                <tr key={inst.id}>
                  <td className="border p-1">{inst.number}/{inst.total}</td>
                  <td className="border p-1">{new Date(inst.due_date).toLocaleDateString('pt-BR')}</td>
                  <td className="border p-1">R$ {inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-6">
        <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs">4. Das Responsabilidades do Comprador</h2>
        <p className="text-[10px]">
          4.1. O COMPRADOR compromete-se a efetuar o pagamento das parcelas rigorosamente nas datas de vencimento.<br/>
          4.2. Em caso de atraso superior a 5 (cinco) dias, o VENDEDOR reserva-se o direito de realizar o bloqueio remoto do dispositivo via IMEI/Software de Gestão.<br/>
          4.3. O desbloqueio ocorrerá em até 24 horas úteis após a compensação do pagamento.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs">5. Garantia</h2>
        <p className="text-[10px]">90 (noventa) dias contra defeitos de fabricação, não cobrindo danos por mau uso, umidade ou intervenção de terceiros.</p>
      </section>

      <div className="mt-20 flex justify-between gap-10">
        <div className="flex-1 border-t border-black pt-2 text-center text-[10px]">
          <p>{unit?.name?.toUpperCase() || 'MDR CELULARES'}</p>
          <p>CONTROLE DE VENDAS</p>
        </div>
        <div className="flex-1 border-t border-black pt-2 text-center text-[10px]">
          <p>{customer.name.toUpperCase()}</p>
          <p>CPF: {customer.cpf}</p>
        </div>
      </div>

      <p className="text-center mt-10 text-[10px] text-gray-400">Gerado em {today} pelo Sistema MDR Gestão.</p>

      <style dangerouslySetInnerHTML={{ __html: `
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
    </div>
  );
}
