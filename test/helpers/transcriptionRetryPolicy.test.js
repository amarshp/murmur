const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../../src/helpers/transcriptionRetryPolicy.js");
const noSleep = async () => {};

test("network drops, 5xx and rate limits are retried; user-fixable errors are not", async () => {
  const { isTransientTranscriptionError } = await load();
  assert.equal(isTransientTranscriptionError(new Error("fetch failed")), true);
  assert.equal(isTransientTranscriptionError(Object.assign(new Error("x"), { status: 503 })), true);
  assert.equal(isTransientTranscriptionError(Object.assign(new Error("x"), { status: 429 })), true);
  assert.equal(
    isTransientTranscriptionError(Object.assign(new Error("x"), { code: "NETWORK_ERROR" })),
    true
  );
  assert.equal(
    isTransientTranscriptionError(Object.assign(new Error("x"), { status: 401 })),
    false
  );
  assert.equal(
    isTransientTranscriptionError(Object.assign(new Error("timeout"), { code: "API_KEY_MISSING" })),
    false
  );
  assert.equal(
    isTransientTranscriptionError(
      Object.assign(new Error("x"), { code: "PROVIDER_QUOTA_EXHAUSTED" })
    ),
    false
  );
  assert.equal(isTransientTranscriptionError(new Error("No speech detected")), false);
});

test("a transient failure is retried and the later success is returned", async () => {
  const { withTranscriptionRetry } = await load();
  let calls = 0;
  const retries = [];
  const result = await withTranscriptionRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("network error");
      return "text";
    },
    { sleep: noSleep, onRetry: (info) => retries.push(info.attempt) }
  );
  assert.equal(result, "text");
  assert.equal(calls, 3);
  assert.deepEqual(retries, [1, 2]);
});

test("the last transient error is rethrown once the attempts run out", async () => {
  const { withTranscriptionRetry } = await load();
  let calls = 0;
  await assert.rejects(
    withTranscriptionRetry(
      async () => {
        calls += 1;
        throw Object.assign(new Error("bad gateway"), { status: 502 });
      },
      { sleep: noSleep }
    ),
    /bad gateway/
  );
  assert.equal(calls, 3);
});

test("a fatal error and a cancelled run are not retried", async () => {
  const { withTranscriptionRetry } = await load();
  let calls = 0;
  await assert.rejects(
    withTranscriptionRetry(
      async () => {
        calls += 1;
        throw Object.assign(new Error("denied"), { status: 401 });
      },
      { sleep: noSleep }
    )
  );
  assert.equal(calls, 1);

  calls = 0;
  await assert.rejects(
    withTranscriptionRetry(
      async () => {
        calls += 1;
        throw new Error("network error");
      },
      { sleep: noSleep, isCancelled: () => true }
    )
  );
  assert.equal(calls, 1);
});
