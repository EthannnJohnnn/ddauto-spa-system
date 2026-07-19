import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/service-sales${path}`, {
    ...options,
    headers: { 'x-csrf-token': csrfToken, ...options.headers },
  });
}

export function getDailyServiceSales(businessDate) {
  return apiRequest(`/api/v1/service-sales/daily?date=${encodeURIComponent(businessDate)}`);
}

export function createServiceTicket(values, csrfToken) {
  return ownerRequest('/tickets', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateServiceTicket(ticketId, values, csrfToken) {
  return ownerRequest(`/tickets/${ticketId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setServiceTicketActive(ticketId, isActive, reason, csrfToken) {
  return ownerRequest(`/tickets/${ticketId}/${isActive ? 'restore' : 'void'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function saveAttendance(values, csrfToken) {
  return ownerRequest('/attendance', csrfToken, {
    method: 'PUT',
    body: JSON.stringify(values),
  });
}
