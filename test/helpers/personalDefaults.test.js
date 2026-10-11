const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../../src/config/personalDefaults.ts");

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test("personal defaults route dictation to Deepgram streaming over a prior local-Whisper profile", async () => {
  const { applyPersonalDefaults } = await load();
  const storage = memoryStorage({ useLocalWhisper: "true", preferredLanguage: "auto" });

  assert.equal(applyPersonalDefaults(storage), true);
  assert.equal(storage.getItem("useLocalWhisper"), "false");
  assert.equal(storage.getItem("cloudTranscriptionMode"), "byok");
  assert.equal(storage.getItem("cloudTranscriptionProvider"), "deepgram");
  assert.equal(storage.getItem("cloudTranscriptionModel"), "nova-3");
  assert.equal(storage.getItem("preferredLanguage"), "en");
});

test("personal defaults apply once, so a later choice in Settings sticks", async () => {
  const { applyPersonalDefaults } = await load();
  const storage = memoryStorage();
  applyPersonalDefaults(storage);

  storage.setItem("cloudTranscriptionProvider", "groq");
  assert.equal(applyPersonalDefaults(storage), false);
  assert.equal(storage.getItem("cloudTranscriptionProvider"), "groq");
});

test("personal defaults point at a speech model and a cleanup model the registry lists", async () => {
  const { PERSONAL_SETTING_DEFAULTS } = await load();
  const registry = require("../../src/models/modelRegistryData.json");

  const speech = registry.transcriptionProviders.find(
    (provider) => provider.id === PERSONAL_SETTING_DEFAULTS.cloudTranscriptionProvider
  );
  assert.ok(speech.models.some((m) => m.id === PERSONAL_SETTING_DEFAULTS.cloudTranscriptionModel));

  const cleanup = registry.cloudProviders.find(
    (provider) => provider.id === PERSONAL_SETTING_DEFAULTS.cleanupProvider
  );
  assert.ok(cleanup.models.some((m) => m.id === PERSONAL_SETTING_DEFAULTS.cleanupModel));
});

test("a profile that already took the first defaults still receives the clipboard default once", async () => {
  const { applyPersonalDefaults } = await load();
  const storage = memoryStorage({
    _personalDefaultsV1: "1",
    cloudTranscriptionProvider: "groq",
  });

  assert.equal(applyPersonalDefaults(storage), true);
  assert.equal(storage.getItem("keepTranscriptionInClipboard"), "true");
  // The earlier step is not replayed over the user's later choice.
  assert.equal(storage.getItem("cloudTranscriptionProvider"), "groq");

  storage.setItem("keepTranscriptionInClipboard", "false");
  assert.equal(applyPersonalDefaults(storage), false);
  assert.equal(storage.getItem("keepTranscriptionInClipboard"), "false");
});
