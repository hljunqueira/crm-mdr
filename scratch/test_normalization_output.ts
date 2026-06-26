import { formatWhatsAppJid } from '../server/lib/phoneHelper';

function run() {
  const tests = [
    { input: '(48) 99101-3293', expected: '554891013293@s.whatsapp.net' }, // Admin
    { input: '(48) 99639-0126', expected: '554896390126@s.whatsapp.net' }, // Andileine
    { input: '(11) 99999-9999', expected: '5511999999999@s.whatsapp.net' }, // São Paulo (keeps 9)
    { input: '5548996390126', expected: '554896390126@s.whatsapp.net' }, // Already has 55
  ];

  console.log('Running normalization tests:');
  for (const t of tests) {
    const output = formatWhatsAppJid(t.input);
    const pass = output === t.expected;
    console.log(`Input: "${t.input}" | Output: "${output}" | Pass: ${pass ? '✅' : '❌'}`);
  }
}

run();
