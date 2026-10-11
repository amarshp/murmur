const test = require("node:test");
const assert = require("node:assert/strict");

const DeepgramStreaming = require("../../src/helpers/deepgramStreaming.js");

const frame = (bytes = 3200) => Buffer.alloc(bytes, 1);

test("frames that arrive before the socket exists are held while a start is pending", () => {
  const dg = new DeepgramStreaming();
  dg.beginStart();

  assert.equal(dg.sendAudio(frame()), false);
  assert.equal(dg.sendAudio(frame()), false);

  assert.equal(dg.coldStartBuffer.length, 2);
  assert.equal(dg.coldStartBufferSize, 6400);
});

test("frames with no start pending are dropped, so a stale session cannot leak into the next", () => {
  const dg = new DeepgramStreaming();

  assert.equal(dg.sendAudio(frame()), false);
  assert.equal(dg.coldStartBuffer.length, 0);

  dg.beginStart();
  dg.sendAudio(frame());
  dg.endStart();
  dg.sendAudio(frame());

  assert.equal(dg.coldStartBuffer.length, 1);
});

test("a new session starts from an empty buffer", () => {
  const dg = new DeepgramStreaming();
  dg.beginStart();
  dg.sendAudio(frame());
  dg.endStart();

  dg.beginStart();

  assert.equal(dg.coldStartBuffer.length, 0);
  assert.equal(dg.coldStartBufferSize, 0);
});

test("held audio is capped so a connection that never opens cannot grow without bound", () => {
  const dg = new DeepgramStreaming();
  dg.beginStart();
  for (let i = 0; i < 400; i += 1) dg.sendAudio(frame());

  assert.ok(dg.coldStartBufferSize <= 10 * 16000 * 2 + 3200);
  assert.ok(dg.coldStartBufferSize >= 9 * 16000 * 2, "keeps at least the first nine seconds");
});
