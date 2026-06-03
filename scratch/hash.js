import crypto from 'crypto';

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex').toUpperCase();
}

function hmdmHash(text) {
  const md5Upper = md5(text);
  const salted = md5Upper + '5YdSYHyg2U';
  return crypto.createHash('sha1').update(salted).digest('hex').toUpperCase();
}

console.log('Henrique:', hmdmHash('183834@Hlj'));
console.log('Maykon:', hmdmHash('Admin@Mdr@2026'));
