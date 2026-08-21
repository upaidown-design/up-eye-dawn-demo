/**
 * workspace-crm.ts
 *
 * Fastify plugin: Investor CRM endpoint group
 * Routes:
 *   GET    /api/v1/admin/crm/organisations                — list orgs (all admin roles)
 *   POST   /api/v1/admin/crm/organisations                — create org (OWNER/ADMIN/EDITOR)
 *   PATCH  /api/v1/admin/crm/organisations/:id            — update org (OWNER/ADMIN/EDITOR)
 *   GET    /api/v1/admin/crm/organisations/:id            — get org with contacts (all roles)
 *   GET    /api/v1/admin/crm/contacts                     — list all contacts (all roles)
 *   POST   /api/v1/admin/crm/contacts                     — create contact (OWNER/ADMIN/EDITOR)
 *   PATCH  /api/v1/admin/crm/contacts/:id                 — update contact (OWNER/ADMIN/EDITOR)
 *
 * RBAC: VIEWER and EDITOR have read access. OWNER/ADMIN/EDITOR may write.
 * All mutations are logged to private_portal.audit_events.
 */

import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {FastifyInstance} from 'fastify';
import {
  CreateCrmOrganisationBody,
  UpdateCrmOrganisationBody,
  CreateCrmContactBody,
  UpdateCrmContactBody,
} from './workspace-schema.js';
import type {PortalAuditFn, PortalRequireAdminFn} from './private-access.js';

type RequireAdminFn = PortalRequireAdminFn;
type AuditFn = PortalAuditFn;

interface CrmPluginOptions {
  pool: pg.Pool;
  requireAdmin: RequireAdminFn;
  requireAdminMutation: RequireAdminFn;
  audit: AuditFn;
}

const WRITER_ROLES = ['OWNER', 'ADMIN', 'EDITOR'] as const;

export function registerCrmRoutes(
  app: FastifyInstance,
  {pool, requireAdmin, requireAdminMutation, audit}: CrmPluginOptions,
) {
  // ── Organisations ───────────────────────────────────────────────────────────

  // GET /api/v1/admin/crm/organisations
  app.get('/api/v1/admin/crm/organisations', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const query = request.query as {stage?: string; status?: string; search?: string};
    const search = `%${String(query.search ?? '').trim().toLowerCase()}%`;
    const stage = query.stage ?? '';
    const status = query.status ?? 'ACTIVE';

    return (await pool.query(
      `SELECT o.*,
              u.display_name AS owner_name,
              COUNT(c.id)::int AS contact_count
       FROM private_portal.crm_organisations o
       LEFT JOIN private_portal.admin_users u ON u.id = o.owner_id
       LEFT JOIN private_portal.crm_contacts c ON c.organisation_id = o.id AND c.status = 'ACTIVE'
       WHERE ($1 = '%%' OR lower(o.name) LIKE $1 OR lower(o.country) LIKE $1 OR lower(o.notes) LIKE $1)
         AND ($2 = '' OR o.stage = $2)
         AND ($3 = '' OR o.status = $3)
       GROUP BY o.id, u.display_name
       ORDER BY CASE o.stage
         WHEN 'DILIGENCE' THEN 1 WHEN 'TERM_SHEET' THEN 2 WHEN 'MEETING' THEN 3
         WHEN 'INTRO' THEN 4 WHEN 'PROSPECT' THEN 5 ELSE 6 END, o.updated_at DESC
       LIMIT 200`,
      [search, stage, status],
    )).rows;
  });

  // GET /api/v1/admin/crm/organisations/:id
  app.get('/api/v1/admin/crm/organisations/:id', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const id = (request.params as {id: string}).id;

    const [org, contacts] = await Promise.all([
      pool.query(
        `SELECT o.*, u.display_name AS owner_name
         FROM private_portal.crm_organisations o
         LEFT JOIN private_portal.admin_users u ON u.id = o.owner_id
         WHERE o.id = $1`,
        [id],
      ),
      pool.query(
        `SELECT c.*, v.full_name AS visitor_name, v.email AS visitor_email
         FROM private_portal.crm_contacts c
         LEFT JOIN private_portal.visitors v ON v.id = c.visitor_id
         WHERE c.organisation_id = $1
         ORDER BY c.is_primary DESC, c.created_at ASC`,
        [id],
      ),
    ]);

    if (!org.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});
    return {...org.rows[0], contacts: contacts.rows};
  });

  // POST /api/v1/admin/crm/organisations
  app.post('/api/v1/admin/crm/organisations', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = CreateCrmOrganisationBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_CRM_ORGANISATION', issues: parsed.error.flatten()});

    const input = parsed.data;
    const id = randomUUID();

    const result = await pool.query(
      `INSERT INTO private_portal.crm_organisations
         (id, name, org_type, country, stage, owner_id, last_interaction_at,
          next_action, next_action_at, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
       RETURNING *`,
      [id, input.name, input.orgType, input.country, input.stage,
        input.ownerId ?? admin.admin_user_id,
        input.lastInteractionAt ? new Date(input.lastInteractionAt) : null,
        input.nextAction, input.nextActionAt ? new Date(input.nextActionAt) : null,
        input.notes, admin.admin_user_id],
    );

    await audit('CRM_ORGANISATION_CREATED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {orgId: id, name: input.name, stage: input.stage},
    );

    return reply.code(201).send(result.rows[0]);
  });

  // PATCH /api/v1/admin/crm/organisations/:id
  app.patch('/api/v1/admin/crm/organisations/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = UpdateCrmOrganisationBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_CRM_ORGANISATION_UPDATE', issues: parsed.error.flatten()});

    const id = (request.params as {id: string}).id;
    const input = parsed.data;
    const hasOwner = Object.hasOwn(input, 'ownerId');
    const hasLastInteraction = Object.hasOwn(input, 'lastInteractionAt');
    const hasNextActionAt = Object.hasOwn(input, 'nextActionAt');

    const result = await pool.query(
      `UPDATE private_portal.crm_organisations SET
         name                 = COALESCE($2, name),
         org_type             = COALESCE($3, org_type),
         country              = COALESCE($4, country),
         stage                = COALESCE($5, stage),
         owner_id             = CASE WHEN $6 THEN $7::uuid ELSE owner_id END,
         last_interaction_at  = CASE WHEN $8 THEN $9 ELSE last_interaction_at END,
         next_action          = COALESCE($10, next_action),
         next_action_at       = CASE WHEN $11 THEN $12 ELSE next_action_at END,
         notes                = COALESCE($13, notes),
         status               = COALESCE($14, status),
         updated_by           = $15,
         updated_at           = now()
       WHERE id = $1
       RETURNING *`,
      [id, input.name ?? null, input.orgType ?? null, input.country ?? null, input.stage ?? null,
        hasOwner, input.ownerId ?? null,
        hasLastInteraction, input.lastInteractionAt ? new Date(input.lastInteractionAt) : null,
        input.nextAction ?? null,
        hasNextActionAt, input.nextActionAt ? new Date(input.nextActionAt) : null,
        input.notes ?? null, input.status ?? null, admin.admin_user_id],
    );

    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});

    await audit('CRM_ORGANISATION_UPDATED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {orgId: id, changed: Object.keys(input)},
    );

    return result.rows[0];
  });

  // ── Contacts ────────────────────────────────────────────────────────────────

  // GET /api/v1/admin/crm/contacts
  app.get('/api/v1/admin/crm/contacts', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const query = request.query as {organisationId?: string; search?: string; status?: string};
    const search = `%${String(query.search ?? '').trim().toLowerCase()}%`;
    const orgId = query.organisationId ?? null;
    const status = query.status ?? 'ACTIVE';

    return (await pool.query(
      `SELECT c.*, o.name AS organisation_name, o.stage AS organisation_stage,
              v.full_name AS visitor_name
       FROM private_portal.crm_contacts c
       JOIN private_portal.crm_organisations o ON o.id = c.organisation_id
       LEFT JOIN private_portal.visitors v ON v.id = c.visitor_id
       WHERE ($1 = '%%' OR lower(c.first_name || ' ' || c.last_name) LIKE $1 OR lower(c.email) LIKE $1)
         AND ($2::uuid IS NULL OR c.organisation_id = $2::uuid)
         AND ($3 = '' OR c.status = $3)
       ORDER BY c.is_primary DESC, c.last_name ASC, c.first_name ASC
       LIMIT 500`,
      [search, orgId, status],
    )).rows;
  });

  // POST /api/v1/admin/crm/contacts
  app.post('/api/v1/admin/crm/contacts', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = CreateCrmContactBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_CRM_CONTACT', issues: parsed.error.flatten()});

    const input = parsed.data;

    // Verify organisation exists
    const orgCheck = await pool.query('SELECT id FROM private_portal.crm_organisations WHERE id=$1 AND status=\'ACTIVE\'', [input.organisationId]);
    if (!orgCheck.rowCount) return reply.code(400).send({error: 'ORGANISATION_NOT_FOUND'});

    const id = randomUUID();

    const result = await pool.query(
      `INSERT INTO private_portal.crm_contacts
         (id, organisation_id, visitor_id, first_name, last_name, email,
          role_title, phone, is_primary, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
       RETURNING *`,
      [id, input.organisationId, input.visitorId ?? null, input.firstName, input.lastName,
        input.email, input.roleTitle, input.phone, input.isPrimary, input.notes, admin.admin_user_id],
    );

    await audit('CRM_CONTACT_CREATED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {contactId: id, orgId: input.organisationId},
    );

    return reply.code(201).send(result.rows[0]);
  });

  // PATCH /api/v1/admin/crm/contacts/:id
  app.patch('/api/v1/admin/crm/contacts/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = UpdateCrmContactBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_CRM_CONTACT_UPDATE', issues: parsed.error.flatten()});

    const id = (request.params as {id: string}).id;
    const input = parsed.data;
    const hasVisitor = Object.hasOwn(input, 'visitorId');
    const hasPrimary = Object.hasOwn(input, 'isPrimary');

    const result = await pool.query(
      `UPDATE private_portal.crm_contacts SET
         first_name  = COALESCE($2, first_name),
         last_name   = COALESCE($3, last_name),
         email       = COALESCE($4, email),
         role_title  = COALESCE($5, role_title),
         phone       = COALESCE($6, phone),
         is_primary  = CASE WHEN $7 THEN $8 ELSE is_primary END,
         notes       = COALESCE($9, notes),
         status      = COALESCE($10, status),
         visitor_id  = CASE WHEN $11 THEN $12::uuid ELSE visitor_id END,
         updated_by  = $13,
         updated_at  = now()
       WHERE id = $1
       RETURNING *`,
      [id, input.firstName ?? null, input.lastName ?? null, input.email ?? null,
        input.roleTitle ?? null, input.phone ?? null,
        hasPrimary, input.isPrimary ?? false,
        input.notes ?? null, input.status ?? null,
        hasVisitor, input.visitorId ?? null,
        admin.admin_user_id],
    );

    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});

    await audit('CRM_CONTACT_UPDATED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {contactId: id, changed: Object.keys(input)},
    );

    return result.rows[0];
  });
}
