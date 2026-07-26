import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/daily-close${path}`, {
    ...options,
    headers: { 'x-csrf-token': csrfToken, ...options.headers },
  });
}

export function getDailyClose(businessDate) {
  return apiRequest(`/api/v1/daily-close/daily?date=${encodeURIComponent(businessDate)}`);
}

export function closeBusinessDate(values, csrfToken) {
  return ownerRequest('/close', csrfToken, { method: 'POST', body: JSON.stringify(values) });
}

export function reopenBusinessDate(values, csrfToken) {
  return ownerRequest('/reopen', csrfToken, { method: 'POST', body: JSON.stringify(values) });
}
