'use client';

import { useEffect, useRef, useState } from 'react';
import { adminRequest } from '@/lib/admin-client';

type Asset = {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
  public_url: string;
  created_at: string;
};

const MAX_SIZE_MB = 5;

/**
 * The profile picture.
 *
 * Winnie can upload a new picture, pick one that is already in the media
 * library, replace the current one, or remove it. The file itself is stored
 * outside the database; the panel only ever handles a reference to it.
 */
export function ProfilePicturePanel({
  current,
  onChanged,
}: {
  current: { id: number; public_url: string; original_name: string } | null;
  onChanged: (asset: Asset | null) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pending, setPending] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminRequest<Asset[]>('/api/media').then((result) => {
      if (result.ok && result.data) {
        setAssets(result.data.filter((asset) => asset.mime_type.startsWith('image/')));
      }
    });
  }, []);

  async function upload(file: File) {
    setError('');
    setNotice('');
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`That image is too large. The maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setBusy(true);
    const formData = new FormData();
    formData.append('file', file);

    const result = await adminRequest<{ asset: Asset }>('/api/profile/picture', {
      method: 'POST',
      formData,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error || 'The picture could not be uploaded.');
      return;
    }
    if (result.data?.asset) {
      onChanged(result.data.asset);
      setNotice('Your profile picture has been updated.');
      setLibraryOpen(false);
      setPending(null);
      const fresh = await adminRequest<Asset[]>('/api/media');
      if (fresh.ok && fresh.data) {
        setAssets(fresh.data.filter((asset) => asset.mime_type.startsWith('image/')));
      }
    }
  }

  async function applyPending() {
    if (!pending) return;
    setError('');
    setNotice('');
    setBusy(true);
    const result = await adminRequest('/api/profile', {
      method: 'PUT',
      body: { profile_image_id: pending.id },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error || 'The picture could not be saved.');
      return;
    }
    onChanged(pending);
    setPending(null);
    setLibraryOpen(false);
    setNotice('Your profile picture has been updated.');
  }

  async function remove() {
    setError('');
    setNotice('');
    setBusy(true);
    const result = await adminRequest('/api/profile/picture', { method: 'DELETE' });
    setBusy(false);
    if (!result.ok) {
      setError(result.error || 'The picture could not be removed.');
      return;
    }
    onChanged(null);
    setPending(null);
    setNotice('Your profile picture has been removed.');
  }

  const shown = pending ?? current;

  return (
    <fieldset className="admin-group">
      <legend className="admin-group__legend">Profile picture</legend>
      <p className="admin-form__help">
        This picture appears in the navigation of the website. JPEG, PNG or WebP,
        up to {MAX_SIZE_MB} MB. It is stored outside the database.
      </p>

      <div className="picture">
        <div className="picture__preview">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown.public_url} alt={shown.original_name} />
          ) : (
            <span className="picture__fallback" aria-hidden="true">
              WA
            </span>
          )}
        </div>

        <div className="picture__details">
          <p className="picture__name">
            {pending
              ? `Selected: ${pending.original_name} (not saved yet)`
              : current
                ? current.original_name
                : 'No picture — the navigation shows your initials.'}
          </p>

          <div className="picker__actions">
            <button
              type="button"
              className="btn btn--text"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {current ? 'Replace picture' : 'Upload picture'}
            </button>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void upload(file);
              }}
            />

            <button
              type="button"
              className="btn btn--text"
              onClick={() => setLibraryOpen((open) => !open)}
              aria-expanded={libraryOpen}
            >
              {libraryOpen ? 'Close library' : 'Choose from library'}
            </button>

            {current ? (
              <button
                type="button"
                className="btn btn--text"
                onClick={() => void remove()}
                disabled={busy}
                style={{ color: '#7a2e1e' }}
              >
                Remove picture
              </button>
            ) : null}

            {pending ? (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void applyPending()}
                  disabled={busy}
                >
                  Use this picture
                </button>
                <button
                  type="button"
                  className="btn btn--text"
                  onClick={() => setPending(null)}
                >
                  Cancel
                </button>
              </>
            ) : null}
          </div>

          {error ? (
            <p className="admin-login__error" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p
              className="admin-login__error"
              role="status"
              style={{ color: 'var(--accent)' }}
            >
              {notice}
            </p>
          ) : null}

          {libraryOpen ? (
            <div className="picker__library">
              {assets.length === 0 ? (
                <p className="admin-empty">
                  No images in the library yet. Upload one to use it here.
                </p>
              ) : (
                <ul className="picker__list">
                  {assets.map((asset) => (
                    <li key={asset.id}>
                      <button
                        type="button"
                        className={`picker__item${
                          pending?.id === asset.id ? ' picker__item--selected' : ''
                        }`}
                        onClick={() => setPending(asset)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.public_url} alt="" />
                        <span className="picker__name">{asset.original_name}</span>
                        <span className="picker__meta">
                          {Math.round(asset.size / 1024)} KB
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </fieldset>
  );
}
