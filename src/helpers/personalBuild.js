// Switches for the personal build, read by the main process. Everything this
// fork changes about startup hangs off this one module so an upstream update
// conflicts in as few places as possible. Renderer-side defaults live in
// src/config/personalDefaults.ts.

const PERSONAL_BUILD = Object.freeze({
  // Pure dictation: no calendar sync and no meeting detection in the background.
  leanMode: true,
  // An official release would replace this build and drop the personal layer.
  disableAutoUpdate: true,
});

module.exports = { PERSONAL_BUILD };
