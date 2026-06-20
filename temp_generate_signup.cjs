const { google } = require('googleapis');

async function main() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './docs/crm-mdr-7bd29f5d4741.json',
      scopes: ['https://www.googleapis.com/auth/androidmanagement'],
    });
    const amapi = google.androidmanagement({ version: 'v1', auth });

    console.log('--- 1. GERANDO URL DE INSCRIÇÃO ---');
    const signup = await amapi.signupUrls.create({
      projectId: 'crm-mdr',
      callbackUrl: 'https://mdrinformaticaecelulares.com.br/api/device-locks/callback'
    });

    console.log('\nSIGNUP_URL_START');
    console.log(signup.data.url);
    console.log('SIGNUP_URL_END\n');
  } catch (error) {
    console.error('Erro ao gerar URL:', error.message || error);
  }
}
main();
