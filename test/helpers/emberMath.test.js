const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../../src/components/dictation/emberMath.ts");

test("ember listens while recording even if a previous result is still processing", async () => {
  const { resolveEmberMode } = await load();
  assert.equal(resolveEmberMode({ recording: true, thinking: true }), "listen");
  assert.equal(resolveEmberMode({ recording: false, thinking: true }), "think");
  assert.equal(resolveEmberMode({ recording: false, thinking: false }), "rest");
});

test("ember heat stays cold with no signal source and never exceeds full heat", async () => {
  const { resolveEmberHeat } = await load();
  assert.equal(resolveEmberHeat(null), 0);
  assert.equal(resolveEmberHeat(Number.NaN), 0);
  assert.equal(resolveEmberHeat(-0.2), 0);
  assert.equal(resolveEmberHeat(5), 1);
});

test("ember heat keeps quiet speech visible and separates it from loud speech", async () => {
  const { resolveEmberHeat } = await load();
  const quiet = resolveEmberHeat(0.02);
  const loud = resolveEmberHeat(0.12);
  assert.ok(quiet > 0.2, `quiet speech should be visibly alive, got ${quiet}`);
  assert.ok(
    loud - quiet > 0.4,
    `loud should read clearly hotter than quiet, got ${quiet} vs ${loud}`
  );
});

test("ember listening look is calm in silence and clearly larger, brighter and faster in speech", async () => {
  const { resolveEmberVoiceLook, resolveEmberHeat } = await load();
  const silent = resolveEmberVoiceLook(resolveEmberHeat(0));
  const quiet = resolveEmberVoiceLook(resolveEmberHeat(0.02));
  const loud = resolveEmberVoiceLook(resolveEmberHeat(0.12));

  for (const key of ["radius", "alpha", "glow", "speed", "reach"]) {
    assert.ok(quiet[key] > silent[key], `${key}: quiet speech must read above silence`);
    assert.ok(loud[key] > quiet[key], `${key}: loud speech must read above quiet speech`);
  }
  assert.ok(loud.radius / silent.radius > 3, "speech must at least triple the glow radius");
  assert.ok(silent.alpha > 0.1, "silence stays visibly lit, not off");
});

test("ember listening look clamps out-of-range heat", async () => {
  const { resolveEmberVoiceLook } = await load();
  assert.deepEqual(resolveEmberVoiceLook(-1), resolveEmberVoiceLook(0));
  assert.deepEqual(resolveEmberVoiceLook(9), resolveEmberVoiceLook(1));
  assert.deepEqual(resolveEmberVoiceLook(Number.NaN), resolveEmberVoiceLook(0));
});

// Levels measured on the owner's mic from saved dictations (50 ms RMS windows):
// room floor 0.0012-0.003, p50 0.006, p90 0.012-0.018, max 0.04.
test("ember heat reads this mic's real speech levels as clearly alive", async () => {
  const { createEmberHeatTracker } = await load();
  const run = (level, seconds = 1) => {
    const tracker = createEmberHeatTracker();
    for (let i = 0; i < 60; i += 1) tracker.next(0.0015, 1 / 60); // room noise first
    let heat = 0;
    for (let i = 0; i < seconds * 60; i += 1) heat = tracker.next(level, 1 / 60);
    return heat;
  };
  assert.equal(run(0.0015), 0, "room noise is cold");
  assert.equal(run(0.0025), 0, "a rise of a few dB over the floor is still silence");
  assert.ok(run(0.006) > 0.4, "median speech must be well above cold");
  assert.ok(run(0.015) > 0.8, "loud speech is nearly full heat");
  assert.equal(run(0.04), 1);
});

test("ember heat adapts to a hot mic and never sticks on after speech stops", async () => {
  const { createEmberHeatTracker } = await load();
  const tracker = createEmberHeatTracker();
  // A hot mic: floor 0.02, speech 0.2. The floor is learned from the quiet
  // parts, rising slowly (0.8 dB/s) so speech never drags it up.
  for (let i = 0; i < 60 * 40; i += 1) tracker.next(0.02, 1 / 60);
  const speech = tracker.next(0.2, 1 / 60);
  assert.ok(speech > 0.75, `hot-mic speech should read hot, got ${speech}`);
  let heat = speech;
  for (let i = 0; i < 60 * 5; i += 1) heat = tracker.next(0.02, 1 / 60);
  assert.equal(heat, 0, "back at its own floor the ember is calm again");
});

test("ember heat treats a missing signal as cold", async () => {
  const { createEmberHeatTracker } = await load();
  const tracker = createEmberHeatTracker();
  assert.equal(tracker.next(null, 1 / 60), 0);
  assert.equal(tracker.next(Number.NaN, 1 / 60), 0);
});
