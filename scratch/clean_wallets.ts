import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mdrinformaticaecelulares.com.br';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log("Starting wallet transaction cleanup...");

  // 1. Fetch all wallet transactions
  const { data: txs, error: txsError } = await supabase
    .from('wallet_transactions')
    .select('*');

  if (txsError || !txs) {
    console.error("Error fetching transactions:", txsError);
    return;
  }

  console.log(`Found ${txs.length} wallet transactions.`);

  // 2. Fetch all installments to check existence
  const { data: installments, error: instError } = await supabase
    .from('installments')
    .select('id, sale_id, status');

  if (instError || !installments) {
    console.error("Error fetching installments:", instError);
    return;
  }

  const installmentIds = new Set(installments.map(i => i.id));
  console.log(`Found ${installments.length} active installments.`);

  // 3. Find orphaned transactions (referencing non-existent installment_id, or where description mentions a deleted sale)
  // Let's also fetch all sales to verify
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id');

  if (salesError || !sales) {
    console.error("Error fetching sales:", salesError);
    return;
  }
  const saleIds = new Set(sales.map(s => s.id));
  console.log(`Found ${sales.length} active sales.`);

  const txsToRemove = [];

  for (const tx of txs) {
    let shouldRemove = false;
    let reason = "";

    // If it has installment_id but it doesn't exist
    if (tx.installment_id && !installmentIds.has(tx.installment_id)) {
      shouldRemove = true;
      reason = `Installment ${tx.installment_id} does not exist`;
    }

    // Try to extract sale ID from description: e.g. "CELULAR #23ADEB8C-2A30-483A-A74A-60E511A72938"
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = tx.description?.match(uuidRegex);
    if (match) {
      const extractedSaleId = match[0].toLowerCase();
      if (!saleIds.has(extractedSaleId)) {
        shouldRemove = true;
        reason = `Extracted sale ID ${extractedSaleId} from description does not exist`;
      }
    }

    if (shouldRemove) {
      txsToRemove.push({ tx, reason });
    }
  }

  console.log(`Found ${txsToRemove.length} orphaned transactions to remove:`);
  for (const item of txsToRemove) {
    console.log(`- ID: ${item.tx.id}, Profile: ${item.tx.profile_id}, Amount: ${item.tx.amount}, Type: ${item.tx.type}, Description: ${item.tx.description}. Reason: ${item.reason}`);
  }

  if (txsToRemove.length === 0) {
    console.log("No orphaned transactions found.");
    return;
  }

  // 4. Remove orphans and adjust wallet balances
  // We need to group by profile_id to update balances
  const balanceAdjustments: Record<string, number> = {};
  for (const item of txsToRemove) {
    const profileId = item.tx.profile_id;
    const amount = Number(item.tx.amount);
    
    // Check type: AMORTIZATION or PROFIT increases balance, so removing them decreases balance
    // WITHDRAWAL decreases balance, so removing it increases balance
    let diff = 0;
    if (item.tx.type === 'AMORTIZATION' || item.tx.type === 'PROFIT') {
      diff = -amount;
    } else if (item.tx.type === 'WITHDRAWAL') {
      diff = amount;
    }

    balanceAdjustments[profileId] = (balanceAdjustments[profileId] || 0) + diff;
  }

  console.log("\nProposed Wallet Balance Adjustments:");
  for (const [profileId, diff] of Object.entries(balanceAdjustments)) {
    console.log(`Profile ${profileId}: ${diff > 0 ? '+' : ''}${diff}`);
  }

  // Execute deletion of orphaned transactions
  const txIdsToDelete = txsToRemove.map(item => item.tx.id);
  const { error: deleteError } = await supabase
    .from('wallet_transactions')
    .delete()
    .in('id', txIdsToDelete);

  if (deleteError) {
    console.error("Error deleting orphaned transactions:", deleteError);
    return;
  }
  console.log("Deleted orphaned transactions successfully.");

  // Update wallet balances
  for (const [profileId, diff] of Object.entries(balanceAdjustments)) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (wallet) {
      const newBalance = Math.max(0, Number(wallet.balance) + diff);
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('profile_id', profileId);

      if (walletError) {
        console.error(`Error updating wallet for profile ${profileId}:`, walletError);
      } else {
        console.log(`Updated wallet for profile ${profileId}: balance set to ${newBalance} (was ${wallet.balance})`);
      }
    }
  }

  console.log("Done!");
}

main();
