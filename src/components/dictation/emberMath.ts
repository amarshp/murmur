export type EmberMode = "listen" | "think" | "rest";

/** Recording wins: the plasma must answer the voice even while a previous result is still settling. */
export function resolveEmberMode({
  recording,
  thinking,
}: {
  recording: boolean;
  thinking: boolean;
}): EmberMode {
  if (recording) return "listen";
  if (thinking) return "think";
  return "rest";
}

// Conversational speech RMS sits around 0.02–0.15 (see waveformMath.ts). The
// gain puts loud voicing at full heat; the exponent keeps quiet speech visibly
// alive instead of leaving the pill dark until the user raises their voice.
const HEAT_GAIN = 6;
const HEAT_EXPONENT = 0.75;

/** Maps a raw input level to 0..1 heat. No signal source reads as cold. */
export function resolveEmberHeat(rms: number | null): number {
  if (rms === null || !Number.isFinite(rms)) return 0;
  return Math.min(1, Math.pow(Math.max(0, rms) * HEAT_GAIN, HEAT_EXPONENT));
}

// This machine's mic measures p50 0.006, p90 0.012-0.018 and max 0.04 while
// speaking, with a room floor of 0.001-0.003, which is far below the 0.02-0.15
// the fixed gain above assumes: speech barely left the "silent" look. Heat is
// therefore measured in dB above the mic's own noise floor, which is followed
// per recording, so a quiet or a hot mic both span the whole range.
const FLOOR_START_DB = -58;
const FLOOR_MIN_DB = -75;
const FLOOR_MAX_DB = -30;
/** How fast a floor that is above the true room noise sinks back (dB per second is the rise, instant is the fall). */
const FLOOR_RISE_DB_PER_S = 0.8;
/** Above the floor this much reads as silence (room noise wobbles a few dB). */
const HEAT_DEADBAND_DB = 5;
/** dB above the floor that reads as full heat (loud speech is ~25 dB up). */
const HEAT_SPAN_DB = 24;
const HEAT_CURVE = 0.8;

export interface EmberHeatTracker {
  /** Heat 0..1 for one input RMS; `dt` is the seconds since the previous call. */
  next(rms: number | null, dt: number): number;
}

export function createEmberHeatTracker(): EmberHeatTracker {
  let floorDb = FLOOR_START_DB;
  return {
    next(rms, dt) {
      if (rms === null || !Number.isFinite(rms)) return 0;
      const db = 20 * Math.log10(Math.max(rms, 1e-5));
      // The floor follows the quietest recent level: down at once, up slowly,
      // so sustained speech does not drag it up into the voice.
      floorDb = db < floorDb ? db : floorDb + FLOOR_RISE_DB_PER_S * Math.max(0, dt);
      floorDb = Math.min(FLOOR_MAX_DB, Math.max(FLOOR_MIN_DB, floorDb));
      const above = db - floorDb - HEAT_DEADBAND_DB;
      if (above <= 0) return 0;
      return Math.min(1, Math.pow(above / (HEAT_SPAN_DB - HEAT_DEADBAND_DB), HEAT_CURVE));
    },
  };
}

export interface EmberVoiceLook {
  /** Blob radius as a fraction of the pill height. */
  radius: number;
  /** Additive alpha for each blob. */
  alpha: number;
  /** Outer glow opacity. */
  glow: number;
  /** Multiplier on how fast the blobs drift. */
  speed: number;
  /** Multiplier on how far each blob roams from its home. */
  reach: number;
}

/**
 * The listening look for a heat of 0..1. Silence is a calm, dim, slow ember
 * that still reads as "on"; speech swells, brightens and quickens every part
 * of it together, so it is obvious from the corner of the eye that the voice
 * is being picked up.
 */
export function resolveEmberVoiceLook(heat: number): EmberVoiceLook {
  const h = Math.min(1, Math.max(0, Number.isFinite(heat) ? heat : 0));
  return {
    radius: 0.26 + 0.86 * h,
    alpha: 0.16 + 0.54 * h,
    glow: 0.1 + 0.9 * h,
    speed: 0.35 + 2.4 * h,
    // How far each blob roams from its home, as a multiple of the base drift.
    reach: 0.8 + 1.1 * h,
  };
}
