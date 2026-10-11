const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveEdgeSnap } = require("../../src/helpers/windowConfig");

const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
const size = { width: 208, height: 120 };
const at = (x, y) => ({ x, y, ...size });

test("a drop nearer the left edge settles on the left edge and keeps its height", () => {
  const r = resolveEdgeSnap(at(300, 500), workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: -8, y: 500, edge: "left" });
});

test("a drop nearer the right edge settles on the right edge", () => {
  const r = resolveEdgeSnap(at(1500, 500), workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: 1920 - 208 + 8, y: 500, edge: "right" });
});

test("a drop near the bottom settles on the bottom and keeps its column", () => {
  const r = resolveEdgeSnap(at(900, 880), workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: 900, y: 1040 - 120 + 8, edge: "bottom" });
});

// The pill docks to the bottom of its window, so a top snap would leave it
// floating a window's height below the edge: the top is never a candidate.
test("a drop near the top settles on a side edge and never leaves the top inset", () => {
  const r = resolveEdgeSnap(at(1700, 40), workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: 1920 - 208 + 8, y: 40, edge: "right" });
});

test("a pill-sized window overhangs the screen by its headroom so the pill rests 4px from the edge", () => {
  // The pill sits 12px inside its window (.voice-pill-position-*); 12 - 4 = 8.
  const r = resolveEdgeSnap(at(1500, 500), workArea);
  const pillRight = r.x + 208 - 12;
  assert.equal(1920 - pillRight, 4);
});

test("a window of another size keeps flush against the work area", () => {
  const r = resolveEdgeSnap({ x: 1500, y: 500, width: 400, height: 500 }, workArea);
  assert.deepEqual({ x: r.x, y: r.y, edge: r.edge }, { x: 1920 - 400, y: 500, edge: "right" });
});

test("an off-screen drop is clamped, and the work area origin is respected", () => {
  const r = resolveEdgeSnap(at(-50, 10), { x: 100, y: 50, width: 1000, height: 700 });
  // Left and bottom may overhang by the 8px headroom; the top never does.
  assert.equal(r.x >= 100 - 8 && r.y >= 50, true);
});
