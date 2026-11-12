/**
 * Standard API Client for Smart IT Helpdesk
 * Automatically attaches cookies and parses JSON responses.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Send session cookies cross-origin / same-origin
  };

  // If body is FormData (e.g. file attachments), remove Content-Type so browser sets boundary
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message || `HTTP ${response.status}: Request failed`);
    error.status = response.status;
    error.code = data.error?.code || 'REQUEST_FAILED';
    error.data = data;
    throw error;
  }

  return data;
}

// Convenient system health helper
export const systemApi = {
  getHealth: () => apiClient('/health'),
  getReady: () => apiClient('/ready'),
};
