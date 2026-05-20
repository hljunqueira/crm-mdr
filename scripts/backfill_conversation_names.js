import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';
const INSTANCE_NAME = 'maykon_da_rosa';

async function fetchWhatsAppName(remoteJid, defaultName) {
  try {
    if (remoteJid.endsWith('@g.us')) {
      const url = `${EVOLUTION_URL}/group/findGroupInfos/${INSTANCE_NAME}?groupJid=${remoteJid}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        const subject = data?.subject || data?.data?.subject;
        if (subject) return subject;
      }
    } else {
      const url = `${EVOLUTION_URL}/chat/fetchProfile/${INSTANCE_NAME}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({ number: remoteJid })
      });
      if (res.ok) {
        const data = await res.json();
        const name = data?.name || data?.pushname || data?.data?.name || data?.data?.pushname;
        if (name) return name;
      }
    }
  } catch (err) {
    console.error(`Error fetching name for ${remoteJid}:`, err.message);
  }
  return defaultName;
}

async function run() {
  console.log('Fetching conversations to backfill names...');
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*');

  if (error) {
    console.error('Error fetching conversations:', error);
    return;
  }

  console.log(`Total conversations: ${conversations.length}`);
  
  for (const c of conversations) {
    const isUgly = !c.contact_name || 
                   c.contact_name.includes('@') || 
                   /^\d+$/.test(c.contact_name);
                   
    if (isUgly) {
      console.log(`Ugly name detected: "${c.contact_name}" for phone "${c.contact_phone}"`);
      console.log(`Fetching correct name from WhatsApp API...`);
      let realName = await fetchWhatsAppName(c.contact_phone, c.contact_name);
      
      if (realName.includes('@')) {
        realName = realName.split('@')[0];
      }
      
      console.log(`Resolved name: "${realName}"`);
      
      if (realName && realName !== c.contact_name) {
        const { error: updErr } = await supabase
          .from('conversations')
          .update({ contact_name: realName })
          .eq('id', c.id);
          
        if (updErr) {
          console.error(`Error updating name for ${c.id}:`, updErr);
        } else {
          console.log(`Successfully updated conversation ID ${c.id} name to "${realName}"`);
        }
      } else {
        console.log(`No change or failed to fetch for ${c.contact_phone}`);
      }
      console.log('--------------------------------------------------');
    }
  }
  console.log('Backfill process complete.');
}

run();
