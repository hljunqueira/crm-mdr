import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCPF = (value?: string) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length > 11) {
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatPhone = (value?: string) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const val = row[header] ?? '';
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function printElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  let printDiv = document.getElementById('print-mount-point');
  if (!printDiv) {
    printDiv = document.createElement('div');
    printDiv.id = 'print-mount-point';
    document.body.appendChild(printDiv);
  }

  printDiv.innerHTML = element.innerHTML;
  document.body.classList.add('printing-active');
  
  setTimeout(() => {
    window.print();
    document.body.classList.remove('printing-active');
    if (printDiv) {
      printDiv.innerHTML = '';
    }
  }, 300);
}

export function resolveUnitInfo(unit: { name: string; cnpj?: string; address?: string; phone?: string; pix_key?: string }) {
  const nameUpper = (unit.name || '').toUpperCase();
  const isGaivota = nameUpper.includes('GAIVOTA');

  const isPlaceholder = (val?: string) => !val || val.includes('____') || val.trim() === '';

  const cleanCnpj = isPlaceholder(unit.cnpj) ? '60.207.477/0001-74' : unit.cnpj!;
  const cleanPhone = isPlaceholder(unit.phone) ? (isGaivota ? '(48) 99654-5259' : '(48) 99936-2282') : unit.phone!;
  const cleanAddress = isPlaceholder(unit.address)
    ? (isGaivota
      ? 'Esquina com Espírito Santo - Rod. Interpraias, Balneário Gaivota - SC, 88955-000'
      : 'Av. Salmi Paladini, 1541 - Sala 01 - Centro, Balneário Arroio do Silva - SC, 88914-000')
    : unit.address!;

  return {
    name: unit.name || (isGaivota ? 'MDR Gaivota' : 'MDR Arroio'),
    cnpj: cleanCnpj,
    phone: cleanPhone,
    address: cleanAddress,
    city: isGaivota ? 'Balneário Gaivota/SC' : 'Balneário Arroio do Silva/SC',
    pix_key: unit.pix_key
  };
}

export function formatPixKey(key: string): string {
  const clean = key.replace(/\s+/g, '');
  // Se for celular (10 ou 11 dígitos, ex: 48999035854)
  if (/^\d{10,11}$/.test(clean)) {
    return `+55${clean}`;
  }
  // Se for celular com DDI mas sem o +
  if (/^55\d{10,11}$/.test(clean)) {
    return `+${clean}`;
  }
  return clean;
}

export function generatePixPayload(key: string, name: string, city: string, amount: number, txid: string = '***'): string {
  const cleanKey = key.trim();
  
  // Normaliza o nome: remove acentos, mantém apenas alfanumérico e espaço, caixa alta, max 25 caracteres
  const cleanName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/gi, '')
    .substring(0, 25)
    .trim()
    .toUpperCase() || 'BENEFICIARIO';
  
  // Normaliza a cidade: remove acentos, apenas alfanumérico e espaço, caixa alta, max 15 caracteres
  const cleanCity = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/gi, '')
    .substring(0, 15)
    .trim()
    .toUpperCase() || 'CIDADE';

  // Normaliza o TXID: apenas alfanumérico, max 25 caracteres
  const cleanTxid = txid
    .normalize('NFD')
    .replace(/[^A-Z0-9]/gi, '')
    .substring(0, 25)
    .trim()
    .toUpperCase() || '***';

  const f = (id: string, val: string) => id + val.length.toString().padStart(2, '0') + val;

  const merchantAccountInfo = f('00', 'br.gov.bcb.pix') + f('01', cleanKey);
  
  let payload = '000201';
  payload += f('26', merchantAccountInfo);
  payload += '52040000';
  payload += '5303986';
  
  if (amount > 0) {
    payload += f('54', amount.toFixed(2));
  }
  
  payload += '5802BR';
  payload += f('59', cleanName);
  payload += f('60', cleanCity);
  payload += f('62', f('05', cleanTxid));
  payload += '6304';

  // Cálculo de CRC16 CCITT
  let crc = 0xFFFF;
  for (let c = 0; c < payload.length; c++) {
    crc ^= payload.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  const crcHex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  
  return payload + crcHex;
}

