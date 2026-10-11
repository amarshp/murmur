const test = require("node:test");
const assert = require("node:assert/strict");
const { loadAudioManager } = require("./harness/audioManager");

// A realtime-only BYOK provider (Deepgram, AssemblyAI) has no file endpoint, so
// a recording it could not stream is transcribed by OpenAI instead
// (withBatchFallbackProvider). The guard that matters is that the audio goes
// only there, and only with the OpenAI key, never the realtime provider's key.

async function loadManager(t) {
  const { createManager } = await loadAudioManager(t, {
    cachePrefix: "openwhispr-batch-route-guard-test-",
    settingsKey: "__batchRouteGuardSettings",
  });
  return createManager();
}

function setSettings(overrides = {}) {
  globalThis.__batchRouteGuardSettings = {
    useLocalWhisper: false,
    transcriptionMode: "providers",
    remoteTranscriptionUrl: "",
    cloudTranscriptionMode: "byok",
    cloudTranscriptionProvider: "deepgram",
    cloudTranscriptionModel: "nova-3",
    deepgramApiKey: "",
    openaiApiKey: "",
    allowLocalFallback: false,
    preferredLanguage: "en",
    customDictionary: [],
    ...overrides,
  };
}

const audioBlob = () => new Blob([new Uint8Array(1600)], { type: "audio/webm" });

function recordFetch(t, body = { text: "hello there" }) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (endpoint, init) => {
    calls.push({ endpoint: String(endpoint), headers: init?.headers, body: init?.body });
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: { get: () => "application/json" },
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  return calls;
}

test("batch dictation on a keyless realtime-only provider needs the OpenAI key and sends nothing", async (t) => {
  const manager = await loadManager(t);
  setSettings();
  const calls = recordFetch(t);
  globalThis.window.electronAPI.getOpenAIKey = async () => "";

  await assert.rejects(manager.processWithOpenAIAPI(audioBlob()), (error) => {
    assert.equal(error.code, "API_KEY_MISSING");
    return true;
  });
  assert.equal(calls.length, 0, "no audio leaves the machine without a key");
});

test("batch dictation on a keyed realtime-only provider goes to OpenAI with the OpenAI key", async (t) => {
  const manager = await loadManager(t);
  setSettings({ deepgramApiKey: "dg-test", openaiApiKey: "sk-test-openai-key-0000000000000000" });
  const calls = recordFetch(t);

  await manager.processWithOpenAIAPI(audioBlob()).catch(() => {});

  assert.equal(calls.length, 1);
  assert.match(calls[0].endpoint, /^https:\/\/api\.openai\.com\//);
  const authorization = JSON.stringify(calls[0].headers);
  assert.match(authorization, /sk-test-openai-key/);
  assert.doesNotMatch(authorization, /dg-test/);
  assert.equal(calls[0].body.get("model"), "gpt-4o-transcribe");
});
