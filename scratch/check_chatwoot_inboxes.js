import dotenv from 'dotenv';

dotenv.config();

const chatwootUrl = 'https://chat.mdrinformaticaecelulares.com.br';
const accountId = '1';
const apiToken = 'Y1fTc41w87JpG1tBDwRh9ugS';

async function run() {
  const url = `${chatwootUrl}/api/v1/accounts/${accountId}/inboxes`;
  console.log(`Querying Chatwoot Inboxes at ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiToken
      }
    });

    console.log('Status code:', response.status);
    if (!response.ok) {
      const errText = await response.text();
      console.error('Error response:', errText);
      return;
    }

    const data = await response.json();
    console.log('Raw data returned:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching inboxes:', error);
  }
}

run();
