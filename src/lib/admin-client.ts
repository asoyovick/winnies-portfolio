'use client';

/**
 * Browser helpers for the administration panel.
 *
 * Every state-changing request carries the CSRF token that the server set in a
 * readable cookie, so a third-party page cannot drive the admin API.
 */
export { formatBytes, formatDate, formatDateTime } from './format';

export function readCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )portfolio_csrf=([^;]+)/);
  return (match && match[1]) || '';
}

export async function refreshCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', { cache: 'no-store' });
  const json = await response.json().catch(() => ({}));
  if (json?.ok) return readCsrfToken();
  return '';
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
};

export async function adminRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<{ ok: boolean; status: number; data: T | null; error: string }> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};

  if (method !== 'GET') {
    const token = readCsrfToken();
    headers['X-CSRF-Token'] = token;
    headers.Cookie = `portfolio_csrf=${token}`;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(path, { method, headers, body, signal: options.signal });
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? '' : data?.error || `Request failed (${response.status}).`,
    };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server.' };
  }
}

/**
 * Upload with progress reporting. The admin API accepts multipart form data,
 * and XHR is the only browser API that reports upload progress.
 */
export function uploadFile(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ ok: boolean; status: number; data: any; error: string }> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);

    const request = new XMLHttpRequest();
    request.open('POST', '/api/media');

    const token = readCsrfToken();
    request.setRequestHeader('X-CSRF-Token', token);
    request.setRequestHeader('Cookie', `portfolio_csrf=${token}`);

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener('load', () => {
      let data: any = null;
      try {
        data = JSON.parse(request.responseText);
      } catch {
        data = null;
      }
      resolve({
        ok: request.status >= 200 && request.status < 300,
        status: request.status,
        data,
        error:
          request.status >= 200 && request.status < 300
            ? ''
            : data?.error || `Upload failed (${request.status}).`,
      });
    });

    request.addEventListener('error', () => {
      resolve({ ok: false, status: 0, data: null, error: 'Upload failed.' });
    });

    request.send(formData);
  });
}

