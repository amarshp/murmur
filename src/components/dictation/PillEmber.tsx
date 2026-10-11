import { useEffect, useRef, type RefObject } from "react";
import { cn } from "../lib/utils";
import {
  createEmberHeatTracker,
  resolveEmberMode,
  resolveEmberVoiceLook,
  type EmberMode,
} from "./emberMath";

interface PillEmberProps {
  /** Returns the current input level (RMS, 0..~1) or null when no signal source exists. */
  getLevel: () => number | null;
  recording: boolean;
  thinking: boolean;
  unavailable: boolean;
  agentMode?: boolean;
  /** Halo outside the pill; its opacity and scale follow the voice. */
  glowRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// Molten palette for dictation, cooler plasma for the agent, so the two
// identities stay distinguishable without the logo.
const EMBER_COLORS = ["255,61,110", "255,138,31", "255,210,63", "179,61,255", "255,90,40"];
const AGENT_COLORS = ["167,139,250", "135,135,255", "124,58,237", "56,189,248", "236,72,153"];
const COAL_UNAVAILABLE = "150,150,150";

const SPRITE_PX = 64;

// One soft radial blob per colour, drawn once. Every frame is then a handful
// of scaled drawImage calls: no gradients or shadows are built while recording.
function buildSprites(colors: string[]): HTMLCanvasElement[] {
  return colors.map((rgb) => {
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE_PX;
    sprite.height = SPRITE_PX;
    const ctx = sprite.getContext("2d");
    if (ctx) {
      const half = SPRITE_PX / 2;
      const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, `rgba(${rgb},1)`);
      gradient.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
    }
    return sprite;
  });
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  radius: number,
  alpha: number
) {
  if (radius <= 0 || alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
}

/**
 * The pill's living fill: plasma that swells with the voice while recording,
 * a spinning ring while the transcript is being worked on, and a single
 * resting coal otherwise. Only the active modes run a frame loop; the resting
 * coal is painted once and breathes through a compositor-only CSS animation,
 * so an idle always-on-top pill costs nothing.
 */
export function PillEmber({
  getLevel,
  recording,
  thinking,
  unavailable,
  agentMode = false,
  glowRef,
  className,
}: PillEmberProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mode: EmberMode = resolveEmberMode({ recording, thinking });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const sprites = buildSprites(
      unavailable ? [COAL_UNAVAILABLE] : agentMode ? AGENT_COLORS : EMBER_COLORS
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const glow = glowRef?.current ?? null;
    let heat = 0;
    let frame = 0;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: canvas.clientWidth, h: canvas.clientHeight };
    };

    const setGlow = (amount: number) => {
      if (!glow) return;
      glow.style.opacity = String(amount);
      glow.style.transform = `scale(${1 + 0.1 * amount})`;
    };

    // Resolved once per frame in the loop below; read by the listening paint.
    let look = resolveEmberVoiceLook(0);
    let phase = 0;
    const heatTracker = createEmberHeatTracker();

    const paint = (seconds: number) => {
      const { w, h } = fit();
      if (w === 0 || h === 0) return;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.globalCompositeOperation = "lighter";
      // Reduced motion keeps the blobs where they are; only their size answers
      // the voice, which is feedback rather than decoration.
      const t = reducedMotion ? 0 : seconds;

      if (mode === "listen") {
        for (let i = 0; i < sprites.length; i += 1) {
          // Each blob wanders around its own home along the pill, so the
          // plasma always spans the capsule instead of pooling at one end.
          const home = (i / (sprites.length - 1) - 0.5) * w * 0.62;
          const x = home + Math.sin(t * (1.1 + i * 0.37) + i * 1.9) * w * 0.2 * look.reach;
          const y = Math.cos(t * (1.6 + i * 0.29) + i) * h * 0.18 * look.reach;
          const wobble = 0.7 + 0.3 * Math.sin(i * 2.3 + t * 3);
          // Additive light: alpha is capped so full heat glows without
          // bleaching the colours to white.
          drawBlob(ctx, sprites[i], x, y, h * look.radius * wobble, look.alpha);
        }
      } else if (mode === "think") {
        for (let i = 0; i < sprites.length; i += 1) {
          const angle = t * 7 + (i * Math.PI * 2) / sprites.length;
          const orbit = Math.min(w, h) * 0.27;
          drawBlob(
            ctx,
            sprites[i],
            Math.cos(angle) * orbit,
            Math.sin(angle) * orbit,
            Math.min(w, h) * 0.3,
            0.75
          );
        }
      } else {
        const size = Math.min(w, h);
        const coal = sprites[sprites.length - 1];
        drawBlob(ctx, coal, 0, 0, size * 0.62, unavailable ? 0.35 : 0.75);
        // A hotter core, so the resting pill reads as lit rather than tinted.
        if (!unavailable) drawBlob(ctx, sprites[2], 0, size * 0.04, size * 0.3, 0.7);
      }
      ctx.restore();
    };

    if (mode === "rest") {
      setGlow(0);
      paint(0);
      // The pill tweens between footprints; repaint so the coal never stretches.
      const observer = new ResizeObserver(() => paint(0));
      observer.observe(canvas);
      return () => observer.disconnect();
    }

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (mode === "listen") {
        const target = heatTracker.next(getLevel(), dt);
        // Fast attack so a syllable lands on the beat; slower release so the
        // plasma settles instead of flickering between words.
        heat += (target - heat) * Math.min(1, dt * (target > heat ? 18 : 7));
        look = resolveEmberVoiceLook(heat);
        // The drift speeds up with the voice, so motion itself says "heard".
        phase += dt * look.speed;
        setGlow(look.glow);
        paint(phase);
      } else {
        setGlow(0.55);
        paint(now / 1000);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      setGlow(0);
    };
  }, [mode, unavailable, agentMode, getLevel, glowRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-ember-mode={mode}
      className={cn("pill-ember pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
