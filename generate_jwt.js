import crypto from 'crypto';

// Esta é a mesma JWT_SECRET que está no seu arquivo .env da VPS.
const JWT_SECRET = 'your-super-secret-jwt-token-with-at-least-32-characters-long';

function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function generateKey(role) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        role: role,
        iss: 'supabase',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10), // Expira em 10 anos
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${data}.${signature}`;
}

console.log('--- NOVO ANON KEY ---');
console.log(generateKey('anon'));
console.log('\n--- NOVO SERVICE ROLE KEY ---');
console.log(generateKey('service_role'));
