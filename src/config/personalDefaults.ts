// Renderer-side defaults for the personal build: bring-your-own-key Deepgram
// streaming for dictation, Groq for cleanup, English, no account. Applied once
// per profile and then left alone, so later choices in Settings stick.
// Main-process switches live in src/helpers/personalBuild.js.

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

// Applied in order, each step once per profile (its own sentinel), so a later
// step adds new defaults without overwriting what the user changed since.
const DEFAULT_STEPS: ReadonlyArray<{ sentinel: string; values: Readonly<Record<string, string>> }> =
  [
    {
      sentinel: "_personalDefaultsV1",
      // Written under the same localStorage keys settingsStore reads at construction.
      values: {
        // Speech: Deepgram Nova-3 over a live stream, so text is ready at key release.
        useLocalWhisper: "false",
        transcriptionMode: "providers",
        cloudTranscriptionMode: "byok",
        cloudTranscriptionProvider: "deepgram",
        cloudTranscriptionModel: "nova-3",
        // "auto" mis-detects accented English as other languages.
        preferredLanguage: "en",

        // Cleanup: Groq, on the same bring-your-own-key routing.
        useCleanupModel: "true",
        cleanupMode: "providers",
        cleanupCloudMode: "byok",
        cleanupProvider: "groq",
        cleanupModel: "openai/gpt-oss-120b",

        // No account: the app's own "continue without signing in" path.
        authenticationSkipped: "true",
        skipAuth: "true",

        meetingProcessDetection: "false",
      },
    },
    {
      sentinel: "_personalDefaultsV2",
      values: {
        // Every transcript stays on the clipboard after pasting, so a paste that
        // missed its target can still be pasted by hand.
        keepTranscriptionInClipboard: "true",
      },
    },
  ];

export const PERSONAL_SETTING_DEFAULTS: Readonly<Record<string, string>> = Object.freeze(
  Object.assign({}, ...DEFAULT_STEPS.map((step) => step.values))
);

/** Writes each pending default step once per profile. Returns true when any applied. */
export function applyPersonalDefaults(storage: KeyValueStore): boolean {
  let applied = false;
  for (const step of DEFAULT_STEPS) {
    if (storage.getItem(step.sentinel) === "1") continue;
    for (const [key, value] of Object.entries(step.values)) {
      storage.setItem(key, value);
    }
    storage.setItem(step.sentinel, "1");
    applied = true;
  }
  return applied;
}
