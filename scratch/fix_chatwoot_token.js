const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';

const INSTANCE_NAME = 'whatsapp_mdr_arroio';
const CORRECT_TOKEN = 'bwuRJj3XKiuoWAeP83xTgAvs'; // Inbox Identifier for "Whatsapp MDR_ARROIO"

async function run() {
  const url = `${EVOLUTION_URL}/chatwoot/set/${INSTANCE_NAME}`;
  console.log(`Setting Chatwoot integration for ${INSTANCE_NAME} at ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': GLOBAL_API_KEY
      },
      body: JSON.stringify({
        enabled: true,
        url: 'http://chatwoot-web:3000',
        accountId: '1',
        token: CORRECT_TOKEN,
        nameInbox: 'whatsapp_mdr_arroio',
        signMsg: true,
        signDelimiter: '\n',
        reopenConversation: true,
        conversationPending: true,
        importContacts: true,
        importMessages: true,
        daysLimitImportMessages: 7
      })
    });

    console.log('Status code:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error setting Chatwoot:', error);
  }
}

run();
