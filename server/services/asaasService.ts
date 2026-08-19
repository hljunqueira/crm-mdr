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
  fine?: { value: number; type?: 'PERCENTAGE' | 'FIXED' };
  interest?: { value: number; type?: 'PERCENTAGE' | 'FIXED' };
  discount?: { value: number; dueDateLimitDays: number; type: 'PERCENTAGE' | 'FIXED' };
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

export async function updateAsaasCustomer(asaasCustomerId: string, data: AsaasCustomerData): Promise<void> {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não está configurada no ambiente.');
  }

  const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : undefined;
  const body: Record<string, any> = {
    name: data.name,
    email: data.email || undefined,
  };

  if (cleanPhone) {
    body.mobilePhone = cleanPhone;
  }

  const url = `${ASAAS_URL}/customers/${asaasCustomerId}`;
  try {
    const res = await fetch(url, {
      method: 'POST', // Asaas API uses POST /v3/customers/{id} to update
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorData: any = await res.json().catch(() => ({}));
      console.error(`Erro ao atualizar cliente ${asaasCustomerId} no Asaas:`, errorData.errors?.[0]?.description || 'Erro desconhecido');
    } else {
      console.log(`Cliente ${asaasCustomerId} atualizado com sucesso no Asaas.`);
    }
  } catch (error) {
    console.error('Erro ao chamar API do Asaas para atualizar cliente:', error);
  }
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
    description: data.description,
    fine: data.fine,
    interest: data.interest,
    discount: data.discount
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

export async function deleteAsaasPayment(paymentId: string): Promise<void> {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não está configurada no ambiente.');
  }

  const res = await fetch(`${ASAAS_URL}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData: any = await res.json().catch(() => ({}));
    console.warn(`Erro ao excluir cobrança ${paymentId} no Asaas:`, errorData.errors?.[0]?.description || 'Erro desconhecido');
  }
}

export async function updateAsaasPayment(paymentId: string, data: { dueDate?: string; value?: number; description?: string }): Promise<boolean> {
  if (!ASAAS_API_KEY) {
    console.warn('[Asaas Update] ASAAS_API_KEY não configurada. Ignorando atualização externa.');
    return false;
  }

  const payload: any = {};
  if (data.dueDate) {
    // Sanitiza data para formato YYYY-MM-DD
    payload.dueDate = data.dueDate.split('T')[0];
  }
  if (data.value !== undefined) {
    payload.value = Number(data.value);
  }
  if (data.description) {
    payload.description = data.description;
  }

  try {
    const res = await fetch(`${ASAAS_URL}/payments/${paymentId}`, {
      method: 'POST', // API Asaas utiliza POST /v3/payments/{id} para update
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData: any = await res.json().catch(() => ({}));
      console.warn(`[Asaas Update Warning] Falha ao atualizar cobrança ${paymentId} no Asaas:`, errorData.errors?.[0]?.description || JSON.stringify(errorData));
      return false;
    }

    console.log(`[Asaas Update Success] Cobrança ${paymentId} atualizada no Asaas com sucesso (Vencimento: ${payload.dueDate || 'inalterado'}).`);
    return true;
  } catch (err: any) {
    console.error(`[Asaas Update Error] Exceção ao atualizar cobrança ${paymentId}:`, err.message);
    return false;
  }
}

export async function checkAndReactivateAsaasWebhook(): Promise<void> {
  if (!ASAAS_API_KEY) return;
  try {
    const res = await fetch(`${ASAAS_URL}/webhooks`, {
      method: 'GET',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      console.warn(`[Asaas Webhook Monitor] Erro ao consultar webhooks (${res.status})`);
      return;
    }
    const result: any = await res.json();
    const webhooks = result.data || [];
    for (const webhook of webhooks) {
      if (webhook.interrupted || webhook.penalizedRequestsCount > 0) {
        console.log(`[Asaas Webhook Monitor] Webhook ${webhook.id} está interrompido ou penalizado (${webhook.penalizedRequestsCount} falhas). Reativando...`);
        const updateRes = await fetch(`${ASAAS_URL}/webhooks/${webhook.id}`, {
          method: 'PUT',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: webhook.url,
            enabled: true,
            interrupted: false,
            events: webhook.events
          })
        });
        if (updateRes.ok) {
          console.log(`[Asaas Webhook Monitor] Webhook ${webhook.id} reativado com sucesso.`);
        } else {
          console.error(`[Asaas Webhook Monitor] Falha ao reativar webhook ${webhook.id}: ${updateRes.status}`);
        }
      }
    }
  } catch (error: any) {
    console.error('[Asaas Webhook Monitor] Erro no monitor de webhooks:', error.message || error);
  }
}


