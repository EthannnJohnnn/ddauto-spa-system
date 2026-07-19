export class ApiError extends Error {
  constructor(message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details ?? [];
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
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
    throw new ApiError(payload.error?.message ?? 'The request could not be completed.', {
      code: payload.error?.code,
      details: payload.error?.details,
    });
  }

  return payload;
}
