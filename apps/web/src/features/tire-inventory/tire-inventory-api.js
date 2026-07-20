import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/tire-inventory${path}`, {
    ...options,
    headers: { 'x-csrf-token': csrfToken, ...options.headers },
  });
}

export function getTireInventoryOverview(start, end) {
  return apiRequest(
    `/api/v1/tire-inventory/overview?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
}

export function createTireProduct(values, csrfToken) {
  return ownerRequest('/products', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateTireProduct(productId, values, csrfToken) {
  return ownerRequest(`/products/${productId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setTireProductActive(productId, isActive, reason, csrfToken) {
  return ownerRequest(`/products/${productId}/${isActive ? 'restore' : 'archive'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function createTireDocument(values, csrfToken) {
  return ownerRequest('/documents', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateTireDocument(documentId, values, csrfToken) {
  return ownerRequest(`/documents/${documentId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setTireDocumentActive(documentId, isActive, reason, csrfToken) {
  return ownerRequest(`/documents/${documentId}/${isActive ? 'restore' : 'void'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
