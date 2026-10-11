// A recording the app closed on before it finished comes back in History as a
// failed row that still holds its audio (error code CRASH_RECOVERY). Nothing
// was wrong with the audio, so it is retried once without a click. A row that
// fails again stays an ordinary failed row the user can retry by hand.

export const RECOVERY_ERROR_CODE = "CRASH_RECOVERY";

// Per launch, so a long backlog does not hit the provider all at once.
export const MAX_AUTO_RETRIES_PER_LAUNCH = 5;

// Ids to retry now, oldest first. `tried` holds ids already attempted on any
// launch, which is what stops a row that keeps failing from being retried forever.
export function pickRecoveredToRetry(items, tried, limit = MAX_AUTO_RETRIES_PER_LAUNCH) {
  if (!Array.isArray(items)) return [];
  const seen = tried instanceof Set ? tried : new Set(tried || []);
  return items
    .filter(
      (item) =>
        item &&
        item.status === "failed" &&
        item.error_code === RECOVERY_ERROR_CODE &&
        item.has_audio === 1 &&
        !seen.has(item.id)
    )
    .sort((a, b) => a.id - b.id)
    .slice(0, limit)
    .map((item) => item.id);
}
