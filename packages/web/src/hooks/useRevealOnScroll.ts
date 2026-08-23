import { useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "./useReducedMotion";

interface UseRevealOnScrollOptions {
  /** Fraction of the element's height that must be visible to reveal it. */
  threshold?: number;
  /** Shrinks the observed viewport so a reveal near the bottom edge doesn't wait for the element to be fully on-screen. */
  rootMargin?: string;
}

/**
 * Reveals an element the first time it scrolls into view, via a one-shot
 * IntersectionObserver that disconnects itself on the first intersection —
 * scrolling back past the element later never re-triggers it.
 *
 * Returns `true` immediately under prefers-reduced-motion (content just
 * appears, matching the reduced-motion contract in globals.css) and
 * wherever IntersectionObserver isn't available, so a caller never needs
 * its own fallback for either case.
 */
export function useRevealOnScroll<T extends HTMLElement>(
  { threshold = 0.15, rootMargin = "0px 0px -10% 0px" }: UseRevealOnScrollOptions = {},
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion, threshold, rootMargin]);

  return [ref, isVisible];
}
