import { useCallback, useState } from "react";

const STORAGE_KEY = "hireflow.recruiterSidebarCollapsed";

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Persists the recruiter sidebar's collapsed/expanded choice across
 * reloads — same localStorage pattern as ThemeProvider's theme preference,
 * namespaced like lib/roles.ts's intended-role key to avoid collisions.
 * Desktop-only concept: the mobile drawer always renders at full width.
 */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Storage unavailable (private mode, etc.) — best-effort persistence.
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
