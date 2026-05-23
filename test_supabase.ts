import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- FETCHING CHANNELS ---');
  const { data: channels, error: channelsError } = await supabase.from('automation_channels').select('*');
  if (channelsError) {
    console.error('Error fetching channels:', channelsError);
  } else {
    console.log('Channels in DB:', channels);
  }

  console.log('\n--- FETCHING CONVERSATIONS SUMMARY ---');
  const { data: conversations, error: convError } = await supabase.from('conversations').select('id, channel_id, contact_name');
  if (convError) {
    console.error('Error fetching conversations:', convError);
  } else {
    console.log('Total Conversations count:', conversations?.length);
    const channelCounts: Record<string, { count: number; sampleNames: string[] }> = {};
    for (const conv of conversations || []) {
      if (!channelCounts[conv.channel_id]) {
        channelCounts[conv.channel_id] = { count: 0, sampleNames: [] };
      }
      channelCounts[conv.channel_id].count++;
      if (channelCounts[conv.channel_id].sampleNames.length < 5) {
        channelCounts[conv.channel_id].sampleNames.push(conv.contact_name);
      }
    }
    console.log('Conversations grouped by channel_id:', channelCounts);
  }
}

run();

