import test from 'node:test';
import assert from 'node:assert/strict';
import {CreateProjectEventBody, CreateProjectNoteBody, CreateProjectTaskBody} from './workspace-schema.js';

test('workspace event requires a valid interval', () => {
  const base = {title: 'Investor meeting', startsAt: '2026-09-10T10:00:00.000Z'};
  assert.equal(CreateProjectEventBody.safeParse({...base, endsAt: '2026-09-10T09:00:00.000Z'}).success, false);
  assert.equal(CreateProjectEventBody.safeParse({...base, endsAt: '2026-09-10T11:00:00.000Z'}).success, true);
});

test('workspace task and note defaults remain controlled', () => {
  const task = CreateProjectTaskBody.parse({title: 'Prepare data room'});
  const note = CreateProjectNoteBody.parse({title: 'Investor signal', body: 'Follow up after the meeting.'});
  assert.equal(task.status, 'TODO');
  assert.equal(task.priority, 'MEDIUM');
  assert.equal(note.category, 'GENERAL');
  assert.equal(note.status, 'ACTIVE');
});
