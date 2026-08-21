import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import pg from 'pg';
import {hmacHex, randomOpaqueToken, sha256, stableJson} from './portal-core.js';
import {runPortalMigrations} from './portal-migrations.js';

if (process.env.DEMO_LOCAL_ONLY !== 'true') throw new Error('portal:seed-dev is restricted to DEMO_LOCAL_ONLY=true');
const required = ['DATABASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'INVITATION_TOKEN_HMAC_SECRET'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const nda = JSON.parse(await readFile(resolve(root, 'data/admin/nda-v1.json'), 'utf8'));
nda.status = process.env.NDA_LEGAL_STATUS || nda.status;
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, max: 1});
try {
  await runPortalMigrations(pool, root);
  await pool.query(`INSERT INTO private_portal.admin_users(id,email,password_hash,role,status,mfa_enabled)
    VALUES($1,$2,$3,'OWNER','ACTIVE',false) ON CONFLICT ((lower(email))) DO UPDATE SET password_hash=excluded.password_hash`,
  [randomUUID(), process.env.ADMIN_EMAIL!.toLowerCase(), process.env.ADMIN_PASSWORD_HASH]);
  const adminId = (await pool.query('SELECT id FROM private_portal.admin_users WHERE lower(email)=lower($1)', [process.env.ADMIN_EMAIL])).rows[0].id;
  const contentHash = sha256(stableJson(nda));
  await pool.query(`INSERT INTO private_portal.nda_documents(id,version,title,legal_status,content,content_sha256,reaccept_required)
    VALUES($1,$2,$3,$4,$5,$6,true) ON CONFLICT(version) DO NOTHING`, [randomUUID(), nda.version, nda.title, nda.status, JSON.stringify(nda), contentHash]);
  const documentId = (await pool.query('SELECT id FROM private_portal.nda_documents WHERE version=$1', [nda.version])).rows[0].id;
  const rawToken = process.env.DEFAULT_INVITE_TOKEN || randomOpaqueToken();
  await pool.query(`INSERT INTO private_portal.invitations(id,public_id,token_hash,name,description,organisation_name,policy,nda_document_id,status,created_by,expires_at,max_registrations,metadata)
    VALUES($1,$2,$3,$4,$5,$6,'MULTI_VISITOR',$7,'ACTIVE',$8,now()+interval '180 days',10,$9) ON CONFLICT(token_hash) DO NOTHING`,
  [randomUUID(), `inv_${randomOpaqueToken(12)}`, hmacHex(rawToken, process.env.INVITATION_TOKEN_HMAC_SECRET!), 'New York 2026 local invitation', 'Local workflow test', 'UP AI DOWN local test', documentId, adminId, JSON.stringify({localSeed: true})]);
  console.log(JSON.stringify({seeded: true, invitationTokenSource: process.env.DEFAULT_INVITE_TOKEN ? 'ENVIRONMENT' : 'GENERATED_NOT_RETURNED'}, null, 2));
} finally {
  await pool.end();
}
