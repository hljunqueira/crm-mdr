import { useNetworkStore } from '../store/useNetworkStore';

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const isOffline = useNetworkStore.getState().isOfflineMode;
  const baseUrl = isOffline ? 'http://localhost:3009/api' : (import.meta.env.VITE_API_URL || '/api');

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    const errorMessage = error.error || error.message || 'Erro de comunicação com o servidor.';
    window.dispatchEvent(new CustomEvent('api-error', { detail: errorMessage }));
    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (endpoint: string) => fetchApi(endpoint, { method: 'GET' }),
  post: (endpoint: string, data: any) => fetchApi(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  patch: (endpoint: string, data: any) => fetchApi(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (endpoint: string, data?: any) => fetchApi(endpoint, { method: 'DELETE', body: data ? JSON.stringify(data) : undefined }),
};
