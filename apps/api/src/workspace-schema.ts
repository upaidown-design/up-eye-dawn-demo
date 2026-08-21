import {z} from 'zod';

export const EventType = z.enum(['MEETING', 'VISIT', 'DEADLINE', 'PRESENTATION', 'TRAVEL', 'OTHER']);
export const EventStatus = z.enum(['SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'ARCHIVED']);
export const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'ARCHIVED']);
export const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const NoteCategory = z.enum(['GENERAL', 'MEETING', 'INVESTOR', 'PRODUCT', 'LEGAL', 'FINANCE', 'TECHNICAL']);
export const DecisionStatus = z.enum(['PROPOSED', 'DECIDED', 'REVISIT', 'ARCHIVED']);
export const CommentEntityType = z.enum(['EVENT', 'TASK', 'NOTE', 'DECISION']);
export const TeamRole = z.enum(['ADMIN', 'EDITOR', 'VIEWER']);

// ── Project Events ─────────────────────────────────────────────────────────────

export const CreateProjectEventBody = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).default(''),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  timezone: z.string().trim().min(2).max(80).default('Europe/Madrid'),
  location: z.string().trim().max(240).default(''),
  eventType: EventType.default('MEETING'),
  status: EventStatus.default('SCHEDULED'),
  priority: Priority.default('MEDIUM'),
  ownerName: z.string().trim().max(160).default(''),
}).refine((value) => !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt), {message: 'End must be after start', path: ['endsAt']});

export const UpdateProjectEventBody = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(4000).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  timezone: z.string().trim().min(2).max(80).optional(),
  location: z.string().trim().max(240).optional(),
  eventType: EventType.optional(),
  status: EventStatus.optional(),
  priority: Priority.optional(),
  ownerName: z.string().trim().max(160).optional(),
});

// ── Project Tasks ──────────────────────────────────────────────────────────────

export const CreateProjectTaskBody = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(4000).default(''),
  ownerName: z.string().trim().max(160).default(''),
  dueAt: z.string().datetime().nullable().optional(),
  status: TaskStatus.default('TODO'),
  priority: Priority.default('MEDIUM'),
  linkedEventId: z.string().uuid().nullable().optional(),
});

export const UpdateProjectTaskBody = CreateProjectTaskBody.partial();

// ── Project Notes ──────────────────────────────────────────────────────────────

export const CreateProjectNoteBody = z.object({
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().min(1).max(20_000),
  category: NoteCategory.default('GENERAL'),
  pinned: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export const UpdateProjectNoteBody = CreateProjectNoteBody.partial();

// ── Project Decisions ──────────────────────────────────────────────────────────

export const CreateProjectDecisionBody = z.object({
  title: z.string().trim().min(2).max(220),
  context: z.string().trim().max(10_000).default(''),
  decision: z.string().trim().min(2).max(10_000),
  alternatives: z.string().trim().max(10_000).default(''),
  consequences: z.string().trim().max(10_000).default(''),
  ownerAdminId: z.string().uuid().nullable().optional(),
  status: DecisionStatus.default('PROPOSED'),
  decisionAt: z.string().datetime().nullable().optional(),
});

export const UpdateProjectDecisionBody = CreateProjectDecisionBody.partial();

// ── Project Comments ───────────────────────────────────────────────────────────

export const CreateProjectCommentBody = z.object({
  entityType: CommentEntityType,
  entityId: z.string().uuid(),
  body: z.string().trim().min(1).max(10_000),
});

// ── Team Management ────────────────────────────────────────────────────────────

export const CreateTeamInvitationBody = z.object({
  email: z.string().email().max(254),
  displayName: z.string().trim().min(2).max(160),
  role: TeamRole.default('EDITOR'),
  expiresAt: z.string().datetime(),
});

export const PrepareTeamInvitationBody = z.object({token: z.string().min(32).max(512)});

export const AcceptTeamInvitationBody = z.object({
  token: z.string().min(32).max(512),
  displayName: z.string().trim().min(2).max(160),
  password: z.string().min(14).max(256)
    .regex(/[a-z]/, 'Lowercase character required')
    .regex(/[A-Z]/, 'Uppercase character required')
    .regex(/[0-9]/, 'Number required')
    .regex(/[^A-Za-z0-9]/, 'Symbol required'),
  mfaCode: z.string().regex(/^\d{6}$/),
});

export const UpdateTeamMemberBody = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one change is required');

export const ConfirmMfaBody = z.object({code: z.string().regex(/^\d{6}$/)});

export const CreateAdminRecoveryBody = z.object({expiresAt: z.string().datetime()});
export const PrepareAdminRecoveryBody = z.object({token: z.string().min(32).max(512)});
export const AcceptAdminRecoveryBody = z.object({
  token: z.string().min(32).max(512),
  password: z.string().min(14).max(256)
    .regex(/[a-z]/, 'Lowercase character required')
    .regex(/[A-Z]/, 'Uppercase character required')
    .regex(/[0-9]/, 'Number required')
    .regex(/[^A-Za-z0-9]/, 'Symbol required'),
  mfaCode: z.string().regex(/^\d{6}$/),
});

// ── Meeting Kit ────────────────────────────────────────────────────────────────

export const MeetingKitItemType = z.enum(['AGENDA', 'SPEECH', 'QUESTION', 'MATERIAL', 'CHECKLIST', 'NOTE']);
export const MeetingKitLanguage = z.enum(['ES', 'EN', 'BOTH']);
export const MeetingKitClassification = z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SYNTHETIC', 'CONCEPT_RENDER', 'LEGAL_REVIEW']);

export const CreateMeetingKitItemBody = z.object({
  itemType: MeetingKitItemType.default('AGENDA'),
  language: MeetingKitLanguage.default('BOTH'),
  title: z.string().trim().min(2).max(220),
  body: z.string().trim().max(20_000).default(''),
  classification: MeetingKitClassification.default('INTERNAL'),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  linkedEventId: z.string().uuid().nullable().optional(),
});

export const UpdateMeetingKitItemBody = z.object({
  itemType: MeetingKitItemType.optional(),
  language: MeetingKitLanguage.optional(),
  title: z.string().trim().min(2).max(220).optional(),
  body: z.string().trim().max(20_000).optional(),
  classification: MeetingKitClassification.optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  linkedEventId: z.string().uuid().nullable().optional(),
});

export const ReorderMeetingKitItemBody = z.object({
  sortOrder: z.number().int().min(0).max(9999),
});

// ── CRM ───────────────────────────────────────────────────────────────────────

export const CrmOrgType = z.enum(['INVESTOR', 'FAMILY_OFFICE', 'VC', 'CORPORATE', 'GOVERNMENT', 'OTHER']);
export const CrmOrgStage = z.enum(['PROSPECT', 'INTRO', 'MEETING', 'DILIGENCE', 'TERM_SHEET', 'CLOSED_WON', 'CLOSED_LOST', 'ON_HOLD']);

export const CreateCrmOrganisationBody = z.object({
  name: z.string().trim().min(2).max(220),
  orgType: CrmOrgType.default('INVESTOR'),
  country: z.string().trim().max(80).default(''),
  stage: CrmOrgStage.default('PROSPECT'),
  ownerId: z.string().uuid().nullable().optional(),
  lastInteractionAt: z.string().datetime().nullable().optional(),
  nextAction: z.string().trim().max(2000).default(''),
  nextActionAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(10_000).default(''),
});

export const UpdateCrmOrganisationBody = z.object({
  name: z.string().trim().min(2).max(220).optional(),
  orgType: CrmOrgType.optional(),
  country: z.string().trim().max(80).optional(),
  stage: CrmOrgStage.optional(),
  ownerId: z.string().uuid().nullable().optional(),
  lastInteractionAt: z.string().datetime().nullable().optional(),
  nextAction: z.string().trim().max(2000).optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(10_000).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export const CreateCrmContactBody = z.object({
  organisationId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).default(''),
  email: z.string().email().max(254),
  roleTitle: z.string().trim().max(160).default(''),
  phone: z.string().trim().max(40).default(''),
  isPrimary: z.boolean().default(false),
  notes: z.string().trim().max(10_000).default(''),
  visitorId: z.string().uuid().nullable().optional(),
});

export const UpdateCrmContactBody = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  email: z.string().email().max(254).optional(),
  roleTitle: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().trim().max(10_000).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  visitorId: z.string().uuid().nullable().optional(),
});

// ── Material Registry ─────────────────────────────────────────────────────────

export const MaterialType = z.enum(['DOCUMENT', 'PRESENTATION', 'SPREADSHEET', 'IMAGE', 'VIDEO', 'DATASET', 'OTHER']);
export const MaterialClassification = z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'REVIEW_REQUIRED', 'SYNTHETIC', 'CONCEPT_RENDER']);
export const MaterialStatus = z.enum(['DRAFT', 'APPROVED', 'DISTRIBUTED', 'RETIRED']);
export const MaterialLanguage = z.enum(['ES', 'EN', 'BOTH', 'OTHER']);

export const CreateMaterialBody = z.object({
  title: z.string().trim().min(2).max(220),
  materialType: MaterialType.default('DOCUMENT'),
  version: z.string().trim().min(1).max(40).default('1.0'),
  language: MaterialLanguage.default('BOTH'),
  classification: MaterialClassification.default('INTERNAL'),
  provenance: z.string().trim().max(2000).default(''),
  ownerId: z.string().uuid().nullable().optional(),
  gcsObject: z.string().trim().max(1024).nullable().optional(),
  externalUrl: z.string().url().max(2048).nullable().optional(),
  notes: z.string().trim().max(10_000).default(''),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const UpdateMaterialBody = z.object({
  title: z.string().trim().min(2).max(220).optional(),
  materialType: MaterialType.optional(),
  version: z.string().trim().min(1).max(40).optional(),
  language: MaterialLanguage.optional(),
  classification: MaterialClassification.optional(),
  provenance: z.string().trim().max(2000).optional(),
  ownerId: z.string().uuid().nullable().optional(),
  gcsObject: z.string().trim().max(1024).nullable().optional(),
  externalUrl: z.string().url().max(2048).nullable().optional(),
  // status + approvalNote: moving REVIEW_REQUIRED → DISTRIBUTED requires approvalNote.
  status: MaterialStatus.optional(),
  approvalNote: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(10_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
