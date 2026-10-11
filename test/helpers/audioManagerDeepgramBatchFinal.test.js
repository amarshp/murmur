const test = require("node:test");
const assert = require("node:assert/strict");
const { loadAudioManager } = require("./harness/audioManager");

// The live Deepgram stream clips first words and mishears numbers, so the kept
// recording goes through Deepgram's file endpoint and that text wins when it
// arrives. Anything short of clean text must leave the stream's text alone.

async function loadManager(t) {
  const { createManager } = await loadAudioManager(t, {
    cachePrefix: "openwhispr-deepgram-batch-final-test-",
    settingsKey: "__deepgramBatchFinalSettings",
  });
  return createManager();
}

function setSettings(overrides = {}) {
  globalThis.__deepgramBatchFinalSettings = {
    useLocalWhisper: false,
    transcriptionMode: "providers",
    cloudTranscriptionMode: "byok",
    cloudTranscriptionProvider: "deepgram",
    cloudTranscriptionModel: "nova-3",
    preferredLanguage: "en",
    customDictionary: ["BMR"],
    ...overrides,
  };
}

const blob = () => new Blob([new Uint8Array(1600)], { type: "audio/webm" });

test("a Deepgram BYOK recording asks main for the file transcript with the dictionary as keyterms", async (t) => {
  const manager = await loadManager(t);
  setSettings();
  const calls = [];
  globalThis.window.electronAPI.deepgramBatchTranscribe = async (options) => {
    calls.push(options);
    return { success: true, text: "  Here there are many boxes.  " };
  };

  const text = await manager._startDeepgramBatchFinal(blob());

  assert.equal(text, "Here there are many boxes.");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].mimeType, "audio/webm");
  assert.equal(calls[0].language, "en");
  assert.deepEqual(calls[0].keyterms, ["BMR"]);
});

test("a failed, empty or throwing file pass resolves to null so the stream's text is kept", async (t) => {
  const manager = await loadManager(t);
  setSettings();
  for (const reply of [
    async () => ({ success: false, error: "Deepgram HTTP 500" }),
    async () => ({ success: true, text: "" }),
    async () => {
      throw new Error("ipc gone");
    },
  ]) {
    globalThis.window.electronAPI.deepgramBatchTranscribe = reply;
    assert.equal(await manager._startDeepgramBatchFinal(blob()), null);
  }
});

test("other providers, an empty recording and the opt-out never call the file endpoint", async (t) => {
  const manager = await loadManager(t);
  let called = 0;
  globalThis.window.electronAPI.deepgramBatchTranscribe = async () => {
    called += 1;
    return { success: true, text: "x" };
  };

  setSettings({ cloudTranscriptionProvider: "assemblyai" });
  assert.equal(manager._startDeepgramBatchFinal(blob()), null);

  setSettings();
  assert.equal(manager._startDeepgramBatchFinal(new Blob([])), null);

  setSettings({ deepgramBatchFinal: false });
  assert.equal(manager._startDeepgramBatchFinal(blob()), null);

  assert.equal(called, 0);
});
