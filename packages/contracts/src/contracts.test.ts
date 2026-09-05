import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEnvelope, Scenario} from './index.js';

const scenario = {id: 'demo', version: 1, seed: 7, title: 'Demo', durationSeconds: 20, farmId: 'farm', phases: [{id: 'one', label: 'One', start: 0, end: 10}, {id: 'two', label: 'Two', start: 10, end: 20}], expectedEvents: []};

test('scenario accepts ordered phases inside the declared duration', () => {
  assert.equal(Scenario.safeParse(scenario).success, true);
});

test('scenario rejects reversed, overlapping and out-of-duration phases', () => {
  assert.equal(Scenario.safeParse({...scenario, phases: [{id: 'bad', label: 'Bad', start: 8, end: 4}]}).success, false);
  assert.equal(Scenario.safeParse({...scenario, phases: [{id: 'one', label: 'One', start: 0, end: 12}, {id: 'two', label: 'Two', start: 10, end: 20}]}).success, false);
  assert.equal(Scenario.safeParse({...scenario, phases: [{id: 'bad', label: 'Bad', start: 0, end: 21}]}).success, false);
});

test('event envelope accepts only declared classifications and non-negative time', () => {
  const event = {eventId: 'evt', eventType: 'TEST', eventVersion: 1, sequence: 0, runId: 'run', scenarioId: 'demo', source: 'test', correlationId: 'cor', causationId: 'cause', recordedAt: new Date().toISOString(), simulationTime: 0, classification: 'SIMULATED', payload: {ok: true}};
  assert.equal(EventEnvelope.safeParse(event).success, true);
  assert.equal(EventEnvelope.safeParse({...event, classification: 'UNVERIFIED'}).success, false);
  assert.equal(EventEnvelope.safeParse({...event, simulationTime: -1}).success, false);
});
