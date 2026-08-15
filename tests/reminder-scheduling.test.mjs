import assert from "node:assert/strict";
import test from "node:test";
import {
  antananarivoClock,
  isPendingInviteDue,
  isUpcomingAppointmentDue,
  reminderDedupeKey,
} from "../supabase/functions/send-reminders/scheduling.ts";

const now = new Date("2026-08-15T05:07:00.000Z");

test("pending invitations wait 24 hours and keep a full day before the appointment", () => {
  assert.equal(
    isPendingInviteDue("2026-08-14T05:07:00.000Z", "2026-08-17T05:07:00.000Z", now),
    true,
  );
  assert.equal(
    isPendingInviteDue("2026-08-14T06:07:00.000Z", "2026-08-17T05:07:00.000Z", now),
    false,
  );
  assert.equal(
    isPendingInviteDue("2026-08-14T05:07:00.000Z", "2026-08-16T05:07:00.000Z", now),
    false,
  );
});

test("accepted appointment reminders cover the next 24 hours only", () => {
  assert.equal(isUpcomingAppointmentDue("2026-08-16T05:07:00.000Z", now), true);
  assert.equal(isUpcomingAppointmentDue("2026-08-16T05:08:00.000Z", now), false);
  assert.equal(isUpcomingAppointmentDue("2026-08-15T05:06:00.000Z", now), false);
});

test("daily summaries use Antananarivo time and stable dedupe keys", () => {
  assert.deepEqual(antananarivoClock(now), { date: "2026-08-15", hour: 8 });
  assert.equal(reminderDedupeKey("summary", "owner-1", "2026-08-15"), "summary:owner-1:2026-08-15");
});
