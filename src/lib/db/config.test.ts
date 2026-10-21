import { describe, it, expect } from 'vitest';
import {
  DatabaseConfigurationError,
  describeConnection,
  readDatabaseConfig,
} from './config';
import { isSafeStorageKey, assetPublicUrl, storageDriver } from '../storage';

describe('database configuration', () => {
  it('requires DATABASE_URL', () => {
    expect(() => readDatabaseConfig({} as Record<string, string | undefined>)).toThrow(
      DatabaseConfigurationError
    );
  });

  it('refuses a file path rather than opening an empty SQLite database', () => {
    expect(() =>
      readDatabaseConfig({ DATABASE_URL: 'data/app.db' } as Record<string, string | undefined>)
    ).toThrow(/PostgreSQL connection string/);
  });

  it('reads a PostgreSQL connection string', () => {
    const config = readDatabaseConfig({
      DATABASE_URL:
        'postgresql://postgres.abc:secret@db.project.supabase.co:5432/postgres?sslmode=require',
    } as Record<string, string | undefined>);
    expect(config.pooled).toBe(false);
    expect(config.ssl).toBe(true);
    expect(config.maxConnections).toBeGreaterThan(0);
  });

  it('recognises a pooled endpoint', () => {
    const config = readDatabaseConfig({
      DATABASE_URL:
        'postgresql://postgres.abc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    } as Record<string, string | undefined>);
    expect(config.pooled).toBe(true);
  });

  it('allows SSL to be turned off for a local server', () => {
    const config = readDatabaseConfig({
      DATABASE_URL: 'postgresql://postgres@127.0.0.1:5432/portfolio?sslmode=disable',
    } as Record<string, string | undefined>);
    expect(config.ssl).toBe(false);
  });

  it('never describes a connection with its credentials', () => {
    const described = describeConnection(
      'postgresql://postgres.abc:supersecret@db.project.supabase.co:5432/postgres'
    );
    expect(described).not.toContain('supersecret');
    expect(described).toContain('db.project.supabase.co');
    expect(described).toContain('postgres');
  });
});

describe('storage', () => {
  it('falls back to the filesystem when nothing else is configured', () => {
    expect(storageDriver()).toBe('filesystem');
  });

  it('refuses an unsafe storage key', () => {
    expect(isSafeStorageKey('profile/abc123.png')).toBe(true);
    expect(isSafeStorageKey('../../etc/passwd')).toBe(false);
    expect(isSafeStorageKey('/absolute.png')).toBe(false);
  });

  it('builds a public path rather than a filesystem path', () => {
    const url = assetPublicUrl('profile/abc123.png');
    expect(url).toBe('/api/media/profile/abc123.png');
    expect(url).not.toContain('/home/');
  });
});
