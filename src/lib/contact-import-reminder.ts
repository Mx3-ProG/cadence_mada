export const CONTACT_IMPORT_REMINDER_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

export function contactImportReminderKey(userId: string) {
  return `cadence:contact-import-reminder:${userId}`;
}

export function shouldShowContactImportReminder(
  lastShownAt: string | null,
  now = Date.now(),
): boolean {
  if (!lastShownAt) return true;
  const timestamp = Number(lastShownAt);
  return !Number.isFinite(timestamp) || now - timestamp >= CONTACT_IMPORT_REMINDER_INTERVAL_MS;
}
