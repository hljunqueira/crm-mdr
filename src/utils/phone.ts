/**
 * Normaliza um número de telefone brasileiro e retorna o JID correto para o WhatsApp.
 * Remove o nono dígito para DDDs maiores que 28.
 */
export function formatWhatsAppJid(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  
  // Se não começa com 55 e tem 10 ou 11 dígitos, adiciona o DDI 55
  if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
    clean = '55' + clean;
  }
  
  if (clean.startsWith('55') && clean.length === 13) {
    const ddd = parseInt(clean.substring(2, 4), 10);
    if (ddd > 28) {
      // Remove o nono dígito (que fica na posição de índice 4)
      clean = clean.substring(0, 4) + clean.substring(5);
    }
  }
  
  return `${clean}@s.whatsapp.net`;
}
