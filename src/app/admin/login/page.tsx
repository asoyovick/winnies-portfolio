'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  useEffect(() => {
    if (searchParams.get('action') === 'logout') {
      fetch('/api/auth/logout', { method: 'POST' }).then(() => {
        document.cookie = 'portfolio_session=; Max-Age=0; path=/';
        document.cookie = 'portfolio_csrf=; Max-Age=0; path=/';
        router.push('/admin/login');
      });
    }
  }, [searchParams, router]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Read the csrf cookie value set by /api/auth/csrf.
      const cookieMatch = document.cookie.match(
        /(?:^|; )portfolio_csrf=([^;]+)/
      );
      const token = (cookieMatch && cookieMatch[1]) || '';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `portfolio_csrf=${token}`,
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Invalid email or password.');
        setLoading(false);
        return;
      }
      router.push(redirectTo);
    } catch {
      setError('Could not sign in. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login__card">
        <div className="admin-login__header">
          <div className="admin-login__mark">WAO</div>
          <h1 className="admin-login__title">Sign in</h1>
          <p className="admin-login__subtitle">
            Administrator area — Winnie Awuor Otieno's portfolio
          </p>
        </div>
        {error && (
          <p className="admin-login__error" role="alert">
            {error}
          </p>
        )}
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
          First time? Create the administrator account with the{' '}
          <code>setup-admin</code> script or the protected setup endpoint.
        </p>
      </div>
    </div>
  );
}
