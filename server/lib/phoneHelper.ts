/**
 * Normaliza um número de telefone brasileiro e retorna o JID correto para a Evolution API / WhatsApp.
 * Garante adição do DDI 55 e formatação limpa sem remoção indevida do 9º dígito.
 */
export function formatWhatsAppJid(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');

  // Se não começa com 55 e tem 10 ou 11 dígitos, adiciona o DDI 55
  if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
    clean = '55' + clean;
  }

  return `${clean}@s.whatsapp.net`;
}

