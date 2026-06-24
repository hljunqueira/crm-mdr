import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { updateCollaboratorGoalProgress } from '../server/lib/goalsHelper.js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function run() {
  const saleId = '44c48817-a43f-4d53-9ac0-d5bb803361d0';
  const arthurId = 'a57bdab9-98b4-46ce-9ef3-70a0de5c65cb';
  const maykonId = '6d5fc41b-c190-4e1f-b254-bdfdfa021675';

  console.log(`Updating sale ${saleId} seller to Arthur Coelho...`);

  const { data, error } = await supabase
    .from('sales')
    .update({ seller_id: arthurId })
    .eq('id', saleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating sale:', error);
    return;
  }

  console.log('Sale updated successfully:', data);

  console.log('Recalculating goal progress for Arthur Coelho (06/2026)...');
  await updateCollaboratorGoalProgress(arthurId, 6, 2026);

  console.log('Recalculating goal progress for Maykon da Rosa (06/2026)...');
  await updateCollaboratorGoalProgress(maykonId, 6, 2026);

  console.log('Done!');
}

run();
