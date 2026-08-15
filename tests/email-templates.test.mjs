import assert from "node:assert/strict";
import test from "node:test";
import { buildAppointmentReminderEmail } from "../supabase/emails/appointment-reminder.ts";
import { buildInviteReminderEmail } from "../supabase/emails/invite-reminder.ts";
import { buildOwnerDailySummaryEmail } from "../supabase/emails/owner-daily-summary.ts";

const appointment = {
  title: "Conseil <important>",
  location: "Bureau & visio",
  startsAt: "2026-08-16T08:00:00.000Z",
  endsAt: "2026-08-16T09:00:00.000Z",
};

test("reminder templates are branded and escape user content", () => {
  const emails = [
    buildInviteReminderEmail({
      guestName: "<Alex>",
      hostName: "Mada & Co",
      appointment,
      link: "https://example.com/invite/token",
    }),
    buildAppointmentReminderEmail({
      guestName: "<Alex>",
      hostName: "Mada & Co",
      appointment,
      link: "https://example.com/invite/token",
    }),
    buildOwnerDailySummaryEmail({
      ownerName: "<Owner>",
      pending: [
        {
          title: appointment.title,
          guestName: "<Alex>",
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
        },
      ],
      upcoming: [],
      dashboardLink: "https://example.com/fr/dashboard",
    }),
  ];

  for (const email of emails) {
    assert.match(email.html, /Cadence/);
    assert.match(email.html, /cadencemada\.com\/apple-touch-icon\.png/);
    assert.doesNotMatch(email.html, /<Alex>/);
    assert.match(email.subject, /Rappel|Demain|Cadence/);
  }
});
