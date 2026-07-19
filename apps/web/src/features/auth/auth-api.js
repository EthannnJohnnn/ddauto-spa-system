export class AuthApiError extends Error {
  constructor(message, { code, details } = {}) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.details = details ?? [];
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`/api/v1/auth${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw new AuthApiError(payload.error?.message ?? 'The request could not be completed.', {
      code: payload.error?.code,
      details: payload.error?.details,
    });
  }

  return payload;
}

export function getAuthStatus() {
  return apiRequest('/status');
}

export function setupOwner(values) {
  return apiRequest('/setup', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function login(values) {
  return apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function resetPassword(values) {
  return apiRequest('/reset-password', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function logout(csrfToken) {
  return apiRequest('/logout', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
  });
}
