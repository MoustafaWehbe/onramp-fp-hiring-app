import type { ElementType, ReactNode } from "react";
import { useRevealOnScroll } from "../../hooks/useRevealOnScroll";
import { cn } from "../../lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms — for revealing a row of cards in sequence rather than all at once. */
  delayMs?: number;
  /** Tag to render, for when the wrapper needs to carry a semantic landmark (e.g. "aside"). Defaults to a plain div. */
  as?: ElementType;
}

/**
 * Fades and slides its children up into place the first time they scroll
 * into view. Renders one plain wrapper element so it doesn't change the
 * layout of whatever it wraps (grid/flex children keep their sizing as
 * normal).
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
  as: Tag = "div",
}: RevealProps) {
  const [ref, isVisible] = useRevealOnScroll<HTMLElement>();

  return (
    <Tag
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      )}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
