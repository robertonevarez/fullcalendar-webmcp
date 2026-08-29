/**
 * Minimal SQL migration runner.
 * Uses DATABASE_MIGRATE_URL when set (PlanetScale direct port 5432 recommended for DDL),
 * otherwise DATABASE_URL.
 */
import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import { Client } from 'pg';

loadEnvConfig(process.cwd());

function migrationConnectionString(): string {
  const url = process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL (or DATABASE_MIGRATE_URL) is required to run migrations.');
  }
  return url;
}

export async function runMigrations(targetConnectionString?: string) {
  const connectionString = targetConnectionString ?? migrationConnectionString();
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? undefined
      : { rejectUnauthorized: true },
  });

  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const dir = path.join(process.cwd(), 'db', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const id = file;
    const existing = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', [id]);
    if (existing.rowCount) {
      continue;
    }

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  await client.end();
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(() => {
      console.log('migrations complete');
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
