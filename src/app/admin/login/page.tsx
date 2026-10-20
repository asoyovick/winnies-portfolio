'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminRequest, refreshCsrfToken } from '@/lib/admin-client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'logout') {
      void adminRequest('/api/auth/logout', { method: 'POST' }).then(() => {
        document.cookie = 'portfolio_session=; Max-Age=0; path=/';
        document.cookie = 'portfolio_csrf=; Max-Age=0; path=/';
        router.push('/admin/login');
        router.refresh();
      });
    }
  }, [searchParams, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await refreshCsrfToken();
      const result = await adminRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (!result.ok) {
        setError(result.error || 'Invalid email or password.');
        setLoading(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Could not sign in. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login__header">
        <div className="admin-login__mark" aria-hidden="true">
          WA
        </div>
        <div>
          <h1 className="admin-login__title">Sign in</h1>
          <p className="admin-login__subtitle">Portfolio administration</p>
        </div>
      </div>
      {error ? (
        <p className="admin-login__error" role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="admin-login__note">
        The administrator account is created once, on the server. If you have
        forgotten the password, ask whoever runs the site to reset it.
      </p>
    </div>
  );
}
