import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/payroll${path}`, {
    ...options,
    headers: { 'x-csrf-token': csrfToken, ...options.headers },
  });
}

export function getDailyPayroll(businessDate) {
  return apiRequest(`/api/v1/payroll/daily?date=${encodeURIComponent(businessDate)}`);
}

export function closeDailyPayroll(values, csrfToken) {
  return ownerRequest('/close', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function reopenDailyPayroll(values, csrfToken) {
  return ownerRequest('/reopen', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}
