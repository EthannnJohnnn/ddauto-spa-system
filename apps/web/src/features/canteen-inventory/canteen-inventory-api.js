import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/canteen-inventory${path}`, {
    ...options,
    headers: { 'x-csrf-token': csrfToken, ...options.headers },
  });
}

export function getCanteenInventoryOverview(start, end) {
  return apiRequest(
    `/api/v1/canteen-inventory/overview?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
}

export function createCanteenProduct(values, csrfToken) {
  return ownerRequest('/products', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateCanteenProduct(productId, values, csrfToken) {
  return ownerRequest(`/products/${productId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setCanteenProductActive(productId, isActive, reason, csrfToken) {
  return ownerRequest(`/products/${productId}/${isActive ? 'restore' : 'archive'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function createCanteenDocument(values, csrfToken) {
  return ownerRequest('/documents', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateCanteenDocument(documentId, values, csrfToken) {
  return ownerRequest(`/documents/${documentId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setCanteenDocumentActive(documentId, isActive, reason, csrfToken) {
  return ownerRequest(`/documents/${documentId}/${isActive ? 'restore' : 'void'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
