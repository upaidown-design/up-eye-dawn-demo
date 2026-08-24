import { createHash, randomUUID } from "node:crypto";
import type pg from "pg";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PortalAuditFn, PortalRequireAdminFn } from "./private-access.js";

const LegalStatus = z.enum([
  "DRAFT_FOR_WORKFLOW_TESTING",
  "LEGAL_REVIEW",
  "APPROVED",
  "RETIRED",
]);
const Jurisdiction = z.enum(["EU_EEA", "UNITED_STATES", "UNSPECIFIED"]);
const Purpose = z.enum([
  "GENERAL_INVESTOR",
  "MUTUAL",
  "ONE_WAY",
  "TECHNICAL_DILIGENCE",
  "FINANCIAL_DILIGENCE",
  "STRATEGIC_PARTNER",
  "PILOT_CUSTOMER",
  "CUSTOM",
]);
const SpanishTranslation = z.object({
  title: z.string().trim().min(3).max(240),
  notice: z.string().trim().min(3).max(1000),
  paragraphs: z.array(z.string().trim().min(1).max(20_000)).min(1).max(100),
});
const DocumentBody = z.object({
  version: z.string().trim().min(2).max(100),
  title: z.string().trim().min(3).max(240),
  jurisdiction: Jurisdiction.default("UNSPECIFIED"),
  governingLaw: z.string().trim().min(3).max(300),
  signatureProfile: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .default("SIMPLE_ELECTRONIC_SIGNATURE_WORKFLOW"),
  purpose: Purpose.default("GENERAL_INVESTOR"),
  disclosingParty: z.string().trim().min(2).max(300),
  notice: z.string().trim().min(3).max(1000),
  paragraphs: z.array(z.string().trim().min(1).max(20_000)).min(1).max(100),
  translations: z.object({ es: SpanishTranslation.optional() }).optional(),
  changeNote: z.string().trim().max(1000).default(""),
});
const UpdateBody = DocumentBody.omit({ version: true })
  .partial()
  .extend({ changeNote: z.string().trim().min(3).max(1000) });
const CloneBody = z.object({
  version: z.string().trim().min(2).max(100),
  title: z.string().trim().min(3).max(240).optional(),
  purpose: Purpose.optional(),
  changeNote: z.string().trim().min(3).max(1000),
});
const StatusBody = z.object({
  status: LegalStatus,
  changeNote: z.string().trim().min(3).max(1000),
  approvalConfirmed: z.boolean().default(false),
  counselReference: z.string().trim().max(500).default(""),
});

export function ndaContentHash(content: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(content, Object.keys(content as object).sort()))
    .digest("hex");
}

export function isNdaTransitionAllowed(current: string, next: string) {
  return (
    (
      {
        DRAFT_FOR_WORKFLOW_TESTING: ["LEGAL_REVIEW"],
        LEGAL_REVIEW: ["DRAFT_FOR_WORKFLOW_TESTING", "APPROVED"],
        APPROVED: ["RETIRED"],
        RETIRED: [],
      } as Record<string, string[]>
    )[current]?.includes(next) ?? false
  );
}

type Options = {
  pool: pg.Pool;
  requireAdmin: PortalRequireAdminFn;
  requireAdminMutation: PortalRequireAdminFn;
  audit: PortalAuditFn;
};

function contentFrom(
  input: z.infer<typeof DocumentBody>,
  status: z.infer<typeof LegalStatus>,
) {
  return {
    version: input.version,
    status,
    jurisdiction: input.jurisdiction,
    governingLaw: input.governingLaw,
    signatureProfile: input.signatureProfile,
    title: input.title,
    disclosingParty: input.disclosingParty,
    notice: input.notice,
    paragraphs: input.paragraphs,
    ...(input.translations ? { translations: input.translations } : {}),
  };
}

async function snapshotRevision(
  client: pg.Pool | pg.PoolClient,
  id: string,
  adminId: string,
  note: string,
) {
  await client.query(
    `INSERT INTO private_portal.nda_document_revisions
    (id,nda_document_id,revision_number,title,legal_status,jurisdiction,governing_law,signature_profile,purpose,content,content_sha256,change_note,created_by)
    SELECT $1,d.id,COALESCE((SELECT max(r.revision_number)+1 FROM private_portal.nda_document_revisions r WHERE r.nda_document_id=d.id),1),
      d.title,d.legal_status,d.jurisdiction,d.governing_law,d.signature_profile,d.purpose,d.content,d.content_sha256,$3,$2
    FROM private_portal.nda_documents d WHERE d.id=$4`,
    [randomUUID(), adminId, note, id],
  );
}

export function registerNdaAuthoringRoutes(
  app: FastifyInstance,
  { pool, requireAdmin, requireAdminMutation, audit }: Options,
) {
  app.get("/api/v1/admin/nda-documents", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return (
      await pool.query(`SELECT d.id,d.version,d.title,d.legal_status,d.jurisdiction,d.governing_law,d.signature_profile,d.purpose,d.source_kind,d.content_sha256,d.created_at,d.updated_at,d.approved_at,d.published_at,
      count(DISTINCT a.id)::int acceptance_count,count(DISTINCT i.id)::int invitation_count,
      COALESCE((SELECT max(r.revision_number) FROM private_portal.nda_document_revisions r WHERE r.nda_document_id=d.id),0)::int revision_number
      FROM private_portal.nda_documents d LEFT JOIN private_portal.nda_acceptances a ON a.nda_document_id=d.id LEFT JOIN private_portal.invitations i ON i.nda_document_id=d.id
      GROUP BY d.id ORDER BY d.updated_at DESC,d.version`)
    ).rows;
  });

  app.get("/api/v1/admin/nda-documents/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const id = (request.params as { id: string }).id;
    const [document, revisions] = await Promise.all([
      pool.query(
        `SELECT d.*,count(DISTINCT a.id)::int acceptance_count,count(DISTINCT i.id)::int invitation_count FROM private_portal.nda_documents d LEFT JOIN private_portal.nda_acceptances a ON a.nda_document_id=d.id LEFT JOIN private_portal.invitations i ON i.nda_document_id=d.id WHERE d.id=$1 GROUP BY d.id`,
        [id],
      ),
      pool.query(
        "SELECT id,revision_number,legal_status,content_sha256,change_note,created_at FROM private_portal.nda_document_revisions WHERE nda_document_id=$1 ORDER BY revision_number DESC",
        [id],
      ),
    ]);
    if (!document.rowCount) return reply.code(404).send({ error: "NOT_FOUND" });
    return { ...document.rows[0], revisions: revisions.rows };
  });

  app.post("/api/v1/admin/nda-documents", async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [
      "OWNER",
      "ADMIN",
    ]);
    if (!admin) return;
    const parsed = DocumentBody.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({
          error: "INVALID_NDA_DOCUMENT",
          issues: parsed.error.flatten(),
        });
    const input = parsed.data;
    const id = randomUUID();
    const status = "DRAFT_FOR_WORKFLOW_TESTING" as const;
    const content = contentFrom(input, status);
    const hash = ndaContentHash(content);
    try {
      await pool.query(
        `INSERT INTO private_portal.nda_documents(id,version,title,legal_status,jurisdiction,governing_law,signature_profile,purpose,source_kind,content,content_sha256,reaccept_required,metadata,updated_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'EDITOR',$9,$10,true,$11,$12)`,
        [
          id,
          input.version,
          input.title,
          status,
          input.jurisdiction,
          input.governingLaw,
          input.signatureProfile,
          input.purpose,
          JSON.stringify(content),
          hash,
          JSON.stringify({ editor: true }),
          admin.admin_user_id,
        ],
      );
      await snapshotRevision(
        pool,
        id,
        admin.admin_user_id,
        input.changeNote || "Initial draft",
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        return reply.code(409).send({ error: "NDA_VERSION_ALREADY_EXISTS" });
      throw error;
    }
    await audit(
      "NDA_DOCUMENT_CREATED",
      "NOTICE",
      "ADMIN",
      request,
      { actorId: admin.admin_user_id, adminId: admin.admin_user_id },
      { documentId: id, version: input.version, purpose: input.purpose },
    );
    return reply
      .code(201)
      .send({ id, version: input.version, content_sha256: hash });
  });

  app.post("/api/v1/admin/nda-documents/:id/clone", async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [
      "OWNER",
      "ADMIN",
    ]);
    if (!admin) return;
    const parsed = CloneBody.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_NDA_CLONE", issues: parsed.error.flatten() });
    const source = (
      await pool.query(
        "SELECT * FROM private_portal.nda_documents WHERE id=$1",
        [(request.params as { id: string }).id],
      )
    ).rows[0];
    if (!source) return reply.code(404).send({ error: "NOT_FOUND" });
    const id = randomUUID();
    const content = {
      ...source.content,
      version: parsed.data.version,
      title: parsed.data.title ?? source.title,
      status: "DRAFT_FOR_WORKFLOW_TESTING",
    };
    const hash = ndaContentHash(content);
    try {
      await pool.query(
        `INSERT INTO private_portal.nda_documents(id,version,title,legal_status,jurisdiction,governing_law,signature_profile,purpose,source_kind,content,content_sha256,reaccept_required,metadata,updated_by)
      VALUES($1,$2,$3,'DRAFT_FOR_WORKFLOW_TESTING',$4,$5,$6,$7,'CLONED',$8,$9,true,$10,$11)`,
        [
          id,
          parsed.data.version,
          parsed.data.title ?? source.title,
          source.jurisdiction,
          source.governing_law,
          source.signature_profile,
          parsed.data.purpose ?? source.purpose,
          JSON.stringify(content),
          hash,
          JSON.stringify({ clonedFrom: source.id }),
          admin.admin_user_id,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        return reply.code(409).send({ error: "NDA_VERSION_ALREADY_EXISTS" });
      throw error;
    }
    await snapshotRevision(
      pool,
      id,
      admin.admin_user_id,
      parsed.data.changeNote,
    );
    await audit(
      "NDA_DOCUMENT_CLONED",
      "NOTICE",
      "ADMIN",
      request,
      { actorId: admin.admin_user_id, adminId: admin.admin_user_id },
      { documentId: id, sourceId: source.id, version: parsed.data.version },
    );
    return reply.code(201).send({ id });
  });

  app.patch("/api/v1/admin/nda-documents/:id", async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [
      "OWNER",
      "ADMIN",
    ]);
    if (!admin) return;
    const parsed = UpdateBody.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_NDA_UPDATE", issues: parsed.error.flatten() });
    const id = (request.params as { id: string }).id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = (
        await client.query(
          `SELECT d.*,(SELECT count(*)::int FROM private_portal.nda_acceptances a WHERE a.nda_document_id=d.id) acceptance_count FROM private_portal.nda_documents d WHERE d.id=$1 FOR UPDATE`,
          [id],
        )
      ).rows[0];
      if (!current) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "NOT_FOUND" });
      }
      if (current.legal_status !== "DRAFT_FOR_WORKFLOW_TESTING") {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "NDA_DOCUMENT_IMMUTABLE" });
      }
      if (Number(current.acceptance_count) > 0) {
        await client.query("ROLLBACK");
        return reply
          .code(409)
          .send({ error: "NDA_HAS_ACCEPTANCES_CLONE_REQUIRED" });
      }
      const input = parsed.data;
      const content = {
        ...current.content,
        ...(input.title ? { title: input.title } : {}),
        ...(input.jurisdiction ? { jurisdiction: input.jurisdiction } : {}),
        ...(input.governingLaw ? { governingLaw: input.governingLaw } : {}),
        ...(input.signatureProfile
          ? { signatureProfile: input.signatureProfile }
          : {}),
        ...(input.disclosingParty
          ? { disclosingParty: input.disclosingParty }
          : {}),
        ...(input.notice ? { notice: input.notice } : {}),
        ...(input.paragraphs ? { paragraphs: input.paragraphs } : {}),
        ...(input.translations ? { translations: input.translations } : {}),
      };
      const hash = ndaContentHash(content);
      await client.query(
        `UPDATE private_portal.nda_documents SET title=COALESCE($2,title),jurisdiction=COALESCE($3,jurisdiction),governing_law=COALESCE($4,governing_law),signature_profile=COALESCE($5,signature_profile),purpose=COALESCE($6,purpose),content=$7,content_sha256=$8,updated_by=$9,updated_at=now() WHERE id=$1`,
        [
          id,
          input.title ?? null,
          input.jurisdiction ?? null,
          input.governingLaw ?? null,
          input.signatureProfile ?? null,
          input.purpose ?? null,
          JSON.stringify(content),
          hash,
          admin.admin_user_id,
        ],
      );
      await snapshotRevision(client, id, admin.admin_user_id, input.changeNote);
      await client.query("COMMIT");
      await audit(
        "NDA_DOCUMENT_UPDATED",
        "NOTICE",
        "ADMIN",
        request,
        { actorId: admin.admin_user_id, adminId: admin.admin_user_id },
        { documentId: id, hash },
      );
      return { updated: true, content_sha256: hash };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  app.post("/api/v1/admin/nda-documents/:id/status", async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, [
      "OWNER",
      "ADMIN",
    ]);
    if (!admin) return;
    const parsed = StatusBody.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_NDA_STATUS", issues: parsed.error.flatten() });
    const id = (request.params as { id: string }).id;
    const current = (
      await pool.query(
        "SELECT legal_status,content FROM private_portal.nda_documents WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (!current) return reply.code(404).send({ error: "NOT_FOUND" });
    if (!isNdaTransitionAllowed(current.legal_status, parsed.data.status))
      return reply.code(409).send({ error: "INVALID_NDA_STATUS_TRANSITION" });
    if (
      parsed.data.status === "APPROVED" &&
      (admin.role !== "OWNER" ||
        !parsed.data.approvalConfirmed ||
        parsed.data.counselReference.length < 3)
    )
      return reply
        .code(403)
        .send({ error: "OWNER_AND_COUNSEL_CONFIRMATION_REQUIRED" });
    const metadata =
      parsed.data.status === "APPROVED"
        ? JSON.stringify({
            counselReference: parsed.data.counselReference,
            approvedVia: "ADMIN_CONTROL",
          })
        : null;
    const content = { ...current.content, status: parsed.data.status };
    const hash = ndaContentHash(content);
    await pool.query(
      `UPDATE private_portal.nda_documents SET legal_status=$2,content=$5,content_sha256=$6,approved_at=CASE WHEN $2='APPROVED' THEN now() ELSE approved_at END,approved_by=CASE WHEN $2='APPROVED' THEN $3 ELSE approved_by END,published_at=CASE WHEN $2='APPROVED' THEN now() ELSE published_at END,metadata=CASE WHEN $4::jsonb IS NULL THEN metadata ELSE metadata||$4::jsonb END,updated_by=$3,updated_at=now() WHERE id=$1`,
      [
        id,
        parsed.data.status,
        admin.admin_user_id,
        metadata,
        JSON.stringify(content),
        hash,
      ],
    );
    await snapshotRevision(
      pool,
      id,
      admin.admin_user_id,
      parsed.data.changeNote,
    );
    await audit(
      "NDA_DOCUMENT_STATUS_CHANGED",
      parsed.data.status === "APPROVED" ? "SECURITY" : "NOTICE",
      "ADMIN",
      request,
      { actorId: admin.admin_user_id, adminId: admin.admin_user_id },
      {
        documentId: id,
        from: current.legal_status,
        to: parsed.data.status,
        counselReference: parsed.data.counselReference || undefined,
      },
    );
    return { status: parsed.data.status };
  });
}
