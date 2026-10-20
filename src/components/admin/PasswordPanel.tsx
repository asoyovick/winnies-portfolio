'use client';

import { useState } from 'react';
import { adminRequest } from '@/lib/admin-client';

type RevealState = {
  status: 'idle' | 'asking' | 'showing' | 'error';
  password?: string;
  message?: string;
};

/**
 * The administrator's own password.
 *
 * The password is never kept in plain text. When it is changed the new one is
 * shown once so it can be stored in a password manager; when it is revealed
 * the administrator has to confirm the current password first.
 */
export function PasswordPanel() {
  const [reveal, setReveal] = useState<RevealState>({ status: 'idle' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleReveal(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const result = await adminRequest<{ password?: string }>('/api/admin/password', {
      method: 'POST',
      body: { action: 'reveal', current_password: currentPassword },
    });
    setBusy(false);
    if (!result.ok) {
      setReveal({ status: 'error', message: result.error });
      setError(result.error);
      return;
    }
    setReveal({
      status: 'showing',
      password: result.data?.password ?? '',
      message: 'Copy it somewhere safe. It will not be shown again unless you ask.',
    });
    setCurrentPassword('');
  }

  async function handleChange(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }

    setBusy(true);
    const result = await adminRequest<{ password?: string }>('/api/admin/password', {
      method: 'POST',
      body: {
        action: 'change',
        current_password: currentPassword,
        new_password: newPassword,
      },
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice('Your password has been changed. Every other signed-in session was signed out.');
    setReveal({
      status: 'showing',
      password: result.data?.password ?? newPassword,
      message: 'Copy your new password somewhere safe. It will not be shown again unless you ask.',
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function copy(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setNotice('Password copied to the clipboard.');
    } catch {
      setNotice('Select the password and copy it manually.');
    }
  }

  return (
    <fieldset className="admin-group admin-group--spaced">
      <legend className="admin-group__legend">Account and password</legend>
      <p className="admin-form__help">
        The password is stored as a hash, so it cannot be read from the
        database. A sealed copy is kept so you can view it here, and only after
        you confirm the current password.
      </p>

      {reveal.status === 'showing' && reveal.password ? (
        <div className="admin-secret">
          <p className="admin-secret__label">Your password</p>
          <p className="admin-secret__value">{reveal.password}</p>
          <div className="picker__actions">
            <button
              type="button"
              className="btn btn--text"
              onClick={() => copy(reveal.password ?? '')}
            >
              Copy password
            </button>
            <button
              type="button"
              className="btn btn--text"
              onClick={() => setReveal({ status: 'idle' })}
            >
              Hide
            </button>
          </div>
          <p className="admin-form__help">{reveal.message}</p>
        </div>
      ) : (
        <form onSubmit={handleReveal}>
          <div className="field">
            <label htmlFor="pw-current-reveal">Current password</label>
            <input
              id="pw-current-reveal"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="admin-actions-row" style={{ marginTop: 0 }}>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Checking…' : 'Show my password'}
            </button>
          </div>
        </form>
      )}

      <h3 className="admin-section__title" style={{ marginTop: '1.75rem' }}>
        Change password
      </h3>
      <form onSubmit={handleChange}>
        <div className="field">
          <label htmlFor="pw-current">Current password</label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="admin-repeat">
          <div className="field">
            <label htmlFor="pw-new">New password</label>
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pw-confirm">Repeat new password</label>
            <input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <p className="admin-form__help">
              At least 12 characters, with upper case, lower case, a number and
              a symbol.
            </p>
          </div>
          <div />
        </div>
        <div className="admin-actions-row">
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>

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
    </fieldset>
  );
}
