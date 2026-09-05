import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import type {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import {randomBytes, randomUUID, scryptSync} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import nodemailer from 'nodemailer';
import {PDFDocument, StandardFonts, rgb} from 'pdf-lib';
import pg from 'pg';
import {z} from 'zod';
import {
  canonicalIp,
  decryptSecret,
  encryptIp,
  encryptSecret,
  evidenceHash,
  generateTotpSecret,
  hmacHex,
  invitationAllowsEmail,
  maskIp,
  normalizeEmail,
  randomOpaqueToken,
  safeEqual,
  sha256,
  splitName,
  stableJson,
  verifyTotp,
} from './portal-core.js';
import {runPortalMigrations} from './portal-migrations.js';
import {
  AcceptTeamInvitationBody,
  AcceptAdminRecoveryBody,
  ConfirmMfaBody,
  CreateAdminRecoveryBody,
  CreateProjectCommentBody,
  CreateProjectDecisionBody,
  CreateProjectEventBody,
  CreateProjectNoteBody,
  CreateProjectTaskBody,
  CreateTeamInvitationBody,
  PrepareTeamInvitationBody,
  PrepareAdminRecoveryBody,
  UpdateProjectDecisionBody,
  UpdateProjectEventBody,
  UpdateProjectNoteBody,
  UpdateProjectTaskBody,
  UpdateTeamMemberBody,
} from './workspace-schema.js';
import {registerMeetingKitRoutes} from './workspace-meeting-kit.js';
import {registerCrmRoutes} from './workspace-crm.js';
import {registerMaterialsRoutes} from './workspace-materials.js';

const {Pool} = pg;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

type NdaFile = {
  version: string;
  status: 'DRAFT_FOR_WORKFLOW_TESTING' | 'LEGAL_REVIEW' | 'APPROVED' | 'RETIRED';
  jurisdiction?: 'EU_EEA' | 'UNITED_STATES' | 'UNSPECIFIED';
  governingLaw?: string;
  signatureProfile?: string;
  title: string;
  disclosingParty: string;
  notice: string;
  paragraphs: string[];
};

type AdminRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type AdminSession = {id: string; admin_user_id: string; email: string; role: AdminRole; csrf_token_hash: string};
export type PortalRequireAdminFn = (request: FastifyRequest, reply: FastifyReply, roles?: AdminRole[]) => Promise<AdminSession | null>;
export type PortalAuditFn = (eventType: string, severity: 'INFO' | 'NOTICE' | 'WARNING' | 'SECURITY', actorType: 'SYSTEM' | 'ADMIN' | 'VISITOR' | 'ANONYMOUS', request: FastifyRequest, links?: {actorId?: string; visitorId?: string; adminId?: string; invitationId?: string; sessionId?: string}, metadata?: Record<string, unknown>) => Promise<void>;
type VisitorDecision = {
  granted: boolean;
  reason: string;
  visitorId?: string;
  sessionId?: string;
  acceptanceId?: string;
  fullName?: string;
  email?: string;
  scopes?: string[];
};

const LoginBody = z.object({email: z.string().email().max(254), password: z.string().min(8).max(256), mfaCode: z.string().regex(/^\d{6}$/).optional().or(z.literal(''))});
const DevLoginBody = z.object({token: z.string().min(32).max(512)});
const PrepareBody = z.object({token: z.string().min(32).max(256)});
const EmailStartBody = z.object({email: z.string().email().max(254)});
const EmailCompleteBody = z.object({email: z.string().email().max(254), oobCode: z.string().min(16).max(2048)});
const RegisterBody = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().email().max(254),
  organisation: z.string().trim().min(2).max(180),
  role: z.string().trim().max(160).default(''),
  country: z.string().trim().min(2).max(100),
  registeredAddress: z.string().trim().min(5).max(500),
  typedSignature: z.string().trim().min(2).max(160),
  ndaConfirmed: z.literal(true),
  privacyConfirmed: z.literal(true),
  signatureIntentConfirmed: z.literal(true),
}).refine((value) => value.typedSignature.toLocaleLowerCase() === value.fullName.toLocaleLowerCase(), {message: 'Typed acknowledgement must match full name', path: ['typedSignature']});
const CreateInvitationBody = z.object({
  name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).default(''), organisationName: z.string().trim().max(180).default(''),
  intendedRecipientEmail: z.string().email().max(254).optional().or(z.literal('')), allowedEmailDomain: z.string().trim().max(190).optional().or(z.literal('')),
  policy: z.enum(['SINGLE_VISITOR', 'MULTI_VISITOR']), maxRegistrations: z.number().int().min(1).max(10_000).nullable().default(1),
  validFrom: z.string().datetime().optional(), expiresAt: z.string().datetime(), manualApprovalRequired: z.boolean().default(false),
  ndaVersion: z.string().min(1).max(100), internalNotes: z.string().max(2000).default(''),
  scopes: z.array(z.enum(['INVESTOR', 'TECHNICAL_DILIGENCE', 'FINANCIAL_DILIGENCE', 'LEGAL_DILIGENCE'])).default(['INVESTOR']),
});
const UpdateInvitationBody = z.object({expiresAt: z.string().datetime().optional(), maxRegistrations: z.number().int().min(1).max(10_000).nullable().optional()});
const ReasonBody = z.object({reason: z.string().trim().min(3).max(500)});

function env(name: string, fallback = '') { return process.env[name]?.trim() || fallback; }
function intEnv(name: string, fallback: number) { const value = Number(env(name, String(fallback))); if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive`); return value; }
function sourceIp(request: FastifyRequest) { return canonicalIp(request.ip); }
function userAgent(request: FastifyRequest) { return String(request.headers['user-agent'] ?? 'unknown').slice(0, 500); }
function verifyPassword(password: string, stored: string) { const [algorithm, saltHex, hashHex] = stored.split(':'); if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false; return safeEqual(scryptSync(password, Buffer.from(saltHex, 'hex'), 64).toString('hex'), hashHex); }
function hashPassword(password: string) { const salt = randomBytes(16); return `scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`; }
function csvCell(value: unknown) { const clean = String(value ?? '').replace(/[\r\n]+/g, ' '); const safe = /^[=+\-@]/.test(clean) ? `'${clean}` : clean; return `"${safe.replaceAll('"', '""')}"`; }
function cookieOptions(secure: boolean, maxAgeMs: number, httpOnly = true) { return {path: '/', httpOnly, sameSite: 'strict' as const, secure, maxAge: Math.floor(maxAgeMs / 1000)}; }

async function buildNdaPdf(snapshot: Record<string, unknown>, evidenceIdentifier: string) {
  const document = snapshot.document as NdaFile;
  const recipient = snapshot.recipient as Record<string, string>;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]); let y = 790; const width = 500;
  const nextPage = () => { page = pdf.addPage([595.28, 841.89]); y = 790; };
  const write = (text: string, size = 10, strong = false, color = rgb(.12, .16, .15)) => {
    const font = strong ? bold : regular; const words = text.split(/\s+/); let line = '';
    for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(candidate, size) > width) { if (y < 70) nextPage(); page.drawText(line, {x: 48, y, size, font, color}); y -= 14; line = word; } else line = candidate; }
    if (line) { if (y < 70) nextPage(); page.drawText(line, {x: 48, y, size, font, color}); y -= 14; } y -= 5;
  };
  write('UP AI DOWN', 12, true, rgb(.08, .38, .31)); write(document.title, 20, true); write(document.notice, 9, true, rgb(.65, .18, .12));
  write(`Document version: ${document.version}`); write(`Document SHA-256: ${String(snapshot.documentHash)}`, 8); write(`Jurisdiction profile: ${document.jurisdiction ?? 'UNSPECIFIED'}`); write(`Governing law: ${document.governingLaw ?? 'TO_BE_SELECTED_BY_COUNSEL'}`); write(`Disclosing party: ${document.disclosingParty}`); y -= 8;
  for (const paragraph of document.paragraphs) write(paragraph);
  y -= 8; write('Recipient electronic acknowledgement', 13, true); write(`Name: ${recipient.fullName}`); write(`Email: ${recipient.email}`); write(`Organisation: ${recipient.organisation}`);
  write(`Role / signatory title: ${recipient.role || 'Not provided'}`); write(`Registered address: ${recipient.registeredAddress}`); write(`Country: ${recipient.country}`); write(`Electronic signature: ${recipient.typedSignature}`); write('Signature method: typed legal name with affirmative intent and electronic-record consent.'); write(`Accepted at UTC: ${String(snapshot.acceptedAtUtc)}`);
  write(`Evidence identifier: ${evidenceIdentifier}`, 8); write(`Masked network evidence: ${String(snapshot.maskedNetwork)}`, 8);
  write('This record uses a simple electronic-signature workflow. It is not described as an advanced or qualified electronic signature.', 9);
  return Buffer.from(await pdf.save());
}

export async function registerPrivateAccess(app: FastifyInstance, {root}: {root: string}) {
  const databaseUrl = env('DATABASE_URL'); const sessionSecret = env('SESSION_SECRET'); const invitationSecret = env('INVITATION_TOKEN_HMAC_SECRET');
  const ipFingerprintSecret = env('IP_FINGERPRINT_SECRET'); const ipEncryptionKey = env('IP_ENCRYPTION_KEY'); const ipKeyVersion = intEnv('IP_ENCRYPTION_KEY_VERSION', 1);
  const cookieSecure = env('COOKIE_SECURE', 'false') === 'true'; const externalEnabled = env('EXTERNAL_PORTAL_ENABLED', 'false') === 'true';
  const workflowTestEnabled = env('WORKFLOW_TEST_PORTAL_ENABLED', 'false') === 'true';
  const privacyStatus = env('PRIVACY_LEGAL_STATUS', 'DRAFT'); const adminMfaRequired = env('ADMIN_MFA_REQUIRED', 'false') === 'true';
  const emailVerificationProvider = env('EMAIL_VERIFICATION_PROVIDER', 'NONE').toUpperCase();
  const identityPlatformProjectId = env('IDENTITY_PLATFORM_PROJECT_ID'); const identityPlatformApiKey = env('IDENTITY_PLATFORM_API_KEY');
  const visitorIdleMs = intEnv('VISITOR_SESSION_IDLE_MINUTES', 120) * MINUTE; const visitorMaxMs = intEnv('VISITOR_SESSION_MAX_HOURS', 72) * HOUR;
  const adminIdleMs = intEnv('ADMIN_SESSION_IDLE_MINUTES', 30) * MINUTE; const adminMaxMs = intEnv('ADMIN_SESSION_MAX_HOURS', 8) * HOUR;
  const publicBaseUrl = env('PUBLIC_BASE_URL', 'http://127.0.0.1:8088'); const adminEmail = normalizeEmail(env('ADMIN_EMAIL')); const adminPasswordHash = env('ADMIN_PASSWORD_HASH');
  const localPortalTestMode = ['localhost', '127.0.0.1', '::1'].includes(new URL(publicBaseUrl).hostname);
  const adminTotpSecret = env('ADMIN_TOTP_SECRET'); const defaultInviteToken = env('DEFAULT_INVITE_TOKEN');
  const adminMfaEncryptionKey = env('ADMIN_MFA_ENCRYPTION_KEY', ipEncryptionKey);
  const devLoginEnabled = env('TEMP_ADMIN_DEV_LOGIN_ENABLED', 'false') === 'true'; const devLoginToken = env('TEMP_ADMIN_DEV_LOGIN_TOKEN');
  const devLoginExpiresAt = env('TEMP_ADMIN_DEV_LOGIN_EXPIRES_AT'); const devLoginExpiry = devLoginExpiresAt ? Date.parse(devLoginExpiresAt) : 0;
  const visitorCookie = cookieSecure ? '__Host-ued-visitor' : 'ued_visitor'; const adminCookie = cookieSecure ? '__Host-ued-admin' : 'ued_admin';
  const registrationCookie = cookieSecure ? '__Host-ued-registration' : 'ued_registration'; const csrfCookie = cookieSecure ? '__Host-ued-admin-csrf' : 'ued_admin_csrf';
  const ndaFiles = await Promise.all(['nda-v1.json', 'nda-eu-v1.json', 'nda-us-v1.json'].map(async (file) => JSON.parse(await readFile(resolve(root, `data/admin/${file}`), 'utf8')) as NdaFile));
  const nda = ndaFiles[0]!; nda.status = env('NDA_LEGAL_STATUS', nda.status) as NdaFile['status'];
  const briefing = JSON.parse(await readFile(resolve(root, 'data/admin/new-york-private-briefing.json'), 'utf8')) as Record<string, unknown>;
  const privacyNotice = {legalStatus: privacyStatus, controller: nda.disclosingParty, contact: env('PRIVACY_CONTACT_EMAIL', adminEmail), purpose: 'Administer controlled investor access, record NDA acknowledgement, detect session misuse and preserve a security audit trail.', data: 'Identity and business contact data, acknowledgement evidence, timestamp, user agent and technical network identifiers. Source IP is encrypted at rest and separately HMAC-fingerprinted.', retention: env('NDA_RETENTION_NOTICE', 'LEGAL_REVIEW_REQUIRED'), rights: 'Contact the privacy address for applicable rights requests. Evidence-retention decisions require legal review.'};
  const smtpConfigured = Boolean(env('SMTP_HOST') && env('SMTP_FROM', env('MAIL_FROM')) && env('SMTP_ARCHIVE', env('NDA_ARCHIVE_EMAIL')));

  const secrets = [sessionSecret, invitationSecret, ipFingerprintSecret];
  if (!databaseUrl || secrets.some((secret) => secret.length < 32) || new Set(secrets).size !== secrets.length || !/^[a-f0-9]{64}$/i.test(ipEncryptionKey) || !/^[a-f0-9]{64}$/i.test(adminMfaEncryptionKey) || !adminEmail || !adminPasswordHash) throw new Error('Private portal configuration is incomplete or key separation is invalid');
  if (devLoginEnabled && (devLoginToken.length < 32 || !Number.isFinite(devLoginExpiry))) throw new Error('Temporary administrator login requires a strong token and a valid expiry');
  if (emailVerificationProvider === 'GOOGLE_IDENTITY_PLATFORM' && (!identityPlatformProjectId || identityPlatformApiKey.length < 20)) throw new Error('Google Identity Platform email verification is incomplete');
  if (externalEnabled) {
    const failures = [!ndaFiles.some((document) => document.status === 'APPROVED') && 'at least one NDA must be APPROVED', privacyStatus !== 'APPROVED' && 'privacy notice must be APPROVED', emailVerificationProvider === 'NONE' && 'verified email provider is required', !cookieSecure && 'secure cookies are required', !adminMfaRequired && 'admin MFA is required', adminMfaEncryptionKey === ipEncryptionKey && 'MFA encryption key must be separated', !smtpConfigured && 'SMTP sender and archive delivery must be configured', devLoginEnabled && 'temporary developer login must be disabled', Boolean(defaultInviteToken) && 'default invitation must be removed'].filter(Boolean);
    if (failures.length) throw new Error(`External portal safety gate failed: ${failures.join('; ')}`);
  }

  const pool = new Pool({connectionString: databaseUrl, max: 8}); await runPortalMigrations(pool, root); await app.register(cookie); await app.register(rateLimit, {global: false});
  await pool.query(`INSERT INTO private_portal.admin_users AS target(id,email,password_hash,role,status,mfa_enabled,mfa_secret_encrypted) VALUES($1,$2,$3,'OWNER','ACTIVE',$4,$5)
    ON CONFLICT ((lower(email))) DO UPDATE SET mfa_enabled=target.mfa_enabled OR excluded.mfa_enabled,mfa_secret_encrypted=COALESCE(target.mfa_secret_encrypted,excluded.mfa_secret_encrypted)`, [randomUUID(), adminEmail, adminPasswordHash, Boolean(adminTotpSecret), adminTotpSecret ? encryptSecret(adminTotpSecret, adminMfaEncryptionKey) : null]);
  const seededAdminId = (await pool.query('SELECT id FROM private_portal.admin_users WHERE lower(email)=lower($1)', [adminEmail])).rows[0].id as string;
  if (externalEnabled && !(await pool.query("SELECT 1 FROM private_portal.admin_users WHERE role='OWNER' AND status='ACTIVE' AND mfa_enabled=true AND mfa_secret_encrypted IS NOT NULL LIMIT 1")).rowCount) throw new Error('External portal safety gate failed: at least one active owner must have MFA enrolled');
  for (const document of ndaFiles) {
    const contentHash = sha256(stableJson(document));
    await pool.query(`INSERT INTO private_portal.nda_documents(id,version,title,legal_status,jurisdiction,governing_law,signature_profile,content,content_sha256,reaccept_required,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
      ON CONFLICT(version) DO UPDATE SET title=excluded.title,legal_status=excluded.legal_status,jurisdiction=excluded.jurisdiction,governing_law=excluded.governing_law,signature_profile=excluded.signature_profile,content=excluded.content,content_sha256=excluded.content_sha256`, [randomUUID(), document.version, document.title, document.status, document.jurisdiction ?? 'UNSPECIFIED', document.governingLaw ?? 'TO_BE_SELECTED_BY_COUNSEL', document.signatureProfile ?? 'SIMPLE_ELECTRONIC_SIGNATURE_WORKFLOW', JSON.stringify(document), contentHash, JSON.stringify({source: `data/admin/${document.version === nda.version ? 'nda-v1.json' : document.jurisdiction === 'EU_EEA' ? 'nda-eu-v1.json' : 'nda-us-v1.json'}`})]);
  }
  const ndaDocumentId = (await pool.query('SELECT id FROM private_portal.nda_documents WHERE version=$1', [nda.version])).rows[0].id as string;
  if (defaultInviteToken) await pool.query(`INSERT INTO private_portal.invitations(id,public_id,token_hash,name,description,organisation_name,policy,nda_document_id,status,created_by,expires_at,max_registrations,manual_approval_required,metadata)
    VALUES($1,$2,$3,$4,$5,$6,'MULTI_VISITOR',$7,'ACTIVE',$8,now()+interval '180 days',10,false,$9) ON CONFLICT(token_hash) DO NOTHING`, [randomUUID(), `inv_${randomOpaqueToken(12)}`, hmacHex(defaultInviteToken, invitationSecret), 'New York 2026 local invitation', 'Seeded only for local workflow testing', 'UP AI DOWN local test', ndaDocumentId, seededAdminId, JSON.stringify({localSeed: true})]);

  const initialTasks = [
    ['Confirm New York meeting date, room and attendees', 'Lock the schedule, attendee roles, room technology and offline fallback before travel.', 'Founding team', 'TODO', 'HIGH'],
    ['Approve NDA and privacy notice with counsel', 'Replace workflow drafts with approved legal text before enabling external investor registration.', 'Legal owner', 'BLOCKED', 'CRITICAL'],
    ['Enroll owner MFA before external release', 'Configure and verify the owner TOTP factor, then require MFA for production administrator access.', 'Portal owner', 'TODO', 'CRITICAL'],
    ['Configure SMTP delivery and NDA archive', 'Select the approved provider, archive recipient and delivery policy; verify PDF evidence delivery.', 'Platform owner', 'TODO', 'HIGH'],
    ['Truth-review the Spanish and English visual decks', 'Check product geometry, ownership and every autonomous-operation or hardware claim before distribution.', 'Product owner', 'TODO', 'HIGH'],
    ['Run the full presentation rehearsal', 'Execute the demo, meeting kit and offline fallback from beginning to end and record corrective actions.', 'Founding team', 'TODO', 'HIGH'],
  ] as const;
  if (Number((await pool.query('SELECT count(*)::int AS count FROM private_portal.project_tasks WHERE title=ANY($1::text[])', [initialTasks.map((item) => item[0])])).rows[0].count) === 0) {
    for (const item of initialTasks) await pool.query(`INSERT INTO private_portal.project_tasks(id,title,description,owner_name,status,priority,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$7)`, [randomUUID(), ...item, seededAdminId]);
  }
  const initialNotes = [
    ['External investor access remains gated', 'The registration and NDA workflow is implemented, but external release stays disabled until legal/privacy approval, owner MFA and SMTP evidence delivery are complete.', 'LEGAL'],
    ['New visual decks are reference material', 'The two 10-page PDFs and overview JPEG contain useful narrative ideas, but include unverified specifications, autonomy claims and product geometries. Do not distribute them as validated evidence without review.', 'INVESTOR'],
  ] as const;
  if (Number((await pool.query('SELECT count(*)::int AS count FROM private_portal.project_notes WHERE title=ANY($1::text[])', [initialNotes.map((item) => item[0])])).rows[0].count) === 0) {
    for (const item of initialNotes) await pool.query(`INSERT INTO private_portal.project_notes(id,title,body,category,pinned,status,created_by,updated_by) VALUES($1,$2,$3,$4,true,'ACTIVE',$5,$5)`, [randomUUID(), ...item, seededAdminId]);
  }

  // ── NY Meeting Kit seed ────────────────────────────────────────────────────
  // Idempotent: only inserts if the meeting kit is completely empty.
  // Items are ordered by sort_order (ascending) within each type.
  if (Number((await pool.query('SELECT count(*)::int AS count FROM private_portal.meeting_kit_items')).rows[0].count) === 0) {
    const mkItems: [string, string, string, string, string, number][] = [
      // [item_type, language, title, body, classification, sort_order]
      // AGENDA — 5 blocks, 10-minute increments
      ['AGENDA', 'BOTH', '00–05 · Conviction', 'Open with the field-memory thesis and establish why fixed, aerial and ground evidence belong in one system.', 'INTERNAL', 10],
      ['AGENDA', 'BOTH', '05–15 · System', 'Explain Sentinel, drone, rover, soil probe and Data & AI Engine. Separate what exists today from the funded roadmap.', 'INTERNAL', 20],
      ['AGENDA', 'BOTH', '15–25 · Evidence and risk', 'Show only verifiable evidence. Address maturity, IP ownership and unit economics as explicit validation plans.', 'INTERNAL', 30],
      ['AGENDA', 'BOTH', '25–35 · Value creation', 'Connect capital to instrumented prototypes, deployments, rights-cleared data, validated models and recurring revenue.', 'INTERNAL', 40],
      ['AGENDA', 'BOTH', '35–45 · Investment conversation', 'Ask what evidence is required to lead diligence, review scenarios and lock next steps, owners and dates.', 'INTERNAL', 50],
      // SPEECH — 4 cues
      ['SPEECH', 'EN', 'Opening', 'Agriculture has data, but it still lacks a persistent memory of the field. UP AI DOWN is designed to connect autonomous observation, physical ground truth and learning over time.', 'INTERNAL', 10],
      ['SPEECH', 'EN', 'System', 'Sentinel provides persistent fixed observation. The drone adds repeatable aerial coverage. The rover investigates selected locations and the soil probe anchors remote signals in physical measurements. The data layer preserves the evidence chain.', 'INTERNAL', 20],
      ['SPEECH', 'EN', 'Truth', 'Today we are showing a working deterministic software demo and approved concept imagery. We will distinguish those assets from physical validation, real integrated NDVI and production readiness.', 'INTERNAL', 30],
      ['SPEECH', 'EN', 'Close', 'Rather than asking you to accept an unsupported claim, we want to agree the evidence that would make this opportunity diligence-ready, who owns each proof point and when it can be delivered.', 'INTERNAL', 40],
      // QUESTION — 5 investor questions
      ['QUESTION', 'EN', 'Evidence gate', 'What evidence would you need to sponsor or lead technical diligence?', 'INTERNAL', 10],
      ['QUESTION', 'EN', 'Risk priority', 'Which risk matters most at this stage: hardware maturity, data rights, commercial adoption or unit economics?', 'INTERNAL', 20],
      ['QUESTION', 'EN', 'Milestone value', 'Would a field-validation milestone or a rights-cleared longitudinal dataset change your underwriting view?', 'INTERNAL', 30],
      ['QUESTION', 'EN', 'Review circle', 'Who else should review the technical, agronomic and legal evidence?', 'INTERNAL', 40],
      ['QUESTION', 'EN', 'Next step', 'What is the clearest next step, owner and date?', 'INTERNAL', 50],
      // CHECKLIST — 7 presentation steps
      ['CHECKLIST', 'EN', '01 · Preflight', 'The presentation runtime is deterministic and can run locally.', 'INTERNAL', 10],
      ['CHECKLIST', 'EN', '02 · Investor demo', 'Fixed sensing, aerial observation and ground truth form one evidence loop.', 'INTERNAL', 20],
      ['CHECKLIST', 'EN', '03 · Rover and Sentinel', 'Concept renders communicate intended product architecture; they are not physical prototype evidence.', 'INTERNAL', 30],
      ['CHECKLIST', 'EN', '04 · Mission Control', 'Demonstrate the operational workflow and identify simulated elements clearly.', 'INTERNAL', 40],
      ['CHECKLIST', 'EN', '05 · NDVI', 'The visible dataset is synthetic. Related Red/NIR code exists in INSECE but is not yet integrated.', 'INTERNAL', 50],
      ['CHECKLIST', 'EN', '06 · Capital', 'Scenarios are planning envelopes until founder terms and operating assumptions are approved.', 'INTERNAL', 60],
      ['CHECKLIST', 'EN', '07 · Close', 'Ask which evidence gates would support the investor\'s diligence process.', 'INTERNAL', 70],
      // CHECKLIST — 5 pre-visit operational checks
      ['CHECKLIST', 'BOTH', 'Pre-visit · Attendees', 'Confirm attendees, roles, pronunciation and decision authority 24 hours before the meeting.', 'INTERNAL', 110],
      ['CHECKLIST', 'BOTH', 'Pre-visit · Room and tech', 'Confirm room, display resolution, HDMI/USB-C adapters, power, Wi-Fi policy and offline fallback.', 'INTERNAL', 120],
      ['CHECKLIST', 'BOTH', 'Pre-visit · Demo preflight', 'Open the local demo, run preflight, reset the scenario and verify fullscreen before attendees enter.', 'INTERNAL', 130],
      ['CHECKLIST', 'BOTH', 'Pre-visit · Materials', 'Carry the approved deck, NDA link, offline PDF and evidence index on two independent devices.', 'INTERNAL', 140],
      ['CHECKLIST', 'BOTH', 'Pre-visit · Follow-ups', 'Record agreed follow-ups, owner and date before leaving the room. Do not record people without permission.', 'INTERNAL', 150],
    ];
    for (const [itemType, language, title, body, classification, sortOrder] of mkItems) {
      await pool.query(
        `INSERT INTO private_portal.meeting_kit_items(id,item_type,language,title,body,classification,sort_order,status,created_by,updated_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,'ACTIVE',$8,$8)`,
        [randomUUID(), itemType, language, title, body, classification, sortOrder, seededAdminId],
      );
    }
  }

  // ── Material Registry seed ─────────────────────────────────────────────────
  // Three NY materials from the briefing. status=DRAFT pending truth-review.
  if (Number((await pool.query('SELECT count(*)::int AS count FROM private_portal.material_registry')).rows[0].count) === 0) {
    const materials: [string, string, string, string, string, string][] = [
      // [title, material_type, version, language, classification, notes]
      [
        'UPAIDOWN Autonomous Farming',
        'PRESENTATION', '1.0', 'ES', 'REVIEW_REQUIRED',
        'User-supplied visual deck · PDF 10 pages · Spanish. Image-only PDF; claims, product geometry and specifications require truth and ownership review before investor distribution.',
      ],
      [
        'UPAIDOWN Autonomous Agricultural Ecosystem',
        'PRESENTATION', '1.0', 'EN', 'REVIEW_REQUIRED',
        'User-supplied visual deck · PDF 10 pages · English. Autonomous-operation, proprietary-platform and hardware claims are not treated as validated evidence.',
      ],
      [
        'UPAIDOWN overview board · 19 August 2026',
        'IMAGE', '1.0', 'ES', 'REVIEW_REQUIRED',
        'Contact-sheet visual reference · JPEG · Spanish. Contains historical WALL-AI/Sentinel naming and visible specifications that must not override the approved product truth.',
      ],
    ];
    for (const [title, materialType, version, language, classification, notes] of materials) {
      await pool.query(
        `INSERT INTO private_portal.material_registry(id,title,material_type,version,language,classification,status,provenance,notes,metadata,created_by,updated_by)
         VALUES($1,$2,$3,$4,$5,$6,'DRAFT','data/admin/new-york-private-briefing.json',$7,'{}',$8,$8)`,
        [randomUUID(), title, materialType, version, language, classification, notes, seededAdminId],
      );
    }
  }

  // ── CRM seed — NY investor placeholder ────────────────────────────────────
  // Creates an empty "New York 2026" umbrella organisation so the team can
  // attach contacts immediately after the meeting without starting from zero.
  if (Number((await pool.query('SELECT count(*)::int AS count FROM private_portal.crm_organisations')).rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO private_portal.crm_organisations(id,name,org_type,country,stage,next_action,notes,status,created_by,updated_by)
       VALUES($1,'New York 2026 — Investor TBC','INVESTOR','United States','PROSPECT','Identify lead investor and confirm organisation name after the meeting.','Placeholder created from the NY briefing. Update name and org_type after the first meeting.','ACTIVE',$2,$2)`,
      [randomUUID(), seededAdminId],
    );
  }

  const audit = async (eventType: string, severity: 'INFO' | 'NOTICE' | 'WARNING' | 'SECURITY', actorType: 'SYSTEM' | 'ADMIN' | 'VISITOR' | 'ANONYMOUS', request: FastifyRequest, links: {actorId?: string; visitorId?: string; adminId?: string; invitationId?: string; sessionId?: string} = {}, metadata: Record<string, unknown> = {}) => {
    const ip = sourceIp(request); await pool.query(`INSERT INTO private_portal.audit_events(id,event_type,severity,actor_type,actor_id,visitor_id,admin_id,invitation_id,session_id,ip_fingerprint,masked_ip,user_agent,metadata)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [randomUUID(), eventType, severity, actorType, links.actorId ?? null, links.visitorId ?? null, links.adminId ?? null, links.invitationId ?? null, links.sessionId ?? null, hmacHex(ip, ipFingerprintSecret), maskIp(ip), userAgent(request), JSON.stringify(metadata)]);
  };
  const trustedOrigin = (request: FastifyRequest, reply: FastifyReply) => {
    const origin = request.headers.origin; const allowed = new Set([publicBaseUrl, 'http://localhost:8088', 'http://127.0.0.1:8088', 'http://localhost:5173', 'http://127.0.0.1:5173']); const contentType = String(request.headers['content-type'] ?? '');
    if ((origin && !allowed.has(origin)) || (request.method !== 'GET' && !contentType.startsWith('application/json'))) { void reply.code(403).send({error: 'REQUEST_REJECTED'}); return false; } return true;
  };
  const adminSession = async (request: FastifyRequest, mutate = true): Promise<AdminSession | null> => {
    const raw = request.cookies[adminCookie]; if (!raw) return null;
    const row = (await pool.query(`SELECT s.*,u.email,u.role,u.status AS user_status FROM private_portal.admin_sessions s JOIN private_portal.admin_users u ON u.id=s.admin_user_id WHERE s.session_token_hash=$1`, [hmacHex(raw, sessionSecret)])).rows[0];
    if (!row || row.status !== 'ACTIVE' || row.user_status !== 'ACTIVE') return null; const now = Date.now();
    if (new Date(row.expires_at).getTime() <= now || new Date(row.idle_expires_at).getTime() <= now) { if (mutate) await pool.query("UPDATE private_portal.admin_sessions SET status='EXPIRED',invalidated_at=now(),invalidation_reason='TIMEOUT' WHERE id=$1", [row.id]); return null; }
    if (row.ip_fingerprint !== hmacHex(sourceIp(request), ipFingerprintSecret)) { if (mutate) { await pool.query("UPDATE private_portal.admin_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='NETWORK_CHANGED' WHERE id=$1", [row.id]); await audit('ADMIN_NETWORK_CHANGED', 'SECURITY', 'ADMIN', request, {adminId: row.admin_user_id, sessionId: row.id}); } return null; }
    if (!row.user_agent_hash || row.user_agent_hash !== sha256(userAgent(request))) { if (mutate) { await pool.query("UPDATE private_portal.admin_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='CLIENT_CHANGED' WHERE id=$1", [row.id]); await audit('ADMIN_CLIENT_CHANGED', 'SECURITY', 'ADMIN', request, {adminId: row.admin_user_id, sessionId: row.id}); } return null; }
    if (mutate) await pool.query('UPDATE private_portal.admin_sessions SET last_activity_at=now(),idle_expires_at=$2 WHERE id=$1', [row.id, new Date(now + adminIdleMs)]); return row as AdminSession;
  };
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply, roles: Array<AdminSession['role']> = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']) => { const session = await adminSession(request); if (!session) { reply.code(401).send({error: 'ADMIN_AUTH_REQUIRED'}); return null; } if (!roles.includes(session.role)) { reply.code(403).send({error: 'ADMIN_PERMISSION_REQUIRED'}); return null; } return session; };
  const requireAdminMutation = async (request: FastifyRequest, reply: FastifyReply, roles: Array<AdminSession['role']> = ['OWNER', 'ADMIN']) => {
    if (!trustedOrigin(request, reply)) return null; const session = await requireAdmin(request, reply, roles); if (!session) return null; const csrf = String(request.headers['x-csrf-token'] ?? '');
    if (!csrf || !safeEqual(hmacHex(csrf, sessionSecret), session.csrf_token_hash)) { await audit('ADMIN_CSRF_REJECTED', 'SECURITY', 'ADMIN', request, {adminId: session.admin_user_id, sessionId: session.id}); reply.code(403).send({error: 'REQUEST_REJECTED'}); return null; } return session;
  };
  const recordProjectChange = async (entityType: string, entityId: string, action: string, adminId: string, changes: Record<string, unknown>) => {
    await pool.query('INSERT INTO private_portal.project_change_history(id,entity_type,entity_id,action,changed_by,changes) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), entityType, entityId, action, adminId, JSON.stringify(changes)]);
  };
  const recordProjectVersion = async (entityType: 'NOTE' | 'DECISION', entityId: string, adminId: string, snapshot: Record<string, unknown>) => {
    const table = entityType === 'NOTE' ? 'project_note_versions' : 'project_decision_versions';
    const foreignKey = entityType === 'NOTE' ? 'note_id' : 'decision_id';
    await pool.query(`INSERT INTO private_portal.${table}(id,${foreignKey},version_number,snapshot,changed_by)
      SELECT $1,$2,COALESCE(MAX(version_number),0)+1,$3,$4 FROM private_portal.${table} WHERE ${foreignKey}=$2`, [randomUUID(), entityId, JSON.stringify(snapshot), adminId]);
  };
  const createRegistrationContext = async (reply: FastifyReply, invitationId: string, visitorId: string | null, purpose: 'REGISTRATION' | 'REVERIFY' | 'PENDING_APPROVAL', request: FastifyRequest) => {
    const raw = randomOpaqueToken(); const expiresMs = 30 * MINUTE; await pool.query(`INSERT INTO private_portal.registration_contexts(id,context_token_hash,invitation_id,visitor_id,purpose,expires_at,ip_fingerprint,user_agent_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [randomUUID(), hmacHex(raw, sessionSecret), invitationId, visitorId, purpose, new Date(Date.now() + expiresMs), hmacHex(sourceIp(request), ipFingerprintSecret), sha256(userAgent(request))]); reply.setCookie(registrationCookie, raw, cookieOptions(cookieSecure, expiresMs));
  };
  const getRegistrationContext = async (request: FastifyRequest) => {
    const raw = request.cookies[registrationCookie]; if (!raw) return null;
    const context = (await pool.query(`SELECT rc.*,i.public_id,i.name,i.organisation_name,i.intended_recipient_email,i.allowed_email_domain,i.policy,i.status AS invitation_status,i.valid_from,i.expires_at AS invitation_expires_at,i.max_registrations,i.registration_count,i.manual_approval_required,i.scopes,d.version,d.title,d.legal_status,d.content,d.content_sha256
      FROM private_portal.registration_contexts rc JOIN private_portal.invitations i ON i.id=rc.invitation_id JOIN private_portal.nda_documents d ON d.id=i.nda_document_id WHERE rc.context_token_hash=$1 AND rc.expires_at>now() AND rc.consumed_at IS NULL`, [hmacHex(raw, sessionSecret)])).rows[0] ?? null;
    if (!context || context.ip_fingerprint !== hmacHex(sourceIp(request), ipFingerprintSecret) || context.user_agent_hash !== sha256(userAgent(request))) return null;
    return context;
  };
  const createVisitorSession = async (reply: FastifyReply, visitorId: string, invitationId: string, acceptanceId: string, request: FastifyRequest) => {
    await pool.query("UPDATE private_portal.visitor_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='ROTATED' WHERE visitor_id=$1 AND status='ACTIVE'", [visitorId]);
    const raw = randomOpaqueToken(); const id = randomUUID(); const now = Date.now(); await pool.query(`INSERT INTO private_portal.visitor_sessions(id,visitor_id,invitation_id,nda_acceptance_id,session_token_hash,created_at,expires_at,idle_expires_at,last_activity_at,ip_fingerprint,user_agent_hash,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$6,$9,$10,'ACTIVE')`, [id, visitorId, invitationId, acceptanceId, hmacHex(raw, sessionSecret), new Date(now), new Date(now + visitorMaxMs), new Date(now + visitorIdleMs), hmacHex(sourceIp(request), ipFingerprintSecret), sha256(userAgent(request))]);
    reply.setCookie(visitorCookie, raw, cookieOptions(cookieSecure, visitorMaxMs)); await audit('SESSION_CREATED', 'NOTICE', 'VISITOR', request, {actorId: visitorId, visitorId, invitationId, sessionId: id}); return id;
  };
  const visitorSession = async (request: FastifyRequest, reply?: FastifyReply, mutate = true): Promise<VisitorDecision> => {
    const raw = request.cookies[visitorCookie]; if (!raw) return {granted: false, reason: 'REGISTRATION_REQUIRED'};
    const row = (await pool.query(`SELECT s.*,v.status AS visitor_status,v.full_name,v.email,v.scopes,a.revoked_at AS acceptance_revoked,a.nda_document_id AS accepted_document_id,i.nda_document_id AS invitation_document_id,d.reaccept_required
      FROM private_portal.visitor_sessions s JOIN private_portal.visitors v ON v.id=s.visitor_id JOIN private_portal.nda_acceptances a ON a.id=s.nda_acceptance_id JOIN private_portal.invitations i ON i.id=s.invitation_id JOIN private_portal.nda_documents d ON d.id=i.nda_document_id WHERE s.session_token_hash=$1`, [hmacHex(raw, sessionSecret)])).rows[0];
    if (!row || row.status !== 'ACTIVE') return {granted: false, reason: 'REGISTRATION_REQUIRED'}; const links = {actorId: row.visitor_id, visitorId: row.visitor_id, invitationId: row.invitation_id, sessionId: row.id};
    if (row.visitor_status === 'REVOKED') return {granted: false, reason: 'ACCESS_REVOKED'}; if (row.acceptance_revoked) return {granted: false, reason: 'NDA_REVOKED'}; if (row.reaccept_required && row.accepted_document_id !== row.invitation_document_id) return {granted: false, reason: 'NDA_UPDATE_REQUIRED'};
    const now = Date.now(); if (new Date(row.expires_at).getTime() <= now || new Date(row.idle_expires_at).getTime() <= now) { if (mutate) { await pool.query("UPDATE private_portal.visitor_sessions SET status='EXPIRED',invalidated_at=now(),invalidation_reason='TIMEOUT' WHERE id=$1", [row.id]); await audit('SESSION_EXPIRED', 'NOTICE', 'VISITOR', request, links); reply?.clearCookie(visitorCookie, {path: '/'}); } return {granted: false, reason: 'SESSION_EXPIRED'}; }
    if (row.ip_fingerprint !== hmacHex(sourceIp(request), ipFingerprintSecret)) { if (mutate) { await pool.query("UPDATE private_portal.visitor_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='NETWORK_CHANGED' WHERE id=$1", [row.id]); if (reply) await createRegistrationContext(reply, row.invitation_id, row.visitor_id, 'REVERIFY', request); reply?.clearCookie(visitorCookie, {path: '/'}); await audit('NETWORK_CHANGED', 'SECURITY', 'VISITOR', request, links); } return {granted: false, reason: 'NETWORK_CHANGED'}; }
    if (!row.user_agent_hash || row.user_agent_hash !== sha256(userAgent(request))) { if (mutate) { await pool.query("UPDATE private_portal.visitor_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='CLIENT_CHANGED' WHERE id=$1", [row.id]); if (reply) await createRegistrationContext(reply, row.invitation_id, row.visitor_id, 'REVERIFY', request); reply?.clearCookie(visitorCookie, {path: '/'}); await audit('CLIENT_CHANGED', 'SECURITY', 'VISITOR', request, links); } return {granted: false, reason: 'CLIENT_CHANGED'}; }
    if (mutate) { await pool.query('UPDATE private_portal.visitor_sessions SET last_activity_at=now(),idle_expires_at=$2 WHERE id=$1', [row.id, new Date(now + visitorIdleMs)]); await pool.query('UPDATE private_portal.visitors SET last_access_at=now() WHERE id=$1', [row.visitor_id]); }
    return {granted: true, reason: 'ACCEPTED', visitorId: row.visitor_id, sessionId: row.id, acceptanceId: row.nda_acceptance_id, fullName: row.full_name, email: row.email, scopes: row.scopes};
  };

  const mailTransport = () => { const host = env('SMTP_HOST'); if (!host) return null; const user = env('SMTP_USER'); return nodemailer.createTransport({host, port: intEnv('SMTP_PORT', 1025), secure: env('SMTP_SECURE', 'false') === 'true', auth: user ? {user, pass: env('SMTP_PASSWORD')} : undefined}); };
  const recordEmail = async (kind: string, recipient: string, status: string, ids: {visitorId?: string; invitationId?: string; acceptanceId?: string}, providerMessageId?: string, errorCode?: string) => pool.query(`INSERT INTO private_portal.email_deliveries(id,kind,recipient,visitor_id,invitation_id,nda_acceptance_id,status,provider_message_id,sent_at,error_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [randomUUID(), kind, recipient, ids.visitorId ?? null, ids.invitationId ?? null, ids.acceptanceId ?? null, status, providerMessageId ?? null, status === 'SENT' ? new Date() : null, errorCode ?? null]);
  const sendNdaEvidence = async (recipient: string, name: string, pdf: Buffer, version: string, acceptedAt: string, evidence: string, ids: {visitorId: string; invitationId: string; acceptanceId: string}) => {
    const transport = mailTransport(); if (!transport) { await recordEmail('NDA_EVIDENCE', recipient, 'SKIPPED_NO_SMTP', ids); return 'SKIPPED_NO_SMTP'; }
    try { const result = await transport.sendMail({from: env('SMTP_FROM', env('MAIL_FROM', 'UP AI DOWN <nda@up-ai-down.local>')), to: recipient, cc: env('SMTP_ARCHIVE', env('NDA_ARCHIVE_EMAIL')) || undefined, subject: `${nda.status === 'APPROVED' ? 'NDA acceptance' : 'Workflow-test acknowledgement'} · UP AI DOWN`, text: `Hello ${name},\n\nAttached is your acknowledgement record.\nVersion: ${version}\nAccepted at UTC: ${acceptedAt}\nEvidence: ${evidence}\nLegal status: ${nda.status}\n`, attachments: [{filename: `UP AI DOWN-${version}-${evidence.slice(0, 12)}.pdf`, content: pdf, contentType: 'application/pdf'}]}); await recordEmail('NDA_EVIDENCE', recipient, 'SENT', ids, result.messageId); return 'SENT'; }
    catch (error) { app.log.error({acceptanceId: ids.acceptanceId, error}, 'NDA email delivery failed'); await recordEmail('NDA_EVIDENCE', recipient, 'FAILED', ids, undefined, 'SMTP_DELIVERY_FAILED'); return 'FAILED'; }
  };
  const identityPlatformRequest = async (method: string, body: Record<string, unknown>) => {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${method}?key=${encodeURIComponent(identityPlatformApiKey)}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(12_000)});
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw Object.assign(new Error('EMAIL_VERIFICATION_FAILED'), {statusCode: response.status, providerCode: (data.error as {message?: string} | undefined)?.message});
    return data;
  };
  const createAdminSession = async (user: {id: string; email: string; role: string; mfa_enabled: boolean}, request: FastifyRequest, reply: FastifyReply, eventType = 'ADMIN_LOGIN_SUCCESS') => {
    await pool.query("UPDATE private_portal.admin_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='ROTATED' WHERE admin_user_id=$1 AND status='ACTIVE'", [user.id]);
    const raw = randomOpaqueToken(); const csrf = randomOpaqueToken(); const now = Date.now(); const sessionId = randomUUID();
    await pool.query(`INSERT INTO private_portal.admin_sessions(id,admin_user_id,session_token_hash,csrf_token_hash,created_at,expires_at,idle_expires_at,last_activity_at,ip_fingerprint,user_agent_hash,status) VALUES($1,$2,$3,$4,$5,$6,$7,$5,$8,$9,'ACTIVE')`, [sessionId, user.id, hmacHex(raw, sessionSecret), hmacHex(csrf, sessionSecret), new Date(now), new Date(now + adminMaxMs), new Date(now + adminIdleMs), hmacHex(sourceIp(request), ipFingerprintSecret), sha256(userAgent(request))]);
    await pool.query('UPDATE private_portal.admin_users SET last_login_at=now() WHERE id=$1', [user.id]); reply.setCookie(adminCookie, raw, cookieOptions(cookieSecure, adminMaxMs)); reply.setCookie(csrfCookie, csrf, cookieOptions(cookieSecure, adminMaxMs, false));
    await audit(eventType, 'NOTICE', 'ADMIN', request, {actorId: user.id, adminId: user.id, sessionId});
    return {authenticated: true, email: user.email, role: user.role, mfa: Boolean(user.mfa_enabled)};
  };

  app.addHook('onSend', async (request, reply, payload) => { if (request.url.startsWith('/api/v1/access') || request.url.startsWith('/api/v1/admin')) reply.header('Cache-Control', 'no-store, private'); return payload; });

  app.post('/api/v1/admin/team-invitations/prepare', {config: {rateLimit: {max: 10, timeWindow: '15 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; const parsed = PrepareTeamInvitationBody.safeParse(request.body); if (!parsed.success) return reply.code(404).send({error: 'TEAM_INVITATION_UNAVAILABLE'});
    const invitation = (await pool.query("SELECT * FROM private_portal.team_invitations WHERE token_hash=$1 AND status='ACTIVE' AND expires_at>now()", [hmacHex(parsed.data.token, invitationSecret)])).rows[0];
    if (!invitation) return reply.code(404).send({error: 'TEAM_INVITATION_UNAVAILABLE'});
    const secret = decryptSecret(invitation.mfa_secret_encrypted, adminMfaEncryptionKey);
    await audit('TEAM_INVITATION_OPENED', 'NOTICE', 'ANONYMOUS', request, {}, {invitationId: invitation.id, emailHash: sha256(invitation.email)});
    return {email: invitation.email, displayName: invitation.display_name, role: invitation.role, expiresAt: invitation.expires_at, totpSecret: secret, otpauthUri: `otpauth://totp/${encodeURIComponent(`UP AI DOWN:${invitation.email}`)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent('UP AI DOWN')}`};
  });

  app.post('/api/v1/admin/team-invitations/accept', {config: {rateLimit: {max: 8, timeWindow: '30 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; const parsed = AcceptTeamInvitationBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_TEAM_REGISTRATION', issues: parsed.error.flatten()});
    const input = parsed.data; const client = await pool.connect(); let userId = '';
    try {
      await client.query('BEGIN');
      const invitation = (await client.query("SELECT * FROM private_portal.team_invitations WHERE token_hash=$1 FOR UPDATE", [hmacHex(input.token, invitationSecret)])).rows[0];
      if (!invitation || invitation.status !== 'ACTIVE' || new Date(invitation.expires_at).getTime() <= Date.now()) throw Object.assign(new Error('TEAM_INVITATION_UNAVAILABLE'), {statusCode: 404});
      if ((await client.query('SELECT 1 FROM private_portal.admin_users WHERE lower(email)=lower($1)', [invitation.email])).rowCount) throw Object.assign(new Error('TEAM_ACCOUNT_EXISTS'), {statusCode: 409});
      const secret = decryptSecret(invitation.mfa_secret_encrypted, adminMfaEncryptionKey); if (!verifyTotp(secret, input.mfaCode)) throw Object.assign(new Error('INVALID_MFA_CODE'), {statusCode: 401});
      userId = randomUUID(); await client.query(`INSERT INTO private_portal.admin_users(id,email,display_name,password_hash,password_changed_at,role,status,mfa_enabled,mfa_secret_encrypted,invited_by) VALUES($1,$2,$3,$4,now(),$5,'ACTIVE',true,$6,$7)`, [userId, normalizeEmail(invitation.email), input.displayName, hashPassword(input.password), invitation.role, invitation.mfa_secret_encrypted, invitation.created_by]);
      await client.query("UPDATE private_portal.team_invitations SET status='CONSUMED',consumed_at=now(),consumed_by=$2 WHERE id=$1", [invitation.id, userId]); await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); const typed = error as Error & {statusCode?: number}; return reply.code(typed.statusCode ?? 500).send({error: typed.statusCode ? typed.message : 'TEAM_REGISTRATION_FAILED'}); } finally { client.release(); }
    await audit('TEAM_MEMBER_ACTIVATED', 'SECURITY', 'ADMIN', request, {actorId: userId, adminId: userId}); return reply.code(201).send({created: true, redirect: '/demo/admin/login'});
  });
  app.post('/api/v1/admin/recovery/prepare', {config: {rateLimit: {max: 10, timeWindow: '15 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; const parsed = PrepareAdminRecoveryBody.safeParse(request.body); if (!parsed.success) return reply.code(404).send({error: 'RECOVERY_UNAVAILABLE'}); const reset = (await pool.query(`SELECT r.*,u.email,u.display_name FROM private_portal.admin_password_resets r JOIN private_portal.admin_users u ON u.id=r.admin_user_id WHERE r.token_hash=$1 AND r.status='ACTIVE' AND r.expires_at>now() AND u.status='ACTIVE'`, [hmacHex(parsed.data.token, invitationSecret)])).rows[0]; if (!reset) return reply.code(404).send({error: 'RECOVERY_UNAVAILABLE'}); const secret = decryptSecret(reset.mfa_secret_encrypted, adminMfaEncryptionKey); await audit('ADMIN_RECOVERY_OPENED', 'SECURITY', 'ANONYMOUS', request, {}, {resetId: reset.id, emailHash: sha256(reset.email)}); return {email: reset.email, displayName: reset.display_name, expiresAt: reset.expires_at, totpSecret: secret, otpauthUri: `otpauth://totp/${encodeURIComponent(`UP AI DOWN:${reset.email}`)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent('UP AI DOWN')}`};
  });
  app.post('/api/v1/admin/recovery/accept', {config: {rateLimit: {max: 8, timeWindow: '30 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; const parsed = AcceptAdminRecoveryBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_RECOVERY', issues: parsed.error.flatten()}); const input = parsed.data; const client = await pool.connect(); let adminUserId = '';
    try { await client.query('BEGIN'); const reset = (await client.query(`SELECT r.*,u.status AS user_status FROM private_portal.admin_password_resets r JOIN private_portal.admin_users u ON u.id=r.admin_user_id WHERE r.token_hash=$1 FOR UPDATE`, [hmacHex(input.token, invitationSecret)])).rows[0]; if (!reset || reset.status !== 'ACTIVE' || reset.user_status !== 'ACTIVE' || new Date(reset.expires_at).getTime() <= Date.now()) throw Object.assign(new Error('RECOVERY_UNAVAILABLE'), {statusCode: 404}); const secret = decryptSecret(reset.mfa_secret_encrypted, adminMfaEncryptionKey); if (!verifyTotp(secret, input.mfaCode)) throw Object.assign(new Error('INVALID_MFA_CODE'), {statusCode: 401}); adminUserId = reset.admin_user_id; await client.query('UPDATE private_portal.admin_users SET password_hash=$2,password_changed_at=now(),mfa_enabled=true,mfa_secret_encrypted=$3 WHERE id=$1', [adminUserId, hashPassword(input.password), reset.mfa_secret_encrypted]); await client.query("UPDATE private_portal.admin_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='CREDENTIALS_RECOVERED' WHERE admin_user_id=$1 AND status='ACTIVE'", [adminUserId]); await client.query("UPDATE private_portal.admin_password_resets SET status='CONSUMED',consumed_at=now() WHERE id=$1", [reset.id]); await client.query('COMMIT'); } catch (error) { await client.query('ROLLBACK'); const typed = error as Error & {statusCode?: number}; return reply.code(typed.statusCode ?? 500).send({error: typed.statusCode ? typed.message : 'RECOVERY_FAILED'}); } finally { client.release(); } await audit('ADMIN_CREDENTIALS_RECOVERED', 'SECURITY', 'ADMIN', request, {actorId: adminUserId, adminId: adminUserId}); return {recovered: true, redirect: '/demo/admin/login'};
  });

  app.post('/api/v1/access/invitations/prepare', {config: {rateLimit: {max: 30, timeWindow: '15 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; if (!externalEnabled && !workflowTestEnabled && !localPortalTestMode) return reply.code(503).send({error: 'EXTERNAL_PORTAL_DISABLED'}); const parsed = PrepareBody.safeParse(request.body); if (!parsed.success) return reply.code(404).send({error: 'INVITATION_UNAVAILABLE'});
    const invitation = (await pool.query('SELECT * FROM private_portal.invitations WHERE token_hash=$1', [hmacHex(parsed.data.token, invitationSecret)])).rows[0]; const now = Date.now();
    if (!invitation || invitation.status === 'REVOKED' || new Date(invitation.valid_from).getTime() > now || new Date(invitation.expires_at).getTime() <= now) { await audit('ACCESS_DENIED', 'WARNING', 'ANONYMOUS', request, {}, {reason: 'INVITATION_UNAVAILABLE'}); return reply.code(404).send({error: 'INVITATION_UNAVAILABLE'}); }
    if (invitation.status === 'CONSUMED' || (invitation.max_registrations && invitation.registration_count >= invitation.max_registrations)) return reply.code(409).send({error: 'REGISTRATION_LIMIT_REACHED'});
    await createRegistrationContext(reply, invitation.id, null, 'REGISTRATION', request); await audit('INVITATION_OPENED', 'INFO', 'ANONYMOUS', request, {invitationId: invitation.id}); return {prepared: true, redirect: '/demo/access'};
  });
  app.get('/api/v1/access/document', {config: {rateLimit: {max: 60, timeWindow: '15 minutes'}}}, async (request, reply) => {
    const context = await getRegistrationContext(request); if (!context) return reply.code(404).send({error: 'REGISTRATION_CONTEXT_REQUIRED'});
    return {invitation: {publicId: context.public_id, name: context.name, organisationName: context.organisation_name, purpose: context.purpose, intendedRecipientEmail: context.verified_email ?? context.intended_recipient_email}, emailVerification: {required: emailVerificationProvider !== 'NONE', verified: Boolean(context.email_verified_at), verifiedEmail: context.verified_email ?? null, provider: emailVerificationProvider}, version: context.version, status: context.legal_status, jurisdiction: context.content.jurisdiction ?? 'UNSPECIFIED', governingLaw: context.content.governingLaw ?? 'TO_BE_SELECTED_BY_COUNSEL', signatureProfile: context.content.signatureProfile ?? 'SIMPLE_ELECTRONIC_SIGNATURE_WORKFLOW', title: context.title, disclosingParty: context.content.disclosingParty, notice: context.content.notice, paragraphs: context.content.paragraphs, privacy: privacyNotice};
  });
  app.post('/api/v1/access/email/start', {config: {rateLimit: {max: 5, timeWindow: '30 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; if (emailVerificationProvider !== 'GOOGLE_IDENTITY_PLATFORM') return reply.code(503).send({error: 'EMAIL_VERIFICATION_UNAVAILABLE'});
    const parsed = EmailStartBody.safeParse(request.body); const context = await getRegistrationContext(request); if (!parsed.success || !context) return reply.code(400).send({error: 'EMAIL_VERIFICATION_UNAVAILABLE'});
    const email = normalizeEmail(parsed.data.email); if (!invitationAllowsEmail({intendedRecipientEmail: context.intended_recipient_email, allowedEmailDomain: context.allowed_email_domain}, email)) return reply.code(403).send({error: 'REGISTRATION_NOT_AVAILABLE'});
    try { await identityPlatformRequest('accounts:sendOobCode', {requestType: 'EMAIL_SIGNIN', email, continueUrl: `${publicBaseUrl}/demo/access/verify`, canHandleCodeInApp: true}); }
    catch (error) { app.log.warn({providerCode: (error as {providerCode?: string}).providerCode}, 'identity platform email start failed'); return reply.code(502).send({error: 'EMAIL_DELIVERY_FAILED'}); }
    await audit('EMAIL_VERIFICATION_SENT', 'NOTICE', 'ANONYMOUS', request, {invitationId: context.invitation_id}, {emailHash: sha256(email)}); return {sent: true};
  });
  app.post('/api/v1/access/email/complete', {config: {rateLimit: {max: 8, timeWindow: '30 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; if (emailVerificationProvider !== 'GOOGLE_IDENTITY_PLATFORM') return reply.code(503).send({error: 'EMAIL_VERIFICATION_UNAVAILABLE'});
    const parsed = EmailCompleteBody.safeParse(request.body); const context = await getRegistrationContext(request); if (!parsed.success || !context) return reply.code(400).send({error: 'EMAIL_VERIFICATION_UNAVAILABLE'}); const email = normalizeEmail(parsed.data.email);
    try { const result = await identityPlatformRequest('accounts:signInWithEmailLink', {email, oobCode: parsed.data.oobCode}); const providerEmail = normalizeEmail(String(result.email ?? email)); if (providerEmail !== email || !result.localId) throw new Error('EMAIL_VERIFICATION_FAILED'); await pool.query('UPDATE private_portal.registration_contexts SET verified_email=$2,email_verified_at=now(),identity_provider_uid=$3 WHERE id=$1', [context.id, email, String(result.localId)]); await audit('EMAIL_VERIFIED', 'NOTICE', 'ANONYMOUS', request, {invitationId: context.invitation_id}, {emailHash: sha256(email), provider: 'GOOGLE_IDENTITY_PLATFORM'}); return {verified: true, email}; }
    catch (error) { app.log.warn({providerCode: (error as {providerCode?: string}).providerCode}, 'identity platform email completion failed'); return reply.code(401).send({error: 'EMAIL_VERIFICATION_FAILED'}); }
  });
  app.get('/api/v1/access/status', async (request, reply) => {
    const admin = await adminSession(request); if (admin) return {granted: true, reason: 'ADMIN_SESSION', role: admin.role}; const visitor = await visitorSession(request, reply); if (visitor.granted) return visitor;
    const context = await getRegistrationContext(request); if (context?.purpose === 'PENDING_APPROVAL' && context.visitor_id) { const row = (await pool.query(`SELECT v.status,(SELECT id FROM private_portal.nda_acceptances WHERE visitor_id=v.id AND revoked_at IS NULL ORDER BY accepted_at_utc DESC LIMIT 1) AS acceptance_id FROM private_portal.visitors v WHERE v.id=$1`, [context.visitor_id])).rows[0]; if (row?.status === 'ACTIVE' && row.acceptance_id) { await createVisitorSession(reply, context.visitor_id, context.invitation_id, row.acceptance_id, request); await pool.query('UPDATE private_portal.registration_contexts SET consumed_at=now() WHERE id=$1', [context.id]); reply.clearCookie(registrationCookie, {path: '/'}); return {granted: true, reason: 'APPROVED', visitorId: context.visitor_id}; } if (row?.status === 'REVOKED') return {granted: false, reason: 'ACCESS_REVOKED'}; return {granted: false, reason: 'PENDING_APPROVAL'}; }
    return visitor;
  });
  app.post('/api/v1/access/register', {config: {rateLimit: {max: 10, timeWindow: '15 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; const parsed = RegisterBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_REGISTRATION', issues: parsed.error.flatten()}); const context = await getRegistrationContext(request); if (!context) return reply.code(401).send({error: 'REGISTRATION_CONTEXT_REQUIRED'});
    const input = parsed.data; const email = normalizeEmail(input.email); if (!invitationAllowsEmail({intendedRecipientEmail: context.intended_recipient_email, allowedEmailDomain: context.allowed_email_domain}, email)) { await audit('REGISTRATION_POLICY_REJECTED', 'WARNING', 'ANONYMOUS', request, {invitationId: context.invitation_id}); return reply.code(403).send({error: 'REGISTRATION_NOT_AVAILABLE'}); }
    if (emailVerificationProvider !== 'NONE' && (!context.email_verified_at || normalizeEmail(context.verified_email ?? '') !== email)) { await audit('UNVERIFIED_EMAIL_REJECTED', 'WARNING', 'ANONYMOUS', request, {invitationId: context.invitation_id}); return reply.code(403).send({error: 'EMAIL_VERIFICATION_REQUIRED'}); }
    const client = await pool.connect(); let visitorId = context.visitor_id as string | null; let newVisitor = false; let acceptanceId = ''; let acceptedAtUtc = ''; let evidence = ''; let pdf = Buffer.alloc(0);
    try { await client.query('BEGIN'); const invitation = (await client.query(`SELECT i.*,d.version,d.legal_status,d.content,d.content_sha256 FROM private_portal.invitations i JOIN private_portal.nda_documents d ON d.id=i.nda_document_id WHERE i.id=$1 FOR UPDATE`, [context.invitation_id])).rows[0]; const now = Date.now();
      if (!invitation || invitation.status === 'REVOKED' || new Date(invitation.valid_from).getTime() > now || new Date(invitation.expires_at).getTime() <= now) throw Object.assign(new Error('INVITATION_UNAVAILABLE'), {statusCode: 404});
      const existing = await client.query('SELECT * FROM private_portal.visitors WHERE invitation_id=$1 AND lower(email)=lower($2)', [invitation.id, email]);
      if (visitorId) { const expected = existing.rows.find((row) => row.id === visitorId); if (!expected || expected.status === 'REVOKED') throw Object.assign(new Error('REGISTRATION_NOT_AVAILABLE'), {statusCode: 403}); }
      else if (existing.rowCount) { throw Object.assign(new Error('IDENTITY_ALREADY_REGISTERED'), {statusCode: 409}); }
      else { if (invitation.status === 'CONSUMED' || (invitation.policy === 'SINGLE_VISITOR' && invitation.registration_count >= 1) || (invitation.max_registrations && invitation.registration_count >= invitation.max_registrations)) throw Object.assign(new Error('REGISTRATION_LIMIT_REACHED'), {statusCode: 409}); const names = splitName(input.fullName); visitorId = randomUUID(); const status = invitation.manual_approval_required ? 'PENDING_APPROVAL' : 'ACTIVE'; await client.query(`INSERT INTO private_portal.visitors(id,invitation_id,first_name,last_name,full_name,email,organisation,role,country,registered_address,status,scopes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [visitorId, invitation.id, names.firstName, names.lastName, names.fullName, email, input.organisation, input.role, input.country, input.registeredAddress, status, invitation.scopes]); await client.query(`UPDATE private_portal.invitations SET registration_count=registration_count+1,status=CASE WHEN policy='SINGLE_VISITOR' OR (max_registrations IS NOT NULL AND registration_count+1>=max_registrations) THEN 'CONSUMED' ELSE status END WHERE id=$1`, [invitation.id]); newVisitor = true; }
      await client.query('UPDATE private_portal.visitors SET organisation=$2,role=$3,country=$4,registered_address=$5 WHERE id=$1', [visitorId, input.organisation, input.role, input.country, input.registeredAddress]);
      acceptedAtUtc = new Date().toISOString(); const network = sourceIp(request); const snapshot = {document: invitation.content, documentHash: invitation.content_sha256, privacy: privacyNotice, recipient: {fullName: input.fullName.trim(), email, organisation: input.organisation, role: input.role, country: input.country, registeredAddress: input.registeredAddress, typedSignature: input.typedSignature.trim(), signatureIntentConfirmed: true}, invitationPublicId: invitation.public_id, acceptedAtUtc, maskedNetwork: maskIp(network)};
      evidence = evidenceHash({ndaVersion: invitation.version, documentHash: invitation.content_sha256, visitorId, email, organisation: input.organisation, registeredAddress: input.registeredAddress, typedSignature: input.typedSignature.trim(), signatureMethod: 'TYPED_NAME_WITH_AFFIRMATIVE_INTENT', acceptedAtUtc, invitationPublicId: invitation.public_id}); pdf = await buildNdaPdf(snapshot, evidence); acceptanceId = randomUUID();
      await client.query(`INSERT INTO private_portal.nda_acceptances(id,nda_document_id,nda_version,nda_content_hash,invitation_id,visitor_id,full_name,email,organisation,role,country,registered_address,typed_signature,signature_method,signature_intent_confirmed,nda_confirmed,privacy_confirmed,accepted_at_utc,user_agent,encrypted_ip,ip_key_version,ip_fingerprint,masked_ip,evidence_hash,document_snapshot,pdf_bytes,pdf_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'TYPED_NAME_WITH_AFFIRMATIVE_INTENT',true,true,true,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`, [acceptanceId, invitation.nda_document_id, invitation.version, invitation.content_sha256, invitation.id, visitorId, input.fullName.trim(), email, input.organisation, input.role, input.country, input.registeredAddress, input.typedSignature.trim(), acceptedAtUtc, userAgent(request), encryptIp(network, ipEncryptionKey, ipKeyVersion), ipKeyVersion, hmacHex(network, ipFingerprintSecret), maskIp(network), evidence, JSON.stringify(snapshot), pdf, sha256(pdf)]); await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); const typed = error as Error & {statusCode?: number}; return reply.code(typed.statusCode ?? 500).send({error: typed.statusCode ? typed.message : 'REGISTRATION_FAILED'}); } finally { client.release(); }
    const ids = {visitorId: visitorId!, invitationId: context.invitation_id, acceptanceId}; const emailStatus = await sendNdaEvidence(email, input.fullName, pdf, context.version, acceptedAtUtc, evidence, ids); await pool.query('UPDATE private_portal.nda_acceptances SET email_delivery_status=$1 WHERE id=$2', [emailStatus, acceptanceId]);
    await audit('REGISTRATION_COMPLETED', 'NOTICE', 'VISITOR', request, {actorId: visitorId!, visitorId: visitorId!, invitationId: context.invitation_id}, {newVisitor}); await audit('NDA_ACCEPTED', 'NOTICE', 'VISITOR', request, {actorId: visitorId!, visitorId: visitorId!, invitationId: context.invitation_id}, {acceptanceId, ndaVersion: context.version, evidenceHash: evidence});
    if (context.manual_approval_required && newVisitor) { await pool.query("UPDATE private_portal.registration_contexts SET visitor_id=$2,purpose='PENDING_APPROVAL',expires_at=now()+interval '24 hours' WHERE id=$1", [context.id, visitorId]); return {granted: false, reason: 'PENDING_APPROVAL', acceptanceId, acceptedAtUtc, evidenceHash: evidence, emailStatus, legalStatus: context.legal_status}; }
    await createVisitorSession(reply, visitorId!, context.invitation_id, acceptanceId, request); await pool.query('UPDATE private_portal.registration_contexts SET consumed_at=now() WHERE id=$1', [context.id]); reply.clearCookie(registrationCookie, {path: '/'}); return {granted: true, reason: 'ACCESS_VERIFIED', acceptanceId, acceptedAtUtc, evidenceHash: evidence, emailStatus, legalStatus: context.legal_status};
  });
  app.get('/api/v1/access/nda-copy', async (request, reply) => { const session = await visitorSession(request, reply); if (!session.granted) return reply.code(401).send({error: session.reason}); const row = (await pool.query('SELECT nda_version,evidence_hash,pdf_bytes FROM private_portal.nda_acceptances WHERE id=$1 AND revoked_at IS NULL', [session.acceptanceId])).rows[0]; if (!row?.pdf_bytes) return reply.code(404).send({error: 'DOCUMENT_UNAVAILABLE'}); await audit('REPORT_DOWNLOADED', 'INFO', 'VISITOR', request, {actorId: session.visitorId!, visitorId: session.visitorId!, sessionId: session.sessionId!}, {kind: 'NDA_PDF', evidenceHash: row.evidence_hash}); return reply.type('application/pdf').header('Content-Disposition', `attachment; filename="UP AI DOWN-${row.nda_version}-${row.evidence_hash.slice(0, 12)}.pdf"`).send(row.pdf_bytes); });
  app.get('/api/v1/access/check', async (request, reply) => { if (await adminSession(request, false)) return reply.code(204).send(); const originalUri = String(request.headers['x-original-uri'] ?? ''); if (originalUri.startsWith('/demo/dev/')) return reply.header('X-Access-Reason', 'ADMIN_REQUIRED').code(401).send(); const session = await visitorSession(request, undefined, false); return session.granted ? reply.code(204).send() : reply.header('X-Access-Reason', session.reason).code(401).send(); });

  app.post('/api/v1/admin/login', {config: {rateLimit: {max: 8, timeWindow: '15 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; const parsed = LoginBody.safeParse(request.body); if (!parsed.success) return reply.code(401).send({error: 'INVALID_CREDENTIALS'}); const user = (await pool.query("SELECT * FROM private_portal.admin_users WHERE lower(email)=lower($1) AND status='ACTIVE'", [parsed.data.email])).rows[0]; const passwordValid = user && verifyPassword(parsed.data.password, user.password_hash); const mfaEnabled = Boolean(user?.mfa_enabled); let mfaSecret = '';
    if (mfaEnabled) { try { mfaSecret = user.mfa_secret_encrypted ? decryptSecret(user.mfa_secret_encrypted, adminMfaEncryptionKey) : (normalizeEmail(user.email) === adminEmail ? adminTotpSecret : ''); } catch { mfaSecret = ''; } }
    const mfaValid = !mfaEnabled || Boolean(mfaSecret && parsed.data.mfaCode && verifyTotp(mfaSecret, parsed.data.mfaCode));
    if (!passwordValid || !mfaValid || (adminMfaRequired && !mfaEnabled)) { await audit('ADMIN_LOGIN_FAILURE', 'WARNING', 'ANONYMOUS', request, {}, {mfaAttempted: Boolean(parsed.data.mfaCode)}); return reply.code(401).send({error: 'INVALID_CREDENTIALS'}); }
    return createAdminSession(user, request, reply);
  });
  app.post('/api/v1/admin/dev-login', {config: {rateLimit: {max: 5, timeWindow: '15 minutes'}}}, async (request, reply) => {
    if (!trustedOrigin(request, reply)) return; const parsed = DevLoginBody.safeParse(request.body);
    const available = devLoginEnabled && devLoginExpiry > Date.now() && devLoginToken.length >= 32;
    if (!available || !parsed.success || !safeEqual(parsed.data.token, devLoginToken)) { await audit('ADMIN_DEV_LOGIN_FAILURE', 'SECURITY', 'ANONYMOUS', request); return reply.code(404).send({error: 'DEV_ACCESS_UNAVAILABLE'}); }
    const user = (await pool.query("SELECT * FROM private_portal.admin_users WHERE lower(email)=lower($1) AND status='ACTIVE'", [adminEmail])).rows[0];
    if (!user) return reply.code(404).send({error: 'DEV_ACCESS_UNAVAILABLE'});
    return createAdminSession(user, request, reply, 'ADMIN_DEV_LOGIN_SUCCESS');
  });
  app.get('/api/v1/admin/session', async (request, reply) => { const session = await requireAdmin(request, reply); if (!session) return; const profile = (await pool.query('SELECT display_name,mfa_enabled FROM private_portal.admin_users WHERE id=$1', [session.admin_user_id])).rows[0]; return {authenticated: true, email: session.email, role: session.role, displayName: profile?.display_name ?? '', mfa: Boolean(profile?.mfa_enabled)}; });
  app.post('/api/v1/admin/logout', async (request, reply) => { const session = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']); if (!session) return; await pool.query("UPDATE private_portal.admin_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='LOGOUT' WHERE id=$1", [session.id]); reply.clearCookie(adminCookie, {path: '/'}).clearCookie(csrfCookie, {path: '/'}); await audit('ADMIN_LOGOUT', 'INFO', 'ADMIN', request, {actorId: session.admin_user_id, adminId: session.admin_user_id, sessionId: session.id}); return {authenticated: false}; });
  app.get('/api/v1/admin/team', async (request, reply) => {
    const admin = await requireAdmin(request, reply); if (!admin) return;
    const members = (await pool.query(`SELECT id,email,display_name,role,status,mfa_enabled,created_at,last_login_at,disabled_at FROM private_portal.admin_users ORDER BY CASE role WHEN 'OWNER' THEN 1 WHEN 'ADMIN' THEN 2 WHEN 'EDITOR' THEN 3 ELSE 4 END,created_at`)).rows;
    const invitations = ['OWNER', 'ADMIN'].includes(admin.role) ? (await pool.query(`SELECT id,email,display_name,role,status,created_at,expires_at FROM private_portal.team_invitations WHERE status IN ('ACTIVE','EXPIRED') ORDER BY created_at DESC`)).rows : [];
    return {current: {id: admin.admin_user_id, email: admin.email, role: admin.role}, members, invitations};
  });
  app.post('/api/v1/admin/team/invitations', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER']); if (!admin) return; const parsed = CreateTeamInvitationBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_TEAM_INVITATION', issues: parsed.error.flatten()}); const input = parsed.data; const email = normalizeEmail(input.email);
    if ((await pool.query('SELECT 1 FROM private_portal.admin_users WHERE lower(email)=lower($1)', [email])).rowCount) return reply.code(409).send({error: 'TEAM_ACCOUNT_EXISTS'});
    await pool.query("UPDATE private_portal.team_invitations SET status='EXPIRED' WHERE status='ACTIVE' AND expires_at<=now()"); if ((await pool.query("SELECT 1 FROM private_portal.team_invitations WHERE lower(email)=lower($1) AND status='ACTIVE'", [email])).rowCount) return reply.code(409).send({error: 'TEAM_INVITATION_EXISTS'});
    const raw = randomOpaqueToken(); const secret = generateTotpSecret(); const id = randomUUID();
    await pool.query(`INSERT INTO private_portal.team_invitations(id,token_hash,email,display_name,role,mfa_secret_encrypted,status,created_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,'ACTIVE',$7,$8)`, [id, hmacHex(raw, invitationSecret), email, input.displayName, input.role, encryptSecret(secret, adminMfaEncryptionKey), admin.admin_user_id, new Date(input.expiresAt)]);
    await audit('TEAM_INVITATION_CREATED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {teamInvitationId: id, emailHash: sha256(email), role: input.role});
    return reply.code(201).send({id, shareUrl: `${publicBaseUrl}/demo/admin/join#token=${raw}`, warning: 'This team invitation is shown once and requires individual MFA enrollment.'});
  });
  app.post('/api/v1/admin/team/invitations/:id/revoke', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER']); if (!admin) return; const id = (request.params as {id: string}).id;
    await pool.query("UPDATE private_portal.team_invitations SET status='REVOKED',revoked_at=now(),revoked_by=$2 WHERE id=$1 AND status='ACTIVE'", [id, admin.admin_user_id]); await audit('TEAM_INVITATION_REVOKED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {teamInvitationId: id}); return {revoked: true};
  });
  app.patch('/api/v1/admin/team/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER']); if (!admin) return; const parsed = UpdateTeamMemberBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_TEAM_UPDATE'}); const id = (request.params as {id: string}).id; const target = (await pool.query('SELECT id,role,status FROM private_portal.admin_users WHERE id=$1', [id])).rows[0]; if (!target) return reply.code(404).send({error: 'NOT_FOUND'});
    const removesOwner = target.role === 'OWNER' && (parsed.data.role && parsed.data.role !== 'OWNER' || parsed.data.status === 'DISABLED'); if (removesOwner && Number((await pool.query("SELECT count(*)::int AS count FROM private_portal.admin_users WHERE role='OWNER' AND status='ACTIVE' AND id<>$1", [id])).rows[0].count) < 1) return reply.code(409).send({error: 'LAST_OWNER_REQUIRED'}); if (id === admin.admin_user_id && parsed.data.status === 'DISABLED') return reply.code(409).send({error: 'CANNOT_DISABLE_CURRENT_SESSION'});
    await pool.query(`UPDATE private_portal.admin_users SET role=COALESCE($2,role),status=COALESCE($3,status),disabled_at=CASE WHEN $3='DISABLED' THEN now() WHEN $3='ACTIVE' THEN NULL ELSE disabled_at END,disabled_by=CASE WHEN $3='DISABLED' THEN $4 WHEN $3='ACTIVE' THEN NULL ELSE disabled_by END WHERE id=$1`, [id, parsed.data.role ?? null, parsed.data.status ?? null, admin.admin_user_id]);
    if (parsed.data.status === 'DISABLED') await pool.query("UPDATE private_portal.admin_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='ACCOUNT_DISABLED' WHERE admin_user_id=$1 AND status='ACTIVE'", [id]); await audit('TEAM_MEMBER_UPDATED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {targetAdminId: id, ...parsed.data}); return {updated: true};
  });
  app.post('/api/v1/admin/team/:id/recovery', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER']); if (!admin) return; const parsed = CreateAdminRecoveryBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_RECOVERY_EXPIRY'}); const id = (request.params as {id: string}).id; const target = (await pool.query("SELECT id,email FROM private_portal.admin_users WHERE id=$1 AND status='ACTIVE'", [id])).rows[0]; if (!target) return reply.code(404).send({error: 'NOT_FOUND'}); const raw = randomOpaqueToken(); const secret = generateTotpSecret(); await pool.query("UPDATE private_portal.admin_password_resets SET status='REVOKED' WHERE admin_user_id=$1 AND status='ACTIVE'", [id]); const resetId = randomUUID(); await pool.query(`INSERT INTO private_portal.admin_password_resets(id,admin_user_id,token_hash,mfa_secret_encrypted,status,created_by,expires_at) VALUES($1,$2,$3,$4,'ACTIVE',$5,$6)`, [resetId, id, hmacHex(raw, invitationSecret), encryptSecret(secret, adminMfaEncryptionKey), admin.admin_user_id, new Date(parsed.data.expiresAt)]); await audit('ADMIN_RECOVERY_CREATED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {targetAdminId: id, resetId, emailHash: sha256(target.email)}); return reply.code(201).send({shareUrl: `${publicBaseUrl}/demo/admin/recover#token=${raw}`, warning: 'This recovery link rotates both the password and MFA factor and is shown once.'});
  });
  app.post('/api/v1/admin/mfa/begin', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply); if (!admin) return; const secret = generateTotpSecret(); await pool.query(`INSERT INTO private_portal.admin_mfa_enrollments(id,admin_user_id,secret_encrypted,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes') ON CONFLICT(admin_user_id) DO UPDATE SET id=excluded.id,secret_encrypted=excluded.secret_encrypted,created_at=now(),expires_at=excluded.expires_at`, [randomUUID(), admin.admin_user_id, encryptSecret(secret, adminMfaEncryptionKey)]); await audit('ADMIN_MFA_ENROLLMENT_STARTED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}); return {secret, otpauthUri: `otpauth://totp/${encodeURIComponent(`UP AI DOWN:${admin.email}`)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent('UP AI DOWN')}`, expiresInSeconds: 600};
  });
  app.post('/api/v1/admin/mfa/confirm', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply); if (!admin) return; const parsed = ConfirmMfaBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_MFA_CODE'}); const enrollment = (await pool.query('SELECT * FROM private_portal.admin_mfa_enrollments WHERE admin_user_id=$1 AND expires_at>now()', [admin.admin_user_id])).rows[0]; if (!enrollment) return reply.code(404).send({error: 'MFA_ENROLLMENT_EXPIRED'}); const secret = decryptSecret(enrollment.secret_encrypted, adminMfaEncryptionKey); if (!verifyTotp(secret, parsed.data.code)) return reply.code(401).send({error: 'INVALID_MFA_CODE'}); const client = await pool.connect(); try { await client.query('BEGIN'); await client.query('UPDATE private_portal.admin_users SET mfa_enabled=true,mfa_secret_encrypted=$2 WHERE id=$1', [admin.admin_user_id, enrollment.secret_encrypted]); await client.query('DELETE FROM private_portal.admin_mfa_enrollments WHERE admin_user_id=$1', [admin.admin_user_id]); await client.query('COMMIT'); } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } await audit('ADMIN_MFA_ENABLED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}); return {enabled: true};
  });
  app.get('/api/v1/admin/briefing', async (request, reply) => { if (!await requireAdmin(request, reply)) return; const documents = (await pool.query("SELECT version,title,legal_status AS status,jurisdiction,governing_law,signature_profile FROM private_portal.nda_documents WHERE legal_status<>'RETIRED' ORDER BY jurisdiction,version")).rows; return {...briefing, nda: {version: nda.version, status: nda.status, title: nda.title, notice: nda.notice}, ndaDocuments: documents, defaultInviteUrl: defaultInviteToken ? `${publicBaseUrl}/demo/access/${defaultInviteToken}` : null}; });
  app.get('/api/v1/admin/dashboard', async (request, reply) => { if (!await requireAdmin(request, reply)) return; const [kpis, recent] = await Promise.all([pool.query(`SELECT (SELECT count(*) FROM private_portal.invitations)::int invitations_issued,(SELECT count(*) FROM private_portal.invitations WHERE status='ACTIVE' AND expires_at>now())::int active_invitations,(SELECT count(*) FROM private_portal.visitors)::int registered_visitors,(SELECT count(*) FROM private_portal.visitors WHERE status='PENDING_APPROVAL')::int pending_approvals,(SELECT count(*) FROM private_portal.nda_acceptances WHERE revoked_at IS NULL)::int nda_accepted,(SELECT count(*) FROM private_portal.visitor_sessions WHERE status='ACTIVE' AND expires_at>now() AND idle_expires_at>now())::int active_sessions,(SELECT count(*) FROM private_portal.project_tasks WHERE status NOT IN ('DONE','ARCHIVED'))::int open_tasks,(SELECT count(*) FROM private_portal.project_tasks WHERE status NOT IN ('DONE','ARCHIVED') AND due_at<now())::int overdue_tasks,(SELECT count(*) FROM private_portal.project_events WHERE status='SCHEDULED' AND starts_at>=now())::int upcoming_events,(SELECT count(*) FROM private_portal.project_notes WHERE status='ACTIVE' AND pinned=true)::int pinned_notes`), pool.query('SELECT event_type,severity,actor_type,timestamp_utc,masked_ip,metadata FROM private_portal.audit_events ORDER BY timestamp_utc DESC LIMIT 30')]); return {kpis: kpis.rows[0], recentActivity: recent.rows}; });
  app.get('/api/v1/admin/workspace', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const [events, tasks, notes, decisions, comments, history] = await Promise.all([
      pool.query("SELECT * FROM private_portal.project_events WHERE status<>'ARCHIVED' ORDER BY starts_at ASC, created_at ASC"),
      pool.query("SELECT * FROM private_portal.project_tasks WHERE status<>'ARCHIVED' ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, due_at ASC NULLS LAST, created_at DESC"),
      pool.query("SELECT * FROM private_portal.project_notes WHERE status='ACTIVE' ORDER BY pinned DESC, updated_at DESC"),
      pool.query(`SELECT d.*,u.display_name AS owner_name FROM private_portal.project_decisions d LEFT JOIN private_portal.admin_users u ON u.id=d.owner_admin_id WHERE d.status<>'ARCHIVED' ORDER BY CASE d.status WHEN 'PROPOSED' THEN 1 WHEN 'REVISIT' THEN 2 ELSE 3 END,d.updated_at DESC`),
      pool.query(`SELECT c.*,u.display_name AS author_name,u.email AS author_email FROM private_portal.project_comments c JOIN private_portal.admin_users u ON u.id=c.created_by WHERE c.status='ACTIVE' ORDER BY c.created_at ASC`),
      pool.query(`SELECT h.*,u.display_name AS author_name,u.email AS author_email FROM private_portal.project_change_history h JOIN private_portal.admin_users u ON u.id=h.changed_by ORDER BY h.changed_at DESC LIMIT 100`),
    ]);
    return {events: events.rows, tasks: tasks.rows, notes: notes.rows, decisions: decisions.rows, comments: comments.rows, history: history.rows};
  });
  app.post('/api/v1/admin/events', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return;
    const parsed = CreateProjectEventBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_EVENT', issues: parsed.error.flatten()});
    const input = parsed.data; const id = randomUUID();
    const result = await pool.query(`INSERT INTO private_portal.project_events(id,title,description,starts_at,ends_at,timezone,location,event_type,status,priority,owner_name,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12) RETURNING *`, [id, input.title, input.description, new Date(input.startsAt), input.endsAt ? new Date(input.endsAt) : null, input.timezone, input.location, input.eventType, input.status, input.priority, input.ownerName, admin.admin_user_id]);
    await recordProjectChange('EVENT', id, 'CREATED', admin.admin_user_id, input); await audit('PROJECT_EVENT_CREATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {eventId: id, eventType: input.eventType});
    return reply.code(201).send(result.rows[0]);
  });
  app.patch('/api/v1/admin/events/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return;
    const parsed = UpdateProjectEventBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_EVENT_UPDATE', issues: parsed.error.flatten()});
    const id = (request.params as {id: string}).id; const input = parsed.data; const hasEndsAt = Object.hasOwn(input, 'endsAt');
    const current = (await pool.query('SELECT starts_at,ends_at FROM private_portal.project_events WHERE id=$1', [id])).rows[0];
    if (!current) return reply.code(404).send({error: 'NOT_FOUND'});
    const nextStartsAt = input.startsAt ? new Date(input.startsAt) : new Date(current.starts_at);
    const nextEndsAt = hasEndsAt ? (input.endsAt ? new Date(input.endsAt) : null) : (current.ends_at ? new Date(current.ends_at) : null);
    if (nextEndsAt && nextEndsAt <= nextStartsAt) return reply.code(400).send({error: 'INVALID_EVENT_INTERVAL'});
    const result = await pool.query(`UPDATE private_portal.project_events SET title=COALESCE($2,title),description=COALESCE($3,description),starts_at=COALESCE($4,starts_at),ends_at=CASE WHEN $5 THEN $6 ELSE ends_at END,timezone=COALESCE($7,timezone),location=COALESCE($8,location),event_type=COALESCE($9,event_type),status=COALESCE($10,status),priority=COALESCE($11,priority),owner_name=COALESCE($12,owner_name),updated_by=$13,updated_at=now() WHERE id=$1 RETURNING *`, [id, input.title ?? null, input.description ?? null, input.startsAt ? new Date(input.startsAt) : null, hasEndsAt, input.endsAt ? new Date(input.endsAt) : null, input.timezone ?? null, input.location ?? null, input.eventType ?? null, input.status ?? null, input.priority ?? null, input.ownerName ?? null, admin.admin_user_id]);
    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});
    await recordProjectChange('EVENT', id, 'UPDATED', admin.admin_user_id, input); await audit('PROJECT_EVENT_UPDATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {eventId: id, changed: Object.keys(input)});
    return result.rows[0];
  });
  app.post('/api/v1/admin/tasks', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return;
    const parsed = CreateProjectTaskBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_TASK', issues: parsed.error.flatten()});
    const input = parsed.data; const id = randomUUID();
    const result = await pool.query(`INSERT INTO private_portal.project_tasks(id,title,description,owner_name,due_at,status,priority,linked_event_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`, [id, input.title, input.description, input.ownerName, input.dueAt ? new Date(input.dueAt) : null, input.status, input.priority, input.linkedEventId ?? null, admin.admin_user_id]);
    await recordProjectChange('TASK', id, 'CREATED', admin.admin_user_id, input); await audit('PROJECT_TASK_CREATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {taskId: id, priority: input.priority});
    return reply.code(201).send(result.rows[0]);
  });
  app.patch('/api/v1/admin/tasks/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return;
    const parsed = UpdateProjectTaskBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_TASK_UPDATE', issues: parsed.error.flatten()});
    const id = (request.params as {id: string}).id; const input = parsed.data; const hasDueAt = Object.hasOwn(input, 'dueAt'); const hasLinkedEvent = Object.hasOwn(input, 'linkedEventId');
    const result = await pool.query(`UPDATE private_portal.project_tasks SET title=COALESCE($2,title),description=COALESCE($3,description),owner_name=COALESCE($4,owner_name),due_at=CASE WHEN $5 THEN $6 ELSE due_at END,status=COALESCE($7,status),priority=COALESCE($8,priority),linked_event_id=CASE WHEN $9 THEN $10 ELSE linked_event_id END,updated_by=$11,updated_at=now() WHERE id=$1 RETURNING *`, [id, input.title ?? null, input.description ?? null, input.ownerName ?? null, hasDueAt, input.dueAt ? new Date(input.dueAt) : null, input.status ?? null, input.priority ?? null, hasLinkedEvent, input.linkedEventId ?? null, admin.admin_user_id]);
    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});
    await recordProjectChange('TASK', id, 'UPDATED', admin.admin_user_id, input); await audit('PROJECT_TASK_UPDATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {taskId: id, changed: Object.keys(input)});
    return result.rows[0];
  });
  app.post('/api/v1/admin/notes', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return;
    const parsed = CreateProjectNoteBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_NOTE', issues: parsed.error.flatten()});
    const input = parsed.data; const id = randomUUID();
    const result = await pool.query(`INSERT INTO private_portal.project_notes(id,title,body,category,pinned,status,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`, [id, input.title, input.body, input.category, input.pinned, input.status, admin.admin_user_id]);
    await recordProjectVersion('NOTE', id, admin.admin_user_id, result.rows[0]); await recordProjectChange('NOTE', id, 'CREATED', admin.admin_user_id, input); await audit('PROJECT_NOTE_CREATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {noteId: id, category: input.category});
    return reply.code(201).send(result.rows[0]);
  });
  app.patch('/api/v1/admin/notes/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return;
    const parsed = UpdateProjectNoteBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_NOTE_UPDATE', issues: parsed.error.flatten()});
    const id = (request.params as {id: string}).id; const input = parsed.data; const hasPinned = Object.hasOwn(input, 'pinned');
    const result = await pool.query(`UPDATE private_portal.project_notes SET title=COALESCE($2,title),body=COALESCE($3,body),category=COALESCE($4,category),pinned=CASE WHEN $5 THEN $6 ELSE pinned END,status=COALESCE($7,status),updated_by=$8,updated_at=now() WHERE id=$1 RETURNING *`, [id, input.title ?? null, input.body ?? null, input.category ?? null, hasPinned, input.pinned ?? false, input.status ?? null, admin.admin_user_id]);
    if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'});
    await recordProjectVersion('NOTE', id, admin.admin_user_id, result.rows[0]); await recordProjectChange('NOTE', id, 'UPDATED', admin.admin_user_id, input); await audit('PROJECT_NOTE_UPDATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {noteId: id, changed: Object.keys(input)});
    return result.rows[0];
  });
  app.get('/api/v1/admin/notes/:id/versions', async (request, reply) => {
    if (!await requireAdmin(request, reply)) return; const id = (request.params as {id: string}).id;
    return (await pool.query('SELECT version_number,snapshot,changed_by,changed_at FROM private_portal.project_note_versions WHERE note_id=$1 ORDER BY version_number DESC', [id])).rows;
  });
  app.post('/api/v1/admin/decisions', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return; const parsed = CreateProjectDecisionBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_DECISION', issues: parsed.error.flatten()}); const input = parsed.data; const id = randomUUID();
    const result = await pool.query(`INSERT INTO private_portal.project_decisions(id,title,context,decision,alternatives,consequences,owner_admin_id,status,decision_at,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`, [id, input.title, input.context, input.decision, input.alternatives, input.consequences, input.ownerAdminId ?? null, input.status, input.decisionAt ? new Date(input.decisionAt) : input.status === 'DECIDED' ? new Date() : null, admin.admin_user_id]); await recordProjectVersion('DECISION', id, admin.admin_user_id, result.rows[0]); await recordProjectChange('DECISION', id, 'CREATED', admin.admin_user_id, input); await audit('PROJECT_DECISION_CREATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {decisionId: id, status: input.status}); return reply.code(201).send(result.rows[0]);
  });
  app.patch('/api/v1/admin/decisions/:id', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return; const parsed = UpdateProjectDecisionBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_DECISION_UPDATE', issues: parsed.error.flatten()}); const id = (request.params as {id: string}).id; const input = parsed.data; const hasOwner = Object.hasOwn(input, 'ownerAdminId'); const hasDecisionAt = Object.hasOwn(input, 'decisionAt');
    const result = await pool.query(`UPDATE private_portal.project_decisions SET title=COALESCE($2,title),context=COALESCE($3,context),decision=COALESCE($4,decision),alternatives=COALESCE($5,alternatives),consequences=COALESCE($6,consequences),owner_admin_id=CASE WHEN $7 THEN $8 ELSE owner_admin_id END,status=COALESCE($9,status),decision_at=CASE WHEN $10 THEN $11 WHEN $9='DECIDED' AND decision_at IS NULL THEN now() ELSE decision_at END,updated_by=$12,updated_at=now() WHERE id=$1 RETURNING *`, [id, input.title ?? null, input.context ?? null, input.decision ?? null, input.alternatives ?? null, input.consequences ?? null, hasOwner, input.ownerAdminId ?? null, input.status ?? null, hasDecisionAt, input.decisionAt ? new Date(input.decisionAt) : null, admin.admin_user_id]); if (!result.rowCount) return reply.code(404).send({error: 'NOT_FOUND'}); await recordProjectVersion('DECISION', id, admin.admin_user_id, result.rows[0]); await recordProjectChange('DECISION', id, 'UPDATED', admin.admin_user_id, input); await audit('PROJECT_DECISION_UPDATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {decisionId: id, changed: Object.keys(input)}); return result.rows[0];
  });
  app.get('/api/v1/admin/decisions/:id/versions', async (request, reply) => { if (!await requireAdmin(request, reply)) return; const id = (request.params as {id: string}).id; return (await pool.query('SELECT version_number,snapshot,changed_by,changed_at FROM private_portal.project_decision_versions WHERE decision_id=$1 ORDER BY version_number DESC', [id])).rows; });
  app.post('/api/v1/admin/comments', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply, ['OWNER', 'ADMIN', 'EDITOR']); if (!admin) return; const parsed = CreateProjectCommentBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_COMMENT', issues: parsed.error.flatten()}); const input = parsed.data; const tables = {EVENT: 'project_events', TASK: 'project_tasks', NOTE: 'project_notes', DECISION: 'project_decisions'} as const; if (!(await pool.query(`SELECT 1 FROM private_portal.${tables[input.entityType]} WHERE id=$1`, [input.entityId])).rowCount) return reply.code(404).send({error: 'NOT_FOUND'}); const id = randomUUID(); const result = await pool.query(`INSERT INTO private_portal.project_comments(id,entity_type,entity_id,body,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *`, [id, input.entityType, input.entityId, input.body, admin.admin_user_id]); await recordProjectChange(input.entityType, input.entityId, 'COMMENTED', admin.admin_user_id, {commentId: id}); await audit('PROJECT_COMMENT_CREATED', 'INFO', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {commentId: id, entityType: input.entityType, entityId: input.entityId}); return reply.code(201).send(result.rows[0]);
  });
  app.get('/api/v1/admin/invitations', async (request, reply) => { if (!await requireAdmin(request, reply)) return; return (await pool.query(`SELECT i.id,i.public_id,i.name,i.organisation_name,i.policy,i.created_at,i.valid_from,i.expires_at,i.registration_count,i.max_registrations,i.manual_approval_required,i.status,d.version AS nda_version,count(v.id)::int visitor_count FROM private_portal.invitations i JOIN private_portal.nda_documents d ON d.id=i.nda_document_id LEFT JOIN private_portal.visitors v ON v.invitation_id=i.id GROUP BY i.id,d.version ORDER BY i.created_at DESC`)).rows; });
  app.post('/api/v1/admin/invitations', async (request, reply) => {
    const admin = await requireAdminMutation(request, reply); if (!admin) return; const parsed = CreateInvitationBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_INVITATION', issues: parsed.error.flatten()}); const input = parsed.data; const document = await pool.query("SELECT id FROM private_portal.nda_documents WHERE version=$1 AND legal_status<>'RETIRED' AND ($2::boolean=false OR legal_status='APPROVED')", [input.ndaVersion, externalEnabled]); if (!document.rowCount) return reply.code(400).send({error: 'NDA_VERSION_UNAVAILABLE'}); const raw = randomOpaqueToken(); const id = randomUUID(); const publicId = `inv_${randomOpaqueToken(12)}`;
    const manualApprovalRequired = workflowTestEnabled ? true : input.manualApprovalRequired;
    await pool.query(`INSERT INTO private_portal.invitations(id,public_id,token_hash,name,description,organisation_name,intended_recipient_email,allowed_email_domain,policy,nda_document_id,status,created_by,valid_from,expires_at,max_registrations,manual_approval_required,scopes,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE',$11,$12,$13,$14,$15,$16,$17)`, [id, publicId, hmacHex(raw, invitationSecret), input.name, input.description, input.organisationName, input.intendedRecipientEmail ? normalizeEmail(input.intendedRecipientEmail) : null, input.allowedEmailDomain ? input.allowedEmailDomain.toLowerCase().replace(/^@/, '') : null, input.policy, document.rows[0].id, admin.admin_user_id, input.validFrom ? new Date(input.validFrom) : new Date(), new Date(input.expiresAt), input.policy === 'SINGLE_VISITOR' ? 1 : input.maxRegistrations, manualApprovalRequired, input.scopes, JSON.stringify({internalNotes: input.internalNotes, workflowTest: workflowTestEnabled})]); await audit('INVITATION_CREATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id, invitationId: id}, {publicId, policy: input.policy, manualApprovalRequired}); return reply.code(201).send({id, publicId, shareUrl: `${publicBaseUrl}/demo/access/${raw}`, warning: 'For security reasons this token will not be shown again.'});
  });
  app.get('/api/v1/admin/invitations/:id', async (request, reply) => { if (!await requireAdmin(request, reply)) return; const id = (request.params as {id: string}).id; const [invitation, visitors] = await Promise.all([pool.query('SELECT i.*,d.version AS nda_version FROM private_portal.invitations i JOIN private_portal.nda_documents d ON d.id=i.nda_document_id WHERE i.id=$1', [id]), pool.query('SELECT id,full_name,email,organisation,status,created_at,last_access_at FROM private_portal.visitors WHERE invitation_id=$1 ORDER BY created_at', [id])]); if (!invitation.rowCount) return reply.code(404).send({error: 'NOT_FOUND'}); const {token_hash: _secret, ...safe} = invitation.rows[0]; return {...safe, visitors: visitors.rows}; });
  app.patch('/api/v1/admin/invitations/:id', async (request, reply) => { const admin = await requireAdminMutation(request, reply); if (!admin) return; const parsed = UpdateInvitationBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'INVALID_UPDATE'}); const id = (request.params as {id: string}).id; await pool.query(`UPDATE private_portal.invitations SET expires_at=COALESCE($2,expires_at),max_registrations=COALESCE($3,max_registrations),status=CASE WHEN status='EXPIRED' AND COALESCE($2,expires_at)>now() THEN 'ACTIVE' ELSE status END WHERE id=$1`, [id, parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null, parsed.data.maxRegistrations]); await audit('INVITATION_UPDATED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id, invitationId: id}); return {updated: true}; });
  app.post('/api/v1/admin/invitations/:id/revoke', async (request, reply) => { const admin = await requireAdminMutation(request, reply); if (!admin) return; const parsed = ReasonBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'REASON_REQUIRED'}); const id = (request.params as {id: string}).id; await pool.query("UPDATE private_portal.invitations SET status='REVOKED',revoked_at=now(),revoked_by=$2,revocation_reason=$3 WHERE id=$1", [id, admin.admin_user_id, parsed.data.reason]); await audit('INVITATION_REVOKED', 'WARNING', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id, invitationId: id}, {reason: parsed.data.reason}); return {revoked: true}; });
  app.get('/api/v1/admin/visitors', async (request, reply) => { if (!await requireAdmin(request, reply)) return; const query = request.query as {search?: string; status?: string}; const search = `%${String(query.search ?? '').trim().toLowerCase()}%`; const status = String(query.status ?? ''); return (await pool.query(`SELECT v.id,v.full_name,v.email,v.organisation,v.role,v.country,v.status,v.created_at,v.last_access_at,i.name AS invitation_name,a.nda_version,a.accepted_at_utc,a.masked_ip,a.email_delivery_status,(SELECT status FROM private_portal.visitor_sessions s WHERE s.visitor_id=v.id ORDER BY created_at DESC LIMIT 1) AS session_status FROM private_portal.visitors v JOIN private_portal.invitations i ON i.id=v.invitation_id LEFT JOIN LATERAL (SELECT * FROM private_portal.nda_acceptances a WHERE a.visitor_id=v.id ORDER BY accepted_at_utc DESC LIMIT 1) a ON true WHERE ($1='%%' OR lower(v.full_name) LIKE $1 OR lower(v.email) LIKE $1 OR lower(v.organisation) LIKE $1 OR lower(i.name) LIKE $1) AND ($2='' OR v.status=$2) ORDER BY v.created_at DESC LIMIT 500`, [search, status])).rows; });
  app.get('/api/v1/admin/visitors/:id', async (request, reply) => { if (!await requireAdmin(request, reply)) return; const id = (request.params as {id: string}).id; const [visitor, acceptances, sessions, activity] = await Promise.all([pool.query('SELECT v.*,i.public_id AS invitation_public_id,i.name AS invitation_name,i.policy FROM private_portal.visitors v JOIN private_portal.invitations i ON i.id=v.invitation_id WHERE v.id=$1', [id]), pool.query('SELECT id,nda_version,accepted_at_utc,evidence_hash,pdf_sha256,email_delivery_status,masked_ip,revoked_at FROM private_portal.nda_acceptances WHERE visitor_id=$1 ORDER BY accepted_at_utc DESC', [id]), pool.query('SELECT id,status,created_at,expires_at,idle_expires_at,last_activity_at,invalidation_reason FROM private_portal.visitor_sessions WHERE visitor_id=$1 ORDER BY created_at DESC', [id]), pool.query('SELECT event_type,severity,timestamp_utc,masked_ip,metadata FROM private_portal.audit_events WHERE visitor_id=$1 ORDER BY timestamp_utc DESC LIMIT 100', [id])]); if (!visitor.rowCount) return reply.code(404).send({error: 'NOT_FOUND'}); return {identity: visitor.rows[0], acceptances: acceptances.rows, sessions: sessions.rows, activity: activity.rows}; });
  app.post('/api/v1/admin/visitors/:id/approve', async (request, reply) => { const admin = await requireAdminMutation(request, reply); if (!admin) return; const id = (request.params as {id: string}).id; await pool.query("UPDATE private_portal.visitors SET status='ACTIVE',approved_at=now(),approved_by=$2 WHERE id=$1 AND status='PENDING_APPROVAL'", [id, admin.admin_user_id]); await audit('VISITOR_APPROVED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id, visitorId: id}); return {approved: true}; });
  app.post('/api/v1/admin/visitors/:id/revoke', async (request, reply) => { const admin = await requireAdminMutation(request, reply); if (!admin) return; const parsed = ReasonBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'REASON_REQUIRED'}); const id = (request.params as {id: string}).id; await pool.query("UPDATE private_portal.visitors SET status='REVOKED',revoked_at=now(),revoked_by=$2,revocation_reason=$3 WHERE id=$1", [id, admin.admin_user_id, parsed.data.reason]); await pool.query("UPDATE private_portal.visitor_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='VISITOR_REVOKED' WHERE visitor_id=$1 AND status='ACTIVE'", [id]); await audit('VISITOR_REVOKED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id, visitorId: id}, {reason: parsed.data.reason}); return {revoked: true}; });
  app.post('/api/v1/admin/visitors/:id/reverify', async (request, reply) => { const admin = await requireAdminMutation(request, reply); if (!admin) return; const id = (request.params as {id: string}).id; await pool.query("UPDATE private_portal.visitor_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='ADMIN_REVERIFY' WHERE visitor_id=$1 AND status='ACTIVE'", [id]); await audit('SESSION_REVERIFICATION_REQUIRED', 'WARNING', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id, visitorId: id}); return {reverificationRequired: true}; });
  app.post('/api/v1/admin/sessions/:id/revoke', async (request, reply) => { const admin = await requireAdminMutation(request, reply); if (!admin) return; const parsed = ReasonBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'REASON_REQUIRED'}); const id = (request.params as {id: string}).id; await pool.query("UPDATE private_portal.visitor_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason=$2 WHERE id=$1", [id, parsed.data.reason]); await audit('SESSION_REVOKED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id, sessionId: id}, {reason: parsed.data.reason}); return {revoked: true}; });
  app.get('/api/v1/admin/nda', async (request, reply) => { if (!await requireAdmin(request, reply)) return; return (await pool.query('SELECT a.id,a.visitor_id,a.full_name,a.email,a.organisation,a.nda_version,a.accepted_at_utc,a.evidence_hash,a.pdf_sha256,a.email_delivery_status,a.masked_ip,a.revoked_at FROM private_portal.nda_acceptances a ORDER BY a.accepted_at_utc DESC LIMIT 500')).rows; });
  app.get('/api/v1/admin/nda/:id/pdf', async (request, reply) => { const admin = await requireAdmin(request, reply); if (!admin) return; const id = (request.params as {id: string}).id; const row = (await pool.query('SELECT nda_version,evidence_hash,pdf_bytes FROM private_portal.nda_acceptances WHERE id=$1', [id])).rows[0]; if (!row?.pdf_bytes) return reply.code(404).send({error: 'DOCUMENT_UNAVAILABLE'}); await audit('NDA_EVIDENCE_DOWNLOADED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {acceptanceId: id}); return reply.type('application/pdf').header('Content-Disposition', `attachment; filename="UP AI DOWN-${row.nda_version}-${row.evidence_hash.slice(0, 12)}.pdf"`).send(row.pdf_bytes); });
  app.post('/api/v1/admin/nda/:id/revoke', async (request, reply) => { const admin = await requireAdminMutation(request, reply); if (!admin) return; const parsed = ReasonBody.safeParse(request.body); if (!parsed.success) return reply.code(400).send({error: 'REASON_REQUIRED'}); const id = (request.params as {id: string}).id; const result = await pool.query('UPDATE private_portal.nda_acceptances SET revoked_at=now(),revoked_by=$2,revocation_reason=$3 WHERE id=$1 RETURNING visitor_id', [id, admin.admin_user_id, parsed.data.reason]); if (result.rowCount) await pool.query("UPDATE private_portal.visitor_sessions SET status='INVALIDATED',invalidated_at=now(),invalidation_reason='NDA_REVOKED' WHERE nda_acceptance_id=$1 AND status='ACTIVE'", [id]); await audit('NDA_ACCEPTANCE_REVOKED', 'SECURITY', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id, visitorId: result.rows[0]?.visitor_id}, {acceptanceId: id, reason: parsed.data.reason}); return {revoked: true}; });
  app.get('/api/v1/admin/audit', async (request, reply) => { if (!await requireAdmin(request, reply)) return; return (await pool.query('SELECT event_type,severity,actor_type,visitor_id,admin_id,invitation_id,session_id,timestamp_utc,masked_ip,metadata FROM private_portal.audit_events ORDER BY timestamp_utc DESC LIMIT 500')).rows; });

  // ── New collaborative modules ──────────────────────────────────────────────
  registerMeetingKitRoutes(app, {pool, requireAdmin, requireAdminMutation, audit});
  registerCrmRoutes(app, {pool, requireAdmin, requireAdminMutation, audit});
  registerMaterialsRoutes(app, {pool, requireAdmin, requireAdminMutation, audit});

  app.get('/api/v1/admin/visitors.csv', async (request, reply) => { const admin = await requireAdmin(request, reply, ['OWNER', 'ADMIN']); if (!admin) return; const result = await pool.query(`SELECT v.full_name,v.email,v.organisation,v.role,v.country,v.status,v.created_at,v.last_access_at,i.name AS invitation_name,a.nda_version,a.accepted_at_utc,a.masked_ip,a.email_delivery_status FROM private_portal.visitors v JOIN private_portal.invitations i ON i.id=v.invitation_id LEFT JOIN LATERAL (SELECT * FROM private_portal.nda_acceptances a WHERE a.visitor_id=v.id ORDER BY accepted_at_utc DESC LIMIT 1) a ON true ORDER BY v.created_at DESC`); const headers = ['Name','Email','Organisation','Role','Country','Status','Registered','Last access','Invitation','NDA','Accepted','Masked IP','Email delivery']; const rows = result.rows.map((row) => [row.full_name,row.email,row.organisation,row.role,row.country,row.status,row.created_at,row.last_access_at,row.invitation_name,row.nda_version,row.accepted_at_utc,row.masked_ip,row.email_delivery_status]); await audit('VISITOR_LEDGER_EXPORTED', 'NOTICE', 'ADMIN', request, {actorId: admin.admin_user_id, adminId: admin.admin_user_id}, {format: 'CSV', rows: rows.length}); return reply.type('text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="up-ai-down-visitor-ledger.csv"').send([headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')); });
  app.get('/api/v1/admin/security', async (request, reply) => { if (!await requireAdmin(request, reply)) return; const [activeSessions, securityEvents, mfaStats] = await Promise.all([pool.query("SELECT count(*)::int AS count FROM private_portal.visitor_sessions WHERE status='ACTIVE' AND expires_at>now() AND idle_expires_at>now()"), pool.query("SELECT count(*)::int AS count FROM private_portal.audit_events WHERE severity='SECURITY' AND timestamp_utc>now()-interval '7 days'"), pool.query("SELECT count(*) FILTER (WHERE mfa_enabled=true AND mfa_secret_encrypted IS NOT NULL)::int AS enrolled,count(*)::int AS members FROM private_portal.admin_users WHERE status='ACTIVE'")]); const mfa = mfaStats.rows[0]; return {externalPortal: externalEnabled ? 'ENABLED' : workflowTestEnabled ? 'WORKFLOW_TESTING' : 'DISABLED', ndaLegalStatus: nda.status, privacyLegalStatus: privacyStatus, emailVerification: emailVerificationProvider, adminMfa: `${adminMfaRequired ? 'REQUIRED' : 'OPTIONAL'} · ${mfa.enrolled}/${mfa.members} ENROLLED`, smtp: smtpConfigured ? 'CONFIGURED_AND_ARCHIVED' : env('SMTP_HOST') ? 'INCOMPLETE' : 'NOT_CONFIGURED', temporaryDevAccess: devLoginEnabled && devLoginExpiry > Date.now() ? 'ENABLED' : 'DISABLED', https: cookieSecure ? 'REQUIRED' : 'LOCAL_HTTP', secureCookies: cookieSecure, trustedProxy: 'CONTROLLED_NGINX_ONLY', activeSessions: activeSessions.rows[0].count, securityEvents7d: securityEvents.rows[0].count, productionReady: externalEnabled && ndaFiles.some((document) => document.status === 'APPROVED') && privacyStatus === 'APPROVED' && emailVerificationProvider !== 'NONE' && cookieSecure && adminMfaRequired && Number(mfa.enrolled) === Number(mfa.members) && smtpConfigured && !devLoginEnabled}; });

  app.addHook('preHandler', async (request, reply) => {
    const privatePrefixes = ['/api/v1/demo', '/api/v1/farms', '/api/v1/devices', '/api/v1/missions', '/api/v1/analytics', '/api/v1/reports'];
    if (!privatePrefixes.some((prefix) => request.url.startsWith(prefix))) return;
    if (await adminSession(request)) return;
    const visitor = await visitorSession(request, reply);
    if (!visitor.granted || !visitor.scopes?.includes('INVESTOR')) return reply.code(401).send({error: visitor.reason || 'ACCESS_DENIED'});
  });

  const cleanupTimer = setInterval(async () => { try { await pool.query("UPDATE private_portal.visitor_sessions SET status='EXPIRED',invalidated_at=now(),invalidation_reason='TIMEOUT' WHERE status='ACTIVE' AND (expires_at<=now() OR idle_expires_at<=now())"); await pool.query("UPDATE private_portal.admin_sessions SET status='EXPIRED',invalidated_at=now(),invalidation_reason='TIMEOUT' WHERE status='ACTIVE' AND (expires_at<=now() OR idle_expires_at<=now())"); await pool.query("DELETE FROM private_portal.registration_contexts WHERE expires_at<now()-interval '1 day'"); } catch (error) { app.log.error({error}, 'portal session cleanup failed'); } }, 15 * MINUTE); cleanupTimer.unref();
  app.addHook('onClose', async () => { clearInterval(cleanupTimer); await pool.end(); });
  return {database: 'postgres', ndaStatus: nda.status, privacyStatus, externalEnabled, workflowTestEnabled, health: async () => ({database: (await pool.query('SELECT 1')).rowCount === 1 ? 'ok' : 'error', portal: 'ok', mail: smtpConfigured ? 'configured' : env('SMTP_HOST') ? 'incomplete' : 'disabled', encryption: 'configured'})};
}
