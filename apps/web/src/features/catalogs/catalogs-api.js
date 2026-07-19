import { apiRequest } from '../../lib/api-client.js';

function ownerRequest(path, csrfToken, options = {}) {
  return apiRequest(`/api/v1/catalogs${path}`, {
    ...options,
    headers: {
      'x-csrf-token': csrfToken,
      ...options.headers,
    },
  });
}

export function getCatalogs() {
  return apiRequest('/api/v1/catalogs');
}

export function createEmployee(values, csrfToken) {
  return ownerRequest('/employees', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateEmployee(employeeId, values, csrfToken) {
  return ownerRequest(`/employees/${employeeId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setEmployeeActive(employeeId, isActive, reason, csrfToken) {
  return ownerRequest(`/employees/${employeeId}/${isActive ? 'restore' : 'archive'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function createVehicleClass(values, csrfToken) {
  return ownerRequest('/vehicle-classes', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateVehicleClass(vehicleClassId, values, csrfToken) {
  return ownerRequest(`/vehicle-classes/${vehicleClassId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setVehicleClassActive(vehicleClassId, isActive, reason, csrfToken) {
  return ownerRequest(
    `/vehicle-classes/${vehicleClassId}/${isActive ? 'restore' : 'archive'}`,
    csrfToken,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

export function createService(values, csrfToken) {
  return ownerRequest('/services', csrfToken, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function updateService(serviceId, values, csrfToken) {
  return ownerRequest(`/services/${serviceId}`, csrfToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function setServiceActive(serviceId, isActive, reason, csrfToken) {
  return ownerRequest(`/services/${serviceId}/${isActive ? 'restore' : 'archive'}`, csrfToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function setServicePrice(values, csrfToken) {
  return ownerRequest('/service-prices', csrfToken, {
    method: 'PUT',
    body: JSON.stringify(values),
  });
}
