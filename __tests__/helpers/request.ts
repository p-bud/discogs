import { NextRequest } from 'next/server';

export function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  cookies?: Record<string, string>,
  headers?: Record<string, string>,
): NextRequest {
  const req = new NextRequest(url, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  Object.entries(cookies ?? {}).forEach(([k, v]) => req.cookies.set(k, v));
  return req;
}
