type ApiResource = 'customers' | 'policies' | 'claims' | 'invoices';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const apiBaseUrl = (configuredApiBaseUrl || '/api').replace(/\/+$/, '');

const isAppsScriptApi = /script\.google\.com\/macros\/s\//.test(apiBaseUrl);

const buildUrl = (path: string) => {
  const cleanPath = path.replace(/^\/+/, '');
  return `${apiBaseUrl}/${cleanPath}`;
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || payload?.status === 'error') {
    throw new Error(payload?.message || `API request failed with ${response.status}`);
  }

  return payload as T;
};

export const getApiBaseUrl = () => apiBaseUrl;

export const fetchResource = async <T>(resource: ApiResource): Promise<T[]> => {
  const response = await fetch(buildUrl(resource));
  return parseJsonResponse<T[]>(response);
};

export const syncResource = async <T>(resource: ApiResource, rows: T[]): Promise<void> => {
  const response = await fetch(buildUrl(`${resource}/sync`), {
    method: 'POST',
    headers: isAppsScriptApi ? undefined : { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  });

  await parseJsonResponse<{ status: string }>(response);
};
