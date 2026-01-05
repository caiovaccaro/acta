/**
 * API Client
 * Handles all HTTP requests to the backend API
 * In production (Vercel), uses relative paths (same origin)
 * In development, can use external API URL if needed
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    super(`API Error: ${status}`);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData);
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    // Ensure endpoint starts with /api
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    
    // Build URL - use relative path if API_BASE_URL is empty (production/Vercel)
    let url: string;
    if (API_BASE_URL) {
      const urlObj = new URL(`${API_BASE_URL}${apiEndpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          urlObj.searchParams.append(key, value);
        });
      }
      url = urlObj.pathname + urlObj.search;
    } else {
      // Relative URL for same-origin requests
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, value);
        });
      }
      url = apiEndpoint + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    }
    
    return this.request<T>(url, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    // Ensure endpoint starts with /api
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    return this.request<T>(apiEndpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

export const apiClient = new ApiClient();
