export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'connected' | 'disconnected';
}

export interface StatusResponse {
  lastCrawl: string | null;
  lastAnalysis: string | null;
  lastVerdictCalculation: string | null;
}

