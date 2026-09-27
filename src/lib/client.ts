'use client';

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

/** fetch wrapper for our own API: JSON in, JSON out, errors as ApiError. */
export async function api<T = unknown>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error');
  return data as T;
}
