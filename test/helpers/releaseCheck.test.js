const test = require("node:test");
const assert = require("node:assert/strict");
const { isNewerVersion, checkForNewRelease, RELEASES_PAGE } = require("../../src/helpers/releaseCheck");

test("isNewerVersion compares x.y.z numerically", () => {
  assert.equal(isNewerVersion("v0.2.0", "0.1.0"), true);
  assert.equal(isNewerVersion("0.10.0", "0.9.9"), true);
  assert.equal(isNewerVersion("0.1.0", "0.1.0"), false);
  assert.equal(isNewerVersion("0.0.9", "0.1.0"), false);
  assert.equal(isNewerVersion("garbage", "0.1.0"), false);
});

const respond = (body, ok = true) => async () => ({ ok, json: async () => body });

test("checkForNewRelease reports a newer published release with the page link", async () => {
  const r = await checkForNewRelease("0.1.0", respond({ tag_name: "v0.2.0" }));
  assert.deepEqual(r, { available: true, version: "0.2.0", url: RELEASES_PAGE });
});

test("checkForNewRelease ignores drafts, prereleases, same version and failures", async () => {
  assert.equal((await checkForNewRelease("0.1.0", respond({ tag_name: "v0.2.0", prerelease: true }))).available, false);
  assert.equal((await checkForNewRelease("0.1.0", respond({ tag_name: "v0.1.0" }))).available, false);
  assert.equal((await checkForNewRelease("0.1.0", respond({}, false))).available, false);
  assert.equal((await checkForNewRelease("0.1.0", async () => { throw new Error("offline"); })).available, false);
});
