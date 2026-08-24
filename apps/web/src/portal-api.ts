import {runtimeConfig} from './runtime-config';

function cookieValue(name: string) {
  return document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}

export async function portalApi<T>(path: string, options?: RequestInit) {
  const method = options?.method?.toUpperCase() ?? 'GET';
  const csrf = cookieValue('__Host-ued-admin-csrf') || cookieValue('ued_admin_csrf');
  const response = await fetch(`${runtimeConfig.apiBase}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(method !== 'GET' ? {'content-type': 'application/json'} : {}),
      ...(csrf && method !== 'GET' ? {'x-csrf-token': csrf} : {}),
      ...(options?.headers ?? {}),
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('json') ? await response.json().catch(() => ({})) : await response.text();
  if (!response.ok) throw Object.assign(new Error((data as {error?: string}).error ?? `Request failed: ${response.status}`), {status: response.status, data});
  return data as T;
}
