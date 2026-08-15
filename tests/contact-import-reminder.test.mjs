import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTACT_IMPORT_REMINDER_INTERVAL_MS,
  contactImportReminderKey,
  shouldShowContactImportReminder,
} from "../src/lib/contact-import-reminder.ts";

test("affiche le rappel à la première visite du dashboard", () => {
  assert.equal(shouldShowContactImportReminder(null, 1_000), true);
  assert.equal(contactImportReminderKey("user-1"), "cadence:contact-import-reminder:user-1");
});

test("masque le rappel pendant deux semaines puis le réaffiche", () => {
  const firstVisit = 1_000;
  assert.equal(
    shouldShowContactImportReminder(
      String(firstVisit),
      firstVisit + CONTACT_IMPORT_REMINDER_INTERVAL_MS - 1,
    ),
    false,
  );
  assert.equal(
    shouldShowContactImportReminder(
      String(firstVisit),
      firstVisit + CONTACT_IMPORT_REMINDER_INTERVAL_MS,
    ),
    true,
  );
});

test("répare naturellement une date de rappel invalide", () => {
  assert.equal(shouldShowContactImportReminder("date-invalide", 1_000), true);
});
