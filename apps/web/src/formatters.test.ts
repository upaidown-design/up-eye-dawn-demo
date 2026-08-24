import test from 'node:test';
import assert from 'node:assert/strict';
import {formatValue} from './formatters.js';

test('visual metrics keep explicit units and stable precision', () => {
  assert.equal(formatValue(18.743, 'temperature', 'en-US'), '18.74 °C');
  assert.equal(formatValue(1.314, 'ec', 'en-US'), '1.31 dS/m');
  assert.equal(formatValue(61.04, 'percent', 'en-US'), '61%');
});

test('currency formatting remains compact and euro-denominated', () => {
  const value = formatValue(890_000, 'currency', 'en-US');
  assert.match(value, /€890K/);
});
