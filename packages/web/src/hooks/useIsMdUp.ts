import { useEffect, useState } from "react";

const QUERY = "(min-width: 768px)";

function getInitial(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks whether the viewport is at Tailwind's md breakpoint (768px) or
 * wider. Unlike a CSS `hidden md:block` class, gating a component's mount on
 * this hook's value keeps it — and anything it fetches — out of the tree
 * entirely below md, not just visually hidden.
 */
export function useIsMdUp(): boolean {
  const [isMdUp, setIsMdUp] = useState(getInitial);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia(QUERY);
    const handleChange = () => setIsMdUp(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMdUp;
}
