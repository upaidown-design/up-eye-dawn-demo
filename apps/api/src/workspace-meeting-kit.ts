/**
 * workspace-meeting-kit.ts
 *
 * Fastify plugin: Meeting Kit endpoint group
 * Routes:
 *   GET    /api/v1/admin/meeting-kit           — list items (all admin roles)
 *   POST   /api/v1/admin/meeting-kit           — create item (OWNER/ADMIN/EDITOR)
 *   PATCH  /api/v1/admin/meeting-kit/:id       — edit item (OWNER/ADMIN/EDITOR)
 *   POST   /api/v1/admin/meeting-kit/:id/reorder — change sort_order (OWNER/ADMIN/EDITOR)
 *   POST   /api/v1/admin/meeting-kit/:id/archive — archive item (OWNER/ADMIN)
 *
 * Security: all routes require a valid admin session via requireAdmin / requireAdminMutation.
 * Body content is stored as plain text only; HTML is not accepted.
 * All mutations are logged to private_portal.audit_events.
 */

import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {FastifyInstance} from 'fastify';
import {
  CreateMeetingKitItemBody,
  UpdateMeetingKitItemBody,
  ReorderMeetingKitItemBody,
} from './workspace-schema.js';
import type {PortalAuditFn, PortalRequireAdminFn} from './private-access.js';

type RequireAdminFn = PortalRequireAdminFn;
type RequireAdminMutationFn = PortalRequireAdminFn;
type AuditFn = PortalAuditFn;

interface MeetingKitPluginOptions {
  pool: pg.Pool;
  requireAdmin: RequireAdminFn;
  requireAdminMutation: RequireAdminMutationFn;
  audit: AuditFn;
}

const WRITER_ROLES = ['OWNER', 'ADMIN', 'EDITOR'] as const;
const ARCHIVER_ROLES = ['OWNER', 'ADMIN'] as const;

export function registerMeetingKitRoutes(
  app: FastifyInstance,
  {pool, requireAdmin, requireAdminMutation, audit}: MeetingKitPluginOptions,
) {
  // GET /api/v1/admin/meeting-kit
  // Returns all non-archived items ordered by sort_order ASC.
  // Query: ?includeArchived=true to include ARCHIVED items (OWNER/ADMIN only).
  app.get('/api/v1/admin/meeting-kit', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const query = request.query as {includeArchived?: string; linkedEventId?: string};
    const includeArchived = query.includeArchived === 'true' && ['OWNER', 'ADMIN'].includes(admin.role);
    const linkedEventId = query.linkedEventId ?? null;

    const rows = (await pool.query(
      `SELECT mki.*,
              au.display_name AS created_by_name,
              uu.display_name AS updated_by_name
       FROM private_portal.meeting_kit_items mki
       LEFT JOIN private_portal.admin_users au ON au.id = mki.created_by
       LEFT JOIN private_portal.admin_users uu ON uu.id = mki.updated_by
       WHERE ($1 OR mki.status = 'ACTIVE')
         AND ($2::uuid IS NULL OR mki.linked_event_id = $2::uuid)
       ORDER BY mki.sort_order ASC, mki.created_at ASC`,
      [includeArchived, linkedEventId],
    )).rows;

    return rows;
  });

  // POST /api/v1/admin/meeting-kit
  app.post('/api/v1/admin/meeting-kit', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = CreateMeetingKitItemBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_MEETING_KIT_ITEM', issues: parsed.error.flatten()});

    const input = parsed.data;
    const id = randomUUID();

    const result = await pool.query(
      `INSERT INTO private_portal.meeting_kit_items
         (id, item_type, language, title, body, classification, sort_order, linked_event_id, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
       RETURNING *`,
      [id, input.itemType, input.language, input.title, input.body, input.classification, input.sortOrder, input.linkedEventId ?? null, admin.admin_user_id],
    );

    await audit('MEETING_KIT_ITEM_CREATED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {itemId: id, itemType: input.itemType, classification: input.classification},
    );

    return reply.code(201).send(result.rows[0]);
  });

  // PATCH /api/v1/admin/meeting-kit/:id
  app.patch('/api/v1/admin/meeting-kit/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = UpdateMeetingKitItemBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_MEETING_KIT_UPDATE', issues: parsed.error.flatten()});

    const id = (request.params as {id: string}).id;
    const input = parsed.data;
    const hasLinkedEvent = Object.hasOwn(input, 'linkedEventId');

    const result = await pool.query(
      `UPDATE private_portal.meeting_kit_items SET
         item_type       = COALESCE($2, item_type),
         language        = COALESCE($3, language),
         title           = COALESCE($4, title),
         body            = COALESCE($5, body),
         classification  = COALESCE($6, classification),
         status          = COALESCE($7, status),
         linked_event_id = CASE WHEN $8 THEN $9::uuid ELSE linked_event_id END,
         updated_by      = $10,
         updated_at      = now()
       WHERE id = $1 AND status <> 'ARCHIVED'
       RETURNING *`,
      [id, input.itemType ?? null, input.language ?? null, input.title ?? null, input.body ?? null,
        input.classification ?? null, input.status ?? null, hasLinkedEvent, input.linkedEventId ?? null, admin.admin_user_id],
    );

    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});

    await audit('MEETING_KIT_ITEM_UPDATED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {itemId: id, changed: Object.keys(input)},
    );

    return result.rows[0];
  });

  // POST /api/v1/admin/meeting-kit/:id/reorder
  // Moves an item to a new sort_order position.
  app.post('/api/v1/admin/meeting-kit/:id/reorder', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...WRITER_ROLES]);
    if (!admin) return;

    const parsed = ReorderMeetingKitItemBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: 'INVALID_SORT_ORDER', issues: parsed.error.flatten()});

    const id = (request.params as {id: string}).id;

    const result = await pool.query(
      `UPDATE private_portal.meeting_kit_items
       SET sort_order = $2, updated_by = $3, updated_at = now()
       WHERE id = $1 AND status = 'ACTIVE'
       RETURNING id, sort_order`,
      [id, parsed.data.sortOrder, admin.admin_user_id],
    );

    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});

    await audit('MEETING_KIT_ITEM_REORDERED', 'INFO', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {itemId: id, sortOrder: parsed.data.sortOrder},
    );

    return {reordered: true, sortOrder: result.rows[0].sort_order};
  });

  // POST /api/v1/admin/meeting-kit/:id/archive
  app.post('/api/v1/admin/meeting-kit/:id/archive', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [...ARCHIVER_ROLES]);
    if (!admin) return;

    const id = (request.params as {id: string}).id;

    const result = await pool.query(
      `UPDATE private_portal.meeting_kit_items
       SET status = 'ARCHIVED', updated_by = $2, updated_at = now()
       WHERE id = $1 AND status = 'ACTIVE'
       RETURNING id`,
      [id, admin.admin_user_id],
    );

    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});

    await audit('MEETING_KIT_ITEM_ARCHIVED', 'NOTICE', 'ADMIN', request,
      {actorId: admin.admin_user_id, adminId: admin.admin_user_id},
      {itemId: id},
    );

    return {archived: true};
  });
}
