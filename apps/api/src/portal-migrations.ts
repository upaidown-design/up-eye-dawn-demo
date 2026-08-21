import {readdir, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type pg from 'pg';

export async function runPortalMigrations(pool: pg.Pool, root: string) {
  await pool.query('CREATE SCHEMA IF NOT EXISTS private_portal');
  await pool.query(`CREATE TABLE IF NOT EXISTS private_portal.schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const directory = resolve(root, 'infra/migrations');
  const files = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of files) {
    const existing = await pool.query('SELECT 1 FROM private_portal.schema_migrations WHERE version=$1', [file]);
    if (existing.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(await readFile(resolve(directory, file), 'utf8'));
      await client.query('INSERT INTO private_portal.schema_migrations(version) VALUES($1)', [file]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
