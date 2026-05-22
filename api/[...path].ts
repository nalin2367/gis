const getAppsScriptUrl = () => {
  const configuredUrl = process.env.APPS_SCRIPT_URL || process.env.VITE_API_BASE_URL;
  return configuredUrl?.trim().replace(/\/+$/, '');
};

const getPath = (value: unknown): string => {
  if (Array.isArray(value)) return value.join('/');
  return typeof value === 'string' ? value : 'health';
};

const getRequestBody = (body: unknown): string | undefined => {
  if (body === undefined || body === null) return undefined;
  return typeof body === 'string' ? body : JSON.stringify(body);
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const appsScriptUrl = getAppsScriptUrl();
  if (!appsScriptUrl) {
    res.status(500).json({
      status: 'error',
      message: 'Missing APPS_SCRIPT_URL or VITE_API_BASE_URL environment variable.',
    });
    return;
  }

  const path = getPath(req.query?.path).replace(/^\/+/, '');
  const upstreamUrl = `${appsScriptUrl}/${path}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: req.method === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
      body: req.method === 'POST' ? getRequestBody(req.body) : undefined,
    });

    const text = await upstreamResponse.text();

    try {
      JSON.parse(text);
    } catch {
      res.status(502).json({
        status: 'error',
        message: 'Apps Script did not return JSON. Check the /exec URL and web app access settings.',
      });
      return;
    }

    res.status(upstreamResponse.ok ? 200 : upstreamResponse.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (error) {
    res.status(502).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unable to reach Apps Script backend.',
    });
  }
}
