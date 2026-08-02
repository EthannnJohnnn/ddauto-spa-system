import { apiRequest } from '../../lib/api-client.js';

export function getSalaryPaymentPreview(start, end) {
  return apiRequest(
    `/api/v1/salary-payments/preview?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
}

export function getSalaryPaymentHistory() {
  return apiRequest('/api/v1/salary-payments/history');
}

export function paySalaries(values, csrfToken) {
  return apiRequest('/api/v1/salary-payments/pay', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
    body: JSON.stringify(values),
  });
}

export function voidSalaryPayment(id, reason, csrfToken) {
  return apiRequest(`/api/v1/salary-payments/${id}/void`, {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
    body: JSON.stringify({ reason }),
  });
}
