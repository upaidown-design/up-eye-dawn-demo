import {z} from 'zod';

export const EventType = z.enum(['MEETING', 'VISIT', 'DEADLINE', 'PRESENTATION', 'TRAVEL', 'OTHER']);
export const EventStatus = z.enum(['SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'ARCHIVED']);
export const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'ARCHIVED']);
export const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const NoteCategory = z.enum(['GENERAL', 'MEETING', 'INVESTOR', 'PRODUCT', 'LEGAL', 'FINANCE', 'TECHNICAL']);

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

export const CreateProjectNoteBody = z.object({
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().min(1).max(20_000),
  category: NoteCategory.default('GENERAL'),
  pinned: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export const UpdateProjectNoteBody = CreateProjectNoteBody.partial();
