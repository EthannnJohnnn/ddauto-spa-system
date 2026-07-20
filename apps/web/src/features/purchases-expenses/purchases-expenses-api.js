import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/purchases-expenses${path}`, {
    ...options,
    headers: { 'x-csrf-token': csrfToken, ...options.headers },
  });
}

export function getPurchasesExpensesOverview(start, end, purchaseSource) {
  const query = new URLSearchParams({ start, end, purchaseSource });
  return apiRequest(`/api/v1/purchases-expenses/overview?${query}`);
}

export function createExpenseCategory(values, csrfToken) {
  return ownerRequest('/categories', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateExpenseCategory(categoryId, values, csrfToken) {
  return ownerRequest(`/categories/${categoryId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setExpenseCategoryActive(categoryId, isActive, reason, csrfToken) {
  return ownerRequest(`/categories/${categoryId}/${isActive ? 'restore' : 'archive'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function createExpense(values, csrfToken) {
  return ownerRequest('/expenses', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateExpense(expenseId, values, csrfToken) {
  return ownerRequest(`/expenses/${expenseId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setExpenseActive(expenseId, isActive, reason, csrfToken) {
  return ownerRequest(`/expenses/${expenseId}/${isActive ? 'restore' : 'void'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
