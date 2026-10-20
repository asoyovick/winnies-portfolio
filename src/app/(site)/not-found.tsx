import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page wrap section">
      <h1 className="section__head">Page not found</h1>
      <p>
        The page you asked for is not here. It may have been moved, or it may
        never have been published.
      </p>
      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/">Back to the homepage</Link>
      </p>
    </div>
  );
}
