'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminRequest, formatBytes, uploadFile } from '@/lib/admin-client';

export type MediaAsset = {
  id: number;
  original_name: string;
  storage_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  public_url: string;
};

type MediaPickerProps = {
  label: string;
  help?: string;
  value: number | null;
  onChange: (id: number | null) => void;
  /** Restrict the library to images (profile photo) or documents (CV). */
  kind?: 'image' | 'document' | 'any';
};

function isImage(asset: MediaAsset) {
  return asset.mime_type.startsWith('image/');
}

/**
 * Choose an asset from the media library without copying file paths.
 *
 * The picker lists what has been uploaded, previews images, and can upload a
 * new file on the spot. It is used for the profile photograph, the public CV
 * and article cover images.
 */
export function MediaPicker({
  label,
  help,
  value,
  onChange,
  kind = 'any',
}: MediaPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const result = await adminRequest<MediaAsset[]>('/api/media');
    if (result.ok && result.data) setAssets(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = assets.find((asset) => asset.id === value) ?? null;

  const visible = assets.filter((asset) => {
    if (kind === 'image') return isImage(asset);
    if (kind === 'document') return asset.mime_type === 'application/pdf';
    return true;
  });

  async function handleUpload(file: File) {
    setBusy(true);
    setError('');
    setProgress(0);
    const result = await uploadFile(file, setProgress);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
    if (result.data?.id) onChange(result.data.id);
    setOpen(false);
  }

  return (
    <div className="admin-field">
      <span className="admin-field__label">{label}</span>
      {help ? <p className="admin-form__help">{help}</p> : null}

      <div className="picker">
        <div className="picker__current">
          {selected ? (
            isImage(selected) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.public_url} alt={selected.original_name} />
            ) : (
              <span className="picker__file">
                {selected.original_name} · {formatBytes(selected.size)}
              </span>
            )
          ) : (
            <span className="picker__empty">Nothing selected</span>
          )}
        </div>

        <div className="picker__actions">
          <button
            type="button"
            className="btn btn--text"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? 'Close library' : 'Choose from library'}
          </button>
          {selected ? (
            <button type="button" className="btn btn--text" onClick={() => onChange(null)}>
              Remove
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--text"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            {busy ? `Uploading ${progress}%` : 'Upload new'}
          </button>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept={kind === 'image' ? 'image/*' : kind === 'document' ? 'application/pdf' : undefined}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void handleUpload(file);
            }}
          />
        </div>

        {busy ? (
          <div className="picker__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}

        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}

        {open ? (
          <div className="picker__library">
            {visible.length === 0 ? (
              <p className="admin-empty">
                No {kind === 'any' ? 'assets' : kind === 'image' ? 'images' : 'PDFs'} uploaded yet.
                Use “Upload new” to add one.
              </p>
            ) : (
              <ul className="picker__list">
                {visible.map((asset) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      className={`picker__item${asset.id === value ? ' picker__item--selected' : ''}`}
                      onClick={() => {
                        onChange(asset.id);
                        setOpen(false);
                      }}
                    >
                      {isImage(asset) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.public_url} alt="" />
                      ) : (
                        <span className="picker__thumb picker__thumb--file">PDF</span>
                      )}
                      <span className="picker__name">{asset.original_name}</span>
                      <span className="picker__meta">{formatBytes(asset.size)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
