import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import pg from 'pg';
import {runPortalMigrations} from './portal-migrations.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const pool = new pg.Pool({connectionString: databaseUrl, max: 1});
try {
  await runPortalMigrations(pool, root);
  const result = await pool.query('SELECT version,applied_at FROM private_portal.schema_migrations ORDER BY version');
  console.log(JSON.stringify({migrated: true, versions: result.rows}, null, 2));
} finally {
  await pool.end();
}
