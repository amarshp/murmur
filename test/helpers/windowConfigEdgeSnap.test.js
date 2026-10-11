const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveEdgeSnap } = require("../../src/helpers/windowConfig");

const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
const size = { width: 208, height: 120 };
const at = (x, y) => ({ x, y, ...size });

test("a drop nearer the left edge settles on the left edge and keeps its height", () => {
  const r = resolveEdgeSnap(at(300, 500), workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: 0, y: 500, edge: "left" });
});

test("a drop nearer the right edge settles on the right edge", () => {
  const r = resolveEdgeSnap(at(1500, 500), workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: 1920 - 208, y: 500, edge: "right" });
});

test("a drop near the bottom settles on the bottom and keeps its column", () => {
  const r = resolveEdgeSnap(at(900, 880), workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: 900, y: 1040 - 120, edge: "bottom" });
});

test("a drop near the top settles on the top", () => {
  const r = resolveEdgeSnap(at(900, 40), workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: 900, y: 0, edge: "top" });
});

test("an off-screen drop is clamped, and the work area origin is respected", () => {
  const r = resolveEdgeSnap(at(-50, 10), { x: 100, y: 50, width: 1000, height: 700 });
  assert.equal(r.x >= 100 && r.y >= 50, true);
});
