
const webhookUrl = 'https://n8n.mdrinformaticaecelulares.com.br/webhook/auth-2fa';
const phone = '5548991013293';
const remoteJid = `${phone}@s.whatsapp.net`;
const name = 'Henrique';

async function runTest() {
  console.log('Sending 2FA login OTP test message...');
  const loginResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instanceName: 'whatsapp_mdr_arroio',
      remoteJid: remoteJid,
      text: `*MDR Informática & Celulares* 🔐\n\nOlá, ${name}!\nSeu código de segurança para acessar o painel (Teste) é:\n\n*123456*\n\nEste código é válido por 5 minutos. Não compartilhe com ninguém.`,
      phone: phone,
      code: '123456',
      name: name
    })
  });
  console.log(`Login message sent! Status: ${loginResponse.status} ${loginResponse.statusText}`);

  console.log('Sending Forgot Password OTP test message...');
  const forgotResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instanceName: 'whatsapp_mdr_arroio',
      remoteJid: remoteJid,
      text: `*MDR Informática & Celulares* 🔑\n\nOlá, ${name}!\nVocê solicitou a recuperação de acesso ao painel administrativo (CRM - Teste).\nSeu código de segurança para redefinir sua senha é:\n\n*654321*\n\nEste código é válido por 5 minutos. Não compartilhe com ninguém.`,
      phone: phone,
      code: '654321',
      name: name
    })
  });
  console.log(`Forgot Password message sent! Status: ${forgotResponse.status} ${forgotResponse.statusText}`);
}

runTest().catch(console.error);
