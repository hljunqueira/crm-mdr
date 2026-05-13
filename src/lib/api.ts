const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || 'API Error');
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (endpoint: string) => fetchApi(endpoint, { method: 'GET' }),
  post: (endpoint: string, data: any) => fetchApi(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  patch: (endpoint: string, data: any) => fetchApi(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (endpoint: string) => fetchApi(endpoint, { method: 'DELETE' }),
};
