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
  UpdateMaterialBody,
  UpdateMeetingKitItemBody,
} from './workspace-schema.js';

test('workspace event requires a valid interval', () => {
  const base = {title: 'Investor meeting', startsAt: '2026-09-10T10:00:00.000Z'};
  assert.equal(CreateProjectEventBody.safeParse({...base, endsAt: '2026-09-10T09:00:00.000Z'}).success, false);
  assert.equal(CreateProjectEventBody.safeParse({...base, endsAt: '2026-09-10T11:00:00.000Z'}).success, true);
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
