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
              <div className="text-center mb-10 border-b-2 border-black pb-6">
                <h1 className="text-2xl font-bold uppercase text-black">{unit.name || 'MDR Celulares'}</h1>
                <p className="text-sm font-bold uppercase text-gray-700 tracking-wider">Contrato de Compra e Venda de Equipamento com Reserva de Domínio</p>
              </div>

              <section className="mb-6">
                <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">1. Das Partes</h2>
                <p><strong>VENDEDOR:</strong> <span className="font-bold">{unit.name || 'MDR Celulares'}</span>, CNPJ nº <span className="font-bold">{unit.cnpj || '____________________'}</span>, com sede em <span className="font-bold">{unit.address || '____________________'}</span>, Telefone: <span className="font-bold">{unit.phone || '____________________'}</span>.</p>
                <p className="mt-2"><strong>COMPRADOR:</strong> <span className="font-bold">{customer.name}</span>, CPF: <span className="font-bold">{formatCPF(customer.cpf)}</span>, residente e domiciliado em <span className="font-bold">{customer.address || "Endereço não informado"}</span>, Telefone: <span className="font-bold">{formatPhone(customer.phone)}</span>.</p>
              </section>

              <section className="mb-6">
                <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">2. Do Objeto e Reserva de Domínio</h2>
                <p>O presente contrato tem como objeto a venda do seguinte dispositivo eletrônico:</p>
                <div className="mt-2 pl-4">
                  <p>• <strong>Modelo:</strong> {sale.device_model}</p>
                  <p>• <strong>IMEI / Serial:</strong> {sale.imei}</p>
                  <p>• <strong>Cor:</strong> {sale.device_color || 'N/A'}</p>
                  <p>• <strong>Acessórios:</strong> {sale.accessories || 'Nenhum'}</p>
                  <p>• <strong>Data da Transação:</strong> {new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <p className="mt-3 text-[10.5px] text-justify text-gray-800 leading-normal">
                  <strong>PARÁGRAFO ÚNICO (RESERVA DE DOMÍNIO):</strong> Fica estabelecida a <strong>Cláusula de Reserva de Domínio</strong> (Art. 521 da Lei nº 10.406/2002 - Código Civil), pela qual o VENDEDOR reserva para si a propriedade e o domínio resolúvel do bem objeto deste contrato até que ocorra o pagamento integral de todas as parcelas avençadas. A posse direta é transferida neste ato ao COMPRADOR, que assume todas as responsabilidades civis, fiscais e como fiel depositário do bem.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">3. Do Preço, Condições e Desconto por Antecipação</h2>
                <p>O valor total da transação é de <strong>R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, conforme as seguintes condições:</p>
                {sale.payment_type === 'vista' ? (
                  <p className="mt-1">• <strong>Forma de Pagamento:</strong> À Vista (Dinheiro/Pix)</p>
                ) : (
                  <>
                    <p className="mt-1">• <strong>Entrada Paga:</strong> R$ {sale.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="mt-1">• <strong>Plano de Financiamento:</strong> {sale.installments}x de R$ {instValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </>
                )}

                {sale.payment_type === 'crediario' && (
                  <div className="my-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-[10.5px] text-gray-800 leading-relaxed">
                    <strong className="text-black uppercase block mb-1.5">⚡ Desconto por Antecipação (Garantia do Art. 52, § 2º do CDC):</strong>
                    <p>• ✅ <strong>1 parcela adiantada:</strong> Desconto de <strong>3%</strong> sobre o juro embutido da parcela.</p>
                    <p>• ✅ <strong>2 parcelas adiantadas:</strong> Desconto de <strong>5%</strong> sobre os juros embutidos das parcelas.</p>
                    <p>• ✅ <strong>3 parcelas adiantadas ou mais:</strong> Desconto de <strong>8%</strong> sobre os juros embutidos das parcelas.</p>
                    <p>• ✅ <strong>Quitação acima de 50% do contrato:</strong> Negociação especial com abatimento proporcional de juros.</p>
                  </div>
                )}

                {sale.payment_type !== 'vista' && installments.length > 0 && (
                  <table className="w-full mt-4 border-collapse text-[10px] text-black">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-1 text-left">Parcela</th>
                        <th className="border p-1 text-left">Vencimento</th>
                        <th className="border p-1 text-left">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(inst => (
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
                <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">4. Cláusula de Bloqueio por Inadimplemento</h2>
                <p className="text-[10px] text-justify text-gray-800 leading-relaxed">
                  4.1. O não pagamento de qualquer parcela em até <strong>5 (cinco) dias</strong> a contar do vencimento constituirá o COMPRADOR em mora.<br />
                  4.2. <strong>CONSENTIMENTO EXPRESSO DE BLOQUEIO REMOTO:</strong> O COMPRADOR declara estar ciente e **concorda de forma expressa e inequívoca** que o VENDEDOR efetuará o **bloqueio remoto imediato** das funcionalidades do dispositivo eletrônico (via IMEI ou software de gestão) caso ocorra o atraso de qualquer parcela por período superior a 5 dias, até a efetiva quitação do débito pendente.<br />
                  4.3. O desbloqueio ocorrerá no prazo de até 24 horas úteis após a compensação do pagamento.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs text-black">5. Garantia e Termos Adicionais</h2>
                <p className="text-[10px] text-gray-800">{unit.warranty_terms || 'Garantia legal de 90 (noventa) dias contra defeitos de fabricação, não cobrindo danos por mau uso, umidade ou intervenção de terceiros.'}</p>
              </section>

              <div className="mt-20 flex justify-between gap-10">
                <div className="flex-1 border-t border-black pt-2 text-center text-[10px]">
                  <p>{unit.name ? unit.name.toUpperCase() : 'MDR CELULARES'}</p>
                  <p>Representante Legal / Vendedor</p>
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
