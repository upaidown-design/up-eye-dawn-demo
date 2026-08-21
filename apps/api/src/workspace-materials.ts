/**
 * workspace-materials.ts
 *
 * Fastify plugin: Material Registry endpoint group
 * Routes:
 *   GET    /api/v1/admin/materials             — list materials (all admin roles)
 *   GET    /api/v1/admin/materials/:id         — get single material (all roles)
 *   POST   /api/v1/admin/materials             — register material (OWNER/ADMIN/EDITOR)
 *   PATCH  /api/v1/admin/materials/:id         — update material (OWNER/ADMIN for status; EDITOR for metadata)
 *
 * Business rule enforced server-side:
 *   Materials with classification=REVIEW_REQUIRED cannot be set to status=DISTRIBUTED
 *   unless approvalNote is provided AND the caller has role OWNER or ADMIN.
 *   This mirrors the CHECK constraint in the database but provides a clear API error.
 *
 * All mutations are logged to private_portal.audit_events.
 */

import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {FastifyInstance} from 'fastify';
import {CreateMaterialBody, UpdateMaterialBody} from './workspace-schema.js';
import type {PortalAuditFn, PortalRequireAdminFn} from './private-access.js';

type RequireAdminFn = PortalRequireAdminFn;
type AuditFn = PortalAuditFn;

interface MaterialsPluginOptions {
  pool: pg.Pool;
  requireAdmin: RequireAdminFn;
  requireAdminMutation: RequireAdminFn;
  audit: AuditFn;
}

const WRITER_ROLES = ['OWNER', 'ADMIN', 'EDITOR'] as const;
const STATUS_CHANGE_ROLES = ['OWNER', 'ADMIN'] as const;

export function registerMaterialsRoutes(
  app: FastifyInstance,
  {pool, requireAdmin, requireAdminMutation, audit}: MaterialsPluginOptions,
) {
  // GET /api/v1/admin/materials
  app.get('/api/v1/admin/materials', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const query = request.query as {
      status?: string;
      classification?: string;
      materialType?: string;
      search?: string;
    };
    const search = `%${String(query.search ?? '').trim().toLowerCase()}%`;
    const status = query.status ?? '';
    const classification = query.classification ?? '';
    const materialType = query.materialType ?? '';

    return (await pool.query(
      `SELECT m.*,
              u.display_name AS owner_name,
              ab.display_name AS approved_by_name
       FROM private_portal.material_registry m
       LEFT JOIN private_portal.admin_users u ON u.id = m.owner_id
       LEFT JOIN private_portal.admin_users ab ON ab.id = m.approved_by
       WHERE ($1 = '%%' OR lower(m.title) LIKE $1 OR lower(m.provenance) LIKE $1)
         AND ($2 = '' OR m.status = $2)
         AND ($3 = '' OR m.classification = $3)
         AND ($4 = '' OR m.material_type = $4)
       ORDER BY m.updated_at DESC
       LIMIT 500`,
      [search, status, classification, materialType],
    )).rows;
  });

  // GET /api/v1/admin/materials/:id
  app.get('/api/v1/admin/materials/:id', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const id = (request.params as {id: string}).id;

    const row = (await pool.query(
      `SELECT m.*,
              u.display_name AS owner_name,
              ab.display_name AS approved_by_name,
              cr.display_name AS created_by_name,
              ur.display_name AS updated_by_name
       FROM private_portal.material_registry m
       LEFT JOIN private_portal.admin_users u ON u.id = m.owner_id
       LEFT JOIN private_portal.admin_users ab ON ab.id = m.approved_by
       LEFT JOIN private_portal.admin_users cr ON cr.id = m.created_by
       LEFT JOIN private_portal.admin_users ur ON ur.id = m.updated_by
       WHERE m.id = $1`,
      [id],
    )).rows[0];

    if (!row) return reply.code(404).send({error: 'NOT_FOUND'});
    return row;
  });

  // POST /api/v1/admin/materials
  app.post('/api/v1/admin/materials', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = CreateMaterialBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_MATERIAL', issues: parsed.error.flatten()});

    const input = parsed.data;
    const id = randomUUID();

    const result = await pool.query(
      `INSERT INTO private_portal.material_registry
         (id, title, material_type, version, language, classification, status,
          provenance, owner_id, gcs_object, external_url, notes, metadata, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,'DRAFT',$7,$8,$9,$10,$11,$12,$13,$13)
       RETURNING *`,
      [id, input.title, input.materialType, input.version, input.language, input.classification,
        input.provenance, input.ownerId ?? admin.admin_user_id,
        input.gcsObject ?? null, input.externalUrl ?? null,
        input.notes, JSON.stringify(input.metadata), admin.admin_user_id],
    );

    await audit('MATERIAL_CREATED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {materialId: id, title: input.title, classification: input.classification},
    );

    return reply.code(201).send(result.rows[0]);
  });

  // PATCH /api/v1/admin/materials/:id
  app.patch('/api/v1/admin/materials/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = UpdateMaterialBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_MATERIAL_UPDATE', issues: parsed.error.flatten()});

    const id = (request.params as {id: string}).id;
    const input = parsed.data;

    // Fetch current state to enforce business rules
    const current = (await pool.query(
      'SELECT classification, status FROM private_portal.material_registry WHERE id=$1',
      [id],
    )).rows[0];
    if (!current) return reply.code(404).send({error: 'NOT_FOUND'});

    // Rule: status changes require OWNER/ADMIN
    if (input.status && input.status !== current.status) {
      if (!STATUS_CHANGE_ROLES.includes(admin.role as typeof STATUS_CHANGE_ROLES[number])) {
        return reply.code(403).send({error: 'STATUS_CHANGE_REQUIRES_OWNER_OR_ADMIN'});
      }
    }

    // Rule: REVIEW_REQUIRED → DISTRIBUTED requires approvalNote
    const targetClassification = input.classification ?? current.classification;
    const targetStatus = input.status ?? current.status;
    if (targetClassification === 'REVIEW_REQUIRED' && targetStatus === 'DISTRIBUTED' && !input.approvalNote) {
      return reply.code(400).send({error: 'APPROVAL_NOTE_REQUIRED_FOR_DISTRIBUTION'});
    }

    const hasOwner = Object.hasOwn(input, 'ownerId');
    const hasGcs = Object.hasOwn(input, 'gcsObject');
    const hasExternalUrl = Object.hasOwn(input, 'externalUrl');
    const isBeingApproved = targetStatus === 'DISTRIBUTED' && current.status !== 'DISTRIBUTED';

    const result = await pool.query(
      `UPDATE private_portal.material_registry SET
         title           = COALESCE($2, title),
         material_type   = COALESCE($3, material_type),
         version         = COALESCE($4, version),
         language        = COALESCE($5, language),
         classification  = COALESCE($6, classification),
         provenance      = COALESCE($7, provenance),
         owner_id        = CASE WHEN $8 THEN $9::uuid ELSE owner_id END,
         gcs_object      = CASE WHEN $10 THEN $11 ELSE gcs_object END,
         external_url    = CASE WHEN $12 THEN $13 ELSE external_url END,
         status          = COALESCE($14, status),
         approval_note   = COALESCE($15, approval_note),
         approved_by     = CASE WHEN $16 THEN $17 ELSE approved_by END,
         approved_at     = CASE WHEN $16 THEN now() ELSE approved_at END,
         notes           = COALESCE($18, notes),
         metadata        = CASE WHEN $19::text IS NOT NULL THEN $19::jsonb ELSE metadata END,
         updated_by      = $20,
         updated_at      = now()
       WHERE id = $1
       RETURNING *`,
      [id,
        input.title ?? null, input.materialType ?? null, input.version ?? null, input.language ?? null,
        input.classification ?? null, input.provenance ?? null,
        hasOwner, input.ownerId ?? null,
        hasGcs, input.gcsObject ?? null,
        hasExternalUrl, input.externalUrl ?? null,
        input.status ?? null, input.approvalNote ?? null,
        isBeingApproved, admin.admin_user_id,
        input.notes ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        admin.admin_user_id],
    );

    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});

    await audit('MATERIAL_UPDATED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {materialId: id, changed: Object.keys(input), newStatus: input.status ?? current.status},
    );

    return result.rows[0];
  });
}
