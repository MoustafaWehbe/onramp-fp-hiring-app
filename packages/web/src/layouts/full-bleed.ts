import { createContext, useContext, useEffect } from "react";

/**
 * Lets a single recruiter page opt out of the shell's shared content measure.
 *
 * The context value is the layout's `useState` setter, which React guarantees
 * is stable, so the effect below depends on it without re-firing every render.
 * A route-path check inside `RecruiterLayout` would have been shorter, but it
 * would put knowledge of which page is which into the shell — the page that
 * wants the exception is the one that should ask for it.
 */
export const FullBleedContext = createContext<
  ((fullBleed: boolean) => void) | null
>(null);

/**
 * Ask the recruiter shell to drop its `max-w-7xl` cap for as long as this
 * component is mounted. Pages that use it are responsible for re-constraining
 * their own reading-width content; only the part that genuinely wants the
 * whole viewport (the Kanban board, whose six columns scroll sideways) should
 * span it.
 */
export function useFullBleedContent(enabled = true): void {
  const setFullBleed = useContext(FullBleedContext);

  useEffect(() => {
    if (!setFullBleed || !enabled) {
      return;
    }

    setFullBleed(true);

    return () => setFullBleed(false);
  }, [setFullBleed, enabled]);
}
