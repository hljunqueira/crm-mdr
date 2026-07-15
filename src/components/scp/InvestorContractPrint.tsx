import React from 'react';
import { formatCPF, formatPhone, resolveUnitInfo } from '../../lib/utils';

interface InvestorContractPrintProps {
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    investor_profile?: string;
  };
  unit: {
    name: string;
    cnpj?: string;
    address?: string;
    phone?: string;
    contract_terms?: string;
  };
  quotas: Array<{
    id: string;
    amountInvested: number;
    ownershipPercentage: number;
    lotTitle: string;
    createdAt?: string;
    signedContractAt?: string;
  }>;
  devices: Array<{
    id: string;
    model: string;
    imei: string;
    costPrice?: number;
    salePrice: number;
    status: string;
  }>;
  isPreview?: boolean;
  onClose?: () => void;
}

export default function InvestorContractPrint({ profile, unit, quotas, devices, isPreview = false, onClose }: InvestorContractPrintProps) {
  const resolvedUnit = resolveUnitInfo(unit);
  const today = new Date().toLocaleDateString('pt-BR');
  const isConservador = profile.investor_profile === 'conservador';
  
  // Calculate total values
  const totalQuotasInvested = quotas.reduce((acc, q) => acc + q.amountInvested, 0);
  const totalDevicesFinanced = devices.reduce((acc, d) => acc + (d.costPrice ?? d.salePrice ?? 0), 0);
  const totalCapitalInvested = totalQuotasInvested + totalDevicesFinanced;

  // Get date of investment (earliest quota signature date or creation date)
  const firstQuota = quotas && quotas.length > 0 ? quotas[0] : null;
  const investmentDateRaw = firstQuota ? (firstQuota.signedContractAt || firstQuota.createdAt) : null;
  const investmentDate = investmentDateRaw 
    ? new Date(investmentDateRaw).toLocaleDateString('pt-BR')
    : today;

  const renderHeader = (pageNum: number) => (
    <div className="flex justify-between items-center border-b border-black pb-2 mb-4 no-print-border">
      <div className="flex items-center gap-2">
        <img
          src="/logo-mdr.png"
          alt="MDR"
          className="print:block"
          style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <span className="font-bold text-[9px] text-black">MDR INFORMÁTICA &amp; CELULARES</span>
      </div>
      <div className="text-right">
        <span className="text-[7px] font-mono text-black uppercase tracking-widest">INSTRUMENTO DE PARTICIPAÇÃO SCP - {profile.full_name.toUpperCase()}</span>
      </div>
    </div>
  );

  const renderFooter = (pageNum: number, totalPages: number = 3) => (
    <div className="absolute bottom-6 left-12 right-12 border-t border-black pt-2 flex justify-between items-center text-[7px] text-black font-sans no-print-border">
      <span>Instrumento Particular de Sociedade em Conta de Participação - MDR &amp; {profile.full_name}</span>
      <span className="font-bold">Página {pageNum} de {totalPages}</span>
    </div>
  );

  return (
    <div id="investor-contract" className={isPreview ? "" : "hidden"}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page {
            size: A4;
            margin: 0 !important;
          }
          body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #1e293b !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body > *:not(#investor-contract):not(#print-mount-point) { display: none !important; }
          #investor-contract, #print-mount-point { display: block !important; }
          .contract-page {
            page-break-after: always !important;
            break-after: page !important;
            height: 297mm !important;
            width: 210mm !important;
            box-sizing: border-box !important;
            position: relative !important;
            padding: 15mm 12mm 20mm 12mm !important;
            background-color: #ffffff !important;
            color: #1e293b !important;
            margin: 0 !important;
            font-family: 'Inter', Arial, sans-serif !important;
          }
          .contract-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
        
        .contract-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 12mm 20mm 12mm;
          box-sizing: border-box;
          font-family: 'Inter', Arial, sans-serif;
          font-size: 11px;
          color: #000000;
          background: #fff;
          line-height: 1.35;
          position: relative;
          border: 1px solid #cbd5e1;
          margin-bottom: 20px;
          margin-left: auto;
          margin-right: auto;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        .contract-title {
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          font-size: 14px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 15px;
          margin-bottom: 25px;
          line-height: 1.2;
        }

        .contract-section-title {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1.5px solid #000;
          padding-bottom: 2px;
          margin-top: 15px;
          margin-bottom: 8px;
        }

        .clause-title {
          font-weight: 700;
          margin-top: 8px;
          text-transform: uppercase;
          font-size: 10px;
        }

        .signature-box {
          border: 1px solid #000;
          padding: 10px;
          margin-top: 15px;
        }

        .signature-line {
          border-top: 1px solid #000;
          text-align: center;
          margin-top: 30px;
          padding-top: 2px;
          font-size: 9px;
        }
      `}</style>

      {/* PAGE 1: QUALIFICAÇÃO E OBJETO */}
      <div className="contract-page">
        {renderHeader(1)}
        
        <div className="contract-title">
          CONTRATO PARTICULAR DE CONSTITUIÇÃO DE SOCIEDADE EM CONTA DE PARTICIPAÇÃO (SCP)
        </div>

        <p className="text-justify mb-4">
          Por este instrumento particular de contrato, as partes qualificadas a seguir resolvem, de comum acordo e nos termos dos artigos 991 a 996 da Lei nº 10.406/2002 (Código Civil Brasileiro), constituir uma Sociedade em Conta de Participação (SCP), que se regerá pelas seguintes cláusulas e condições:
        </p>

        <div className="contract-section-title">1. Qualificação das Partes</div>
        
        <div className="mb-4 space-y-1">
          <p><strong>SÓCIO OSTENSIVO:</strong> {resolvedUnit.name || "MDR INFORMÁTICA & CELULARES"}, com sede no endereço {resolvedUnit.address || "Endereço da Unidade"}, inscrito no CNPJ sob o nº {resolvedUnit.cnpj || "CNPJ da Unidade"}, doravante denominado simplesmente <strong>SÓCIO OSTENSIVO</strong>.</p>
          <p className="pt-2"><strong>SÓCIO PARTICIPANTE (INVESTIDOR):</strong> {profile.full_name}, de e-mail {profile.email} e telefone {profile.phone || "Não informado"}, doravante denominado simplesmente <strong>SÓCIO PARTICIPANTE</strong>.</p>
        </div>

        <div className="contract-section-title">2. Cláusulas Gerais e Perfil Legal</div>
        
        <div className="space-y-2 text-justify">
          <p className="clause-title">CLÁUSULA PRIMEIRA - DO OBJETO E FINALIDADE</p>
          <p>
            A sociedade tem por objeto a cooperação financeira na aquisição e fomento de estoque de smartphones e eletrônicos comercializados pelo <strong>SÓCIO OSTENSIVO</strong>, visando o ganho de capital por meio de venda de ativos comerciais.
          </p>

          <p className="clause-title">CLÁUSULA SEGUNDA - DO PERFIL DE PARTICIPAÇÃO E RISCOS</p>
          {isConservador ? (
            <p>
              O <strong>SÓCIO PARTICIPANTE</strong> declara optar pelo perfil <strong>CONSERVADOR (SEM RISCO DE CREDIÁRIO)</strong>. Nesse formato, a participação é restrita a operações de giro rápido. O capital aportado é direcionado à aquisição de aparelhos liquidados integralmente à vista perante o cliente final. Portanto, o <strong>SÓCIO PARTICIPANTE</strong> não responde por perdas de inadimplência decorrentes de parcelamento (crediário próprio), sendo seu capital garantido pelo <strong>SÓCIO OSTENSIVO</strong> juntamente com a comissão operacional correspondente à liquidação do estoque.
            </p>
          ) : (
            <p>
              O <strong>SÓCIO PARTICIPANTE</strong> declara optar pelo perfil <strong>ARROJADO (COM RISCO DE CREDIÁRIO)</strong>. Nesse formato, os aparelhos adquiridos podem ser comercializados de forma parcelada (crediário próprio). O investidor concorda em participar ativamente das receitas do parcelamento (juros da tabela), assumindo proporcionalmente o risco de eventuais atrasos ou inadimplências dos clientes finais. O <strong>SÓCIO OSTENSIVO</strong> fica incumbido da administração, cobrança ativa e ativação de travas preventivas de segurança nos smartphones nos termos acordados.
            </p>
          )}

          <p className="clause-title">CLÁUSULA TERCEIRA - DA CAPITALIZAÇÃO E APORTES</p>
          <p>
            O capital total financiado pelo <strong>SÓCIO PARTICIPANTE</strong> nesta data é de <strong>R$ {totalCapitalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, conforme a relação discriminada de ativos descrita no Anexo I deste instrumento.
          </p>
        </div>

        {renderFooter(1)}
      </div>

      {/* PAGE 2: ANEXO I - LISTA DE ATIVOS FINANCIADOS */}
      <div className="contract-page">
        {renderHeader(2)}

        <div className="contract-title">ANEXO I - DISCRIMINAÇÃO DE INVESTIMENTOS E ATIVOS FINANCIADOS</div>
        
        <p className="mb-4">
          Relação de cotas em lotes de investimentos SCP e aparelhos do estoque adquiridos pelo <strong>SÓCIO PARTICIPANTE</strong> para fomento operacional da atividade comercial do <strong>SÓCIO OSTENSIVO</strong>.
        </p>

        {quotas.length > 0 && (
          <div className="mb-4">
            <div className="contract-section-title">A. Participações em Lotes SCP (Renda / Amortização Geral)</div>
            <table className="w-full text-[10px] border-collapse mt-2">
              <thead>
                <tr className="border-b border-black text-left font-bold">
                  <th className="py-1">Nome do Lote</th>
                  <th className="py-1 text-right">Capital Investido</th>
                  <th className="py-1 text-right">Participação Quota</th>
                </tr>
              </thead>
              <tbody>
                {quotas.map((q) => (
                  <tr key={q.id} className="border-b border-zinc-200">
                    <td className="py-1.5">{q.lotTitle}</td>
                    <td className="py-1.5 text-right font-mono">R$ {q.amountInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 text-right font-mono">{q.ownershipPercentage.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {devices.length > 0 && (
          <div className="mb-4">
            <div className="contract-section-title">B. Aparelhos do Estoque Financiados (Módulo Prime)</div>
            <table className="w-full text-[9px] border-collapse mt-2">
              <thead>
                <tr className="border-b border-black text-left font-bold">
                  <th className="py-1">Smartphone (Modelo)</th>
                  <th className="py-1">Identificador (IMEI)</th>
                  <th className="py-1 text-right">Valor do Aporte (Custo)</th>
                  <th className="py-1 text-center">Status Operacional</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-b border-zinc-200">
                    <td className="py-1.5 font-bold">{d.model}</td>
                    <td className="py-1.5 font-mono">{d.imei}</td>
                    <td className="py-1.5 text-right font-mono">R$ {(d.costPrice ?? d.salePrice ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 text-center uppercase text-[8px] font-semibold">{d.status === 'sold' ? 'Comercializado' : 'Disponível em Estoque'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
          <div className="flex justify-between items-center text-xs font-bold">
            <span>RESUMO DO APORTE TOTAL DO INVESTIDOR:</span>
            <span className="text-sm font-black text-black">R$ {totalCapitalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {renderFooter(2)}
      </div>

      {/* PAGE 3: ASSINATURAS */}
      <div className="contract-page">
        {renderHeader(3)}

        <div className="contract-section-title">3. Validade, Foro e Assinaturas</div>
        
        <div className="space-y-3 text-justify text-[10px]">
          <p>
            As partes elegem o foro da Comarca da sede do <strong>SÓCIO OSTENSIVO</strong> para dirimir quaisquer dúvidas ou controvérsias decorrentes da interpretação ou execução deste instrumento, com renúncia expressa a qualquer outro por mais privilegiado que seja.
          </p>
          <p>
            E, por estarem assim justas e contratadas, assinam o presente instrumento em duas vias de igual teor e forma, na presença de duas testemunhas abaixo qualificadas.
          </p>
        </div>

        <div className="text-right mt-12 font-bold text-[10px]">
          Balneário Arroio do Silva/SC, {investmentDate}.
        </div>

        <div className="grid grid-cols-2 gap-8 mt-16">
          <div>
            <div className="signature-line">
              <strong>SÓCIO OSTENSIVO</strong><br />
              {resolvedUnit.name || "MDR INFORMÁTICA & CELULARES"}<br />
              CNPJ: {resolvedUnit.cnpj || "_________________________"}
            </div>
          </div>
          <div>
            <div className="signature-line">
              <strong>SÓCIO PARTICIPANTE</strong><br />
              {profile.full_name}<br />
              CPF: _________________________
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-16">
          <div>
            <div className="signature-line">
              Testemunha 1<br />
              Nome: _________________________<br />
              CPF: _________________________
            </div>
          </div>
          <div>
            <div className="signature-line">
              Testemunha 2<br />
              Nome: _________________________<br />
              CPF: _________________________
            </div>
          </div>
        </div>

        {renderFooter(3)}
      </div>
    </div>
  );
}
