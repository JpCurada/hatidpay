import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANCHOR_ORIGIN = 'https://testanchor.stellar.org';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.query.path as string[]).join('/');
  const search = new URL(req.url!, `http://localhost`).search;
  const targetUrl = `${ANCHOR_ORIGIN}/${path}${search}`;

  const headers: Record<string, string> = {
    'Content-Type': req.headers['content-type'] as string ?? 'application/json',
  };
  if (req.headers['authorization']) {
    headers['Authorization'] = req.headers['authorization'] as string;
  }

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(upstream.status);

  const text = await upstream.text();
  res.send(text);
}
