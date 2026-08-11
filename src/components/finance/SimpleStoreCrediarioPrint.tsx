import React from 'react';
import { printElement } from '../../lib/utils';

export interface SimpleCrediarioPrintProps {
  customerName: string;
  customerCpf?: string;
  customerPhone?: string;
  productOrService: string;
  saleDate?: string;
  installments: Array<{
    number: number;
    total: number;
    dueDate?: string;
    value: number;
    status: string;
    paymentDate?: string;
  }>;
  storeName?: string;
  storeCnpj?: string;
  storePhone?: string;
  formatMode?: 'cupom' | 'a4';
}

export default function SimpleStoreCrediarioPrint({
  customerName,
  customerCpf,
  customerPhone,
  productOrService,
  saleDate,
  installments,
  storeName = 'MDR INFORMÁTICA E CELULARES',
  storeCnpj = '',
  storePhone = '(48) 99903-5854',
  formatMode = 'cupom'
}: SimpleCrediarioPrintProps) {

  const formatDate = (dStr?: string) => {
    if (!dStr) return '-';
    try {
      const cleanStr = dStr.includes('T') ? dStr : `${dStr}T12:00:00`;
      return new Date(cleanStr).toLocaleDateString('pt-BR');
    } catch {
      return dStr;
    }
  };

  const totalValue = installments.reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  if (formatMode === 'cupom') {
    return (
      <div
        id="simple-crediario-print"
        className="bg-white text-black p-4 font-mono text-[11px] leading-tight max-w-[80mm] mx-auto border border-black/20 print:border-none print:p-0 print:m-0"
      >
        {/* Cabeçalho Cupom 80mm */}
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <h2 className="font-bold text-xs uppercase tracking-tight">{storeName}</h2>
          {storeCnpj && <p className="text-[9px]">CNPJ: {storeCnpj}</p>}
          {storePhone && <p className="text-[9px]">TEL: {storePhone}</p>}
          <p className="font-bold text-[10px] uppercase mt-1">COMPROVANTE DE CREDIARIO LOJA</p>
        </div>

        {/* Dados do Cliente */}
        <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
          <p><span className="font-bold">CLIENTE:</span> {customerName.toUpperCase()}</p>
          {customerCpf && <p><span className="font-bold">CPF:</span> {customerCpf}</p>}
          {customerPhone && <p><span className="font-bold">TEL:</span> {customerPhone}</p>}
          <p><span className="font-bold">DATA DA VENDA:</span> {formatDate(saleDate || new Date().toISOString())}</p>
          <p className="truncate"><span className="font-bold">PRODUTO/SERVIÇO:</span> {productOrService.toUpperCase()}</p>
        </div>

        {/* Tabela de Parcelas */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <p className="font-bold text-center uppercase mb-1">PARCELAMENTO</p>
          <div className="grid grid-cols-4 font-bold text-[9px] border-b border-black pb-1 mb-1 text-center">
            <span>PARC</span>
            <span>VENC</span>
            <span>VALOR</span>
            <span>STATUS</span>
          </div>
          {installments.map((inst, idx) => (
            <div key={idx} className="grid grid-cols-4 text-[9.5px] py-0.5 text-center">
              <span>{inst.number}/{inst.total}</span>
              <span>{formatDate(inst.dueDate)}</span>
              <span>R${Number(inst.value).toFixed(2)}</span>
              <span className="font-bold">
                {inst.status === 'paid' || inst.status === 'pago' ? 'PAGO' : 'PEND'}
              </span>
            </div>
          ))}
        </div>

        {/* Total e Assinatura */}
        <div className="text-right font-bold text-xs mb-4">
          TOTAL: R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>

        <div className="text-center pt-4 border-t border-dashed border-black space-y-6">
          <div className="border-t border-black pt-1 w-3/4 mx-auto text-[9px] uppercase font-bold">
            Assinatura do Cliente
          </div>
          <p className="text-[8px] text-center uppercase">
            Reconheço o débito acima e me comprometo com o pagamento nos vencimentos informados.
          </p>
        </div>
      </div>
    );
  }

  // Formato A4 Simples
  return (
    <div
      id="simple-crediario-print"
      className="bg-white text-black p-8 font-sans max-w-2xl mx-auto border border-black/20 print:border-none print:p-0 print:m-0"
    >
      {/* Cabeçalho A4 */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="font-black text-xl uppercase tracking-wider">{storeName}</h1>
          <p className="text-xs text-gray-600">Comprovante & Carnê de Crediário da Loja Física</p>
        </div>
        <div className="text-right text-xs">
          {storeCnpj && <p className="font-mono">CNPJ: {storeCnpj}</p>}
          <p className="font-mono">Fone: {storePhone}</p>
          <p className="font-mono font-bold mt-1">Data: {formatDate(saleDate || new Date().toISOString())}</p>
        </div>
      </div>

      {/* Dados do Cliente e Venda */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <p><span className="font-bold text-gray-700">Cliente:</span> {customerName.toUpperCase()}</p>
          {customerCpf && <p><span className="font-bold text-gray-700">CPF:</span> {customerCpf}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {customerPhone && <p><span className="font-bold text-gray-700">Telefone:</span> {customerPhone}</p>}
          <p><span className="font-bold text-gray-700">Item / Serviço:</span> {productOrService.toUpperCase()}</p>
        </div>
      </div>

      {/* Tabela de Parcelamento A4 */}
      <div className="mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 text-gray-800 border-b border-gray-300 pb-1">
          Cronograma de Vencimento de Parcelas
        </h3>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 border-y border-gray-300 text-gray-700 uppercase font-bold">
              <th className="py-2.5 px-3">Parcela</th>
              <th className="py-2.5 px-3">Vencimento</th>
              <th className="py-2.5 px-3">Valor da Parcela</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Data de Pagamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {installments.map((inst, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="py-2.5 px-3 font-bold font-mono">
                  {inst.number} / {inst.total}
                </td>
                <td className="py-2.5 px-3 font-mono">{formatDate(inst.dueDate)}</td>
                <td className="py-2.5 px-3 font-bold font-mono">
                  R$ {Number(inst.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 font-bold">
                  {inst.status === 'paid' || inst.status === 'pago' ? (
                    <span className="text-green-700">PAGO</span>
                  ) : (
                    <span className="text-amber-700">PENDENTE</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                  {inst.paymentDate ? formatDate(inst.paymentDate) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo Total */}
      <div className="flex justify-between items-center bg-gray-100 p-4 rounded-xl mb-12">
        <span className="font-bold text-xs uppercase text-gray-700">Valor Total do Crediário</span>
        <span className="font-black text-lg font-mono">
          R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Assinatura */}
      <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-300 text-center text-xs">
        <div>
          <div className="border-t border-black pt-2 w-3/4 mx-auto font-bold uppercase">
            {storeName}
          </div>
        </div>
        <div>
          <div className="border-t border-black pt-2 w-3/4 mx-auto font-bold uppercase">
            {customerName.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
