// Automatic retry for a batch transcription that failed for a reason that may
// pass on its own (network drop, provider 5xx, rate limit). Anything the user
// has to fix, such as a bad key or an exhausted quota, is never retried, so
// the error surfaces at once instead of after pointless waiting.

// Waits before the second and third attempt.
export const TRANSCRIPTION_RETRY_DELAYS_MS = Object.freeze([600, 1800]);

const NON_RETRYABLE_CODES = new Set([
  "API_KEY_MISSING",
  "AUTH_EXPIRED",
  "AUTH_REQUIRED",
  "AUTH_CONTEXT_CHANGED",
  "ACCOUNT_REQUIRED",
  "UPGRADE_REQUIRED",
  "LIMIT_REACHED",
  "NO_SPEECH_DETECTED",
  "STREAMING_ONLY_PROVIDER",
  "PROVIDER_AUTH_FAILED",
  "PROVIDER_QUOTA_EXHAUSTED",
  "TRANSCRIPTION_CANCELLED",
  "REASON_CANCELLED",
  "DICTIONARY_ECHO",
]);

const TRANSIENT_MESSAGE =
  /network|timed? ?out|timeout|fetch failed|failed to fetch|econn|enotfound|eai_again|socket|offline|temporar|unavailable|overload|rate.?limit|too many requests|\b(408|425|429|500|502|503|504)\b/i;

export function isTransientTranscriptionError(error) {
  if (!error) return false;
  const code = error.code;
  if (code && NON_RETRYABLE_CODES.has(code)) return false;
  if (code === "NETWORK_ERROR" || code === "TIMEOUT" || code === "PROVIDER_UNAVAILABLE")
    return true;
  const status = Number(error.status ?? error.statusCode);
  if (Number.isFinite(status) && status > 0) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }
  if (error.networkCode) return true;
  return TRANSIENT_MESSAGE.test(String(error.message || ""));
}

// Runs `run` up to delays.length + 1 times. The last error is rethrown, so the
// caller's failure handling (and the kept recording) is unchanged.
export async function withTranscriptionRetry(
  run,
  {
    isCancelled = () => false,
    delays = TRANSCRIPTION_RETRY_DELAYS_MS,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    onRetry = () => {},
  } = {}
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run(attempt);
    } catch (error) {
      if (attempt >= delays.length || isCancelled() || !isTransientTranscriptionError(error)) {
        throw error;
      }
      onRetry({ attempt: attempt + 1, delayMs: delays[attempt], error });
      await sleep(delays[attempt]);
      if (isCancelled()) throw error;
    }
  }
}
