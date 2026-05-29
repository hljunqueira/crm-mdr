const CHATWOOT_URL = 'https://chat.mdrinformaticaecelulares.com.br';
const ACCOUNT_ID = '1';
const API_TOKEN = 'Y1fTc41w87JpG1tBDwRh9ugS';

const INBOX_ID = 3;
const WEBHOOK_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br/chatwoot/webhook/whatsapp_mdr_arroio';

async function run() {
  const url = `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/inboxes/${INBOX_ID}`;
  console.log(`Setting callback webhook on Chatwoot API Inbox #${INBOX_ID} to: ${WEBHOOK_URL} using PATCH...`);

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': API_TOKEN
      },
      body: JSON.stringify({
        webhook_url: WEBHOOK_URL,
        channel: {
          webhook_url: WEBHOOK_URL
        }
      })
    });

    console.log('Status code:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error setting Chatwoot callback webhook:', error);
  }
}

run();
