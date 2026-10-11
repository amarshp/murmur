import { useRef, type ReactNode, type PointerEvent } from "react";
import { cn } from "../lib/utils";

/**
 * A surface with an ember glow that follows the pointer, and rests low and
 * warm when the pointer is away. Pure CSS variables, so a pointer move costs
 * no React render.
 */
export default function EmberSpotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--ember-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--ember-y", `${event.clientY - rect.top}px`);
    el.style.setProperty("--ember-o", "1");
  };
  const onLeave = () => ref.current?.style.setProperty("--ember-o", "0");

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("group/ember relative isolate overflow-hidden", className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500"
        style={{
          opacity: "var(--ember-o, 0)",
          background:
            "radial-gradient(260px circle at var(--ember-x, 50%) var(--ember-y, 50%), color-mix(in oklab, var(--color-primary) 18%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-primary/10 to-transparent"
      />
      {children}
    </div>
  );
}
