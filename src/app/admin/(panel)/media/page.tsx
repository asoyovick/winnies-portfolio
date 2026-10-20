'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { adminRequest, refreshCsrfToken, uploadFile } from '@/lib/admin-client';
import { formatBytes, formatDateTime } from '@/lib/format';

type Asset = {
  id: number;
  original_name: string;
  storage_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  public_url: string;
};

type Pending = {
  name: string;
  percent: number;
};

export default function MediaPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const result = await adminRequest<Asset[]>('/api/media');
    if (result.ok && result.data) setItems(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshCsrfToken();
      await load();
    })();
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError('');
    setNotice('');

    for (const file of list) {
      setPending((current) => [...current, { name: file.name, percent: 0 }]);
      const result = await uploadFile(file, (percent) => {
        setPending((current) =>
          current.map((item) => (item.name === file.name ? { ...item, percent } : item))
        );
      });
      setPending((current) => current.filter((item) => item.name !== file.name));
      if (!result.ok) {
        setError(result.error);
      } else {
        setNotice(`Uploaded ${file.name}.`);
      }
    }
    await load();
  }

  async function handleReplace(asset: Asset, file: File) {
    setError('');
    setNotice('');
    setPending([{ name: file.name, percent: 0 }]);

    const uploaded = await uploadFile(file, (percent) => {
      setPending((current) =>
        current.map((item) => (item.name === file.name ? { ...item, percent } : item))
      );
    });
    setPending([]);
    if (!uploaded.ok || !uploaded.data) {
      setError(uploaded.error || 'The upload did not return a file.');
      return;
    }

    const result = await adminRequest('/api/media', {
      method: 'PUT',
      body: { id: asset.id, replacement_id: uploaded.data.id },
    });    if (!result.ok) {
      setError(result.error);
      await load();
      return;
    }
    setNotice(`Replaced ${asset.original_name}.`);
    await load();
  }

  async function handleDelete(asset: Asset) {
    setError('');
    setNotice('');

    const result = await adminRequest<{ references?: string[] }>(
      `/api/media?id=${asset.id}`,
      { method: 'DELETE' }
    );
    if (result.ok) {
      setNotice(`Deleted ${asset.original_name}.`);
      await load();
      return;
    }

    if (result.status === 409) {
      const references: string[] = result.data?.references ?? [];
      const confirmed = window.confirm(
        `${asset.original_name} is still used by:\n\n${references.join('\n')}\n\nDelete it anyway?`
      );
      if (!confirmed) {
        setError('Nothing was deleted.');
        return;
      }
      const forced = await adminRequest(`/api/media?id=${asset.id}&confirm=force`, {
        method: 'DELETE',
      });
      if (!forced.ok) {
        setError(forced.error);
        return;
      }
      setNotice(`Deleted ${asset.original_name}.`);
      await load();
      return;
    }

    setError(result.error);
  }

  function isImage(asset: Asset) {
    return asset.mime_type.startsWith('image/');
  }

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Media library</h1>
          <p className="admin-canvas__sub">
            Photographs and documents used on the portfolio. Files are stored
            permanently and are only published where you select them.
          </p>
        </div>
      </div>

      {error ? (
        <p className="admin-login__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="admin-login__error" role="status" style={{ color: 'var(--accent)' }}>
          {notice}
        </p>
      ) : null}

      <section className="admin-section">
        <div
          className={`dropzone${dragActive ? ' dropzone--active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            if (event.dataTransfer?.files?.length) {
              void uploadFiles(event.dataTransfer.files);
            }
          }}
        >
          <p className="dropzone__title">Drop files here</p>
          <p className="dropzone__hint">
            JPEG, PNG and WebP images, or PDF documents. Up to 10 MB each.
          </p>
          <button
            type="button"
            className="btn dropzone__button"
            onClick={() => inputRef.current?.click()}
          >
            Choose files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => {
              const files = event.target.files;
              event.target.value = '';
              if (files?.length) void uploadFiles(files);
            }}
          />
        </div>

        {pending.length > 0 ? (
          <ul className="admin-note" style={{ listStyle: 'none', padding: 0 }}>
            {pending.map((item) => (
              <li key={item.name}>
                {item.name} — {item.percent}%
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">
          {loading ? 'Loading…' : `${items.length} asset${items.length === 1 ? '' : 's'}`}
        </h2>
        {items.length === 0 && !loading ? (
          <p className="admin-empty">
            No files uploaded yet. Drop an image above to get started.
          </p>
        ) : (
          <div className="media-grid">
            {items.map((asset) => (
              <div key={asset.id} className="media-item">
                {isImage(asset) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.public_url} alt={asset.original_name} loading="lazy" />
                ) : (
                  <div className="picker__thumb picker__thumb--file">PDF</div>
                )}
                <div className="media-item__name">{asset.original_name}</div>
                <div className="media-item__meta">
                  {asset.mime_type} · {formatBytes(asset.size)}
                  <br />
                  Added {formatDateTime(asset.created_at)}
                </div>
                <div className="media-item__actions">
                  <a href={asset.public_url} target="_blank" rel="noreferrer">
                    View
                  </a>
                  <label className="media-item__label" style={{ cursor: 'pointer' }}>
                    Replace
                    <input
                      type="file"
                      hidden
                      accept={isImage(asset) ? 'image/jpeg,image/png,image/webp' : 'application/pdf'}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void handleReplace(asset, file);
                      }}
                    />
                  </label>
                  <button type="button" onClick={() => handleDelete(asset)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-actions-row">
        <Link href="/admin" className="btn btn--text">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
