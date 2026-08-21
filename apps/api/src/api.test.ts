import test from 'node:test';import assert from 'node:assert/strict';import {EventEnvelope} from '@ued/contracts';
test('event envelope rejects unclassified events',()=>{assert.equal(EventEnvelope.safeParse({eventId:'x'}).success,false)});
