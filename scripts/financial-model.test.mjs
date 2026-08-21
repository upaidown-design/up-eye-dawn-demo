import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const modelPath = new URL("../financial/model-v1.json", import.meta.url);
const model = JSON.parse(fs.readFileSync(modelPath, "utf8"));

test("three scenarios and allowed currency are present", () => {
  assert.deepEqual(model.scenarios.map((s) => s.id), ["LEAN","BASE","ACCELERATED"]);
  assert.equal(model.currency, "EUR");
});

test("scenario totals, contingencies and cash signs reconcile", () => {
  for (const s of model.scenarios) {
    const spend15 = s.months.reduce((a,m) => a + m.opex + m.capex, 0);
    assert.equal(spend15, s.total_m0_m15);
    assert.ok(Math.abs(s.capital_with_buffer - spend15 * (1 + s.contingency)) < 0.01);
    assert.ok(s.months.every((m) => m.net_cash_flow <= 0));
    assert.ok(s.capital_with_buffer > s.capital_core);
  }
});

test("round dilution uses investment divided by post-money", () => {
  for (const row of model.round_sensitivity) {
    assert.equal(row.post_money, row.pre_money + row.investment);
    assert.ok(Math.abs(row.dilution - row.investment / row.post_money) < 1e-12);
    assert.ok(row.dilution > 0 && row.dilution < 1);
  }
});

test("revenue stays zero and EBITDA target is not approved", () => {
  assert.ok(model.revenue_drivers.every((x) => x.value === 0));
  assert.equal(model.ebitda_target.status, "TARGET_TO_VALIDATE");
  assert.equal(model.provisional_round_guidance.approved, false);
});

test("founder decisions are capped at seven", () => {
  assert.ok(model.founder_decisions.length <= 7);
});
