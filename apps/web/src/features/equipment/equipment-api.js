import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/equipment${path}`, {
    ...options,
    headers: { 'x-csrf-token': csrfToken, ...options.headers },
  });
}
export function getEquipmentOverview(filters = {}) {
  const query = new URLSearchParams();
  if (filters.search) query.set('search', filters.search);
  if (filters.categoryId) query.set('categoryId', filters.categoryId);
  if (filters.condition) query.set('condition', filters.condition);
  query.set('includeArchived', String(Boolean(filters.includeArchived)));
  return apiRequest(`/api/v1/equipment/overview?${query}`);
}
export function createEquipmentBatch(values, token) {
  return ownerRequest('/batches', token, { method: 'POST', body: JSON.stringify(values) });
}
export function updateEquipmentBatch(id, values, token) {
  return ownerRequest(`/batches/${id}`, token, { method: 'PATCH', body: JSON.stringify(values) });
}
export function updateEquipmentItem(id, values, token) {
  return ownerRequest(`/items/${id}`, token, { method: 'PATCH', body: JSON.stringify(values) });
}
export function setEquipmentItemActive(id, active, reason, token) {
  return ownerRequest(`/items/${id}/${active ? 'restore' : 'archive'}`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
export function createEquipmentCategory(values, token) {
  return ownerRequest('/categories', token, { method: 'POST', body: JSON.stringify(values) });
}
export function updateEquipmentCategory(id, values, token) {
  return ownerRequest(`/categories/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}
export function setEquipmentCategoryActive(id, active, reason, token) {
  return ownerRequest(`/categories/${id}/${active ? 'restore' : 'archive'}`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
export function createEquipmentRepair(itemId, values, token) {
  return ownerRequest(`/items/${itemId}/repairs`, token, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}
export function updateEquipmentRepair(id, values, token) {
  return ownerRequest(`/repairs/${id}`, token, { method: 'PATCH', body: JSON.stringify(values) });
}
export function setEquipmentRepairActive(id, active, reason, token) {
  return ownerRequest(`/repairs/${id}/${active ? 'restore' : 'void'}`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
