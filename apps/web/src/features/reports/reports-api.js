import { apiRequest } from '../../lib/api-client.js';

export function getReportsOverview(start, end) {
  const query = new URLSearchParams({ start, end });
  return apiRequest(`/api/v1/reports/overview?${query}`);
}

export async function downloadReportsExcel(start, end) {
  const query = new URLSearchParams({ start, end });
  const response = await fetch(`/api/v1/reports/excel?${query}`, { credentials: 'same-origin' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? 'The Excel report could not be generated.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `dd-auto-spa-report-${start}-to-${end}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
