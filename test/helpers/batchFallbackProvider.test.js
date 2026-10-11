const test = require("node:test");
const assert = require("node:assert/strict");

const loadRoute = () => import("../../src/helpers/transcriptionRoute.ts");
const loadFallback = () => import("../../src/helpers/transcriptionFallback.js");

test("a streaming-only provider's batch work is routed to OpenAI", async () => {
  const { withBatchFallbackProvider, BATCH_FALLBACK_PROVIDER } = await loadRoute();
  const swapped = withBatchFallbackProvider({
    cloudTranscriptionProvider: "deepgram",
    cloudTranscriptionModel: "nova-3",
    preferredLanguage: "en",
  });
  assert.equal(swapped.cloudTranscriptionProvider, BATCH_FALLBACK_PROVIDER.provider);
  assert.equal(swapped.cloudTranscriptionModel, BATCH_FALLBACK_PROVIDER.model);
  assert.equal(swapped.preferredLanguage, "en");
});

test("providers with a file endpoint keep their own batch route", async () => {
  const { withBatchFallbackProvider } = await loadRoute();
  const groq = { cloudTranscriptionProvider: "groq", cloudTranscriptionModel: "whisper-large-v3" };
  assert.equal(withBatchFallbackProvider(groq), groq);
});

test("the fallback model is one the OpenAI registry entry lists", async () => {
  const { BATCH_FALLBACK_PROVIDER } = await loadRoute();
  const registry = require("../../src/models/modelRegistryData.json");
  const openai = registry.transcriptionProviders.find(
    (p) => p.id === BATCH_FALLBACK_PROVIDER.provider
  );
  assert.ok(openai.models.some((m) => m.id === BATCH_FALLBACK_PROVIDER.model));
});

test("a Deepgram stream that cannot start keeps the recording for the batch fallback", async () => {
  const { resolveStreamingStartFallback } = await loadFallback();
  const base = { providerName: "deepgram", cloudTranscriptionMode: "byok" };
  assert.equal(
    resolveStreamingStartFallback({ ...base, result: { code: "NETWORK_ERROR" } }),
    "network_unavailable"
  );
  assert.equal(
    resolveStreamingStartFallback({ ...base, result: { code: "AUTH_FAILED" } }),
    "session_unavailable"
  );
});

test("other providers keep their own start-failure behaviour", async () => {
  const { resolveStreamingStartFallback } = await loadFallback();
  assert.equal(
    resolveStreamingStartFallback({
      providerName: "openai-realtime",
      cloudTranscriptionMode: "byok",
      result: { code: "NETWORK_ERROR" },
    }),
    null
  );
});
