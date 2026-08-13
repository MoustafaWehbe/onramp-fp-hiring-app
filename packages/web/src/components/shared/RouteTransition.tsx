import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * A light fade/slide on every route change instead of an instant hard cut.
 * Keyed on the pathname so the entrance animation re-runs per navigation;
 * entrance-only (no exit choreography) since react-router v6's <Routes/>
 * unmounts the old page immediately — a true crossfade would need a data
 * router. Motion is neutralized for prefers-reduced-motion globally via the
 * .animate-fade-slide-in rule in globals.css, so no branching needed here.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="animate-fade-slide-in">
      {children}
    </div>
  );
}
