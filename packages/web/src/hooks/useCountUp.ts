import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

interface UseCountUpOptions {
  /** How long the tween from the previous value to `target` takes. */
  durationMs?: number;
  /** Skip the whole hook (e.g. while the underlying data is still loading). */
  enabled?: boolean;
}

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * Tweens a displayed number from its previous value up (or down) to `target`
 * on every change, via requestAnimationFrame. Used for dashboard headline
 * stats (time-to-hire, funnel counts, score averages) so they count up on
 * load instead of appearing instantly.
 *
 * Respects prefers-reduced-motion by skipping the animation loop entirely
 * and returning `target` immediately — the CSS-only reduced-motion guard in
 * globals.css can't reach a JS rAF loop, so this hook checks directly.
 */
export function useCountUp(
  target: number,
  { durationMs = 800, enabled = true }: UseCountUpOptions = {},
): number {
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (!enabled || reducedMotion || !Number.isFinite(target)) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutQuad(progress);
      setValue(from + (to - from) * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setValue(to);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, reducedMotion, durationMs]);

  return value;
}
