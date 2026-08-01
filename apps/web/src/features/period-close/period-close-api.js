import { apiRequest } from '../../lib/api-client.js';

export function getPeriodClosePreview(start, end) {
  return apiRequest(
    `/api/v1/period-close/preview?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
}

export function getPeriodCloseHistory() {
  return apiRequest('/api/v1/period-close/history');
}

export function closePeriod(values, csrfToken) {
  return apiRequest('/api/v1/period-close/close', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
    body: JSON.stringify(values),
  });
}

export function reopenPeriod(id, reason, csrfToken) {
  return apiRequest(`/api/v1/period-close/${id}/reopen`, {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
    body: JSON.stringify({ reason }),
  });
}
