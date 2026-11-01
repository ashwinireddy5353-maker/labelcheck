const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number = 500, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('labelcheck_token');

  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      cache: options.cache ?? 'no-store',
      headers,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw new ApiError(
        errorData.message || errorData.error || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }

    return (await response.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err?.message === 'Failed to fetch' || err?.name === 'TypeError') {
      throw new ApiError(
        'Unable to connect to the authentication server. Please ensure the backend is running.',
        0
      );
    }
    throw new ApiError(err?.message || 'Network connection error', 0);
  }
}

export async function requestBlob(
  endpoint: string,
  options: RequestInit = {}
): Promise<Blob> {
  const token = localStorage.getItem('labelcheck_token');
  const headers = new Headers(options.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      cache: options.cache ?? 'no-store',
      headers,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw new ApiError(
        errorData.message || errorData.error || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }

    return await response.blob();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection error', 0);
  }
}

// Utility delay for simulating realistic AI OCR backend latency during mock mode
export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));