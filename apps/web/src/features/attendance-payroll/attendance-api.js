import { apiRequest } from '../../lib/api-client.js';

export function getOpenAttendance(through) {
  return apiRequest(`/api/v1/attendance/open?through=${encodeURIComponent(through)}`);
}

export function setAttendanceReviewed(businessDate, reviewed, csrfToken) {
  return apiRequest('/api/v1/attendance/review', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
    body: JSON.stringify({ businessDate, reviewed }),
  });
}
