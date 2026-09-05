import test from 'node:test';
import assert from 'node:assert/strict';
import {workerStatus} from './status.js';

test('worker reports its fallback mode without claiming production processing', () => {
  assert.equal(workerStatus.mode, 'DETERMINISTIC_FALLBACK');
  assert.equal(workerStatus.ndvi, 'SIMULATED');
  assert.equal(workerStatus.reports, 'SIMULATED');
});
