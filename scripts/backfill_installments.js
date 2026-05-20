import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const SALE_ID = '9d8c4c5a-4ef0-4600-b0f5-e227108293fd';

async function run() {
  console.log(`Checking existing installments for sale ${SALE_ID}...`);
  const { data: existing, error: existError } = await supabase
    .from('installments')
    .select('*')
    .eq('sale_id', SALE_ID);

  if (existError) {
    console.error('Error checking installments:', existError);
    return;
  }

  if (existing.length > 0) {
    console.log(`Sale already has ${existing.length} installments. No backfill needed.`);
    return;
  }

  console.log(`No installments found for sale ${SALE_ID}. Initiating backfill...`);

  // Generate 12 installments
  const installments = [];
  const baseDate = new Date('2026-06-15'); // 1 month after sale date (2026-05-15)
  const installmentValue = 131.25;

  for (let i = 1; i <= 12; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(baseDate.getMonth() + (i - 1));
    
    installments.push({
      sale_id: SALE_ID,
      installment_number: i,
      total_installments: 12,
      value: installmentValue,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending'
    });
  }

  console.log('Inserting installments into database:', installments);
  const { data: insData, error: insError } = await supabase
    .from('installments')
    .insert(installments)
    .select();

  if (insError) {
    console.error('Failed to backfill installments:', insError);
  } else {
    console.log('Backfill successfully completed! Created installments:', insData.length);
  }
}

run();
