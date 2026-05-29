const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';

const INSTANCE_NAME = 'whatsapp_mdr_arroio';
const ADMIN_TOKEN = 'Y1fTc41w87JpG1tBDwRh9ugS'; // Chatwoot Admin API Token
const EXACT_INBOX_NAME = 'Whatsapp MDR_ARROIO'; // Exact inbox name in Chatwoot

async function run() {
  const url = `${EVOLUTION_URL}/chatwoot/set/${INSTANCE_NAME}`;
  console.log(`Setting Chatwoot integration for ${INSTANCE_NAME} at ${url}...`);
  console.log(`Using token: ${ADMIN_TOKEN} and inbox name: "${EXACT_INBOX_NAME}"`);

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
        token: ADMIN_TOKEN,
        nameInbox: EXACT_INBOX_NAME,
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
