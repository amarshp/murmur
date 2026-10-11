const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../../src/helpers/recoveredRetryPolicy.js");

const row = (id, over = {}) => ({
  id,
  status: "failed",
  error_code: "CRASH_RECOVERY",
  has_audio: 1,
  ...over,
});

test("only failed crash-recovery rows that kept their audio are picked, oldest first", async () => {
  const { pickRecoveredToRetry } = await load();
  const items = [
    row(9),
    row(4),
    row(6, { status: "completed" }),
    row(7, { error_code: "API_KEY_MISSING" }),
    row(8, { has_audio: 0 }),
  ];
  assert.deepEqual(pickRecoveredToRetry(items, new Set()), [4, 9]);
});

test("a row already tried on any launch is never picked again", async () => {
  const { pickRecoveredToRetry } = await load();
  assert.deepEqual(pickRecoveredToRetry([row(1), row(2)], new Set([1])), [2]);
  assert.deepEqual(pickRecoveredToRetry([row(1)], [1]), []);
});

test("a backlog is capped per launch", async () => {
  const { pickRecoveredToRetry, MAX_AUTO_RETRIES_PER_LAUNCH } = await load();
  const items = Array.from({ length: 12 }, (_, i) => row(i + 1));
  assert.equal(pickRecoveredToRetry(items, new Set()).length, MAX_AUTO_RETRIES_PER_LAUNCH);
});

test("bad input gives an empty list instead of throwing", async () => {
  const { pickRecoveredToRetry } = await load();
  assert.deepEqual(pickRecoveredToRetry(undefined, new Set()), []);
  assert.deepEqual(pickRecoveredToRetry([null, row(3)], undefined), [3]);
});
