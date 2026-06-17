export interface AsaasCustomerData {
  name: string;
  cpfCnpj: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface AsaasPaymentData {
  customer: string;
  billingType: 'UNDEFINED' | 'BOLETO' | 'PIX';
  value: number;
  dueDate: string;
  externalReference: string;
  description: string;
}

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

export async function getOrCreateAsaasCustomer(data: AsaasCustomerData): Promise<string> {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não está configurada no ambiente.');
  }

  const cleanCpfCnpj = data.cpfCnpj.replace(/\D/g, '');
  if (!cleanCpfCnpj) {
    throw new Error('CPF/CNPJ é obrigatório para cadastrar no Asaas.');
  }

  // 1. Consultar se já existe o cliente pelo CPF/CNPJ
  const checkUrl = `${ASAAS_URL}/customers?cpfCnpj=${cleanCpfCnpj}`;
  try {
    const checkRes = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (checkRes.ok) {
      const checkData: any = await checkRes.json();
      if (checkData.data && checkData.data.length > 0) {
        return checkData.data[0].id;
      }
    }
  } catch (error) {
    console.error('Erro ao consultar cliente no Asaas:', error);
  }

  // 2. Criar cliente caso não exista
  const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : undefined;
  const body = {
    name: data.name,
    cpfCnpj: cleanCpfCnpj,
    mobilePhone: cleanPhone,
    email: data.email || undefined,
    address: data.address || undefined
  };

  const createRes = await fetch(`${ASAAS_URL}/customers`, {
    method: 'POST',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!createRes.ok) {
    const errorData: any = await createRes.json().catch(() => ({}));
    throw new Error(errorData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.');
  }

  const createdData: any = await createRes.json();
  return createdData.id;
}

export async function createAsaasPayment(data: AsaasPaymentData) {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não está configurada no ambiente.');
  }

  const body = {
    customer: data.customer,
    billingType: data.billingType,
    value: data.value,
    dueDate: data.dueDate,
    externalReference: data.externalReference,
    description: data.description
  };

  const res = await fetch(`${ASAAS_URL}/payments`, {
    method: 'POST',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData: any = await res.json().catch(() => ({}));
    throw new Error(errorData.errors?.[0]?.description || 'Erro ao criar cobrança no Asaas.');
  }

  const result: any = await res.json();
  return {
    id: result.id,
    invoiceUrl: result.invoiceUrl || result.bankSlipUrl
  };
}

export async function getAsaasPaymentBarcode(paymentId: string) {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não está configurada no ambiente.');
  }

  const res = await fetch(`${ASAAS_URL}/payments/${paymentId}/identificationField`, {
    method: 'GET',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData: any = await res.json().catch(() => ({}));
    throw new Error(errorData.errors?.[0]?.description || 'Erro ao obter código de barras do Asaas.');
  }

  const result: any = await res.json();
  return {
    identificationField: result.identificationField,
    barCode: result.barCode
  };
}

export async function getAsaasPaymentPix(paymentId: string) {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não está configurada no ambiente.');
  }

  const res = await fetch(`${ASAAS_URL}/payments/${paymentId}/pixQrCode`, {
    method: 'GET',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData: any = await res.json().catch(() => ({}));
    throw new Error(errorData.errors?.[0]?.description || 'Erro ao obter Pix QR Code do Asaas.');
  }

  const result: any = await res.json();
  return {
    success: result.success,
    encodedImage: result.encodedImage,
    payload: result.payload,
    expirationDate: result.expirationDate
  };
}

