import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateMonthlyScheduledValue,
  estimateWeeklyScheduledValue,
} from "../src/lib/roi-calculator.ts";

test("calcule la valeur hebdomadaire programmée à partir des entrées par défaut", () => {
  assert.equal(estimateWeeklyScheduledValue({ appointmentsPerWeek: 25, averageValue: 100 }), 2500);
});

test("projette la valeur mensuelle sur 4,33 semaines", () => {
  assert.equal(
    estimateMonthlyScheduledValue({ appointmentsPerWeek: 25, averageValue: 100 }),
    Math.round(2500 * 4.33),
  );
});

test("ramène les entrées négatives ou non finies à zéro plutôt que de planter", () => {
  assert.equal(estimateWeeklyScheduledValue({ appointmentsPerWeek: -5, averageValue: 100 }), 0);
  assert.equal(estimateWeeklyScheduledValue({ appointmentsPerWeek: 25, averageValue: NaN }), 0);
});

test("arrondit le résultat à l'unité", () => {
  assert.equal(estimateWeeklyScheduledValue({ appointmentsPerWeek: 3, averageValue: 33.33 }), 100);
});
