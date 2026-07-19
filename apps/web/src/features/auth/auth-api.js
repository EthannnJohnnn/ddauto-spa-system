import { apiRequest } from '../../lib/api-client.js';

export function getAuthStatus() {
  return apiRequest('/api/v1/auth/status');
}

export function setupOwner(values) {
  return apiRequest('/api/v1/auth/setup', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function login(values) {
  return apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function resetPassword(values) {
  return apiRequest('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function logout(csrfToken) {
  return apiRequest('/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
  });
}
