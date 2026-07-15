const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

let accessToken = null;
let onAuthLost = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnAuthLost(fn) {
  onAuthLost = fn;
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function rawRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await parse(res);
  if (!res.ok) {
    const message = data?.error?.message || res.statusText;
    throw new ApiError(res.status, message, data?.error?.details);
  }
  return data;
}

/**
 * Try to silently refresh the access token using the httpOnly refresh cookie.
 */
async function tryRefresh() {
  try {
    const data = await rawRequest('/auth/refresh', { method: 'POST', auth: false });
    if (data?.accessToken) {
      accessToken = data.accessToken;
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}

/**
 * Authenticated request with a single transparent refresh-and-retry on 401.
 */
export async function request(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && options.auth !== false) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return rawRequest(path, options);
      }
      if (onAuthLost) onAuthLost();
    }
    throw err;
  }
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  tryRefresh,
};
