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
  const json: unknown = await response.json().catch(() => null);
  if (json && typeof json === 'object' && 'ok' in json && json.ok) {
    return readCsrfToken();
  }
  return '';
}

export type AdminResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readError(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.error === 'string') return payload.error;
  return fallback;
}

export async function adminRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<AdminResult<T>> {
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
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      data: data as T | null,
      error: response.ok ? '' : readError(data, `Request failed (${response.status}).`),
    };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server.' };
  }
}

export type UploadResult = {
  ok: boolean;
  status: number;
  data: { id: number; public_url: string; original_name: string } | null;
  error: string;
};

/**
 * Upload with progress reporting. The admin API accepts multipart form data,
 * and XHR is the only browser API that reports upload progress.
 */
export function uploadFile(file: File, onProgress: (percent: number) => void): Promise<UploadResult> {
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
      let data: unknown = null;
      try {
        data = JSON.parse(request.responseText);
      } catch {
        data = null;
      }
      const ok = request.status >= 200 && request.status < 300;
      resolve({
        ok,
        status: request.status,
        data: ok && isRecord(data) ? (data as UploadResult['data']) : null,
        error: ok ? '' : readError(data, `Upload failed (${request.status}).`),
      });
    });

    request.addEventListener('error', () => {
      resolve({ ok: false, status: 0, data: null, error: 'Upload failed.' });
    });

    request.send(formData);
  });
}
