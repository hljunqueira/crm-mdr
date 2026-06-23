import { supabase } from '../server/lib/supabase';

// Taxa operacional padrão da MDR (ex: 10% do valor da parcela para cobrir custos operacionais)
const OPERATIONAL_FEE_RATE = 0.10; 

interface WebhookPayload {
  installmentId: string;
  paymentMethod: string;
  paymentDate: string;
}

/**
 * Processa a confirmação de pagamento de uma parcela e distribui 
 * proporcionalmente os recebíveis aos investidores participantes do lote (SCP).
 * Usa o cliente nativo do Supabase.
 */
export async function processInstallmentPayment(payload: WebhookPayload) {
  const { installmentId, paymentMethod, paymentDate } = payload;

  try {
    // 1. Busca a parcela e verifica se já foi paga para evitar processamento duplicado
    const { data: installment, error: fetchErr } = await supabase
      .from('installments')
      .select(`
        *,
        sale:sales (
          *,
          device:devices (
            *
          )
        )
      `)
      .eq('id', installmentId)
      .single();

    if (fetchErr || !installment) {
      throw new Error(`Parcela com ID ${installmentId} não encontrada ou erro ao carregar: ${fetchErr?.message}`);
    }

    if (installment.status === 'paid') {
      return { success: false, message: 'Parcela já se encontra paga.' };
    }

    // 2. Atualiza o status da parcela para paga no banco
    const { error: updateErr } = await supabase
      .from('installments')
      .update({
        status: 'paid',
        payment_method: paymentMethod,
        payment_date: new Date(paymentDate).toISOString()
      })
      .eq('id', installmentId);

    if (updateErr) {
      throw new Error(`Falha ao atualizar parcela: ${updateErr.message}`);
    }

    const sale = installment.sale as any;
    const device = sale?.device as any;

    // Se o aparelho não estiver vinculado a nenhum lote, é uma venda comum do varejo sem investidores SCP
    if (!device || !device.lot_id) {
      return { 
        success: true, 
        message: 'Parcela paga registrada. Sem investidores vinculados a esta venda.' 
      };
    }

    const lotId = device.lot_id;

    // 3. Buscar lote e as cotas dos investidores parceiros
    const { data: lot, error: lotErr } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();

    const { data: quotas, error: quotasErr } = await supabase
      .from('investor_quotas')
      .select('*')
      .eq('lot_id', lotId);

    if (lotErr || quotasErr || !lot || !quotas || quotas.length === 0) {
      return { 
        success: true, 
        message: 'Lote identificado, mas nenhum investidor com cota ativa.' 
      };
    }

    // 4. Cálculos da Divisão de Risco Compartilhado (SCP)
    const rawValue = Number(installment.value);
    const operationalFee = rawValue * OPERATIONAL_FEE_RATE;
    const netValue = rawValue - operationalFee; // Valor líquido distribuível

    const totalSaleValue = Number(sale.total_value);
    const deviceCostPrice = Number(device.cost_price);

    // Fração que representa o custo de aquisição sobre a venda total
    const costFraction = deviceCostPrice / totalSaleValue;
    const totalAmortization = netValue * costFraction;
    const totalProfit = netValue - totalAmortization;

    // 5. Loop de distribuição proporcional para os investidores do lote
    for (const quota of quotas) {
      const ownership = Number(quota.ownership_percentage); // ex: 0.15 para 15% de cota
      
      const investorAmortization = totalAmortization * ownership;
      const investorProfit = totalProfit * ownership;
      const totalPayout = investorAmortization + investorProfit;

      // Busca carteira do investidor
      const { data: wallet, error: walletErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('profile_id', quota.profile_id)
        .maybeSingle();

      if (walletErr) {
        console.error(`Erro ao carregar carteira de ${quota.profile_id}:`, walletErr.message);
        continue;
      }

      if (wallet) {
        // Atualiza carteira
        await supabase
          .from('wallets')
          .update({
            balance: Number(wallet.balance) + totalPayout,
            future_receipts: Math.max(0, Number(wallet.future_receipts) - totalPayout),
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id);
      } else {
        // Cria carteira nova
        await supabase
          .from('wallets')
          .insert({
            profile_id: quota.profile_id,
            balance: totalPayout,
            future_receipts: 0
          });
      }

      // Cria logs de transações
      if (investorAmortization > 0) {
        await supabase
          .from('wallet_transactions')
          .insert({
            profile_id: quota.profile_id,
            type: 'AMORTIZATION',
            amount: investorAmortization,
            description: `Amortização Ref: Parcela ${installment.installment_number}/${installment.total_installments} - ${device.brand} ${device.model} (Lote: ${lot.title})`
          });
      }

      if (investorProfit > 0) {
        await supabase
          .from('wallet_transactions')
          .insert({
            profile_id: quota.profile_id,
            type: 'PROFIT',
            amount: investorProfit,
            description: `Lucro de Venda Ref: Parcela ${installment.installment_number}/${installment.total_installments} - ${device.brand} ${device.model} (Lote: ${lot.title})`
          });
      }
    }

    return { 
      success: true, 
      message: `Parcela paga e valores cindidos distribuídos para ${quotas.length} investidor(es).`,
      details: {
        totalDistributed: netValue,
        totalAmortization,
        totalProfit
      }
    };

  } catch (error: any) {
    console.error('[processInstallmentPayment Error]:', error.message);
    return { success: false, error: error.message };
  }
}
