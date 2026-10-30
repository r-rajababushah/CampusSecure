function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export class ApiError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(message: string, code = 'UNKNOWN_ERROR', status = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Add Anti-CSRF token for state-changing requests
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrfToken = getCookie('campus_csrf') || sessionStorage.getItem('campus_csrf_token');
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  // Attach session token in headers for cross-origin or cookie-restricted environments
  const savedSessionId = sessionStorage.getItem('campus_session_id') || getCookie('campus_session');
  if (savedSessionId && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${savedSessionId}`;
    headers['X-Session-ID'] = savedSessionId;
  }

  const response = await fetch(path, {
    method,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Extract error from data.error (Express/standard) or data.detail (FastAPI)
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode = 'HTTP_ERROR';
    let errorDetails: any = undefined;

    if (data.error) {
      errorMessage = data.error.message || errorMessage;
      errorCode = data.error.code || errorCode;
      errorDetails = data.error.details;
    } else if (data.detail) {
      if (typeof data.detail === 'object') {
        errorMessage = data.detail.message || JSON.stringify(data.detail);
        errorCode = data.detail.code || errorCode;
      } else {
        errorMessage = String(data.detail);
      }
    }

    throw new ApiError(errorMessage, errorCode, response.status, errorDetails);
  }

  return data.data !== undefined ? data.data : data;
}
