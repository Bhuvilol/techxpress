const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor({ message, code, status, details }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const buildUrl = (path, query) => {
  const qs = query
    ? '?' +
      new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ).toString()
    : '';
  return `${BASE}${path}${qs}`;
};

const request = async (method, path, { body, query, headers, signal } = {}) => {
  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 204) return null;

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON or empty response */
  }

  if (!res.ok) {
    throw new ApiError({
      message: payload?.error ?? payload?.message ?? `${method} ${path} failed (${res.status})`,
      code: payload?.code ?? 'HTTP_ERROR',
      status: res.status,
      details: payload?.details,
    });
  }

  return payload;
};

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
};
