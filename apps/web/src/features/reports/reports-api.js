import { apiRequest } from '../../lib/api-client.js';

export function getReportsOverview(start, end) {
  const query = new URLSearchParams({ start, end });
  return apiRequest(`/api/v1/reports/overview?${query}`);
}
