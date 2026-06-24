import { supabase } from './supabase.js';

export async function updateCollaboratorGoalProgress(profileId: string | null | undefined, month: number, year: number) {
  if (!profileId) return;

  try {
    // 1. Fetch sales for the given collaborator (excluding cancelled ones)
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('total_value, original_price, is_trade_in, trade_in_valuation, sale_date, created_at')
      .eq('seller_id', profileId)
      .neq('status', 'cancelled');

    let salesProgress = 0;
    if (!salesError && sales) {
      const monthSales = sales.filter(s => {
        const dateStr = s.sale_date || s.created_at;
        if (!dateStr) return false;
        const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const date = new Date(cleanDateStr + 'T12:00:00');
        if (isNaN(date.getTime())) return false;
        return date.getFullYear() === year && (date.getMonth() + 1) === month;
      });

      salesProgress = monthSales.reduce((acc, s) => {
        const tradeInVal = s.is_trade_in ? Number(s.trade_in_valuation || 0) : 0;
        return acc + (s.original_price ?? s.total_value) - tradeInVal;
      }, 0);
    } else if (salesError) {
      console.error(`[GoalsHelper] Error fetching sales for collaborator ${profileId}:`, salesError);
    }

    // 2. Fetch completed/delivered OSs for the given technician
    const { data: serviceOrders, error: osError } = await supabase
      .from('service_orders')
      .select('delivered_at, created_at, status')
      .eq('responsible_technician_id', profileId)
      .in('status', ['delivered', 'ready']);

    let osProgress = 0;
    if (!osError && serviceOrders) {
      osProgress = serviceOrders.filter(o => {
        const dateStr = o.delivered_at || o.created_at;
        if (!dateStr) return false;
        const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const date = new Date(cleanDateStr + 'T12:00:00');
        if (isNaN(date.getTime())) return false;
        return date.getFullYear() === year && (date.getMonth() + 1) === month;
      }).length;
    } else if (osError) {
      console.error(`[GoalsHelper] Error fetching OSs for technician ${profileId}:`, osError);
    }

    // 3. Upsert progress back into collaborator_goals table
    const { error: upsertError } = await supabase
      .from('collaborator_goals')
      .upsert({
        profile_id: profileId,
        month,
        year,
        sales_progress: salesProgress,
        os_progress: osProgress,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'profile_id,month,year'
      });

    if (upsertError) {
      console.error(`[GoalsHelper] Error upserting collaborator goal progress:`, upsertError);
    } else {
      console.log(`[GoalsHelper] Goal progress updated for ${profileId} (${month}/${year}): Sales = R$ ${salesProgress}, OS = ${osProgress}`);
    }
  } catch (error) {
    console.error(`[GoalsHelper] Unexpected error in updateCollaboratorGoalProgress:`, error);
  }
}
