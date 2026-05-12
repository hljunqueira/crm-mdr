const fs = require('fs');
const crypto = require('crypto');

function generateKeys() {
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  const anonKey = crypto.randomBytes(64).toString('base64');
  const projectId = crypto.randomBytes(8).toString('hex');

  const envContent = `# APP CONFIG
APP_URL="http://mdrinformaticaecelulares.com.br"
JWT_SECRET=${jwtSecret}

# SUPABASE CONFIG
VITE_SUPABASE_URL="https://${projectId}.supabase.co"
VITE_SUPABASE_ANON_KEY="${anonKey}"
`;

  fs.writeFileSync('.env', envContent);
  console.log('.env file generated successfully with random keys.');
  console.log(`URL: https://${projectId}.supabase.co`);
}

generateKeys();
