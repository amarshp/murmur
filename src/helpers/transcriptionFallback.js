// Where a streaming session's batch fallback goes. "skip" keeps a signed-out
// cloud user's audio from being diverted to a leftover BYOK provider.
export function resolveStreamingFallbackTarget({
  useLocalWhisper,
  cloudTranscriptionMode,
  isSignedIn,
}) {
  const isCloudMode = !useLocalWhisper && cloudTranscriptionMode === "openwhispr";
  if (isCloudMode) return isSignedIn ? "cloud" : "skip";
  return "byok";
}

// Denials the user has to act on, which batch could not absorb either. An
// account switch mid-start is one too: the recording must not continue under
// a different account.
const USER_ACTIONABLE_START_FAILURES = new Set([
  "AUTH_EXPIRED",
  "AUTH_REQUIRED",
  "AUTH_CONTEXT_CHANGED",
  "ACCOUNT_REQUIRED",
  "UPGRADE_REQUIRED",
  "LIMIT_REACHED",
]);

// Orukeet over OpenWhispr Cloud sessions, as opposed to a self-hosted server.
export function isManagedOrukeetStream({ providerName, cloudTranscriptionMode }) {
  return providerName === "orukeet" && cloudTranscriptionMode === "openwhispr";
}

// Deepgram or AssemblyAI on the user's own key. They have no cloud account to
// be signed out of, so every start failure is recoverable from the recording
// the fallback recorder already holds.
export function isByokStreamingOnlyStream({ providerName, cloudTranscriptionMode }) {
  return (
    (providerName === "deepgram" || providerName === "assemblyai") &&
    cloudTranscriptionMode !== "openwhispr"
  );
}

// Every other managed Orukeet start failure goes to batch rather than losing
// the dictation: the rollout was turned off for this account, its mint window
// is exhausted, or the session service, the network, the WebSocket or the
// session response failed. Scoped to the managed Orukeet route so no other
// provider's start-failure behavior changes.
export function resolveStreamingStartFallback({ providerName, cloudTranscriptionMode, result }) {
  if (isByokStreamingOnlyStream({ providerName, cloudTranscriptionMode })) {
    // The mic is already capturing into the fallback recorder, so a socket that
    // will not open (offline, provider outage, a rejected key) keeps the
    // dictation and sends the kept recording through the batch fallback.
    return result.code === "NETWORK_ERROR" ? "network_unavailable" : "session_unavailable";
  }
  if (!isManagedOrukeetStream({ providerName, cloudTranscriptionMode })) return null;
  if (USER_ACTIONABLE_START_FAILURES.has(result.code) || result.code?.startsWith("POLICY_")) {
    return null;
  }
  if (result.code === "FEATURE_NOT_ENABLED") return "feature_disabled";
  if (result.code === "RATE_LIMITED") return "rate_limited";
  return "session_unavailable";
}
