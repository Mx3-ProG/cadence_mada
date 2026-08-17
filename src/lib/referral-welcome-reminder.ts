export function referralWelcomeReminderKey(userId: string) {
  return `cadence:referral-welcome-seen:${userId}`;
}

/** Le pop-up de bienvenue au parrainage ne s'affiche qu'une seule fois par utilisateur. */
export function shouldShowReferralWelcome(rawValue: string | null): boolean {
  return !rawValue;
}
