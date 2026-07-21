import { supabase } from '../lib/supabase.js';

export async function updateCustomerStatus(customerId: string) {
  try {
    if (!customerId) return;
    
    // Fetch all active sales for this customer
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('id')
      .eq('customer_id', customerId)
      .neq('status', 'cancelled');
      
    if (salesErr || !sales || sales.length === 0) {
      // No active sales, customer is active/in good standing
      await supabase.from('customers').update({ status: 'active' }).eq('id', customerId);
      return;
    }
    
    const saleIds = sales.map(s => s.id);
    
    // Fetch all installments for those sales
    const { data: installments, error: instErr } = await supabase
      .from('installments')
      .select('status, due_date')
      .in('sale_id', saleIds)
      .neq('status', 'cancelled');
      
    if (instErr || !installments) return;
    
    const today = new Date().toISOString().split('T')[0];
    const hasBlocked = installments.some(i => i.status === 'blocked');
    const hasOverdue = installments.some(i => i.status === 'overdue' || (i.status === 'pending' && i.due_date < today));
    
    let newStatus = 'active';
    if (hasBlocked) {
      newStatus = 'blocked';
    } else if (hasOverdue) {
      newStatus = 'overdue';
    }
    
    await supabase
      .from('customers')
      .update({ status: newStatus })
      .eq('id', customerId);
      
    console.log(`[Customer Status] Updated customer ${customerId} status to ${newStatus}`);
  } catch (err) {
    console.error('[Customer Status] Error updating customer status:', err);
  }
}
