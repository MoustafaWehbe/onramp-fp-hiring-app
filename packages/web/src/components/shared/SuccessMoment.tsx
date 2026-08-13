import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { ACCENT_GRADIENT } from "../../features/candidate/theme";

interface SuccessMomentProps {
  message: string;
  className?: string;
  /** How long before it auto-dismisses. */
  durationMs?: number;
  onDismiss?: () => void;
}

/**
 * The one deliberate celebratory moment in the app: a small, dismissible,
 * self-timing-out inline confirmation — not a modal, not confetti. Rendered
 * inline near the action that triggered it (e.g. above an apply button, or
 * next to a pipeline stage badge) alongside the existing toast, never in
 * place of it. Entrance uses .animate-celebrate-pop, which is neutralized
 * app-wide for prefers-reduced-motion via globals.css.
 */
export function SuccessMoment({
  message,
  className,
  durationMs = 2500,
  onDismiss,
}: SuccessMomentProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      role="status"
      className={cn(
        "animate-celebrate-pop flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm font-medium text-indigo-900 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-100",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
          ACCENT_GRADIENT,
        )}
        aria-hidden="true"
      >
        <Check className="h-4 w-4" />
      </span>
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-100"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
