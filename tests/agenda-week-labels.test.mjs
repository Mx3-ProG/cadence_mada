import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { shortMonthLabel, weekNumberInMonth } from "../src/lib/agenda.ts";

const root = new URL("../", import.meta.url);

const [agendaLib, agendaRoute, dashboardRoute] = await Promise.all([
  readFile(new URL("src/lib/agenda.ts", root), "utf8"),
  readFile(new URL("src/routes/_authenticated/agenda.tsx", root), "utf8"),
  readFile(new URL("src/routes/_authenticated/dashboard.tsx", root), "utf8"),
]);

test("August Mondays are labelled S1 through S4 instead of S2 through S5", () => {
  const augustMondays = [3, 10, 17, 24].map((day) => new Date(2026, 7, day, 12));

  assert.deepEqual(augustMondays.map(weekNumberInMonth), [1, 2, 3, 4]);
  assert.match(agendaLib, /export function weekNumberInMonth/);
  assert.doesNotMatch(agendaRoute, /getWeekOfMonth/);
  assert.doesNotMatch(dashboardRoute, /getWeekOfMonth/);
  assert.match(agendaRoute, /weekNumberInMonth\(weekRangeStart\)/);
  assert.match(dashboardRoute, /weekNumberInMonth\(rangeStart\)/);
});

test("the mobile French month label spells Août correctly", () => {
  assert.equal(shortMonthLabel(new Date(2026, 7, 3, 12)), "Août");
  assert.match(agendaLib, /"Août"/);
  assert.doesNotMatch(agendaLib, /"AOÛ"/);
});
