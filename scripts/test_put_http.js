const CHANNEL_ID = '4d7b1b94-8475-4b43-9478-ddc645dddbdd';
const url = `http://localhost:3000/api/ai/settings/${CHANNEL_ID}`;

async function run() {
  console.log(`Sending PUT request to ${url} using native fetch...`);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: true,
        provider: 'groq',
        api_key: process.env.GROQ_API_KEY || 'gsk_placeholder_key',
        system_prompt: 'Você é o atendente virtual da MDR (HTTP NATIVE TEST)',
        max_tokens: 450
      })
    });

    console.log(`Response Status: ${res.status}`);
    console.log(`Response Status Text: ${res.statusText}`);
    const text = await res.text();
    console.log(`Response Body:`, text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
