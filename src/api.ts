const AUTH_STORAGE_KEY = 'cookiertmps_stream_key_auth';

export const authFetch = (input: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const key = localStorage.getItem(AUTH_STORAGE_KEY);
  if (key) headers.set('X-Stream-Key', key);
  return fetch(input, { ...init, headers });
};

export { AUTH_STORAGE_KEY };
