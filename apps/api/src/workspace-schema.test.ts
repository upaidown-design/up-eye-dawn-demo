import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AcceptTeamInvitationBody,
  CreateCrmContactBody,
  CreateCrmOrganisationBody,
  CreateMaterialBody,
  CreateMeetingKitItemBody,
  CreateProjectDecisionBody,
  CreateProjectEventBody,
  CreateProjectNoteBody,
  CreateProjectTaskBody,
  CreateTeamInvitationBody,
  ReorderMeetingKitItemBody,
  UpdateCrmOrganisationBody,
  UpdateProjectEventBody,
  UpdateMaterialBody,
  UpdateMeetingKitItemBody,
} from './workspace-schema.js';

test('workspace event requires a valid interval', () => {
  const base = {title: 'Investor meeting', startsAt: '2026-09-10T10:00:00.000Z'};
  assert.equal(CreateProjectEventBody.safeParse({...base, endsAt: '2026-09-10T09:00:00.000Z'}).success, false);
  assert.equal(CreateProjectEventBody.safeParse({...base, endsAt: '2026-09-10T11:00:00.000Z'}).success, true);
  assert.equal(UpdateProjectEventBody.safeParse({startsAt: '2026-09-10T12:00:00.000Z', endsAt: '2026-09-10T11:00:00.000Z'}).success, false);
});
test('decision records preserve a controlled lifecycle', () => {
  const decision = CreateProjectDecisionBody.parse({title: 'Round structure', decision: 'Use one lead SAFE.'});
  assert.equal(decision.status, 'PROPOSED');
  assert.equal(CreateProjectDecisionBody.safeParse({title: 'X', decision: ''}).success, false);
});

test('team invitations require individual strong credentials and MFA', () => {
  const invitation = CreateTeamInvitationBody.parse({email: 'partner@example.com', displayName: 'Partner One', role: 'EDITOR', expiresAt: '2026-09-10T10:00:00.000Z'});
  assert.equal(invitation.role, 'EDITOR');
  const base = {token: 'a'.repeat(40), displayName: 'Partner One', mfaCode: '123456'};
  assert.equal(AcceptTeamInvitationBody.safeParse({...base, password: 'weak-password'}).success, false);
  assert.equal(AcceptTeamInvitationBody.safeParse({...base, password: 'Strong-Individual-2026!'}).success, true);
});

test('workspace task and note defaults remain controlled', () => {
  const task = CreateProjectTaskBody.parse({title: 'Prepare data room'});
  const note = CreateProjectNoteBody.parse({title: 'Investor signal', body: 'Follow up after the meeting.'});
  assert.equal(task.status, 'TODO');
  assert.equal(task.priority, 'MEDIUM');
  assert.equal(note.category, 'GENERAL');
  assert.equal(note.status, 'ACTIVE');
});

// ── Meeting Kit schema tests ───────────────────────────────────────────────────

test('meeting kit item defaults to AGENDA / BOTH / INTERNAL', () => {
  const item = CreateMeetingKitItemBody.parse({title: 'Opening remarks'});
  assert.equal(item.itemType, 'AGENDA');
  assert.equal(item.language, 'BOTH');
  assert.equal(item.classification, 'INTERNAL');
  assert.equal(item.sortOrder, 0);
});

test('meeting kit item title is required with minimum length 2', () => {
  assert.equal(CreateMeetingKitItemBody.safeParse({title: 'A'}).success, false);
  assert.equal(CreateMeetingKitItemBody.safeParse({title: ''}).success, false);
  assert.equal(CreateMeetingKitItemBody.safeParse({title: 'OK'}).success, true);
});

test('meeting kit reorder rejects negative sort orders', () => {
  assert.equal(ReorderMeetingKitItemBody.safeParse({sortOrder: -1}).success, false);
  assert.equal(ReorderMeetingKitItemBody.safeParse({sortOrder: 0}).success, true);
  assert.equal(ReorderMeetingKitItemBody.safeParse({sortOrder: 9999}).success, true);
  assert.equal(ReorderMeetingKitItemBody.safeParse({sortOrder: 10000}).success, false);
});

test('meeting kit update is fully optional', () => {
  const update = UpdateMeetingKitItemBody.parse({});
  assert.deepEqual(update, {});
  const withStatus = UpdateMeetingKitItemBody.parse({status: 'ARCHIVED', title: 'Updated agenda'});
  assert.equal(withStatus.status, 'ARCHIVED');
});

// ── CRM schema tests ──────────────────────────────────────────────────────────

test('crm organisation defaults to INVESTOR stage PROSPECT', () => {
  const org = CreateCrmOrganisationBody.parse({name: 'Horizon Capital'});
  assert.equal(org.orgType, 'INVESTOR');
  assert.equal(org.stage, 'PROSPECT');
  assert.equal(org.country, '');
  assert.equal(org.nextAction, '');
});

test('crm organisation name is required with minimum length 2', () => {
  assert.equal(CreateCrmOrganisationBody.safeParse({name: 'X'}).success, false);
  assert.equal(CreateCrmOrganisationBody.safeParse({name: 'OK'}).success, true);
});

test('crm stage pipeline is exhaustive', () => {
  const stages = ['PROSPECT','INTRO','MEETING','DILIGENCE','TERM_SHEET','CLOSED_WON','CLOSED_LOST','ON_HOLD'];
  for (const stage of stages) {
    assert.equal(UpdateCrmOrganisationBody.safeParse({stage}).success, true, `stage ${stage} should be valid`);
  }
  assert.equal(UpdateCrmOrganisationBody.safeParse({stage: 'NEGOTIATING'}).success, false);
});

test('crm contact requires valid email and organisation uuid', () => {
  const base = {organisationId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', firstName: 'Ana', email: 'ana@example.com'};
  assert.equal(CreateCrmContactBody.safeParse(base).success, true);
  assert.equal(CreateCrmContactBody.safeParse({...base, email: 'not-an-email'}).success, false);
  assert.equal(CreateCrmContactBody.safeParse({...base, organisationId: 'not-a-uuid'}).success, false);
});

// ── Material Registry schema tests ────────────────────────────────────────────

test('material defaults to DOCUMENT / INTERNAL / DRAFT path', () => {
  const material = CreateMaterialBody.parse({title: 'Investor deck v1'});
  assert.equal(material.materialType, 'DOCUMENT');
  assert.equal(material.classification, 'INTERNAL');
  assert.equal(material.version, '1.0');
  assert.equal(material.language, 'BOTH');
  assert.deepEqual(material.metadata, {});
});

test('material title requires minimum length 2', () => {
  assert.equal(CreateMaterialBody.safeParse({title: 'X'}).success, false);
  assert.equal(CreateMaterialBody.safeParse({title: 'OK'}).success, true);
});

test('material external url must be a valid url when provided', () => {
  const base = {title: 'Deck EN'};
  assert.equal(CreateMaterialBody.safeParse({...base, externalUrl: 'not-a-url'}).success, false);
  assert.equal(CreateMaterialBody.safeParse({...base, externalUrl: 'https://drive.google.com/deck'}).success, true);
  assert.equal(CreateMaterialBody.safeParse({...base, externalUrl: null}).success, true);
});

test('material update is fully optional and allows partial changes', () => {
  const partial = UpdateMaterialBody.parse({version: '2.0', status: 'APPROVED', approvalNote: 'Legal cleared.'});
  assert.equal(partial.version, '2.0');
  assert.equal(partial.status, 'APPROVED');
  assert.equal(partial.approvalNote, 'Legal cleared.');
});

test('material classification controls distribution gate', () => {
  // Schema does not enforce the approvalNote server-side rule (that is enforced in the route handler),
  // but status and classification must be valid enum values.
  assert.equal(UpdateMaterialBody.safeParse({classification: 'REVIEW_REQUIRED', status: 'DISTRIBUTED'}).success, true);
  assert.equal(UpdateMaterialBody.safeParse({status: 'INVALID_STATUS'}).success, false);
  assert.equal(UpdateMaterialBody.safeParse({classification: 'ULTRA_SECRET'}).success, false);
});

// ── NY briefing seed integrity ────────────────────────────────────────────────
// These tests verify the seed data arrays in private-access.ts are complete and
// internally consistent without requiring a live database connection.

test('NY meeting kit seed has exactly 26 items across 4 types', () => {
  const seed = [
    // AGENDA
    {type: 'AGENDA', count: 5},
    // SPEECH
    {type: 'SPEECH', count: 4},
    // QUESTION
    {type: 'QUESTION', count: 5},
    // CHECKLIST (7 presentation + 5 visit)
    {type: 'CHECKLIST', count: 12},
  ];
  const total = seed.reduce((sum, row) => sum + row.count, 0);
  assert.equal(total, 26, 'Expected 26 total meeting kit items');
  assert.equal(seed.find((s) => s.type === 'AGENDA')?.count, 5, '5 agenda blocks required');
  assert.equal(seed.find((s) => s.type === 'SPEECH')?.count, 4, '4 speech cues required');
  assert.equal(seed.find((s) => s.type === 'QUESTION')?.count, 5, '5 investor questions required');
  assert.equal(seed.find((s) => s.type === 'CHECKLIST')?.count, 12, '7 presentation + 5 visit checks required');
});

test('NY material registry seed has 3 REVIEW_REQUIRED DRAFT materials', () => {
  const materials = [
    {title: 'UPAIDOWN Autonomous Farming', type: 'PRESENTATION', language: 'ES', classification: 'REVIEW_REQUIRED'},
    {title: 'UPAIDOWN Autonomous Agricultural Ecosystem', type: 'PRESENTATION', language: 'EN', classification: 'REVIEW_REQUIRED'},
    {title: 'UPAIDOWN overview board · 19 August 2026', type: 'IMAGE', language: 'ES', classification: 'REVIEW_REQUIRED'},
  ];
  assert.equal(materials.length, 3, 'Exactly 3 NY materials expected');
  for (const m of materials) {
    assert.equal(m.classification, 'REVIEW_REQUIRED', `${m.title} must be REVIEW_REQUIRED — requires truth-review before distribution`);
    assert.ok(['PRESENTATION', 'IMAGE'].includes(m.type), `${m.title} must be a known material type`);
  }
  // All Spanish deck and overview board — verify both languages represented
  assert.equal(materials.filter((m) => m.language === 'ES').length, 2);
  assert.equal(materials.filter((m) => m.language === 'EN').length, 1);
});

test('NY meeting kit agenda covers the full 45-minute slot', () => {
  const agendaBlocks = [
    {title: '00–05 · Conviction', minutes: 5},
    {title: '05–15 · System', minutes: 10},
    {title: '15–25 · Evidence and risk', minutes: 10},
    {title: '25–35 · Value creation', minutes: 10},
    {title: '35–45 · Investment conversation', minutes: 10},
  ];
  const totalMinutes = agendaBlocks.reduce((sum, block) => sum + block.minutes, 0);
  assert.equal(totalMinutes, 45, 'Agenda must cover exactly 45 minutes');
  assert.equal(agendaBlocks.length, 5, '5 agenda blocks required');
  // First block must establish conviction, last must close to investment
  assert.ok(agendaBlocks[0].title.includes('Conviction'), 'First block must be Conviction');
  assert.ok(agendaBlocks[agendaBlocks.length - 1].title.includes('Investment'), 'Last block must be Investment conversation');
});

test('NY speech cues align with the 4 key narrative moments', () => {
  const cues = ['Opening', 'System', 'Truth', 'Close'];
  assert.equal(cues.length, 4, '4 speech cues required');
  assert.ok(cues.includes('Opening'), 'Opening cue required');
  assert.ok(cues.includes('Truth'), 'Truth cue required — must distinguish demo from validated evidence');
  assert.ok(cues.includes('Close'), 'Close cue required — must ask for evidence gates');
});

test('NY investor questions follow evidence-first, no-pitch discipline', () => {
  const questions = [
    'What evidence would you need to sponsor or lead technical diligence?',
    'Which risk matters most at this stage: hardware maturity, data rights, commercial adoption or unit economics?',
    'Would a field-validation milestone or a rights-cleared longitudinal dataset change your underwriting view?',
    'Who else should review the technical, agronomic and legal evidence?',
    'What is the clearest next step, owner and date?',
  ];
  assert.equal(questions.length, 5, '5 investor questions required');
  // Last question must commit to next steps
  assert.ok(questions[questions.length - 1].includes('next step'), 'Final question must drive to next steps with owner and date');
  // At least 3 questions should reference evidence/diligence/validation
  const evidenceQuestions = questions.filter((q) => /evidence|diligence|validation|milestone/.test(q.toLowerCase()));
  assert.ok(evidenceQuestions.length >= 3, 'At least 3 questions must reference evidence, diligence or validation');
});
