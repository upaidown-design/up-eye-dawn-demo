import test from 'node:test';
import assert from 'node:assert/strict';
import {brand, financialModel, roundDecision, truth} from './index.js';

test('brand names come from the canonical truth source', () => {
  assert.equal(brand.companyName, truth.company.display_name);
  assert.equal(brand.legalName, truth.company.legal_name);
  assert.equal(brand.roverProductName, truth.terminology.rover);
});

test('unapproved round terms remain null in configuration', () => {
  assert.equal(truth.round.current_ask, null);
  assert.equal(truth.round.pre_money, null);
  assert.equal(truth.round.dilution, null);
});

test('financial and round-decision inputs expose controlled scenario sets', () => {
  assert.ok(financialModel.scenarios.length >= 3);
  assert.ok(roundDecision.capital_table.length >= 3);
  assert.ok(roundDecision.founder_questions.length > 0 && roundDecision.founder_questions.length <= 10);
  assert.equal(new Set(roundDecision.founder_questions).size, roundDecision.founder_questions.length);
});
