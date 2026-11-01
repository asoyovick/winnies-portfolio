/**
 * Database configuration.
 *
 * The application talks to PostgreSQL. The connection is configured with a
 * single DATABASE_URL. A file path is refused rather than quietly opening an
 * empty SQLite file, so a production deployment can never start against a
 * blank database by accident.
 */

export const DATABASE_ENV_VAR = 'DATABASE_URL';

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigurationError';
  }
}

export type DatabaseConfig = {
  connectionString: string;
  /** True when the URL points at a pooled endpoint (Supavisor, PgBouncer). */
  pooled: boolean;
  maxConnections: number;
  ssl: boolean;
};

function isPostgresUrl(value: string): boolean {
  return value.startsWith('postgres://') || value.startsWith('postgresql://');
}

/**
 * Removes the SSL parameters that `pg` reads out of the connection string.
 *
 * `pg` parses `sslmode` from the URL and lets it override the explicit `ssl`
 * option passed to the pool. In current versions of `pg-connection-string`
 * `sslmode=require` means "verify the full certificate chain", which a pooler
 * with a self-signed certificate (Supabase's Supavisor) cannot satisfy. SSL is
 * still turned on by the `ssl` option in postgres.ts; only the URL parameter is
 * dropped so it cannot override that option.
 */
function withoutSslParameters(connectionString: string): string {
  const queryIndex = connectionString.indexOf('?');
  if (queryIndex === -1) return connectionString;

  const base = connectionString.slice(0, queryIndex);
  const kept = connectionString
    .slice(queryIndex + 1)
    .split('&')
    .filter((param) => param && !/^(sslmode|ssl|uselibpqcompat)=/i.test(param));

  return kept.length > 0 ? `${base}?${kept.join('&')}` : base;
}

export function readDatabaseConfig(
  env: Record<string, string | undefined> = process.env
): DatabaseConfig {
  const raw = (env[DATABASE_ENV_VAR] ?? '').trim();

  if (!raw) {
    throw new DatabaseConfigurationError(
      `${DATABASE_ENV_VAR} is not set. Point it at the PostgreSQL database, for example ` +
        `postgresql://user:password@host:5432/database?sslmode=require`
    );
  }

  if (!isPostgresUrl(raw)) {
    throw new DatabaseConfigurationError(
      `${DATABASE_ENV_VAR} must be a PostgreSQL connection string. ` +
        `This application does not fall back to a local SQLite file.`
    );
  }

  // Supavisor's transaction pooler uses port 6543; the session pooler 5432.
  const pooled = /:6543\//.test(raw) || /pooler\./.test(raw);

  const sslMode = /[?&]sslmode=([a-z]+)/i.exec(raw)?.[1]?.toLowerCase();
  // Managed databases (Supabase, Render) expect SSL. A local server can turn
  // it off with sslmode=disable.
  const ssl = sslMode !== 'disable' && sslMode !== 'allow';

  const maxConnections = Number(env.DATABASE_POOL_SIZE ?? (pooled ? 10 : 5));

  return {
    connectionString: withoutSslParameters(raw),
    pooled,
    maxConnections: Number.isFinite(maxConnections) && maxConnections > 0 ? maxConnections : 5,
    ssl,
  };
}

/** Strips credentials out of a connection string for safe logging. */
export function describeConnection(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const host = url.hostname || 'unknown';
    const port = url.port ? `:${url.port}` : '';
    const database = url.pathname.replace(/^\//, '') || 'postgres';
    return `${host}${port}/${database}`;
  } catch {
    return 'configured';
  }
}
