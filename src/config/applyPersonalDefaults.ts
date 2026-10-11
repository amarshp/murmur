// Side-effect module: the renderer entry imports it first, so the personal
// defaults are in localStorage before settingsStore reads them at construction.
// Kept out of the store so the store (and its tests) behave exactly as upstream.
import { applyPersonalDefaults } from "./personalDefaults";

try {
  applyPersonalDefaults(localStorage);
} catch {
  // Storage can be unavailable; the app then runs on upstream's own defaults.
}
