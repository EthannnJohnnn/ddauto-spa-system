import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/dashboard${path}`, {
    ...options,
    headers: { 'x-csrf-token': csrfToken, ...options.headers },
  });
}

export function getDashboardNotes() {
  return apiRequest('/api/v1/dashboard/notes');
}

export function createDashboardNote(values, csrfToken) {
  return ownerRequest('/notes', csrfToken, { method: 'POST', body: JSON.stringify(values) });
}

export function updateDashboardNote(id, values, csrfToken) {
  return ownerRequest(`/notes/${id}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function archiveDashboardNote(id, csrfToken) {
  return ownerRequest(`/notes/${id}/archive`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Removed from dashboard by owner' }),
  });
}
